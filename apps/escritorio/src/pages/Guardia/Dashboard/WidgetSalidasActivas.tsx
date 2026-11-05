// src/pages/Guardia/Dashboard/WidgetSalidasActivas.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../app/firebase-config';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { toast } from 'sonner';
import {
  Siren,
  Plus,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  CornerDownLeft,
  FileText,
  AlertCircle,
  Radio,
  Send,
  Check,
} from 'lucide-react';
import Modal from '../../../components/Modal';
import PageLoader from '../../../components/PageLoader/PageLoader';
import SearchableSelect, { SearchableOption } from '../../../components/SearchableSelect/SearchableSelect';
import {
  CODIGOS_INTERVENCION,
  CodigoIntervencion,
  formatearCodigoIntervencion,
  obtenerDescripcionIntervencion,
} from '../constants';
import {
  SalidaUnidad,
  IncidenteAgrupado,
} from './types';
import './WidgetSalidasActivas.css';

// ─── Helpers de tiempo y fecha ──────────────────────────────────────────────────
const getHoraActual = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getFechaHoy = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface UnidadItem {
  id: string;
  nombre: string;
  kilometraje?: string | number;
  estado?: string;
  tipo?: string;
}

interface MiembroItem {
  id: string;
  nombre: string;
  apellido: string;
  ordenOperativo?: number | string;
  activo?: boolean;
  esGuardia?: boolean;
  rol?: string;
  roles?: string[];
  guardia?: boolean;
}

const WidgetSalidasActivas: React.FC = () => {
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();

  const [salidas, setSalidas] = useState<SalidaUnidad[]>([]);
  const [cargando, setCargando] = useState(true);

  // Catálogos para el modal de despacho
  const [unidades, setUnidades] = useState<UnidadItem[]>([]);
  const [choferes, setChoferes] = useState<MiembroItem[]>([]);

  // Modales
  const [modalDespacho, setModalDespacho] = useState(false);
  const [modalRegreso, setModalRegreso] = useState(false);
  const [salidaARegresar, setSalidaARegresar] = useState<SalidaUnidad | null>(null);

  // Formulario Despacho / Nueva Intervención
  const [incidenteSeleccionadoId, setIncidenteSeleccionadoId] = useState<string>('nuevo');
  const [numeroParte, setNumeroParte] = useState<string>('');
  const [unidadSeleccionadaId, setUnidadSeleccionadaId] = useState<string>('');
  const [choferSeleccionadoId, setChoferSeleccionadoId] = useState<string>('');
  const [recepcionistaId, setRecepcionistaId] = useState<string>('');
  const [recepcionistaNombre, setRecepcionistaNombre] = useState<string>('');
  const [codigoIntervencion, setCodigoIntervencion] = useState<string>('');
  const [tipoSiniestro, setTipoSiniestro] = useState<string>('');
  const [direccion, setDireccion] = useState<string>('');
  const [barrio, setBarrio] = useState<string>('');
  const [telefonoLlamado, setTelefonoLlamado] = useState<string>('');
  const [notaGuardia, setNotaGuardia] = useState<string>('');
  const [horaLlamado, setHoraLlamado] = useState<string>(getHoraActual());
  const [horaSalida, setHoraSalida] = useState<string>(getHoraActual());
  const [kmSalida, setKmSalida] = useState<number | string>(0);
  const [guardandoDespacho, setGuardandoDespacho] = useState(false);

  // Formulario Regreso
  const [horaLlegadaRegreso, setHoraLlegadaRegreso] = useState<string>('');
  const [horaRegreso, setHoraRegreso] = useState<string>(getHoraActual());
  const [kmRegreso, setKmRegreso] = useState<number | string>('');
  const [guardandoRegreso, setGuardandoRegreso] = useState(false);

  // Marcado rápido de llegada en el widget
  const [marcandoLlegadaId, setMarcandoLlegadaId] = useState<string | null>(null);

  // ── Suscripción en tiempo real a salidas_unidades (en_camino | en_lugar) ─────
  useEffect(() => {
    const q = query(
      collection(db, 'salidas_unidades'),
      where('estado', 'in', ['en_camino', 'en_lugar'])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SalidaUnidad, 'id'>),
        }));
        setSalidas(data);
        setCargando(false);
      },
      (error) => {
        console.error('Error al suscribir a salidas activas:', error);
        toast.error('Error al cargar intervenciones activas');
        setCargando(false);
      }
    );

    return () => unsub();
  }, []);

  // ── Cargar catálogos de Unidades y Miembros al abrir modal de despacho ──────
  const cargarCatalogos = async () => {
    try {
      // Unidades
      const snapUnidades = await getDocs(collection(db, 'unidades'));
      const listUnidades: UnidadItem[] = snapUnidades.docs
        .map((d) => ({ id: d.id, ...d.data() } as UnidadItem))
        .filter((u) => u.estado !== 'Fuera de servicio')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
      setUnidades(listUnidades);

      // Consultar usuarios con rol guardia
      const idsUsuariosGuardia = new Set<string>();
      try {
        const snapUsuarios = await getDocs(collection(db, 'usuarios'));
        snapUsuarios.docs.forEach((u) => {
          const uData = u.data();
          const rol = String(uData.rol || '').toLowerCase();
          const roles = Array.isArray(uData.roles) ? uData.roles.map((r: any) => String(r).toLowerCase()) : [];
          if (rol === 'guardia' || roles.includes('guardia')) {
            if (uData.miembroId) idsUsuariosGuardia.add(uData.miembroId);
            idsUsuariosGuardia.add(u.id);
          }
        });
      } catch (err) {
        console.warn('No se pudo consultar usuarios para rol guardia:', err);
      }

      // Miembros activos
      const snapMiembros = await getDocs(collection(db, 'miembros'));
      const listMiembros: MiembroItem[] = snapMiembros.docs
        .map((d) => {
          const data = d.data();
          const rol = String(data.rol || '').toLowerCase();
          const roles = Array.isArray(data.roles) ? data.roles.map((r: any) => String(r).toLowerCase()) : [];
          const esGuardia =
            rol === 'guardia' ||
            roles.includes('guardia') ||
            data.guardia === true ||
            idsUsuariosGuardia.has(d.id);

          return {
            id: d.id,
            ...data,
            esGuardia,
          } as MiembroItem;
        })
        .filter((m) => m.activo !== false)
        .sort((a, b) => {
          const numA = Number(a.ordenOperativo) || 9999;
          const numB = Number(b.ordenOperativo) || 9999;
          if (numA !== numB) return numA - numB;
          return a.apellido.localeCompare(b.apellido, 'es');
        });
      setChoferes(listMiembros);
    } catch (err) {
      console.error('Error cargando catálogos para despacho:', err);
      toast.error('No se pudieron cargar unidades o choferes');
    }
  };

  // ── Opciones Autocompletables ──────────────────────────────────────────────
  const opcionesUnidades: SearchableOption[] = useMemo(() => {
    return unidades.map((u) => ({
      value: u.id,
      label: u.nombre,
      meta: u,
    }));
  }, [unidades]);

  const opcionesChoferes: SearchableOption[] = useMemo(() => {
    return choferes.map((c) => {
      const nombreCompleto = `${c.apellido} ${c.nombre}`;
      return {
        value: c.id,
        label: c.ordenOperativo ? `| ${nombreCompleto}` : nombreCompleto,
        badge: c.ordenOperativo ? `${c.ordenOperativo}` : undefined,
        meta: c,
      };
    });
  }, [choferes]);

  // Opciones de Guardia: Primero miembros con rol de Guardia, luego el resto
  const opcionesGuardia: SearchableOption[] = useMemo(() => {
    const sortFn = (a: MiembroItem, b: MiembroItem) => {
      const numA = Number(a.ordenOperativo) || 9999;
      const numB = Number(b.ordenOperativo) || 9999;
      if (numA !== numB) return numA - numB;
      return a.apellido.localeCompare(b.apellido, 'es');
    };

    const guardias = choferes.filter((c) => c.esGuardia).sort(sortFn);
    const otros = choferes.filter((c) => !c.esGuardia).sort(sortFn);

    const guardiasOpts: SearchableOption[] = guardias.map((c) => {
      const nombreCompleto = `${c.apellido} ${c.nombre}`;
      return {
        value: c.id,
        label: c.ordenOperativo ? `| ${nombreCompleto}` : nombreCompleto,
        badge: c.ordenOperativo ? `${c.ordenOperativo}` : undefined,
        sublabel: 'Guardia',
        meta: c,
      };
    });

    const otrosOpts: SearchableOption[] = otros.map((c) => {
      const nombreCompleto = `${c.apellido} ${c.nombre}`;
      return {
        value: c.id,
        label: c.ordenOperativo ? `| ${nombreCompleto}` : nombreCompleto,
        badge: c.ordenOperativo ? `${c.ordenOperativo}` : undefined,
        meta: c,
      };
    });

    return [...guardiasOpts, ...otrosOpts];
  }, [choferes]);

  const opcionesIntervenciones: SearchableOption[] = useMemo(() => {
    return CODIGOS_INTERVENCION.map((ci: CodigoIntervencion) => ({
      value: ci.codigo,
      label: `| ${ci.descripcion}`,
      sublabel: ci.categoria,
      badge: ci.codigo,
      meta: ci,
    }));
  }, []);

  const handleSelectCodigoIntervencion = (codigo: string, opt?: SearchableOption) => {
    setCodigoIntervencion(codigo);
    if (opt?.meta) {
      const ci = opt.meta as CodigoIntervencion;
      setTipoSiniestro(`${ci.codigo} - ${ci.descripcion}`);
    } else {
      const ci = CODIGOS_INTERVENCION.find((c: CodigoIntervencion) => c.codigo === codigo);
      if (ci) {
        setTipoSiniestro(`${ci.codigo} - ${ci.descripcion}`);
      } else if (codigo) {
        setTipoSiniestro(codigo);
      }
    }
  };

  // Autocompletar kilometraje al seleccionar unidad
  const handleSelectUnidad = (unidadId: string, opt?: SearchableOption) => {
    setUnidadSeleccionadaId(unidadId);
    const u = (opt?.meta as UnidadItem) || unidades.find((item) => item.id === unidadId);
    if (u && u.kilometraje !== undefined && u.kilometraje !== null) {
      const parsedKm = Number(u.kilometraje);
      setKmSalida(isNaN(parsedKm) ? 0 : parsedKm);
    } else {
      setKmSalida(0);
    }
  };

  const handleAbrirDespacho = (incidenteExistente?: IncidenteAgrupado) => {
    cargarCatalogos();
    const ahora = getHoraActual();
    setHoraLlamado(ahora);
    setHoraSalida(ahora);
    setUnidadSeleccionadaId('');
    setChoferSeleccionadoId('');
    setKmSalida(0);
    setNumeroParte('');

    if (incidenteExistente) {
      setIncidenteSeleccionadoId(incidenteExistente.incidenteId);
      setDireccion(incidenteExistente.direccion || '');
      setBarrio(incidenteExistente.barrio || '');
      const cod = formatearCodigoIntervencion(incidenteExistente.tipoSiniestro);
      setCodigoIntervencion(cod);
      setTipoSiniestro(incidenteExistente.tipoSiniestro);
      setTelefonoLlamado(incidenteExistente.telefonoLlamado || '');
      setNotaGuardia(incidenteExistente.notaGuardia || '');
    } else {
      setIncidenteSeleccionadoId('nuevo');
      setDireccion('');
      setBarrio('');
      setCodigoIntervencion('');
      setTipoSiniestro('');
      setTelefonoLlamado('');
      setNotaGuardia('');
    }

    if (miembroActivo) {
      setRecepcionistaId(miembroActivo.id);
      const mObj = choferes.find((c) => c.id === miembroActivo.id);
      const ord = mObj?.ordenOperativo || (miembroActivo as any).ordenOperativo;
      const nom = `${ord ? `${ord} - ` : ''}${miembroActivo.apellido} ${miembroActivo.nombre}`.replace(/^[-\s]+/, '');
      setRecepcionistaNombre(nom);
    } else {
      setRecepcionistaId('');
      setRecepcionistaNombre('');
    }

    setModalDespacho(true);
  };

  // ── Agrupación de salidas por incidenteId ──────────────────────────────────
  const incidentesAgrupados = useMemo(() => {
    return salidas.reduce<Record<string, IncidenteAgrupado>>((acc, salida) => {
      const key = salida.incidenteId || salida.id || 'sin_incidente';
      if (!acc[key]) {
        acc[key] = {
          incidenteId: key,
          direccion: salida.direccion,
          barrio: salida.barrio,
          tipoSiniestro: salida.tipoSiniestro,
          notaGuardia: salida.notaGuardia,
          telefonoLlamado: salida.telefonoLlamado,
          horaLlamado: salida.horaLlamado,
          fecha: salida.fecha,
          salidas: [],
        };
      }
      acc[key].salidas.push(salida);
      return acc;
    }, {});
  }, [salidas]);

  const listaIncidentes = useMemo(() => {
    return Object.values(incidentesAgrupados);
  }, [incidentesAgrupados]);

  // ── Guardar nuevo despacho ─────────────────────────────────────────────────
  const handleGuardarDespacho = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidadSeleccionadaId) {
      toast.error('Debe seleccionar una unidad');
      return;
    }
    if (!choferSeleccionadoId) {
      toast.error('Debe seleccionar un chofer');
      return;
    }
    if (!codigoIntervencion && !tipoSiniestro.trim()) {
      toast.error('Seleccioná el código de intervención');
      return;
    }
    if (!direccion.trim()) {
      toast.error('La dirección de la intervención es obligatoria');
      return;
    }

    const unidadObj = unidades.find((u) => u.id === unidadSeleccionadaId);
    const choferObj = choferes.find((c) => c.id === choferSeleccionadoId);
    const recObj = choferes.find((c) => c.id === recepcionistaId);
    const unidadNombre = unidadObj ? unidadObj.nombre : 'Unidad';
    const choferNombre = choferObj
      ? `${choferObj.ordenOperativo ? `${choferObj.ordenOperativo} - ` : ''}${choferObj.apellido} ${choferObj.nombre}`
      : 'Sin chofer';
    const finalRecepcionistaNombre = recepcionistaNombre || (recObj ? `${recObj.ordenOperativo ? `${recObj.ordenOperativo} - ` : ''}${recObj.apellido} ${recObj.nombre}`.replace(/^[-\s]+/, '') : '');

    const kmSalidaNum = Number(kmSalida) || 0;
    const finalIncidenteId =
      incidenteSeleccionadoId !== 'nuevo'
        ? incidenteSeleccionadoId
        : `INC-${Date.now()}`;

    setGuardandoDespacho(true);
    try {
      const operador = buildOperador(miembroActivo, user?.rol);

      const nuevaSalida: Omit<SalidaUnidad, 'id'> = {
        incidenteId: finalIncidenteId,
        fecha: getFechaHoy(),
        numeroParte: numeroParte.trim() || '',
        direccion: direccion.trim(),
        barrio: barrio.trim(),
        tipoSiniestro,
        telefonoLlamado: telefonoLlamado.trim(),
        notaGuardia: notaGuardia.trim(),
        unidadId: unidadSeleccionadaId,
        unidadNombre,
        choferId: choferSeleccionadoId,
        choferNombre,
        recepcionistaId: recepcionistaId || undefined,
        recepcionistaNombre: finalRecepcionistaNombre || undefined,
        horaLlamado: horaLlamado.trim() || getHoraActual(),
        horaSalida: horaSalida.trim() || getHoraActual(),
        horaLlegada: null,
        horaRegreso: null,
        kmSalida: kmSalidaNum,
        kmRegreso: null,
        kmRecorridos: null,
        origen: 'cuartel',
        estado: 'en_camino',
        createdAt: serverTimestamp(),
      };

      const refDoc = await addDoc(collection(db, 'salidas_unidades'), nuevaSalida);

      await registrarAuditoria({
        accion: 'crear',
        coleccion: 'salidas_unidades',
        docId: refDoc.id,
        docResumen: `Despacho ${unidadNombre} - ${direccion.trim()}`,
        operador,
        detalles: {
          descripcion: `Despacho de ${unidadNombre} por ${tipoSiniestro} a ${direccion.trim()}. Chofer: ${choferNombre}. KM salida: ${kmSalidaNum}.`,
        },
      });

      toast.success(`${unidadNombre} despachada con éxito`);
      setModalDespacho(false);
    } catch (err) {
      console.error('Error al despachar unidad:', err);
      toast.error('Error al registrar la intervención');
    } finally {
      setGuardandoDespacho(false);
    }
  };

  // ── Marcar arribo rápido desde el widget ───────────────────────────────────
  const handleMarcarArribo = async (salida: SalidaUnidad) => {
    if (!salida.id) return;
    const horaActual = getHoraActual();
    setMarcandoLlegadaId(salida.id);
    try {
      const operador = buildOperador(miembroActivo, user?.rol);
      await updateDoc(doc(db, 'salidas_unidades', salida.id), {
        horaLlegada: horaActual,
        estado: 'en_lugar',
      });

      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'salidas_unidades',
        docId: salida.id,
        docResumen: `Arribo de ${salida.unidadNombre} al lugar (${horaActual} hs)`,
        operador,
        detalles: {
          descripcion: `Unidad ${salida.unidadNombre} arribó al lugar de la intervención a las ${horaActual} hs.`,
        },
      });

      toast.success(`${salida.unidadNombre} marcada en el lugar a las ${horaActual} hs`);
    } catch (err) {
      console.error('Error marcando arribo:', err);
      toast.error('Error al marcar arribo');
    } finally {
      setMarcandoLlegadaId(null);
    }
  };

  // ── Abrir modal de regreso ────────────────────────────────────────────────
  const handleAbrirRegreso = (salida: SalidaUnidad) => {
    setSalidaARegresar(salida);
    setHoraLlegadaRegreso(salida.horaLlegada || '');
    setHoraRegreso(getHoraActual());
    setKmRegreso(salida.kmSalida || 0);
    setModalRegreso(true);
  };

  // Cálculo en vivo de KM recorridos
  const kmRecorridosCalculados = useMemo(() => {
    if (!salidaARegresar) return 0;
    const reg = Number(kmRegreso);
    const sal = Number(salidaARegresar.kmSalida) || 0;
    if (isNaN(reg) || reg < sal) return 0;
    return reg - sal;
  }, [kmRegreso, salidaARegresar]);

  const esKmInvalido = useMemo(() => {
    if (!salidaARegresar) return false;
    const reg = Number(kmRegreso);
    const sal = Number(salidaARegresar.kmSalida) || 0;
    return isNaN(reg) || reg < sal;
  }, [kmRegreso, salidaARegresar]);

  // ── Confirmar regreso de unidad ───────────────────────────────────────────
  const handleConfirmarRegreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salidaARegresar || !salidaARegresar.id) return;

    const kmSalidaNum = Number(salidaARegresar.kmSalida) || 0;
    const kmRegresoNum = Number(kmRegreso);

    if (isNaN(kmRegresoNum) || kmRegresoNum < kmSalidaNum) {
      toast.error(
        `El KM de regreso (${kmRegresoNum}) no puede ser menor al de salida (${kmSalidaNum})`
      );
      return;
    }

    setGuardandoRegreso(true);
    try {
      const operador = buildOperador(miembroActivo, user?.rol);
      const kmRecorridosFinal = kmRegresoNum - kmSalidaNum;

      // 1. Actualizar salida a finalizada
      await updateDoc(doc(db, 'salidas_unidades', salidaARegresar.id), {
        estado: 'finalizada',
        horaLlegada: horaLlegadaRegreso.trim() || salidaARegresar.horaLlegada || null,
        horaRegreso: horaRegreso.trim() || getHoraActual(),
        kmRegreso: kmRegresoNum,
        kmRecorridos: kmRecorridosFinal,
      });

      // 2. Actualizar kilometraje de la unidad en la colección "unidades"
      if (salidaARegresar.unidadId) {
        await updateDoc(doc(db, 'unidades', salidaARegresar.unidadId), {
          kilometraje: String(kmRegresoNum),
        });
      }

      // 3. Auditoría
      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'salidas_unidades',
        docId: salidaARegresar.id,
        docResumen: `Regreso ${salidaARegresar.unidadNombre} - ${kmRecorridosFinal} KM`,
        operador,
        detalles: {
          descripcion: `Unidad ${salidaARegresar.unidadNombre} regresó al cuartel a las ${horaRegreso} hs. KM final: ${kmRegresoNum}. KM recorridos: ${kmRecorridosFinal}.`,
        },
      });

      toast.success(
        `Regreso de ${salidaARegresar.unidadNombre} completado (${kmRecorridosFinal} km recorridos)`
      );
      setModalRegreso(false);
      setSalidaARegresar(null);
    } catch (err) {
      console.error('Error al registrar regreso:', err);
      toast.error('Error al registrar el regreso de la unidad');
    } finally {
      setGuardandoRegreso(false);
    }
  };

  return (
    <>
      <div className="widget-card widget-salidas-card">
        {/* Cabecera del Widget */}
        <div className="widget-header">
          <div className="widget-header-title-wrap">
            <h3 className="widget-title">
              <Siren
                size={22}
                className={salidas.length > 0 ? 'siren-icon-activa' : 'siren-icon-inactiva'}
              />
              Intervenciones Activas
            </h3>
            <span
              className={`widget-counter-badge ${salidas.length > 0 ? 'counter-badge-alerta' : ''
                }`}
              title={`${salidas.length} intervenciones activas`}
            >
              {salidas.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleAbrirDespacho()}
            className="btn-nueva-salida-widget"
            title="Despachar nueva unidad"
          >
            <Plus size={16} />
            <span>Nueva Intervención</span>
          </button>
        </div>

        {/* Contenido / Listado */}
        {cargando ? (
          <PageLoader texto="Cargando intervenciones activas..." />
        ) : salidas.length === 0 ? (
          /* Estado Vacío */
          <div className="widget-salidas-empty">
            <div className="salidas-empty-icon-wrap">
              <CheckCircle2 size={28} />
            </div>
            <p className="salidas-empty-text">
              Todas las unidades se encuentran en el cuartel. Sin intervenciones activas.
            </p>
          </div>
        ) : (
          /* Estado con Intervenciones Activas (Agrupadas por incidente) */
          <div className="widget-salidas-scroll">
            {listaIncidentes.map((incidente) => {
              const codigoBadge = formatearCodigoIntervencion(incidente.tipoSiniestro);
              const descIntervencion = obtenerDescripcionIntervencion(incidente.tipoSiniestro);

              return (
                <div key={incidente.incidenteId} className="incidente-card">
                  {/* Cabecera del Incidente */}
                  <div className="incidente-header">
                    <div className="incidente-header-info">
                      <div className="incidente-tag-row">
                        <span className="badge-incidente-alerta">
                          <span className="incidente-pulse-dot" />
                          EN CURSO
                        </span>
                        <span className="badge-incidente-codigo" title={descIntervencion}>
                          {codigoBadge}
                        </span>
                        <span className="badge-incidente-tipo">
                          {descIntervencion}
                        </span>
                      </div>

                      <div className="incidente-direccion-row">
                        <MapPin size={16} className="incidente-pin-icon" />
                        <strong className="incidente-direccion-text">
                          {incidente.direccion}
                        </strong>
                        {incidente.barrio && (
                          <span className="incidente-barrio-tag">
                            B° {incidente.barrio}
                          </span>
                        )}
                      </div>

                      {incidente.notaGuardia && (
                        <div className="incidente-nota-row">
                          <FileText size={13} className="incidente-nota-icon" />
                          <span>{incidente.notaGuardia}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAbrirDespacho(incidente)}
                      className="btn-sumar-unidad"
                      title="Despachar otra unidad a esta misma dirección"
                    >
                      <Plus size={13} />
                      <span>Sumar unidad</span>
                    </button>
                  </div>

                  {/* Lista de unidades asignadas a esta intervención */}
                  <div className="incidente-unidades-wrap">
                    {incidente.salidas.map((salida) => {
                      const enLugar =
                        salida.estado === 'en_lugar' || Boolean(salida.horaLlegada);
                      const marcandoEste = marcandoLlegadaId === salida.id;

                      return (
                        <div key={salida.id} className="unidad-activa-row">
                          {/* Datos de la unidad */}
                          <div className="unidad-activa-datos">
                            <div className="unidad-nombre-row">
                              <Truck size={17} className="unidad-truck-icon" />
                              <span className="unidad-nombre-txt">
                                {salida.unidadNombre}
                              </span>
                              {salida.numeroParte && (
                                <span className="badge-parte-mini">
                                  N° Parte: {salida.numeroParte}
                                </span>
                              )}
                            </div>

                            <div className="unidad-subdatos-row">
                              <span className="unidad-chofer-txt">
                                Chofer: <strong>{salida.choferNombre || 'Sin asignar'}</strong>
                              </span>
                              {salida.recepcionistaNombre && (
                                <>
                                  <span className="unidad-separador">·</span>
                                  <span className="unidad-chofer-txt">
                                    Guardia: <strong>{salida.recepcionistaNombre}</strong>
                                  </span>
                                </>
                              )}
                              <span className="unidad-separador">·</span>
                              <span className="unidad-hora-salida">
                                <Clock size={12} /> Salida: {salida.horaSalida} hs
                              </span>
                            </div>
                          </div>

                          {/* Estado de Arribo & Acción de Regreso */}
                          <div className="unidad-activa-acciones">
                            {enLugar ? (
                              <span className="badge-arribo-lugar">
                                <CheckCircle2 size={14} />
                                <span>
                                  En el lugar {salida.horaLlegada ? `· ${salida.horaLlegada} hs` : ''}
                                </span>
                              </span>
                            ) : (
                              <div className="unidad-arribo-pendiente-wrap">
                                <span className="badge-en-camino">
                                  <Radio size={13} className="radio-pulse" />
                                  <span>En camino</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleMarcarArribo(salida)}
                                  disabled={marcandoEste}
                                  className="btn-marcar-arribo-mini"
                                  title="Marcar que la unidad ya llegó al lugar de la intervención"
                                >
                                  {marcandoEste ? 'Guardando...' : 'Marcar llegada'}
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAbrirRegreso(salida)}
                              className="btn-registrar-regreso"
                              title="Registrar retorno al cuartel y kilometraje"
                            >
                              <CornerDownLeft size={14} />
                              <span>Regreso</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer del Widget */}
        <div className="widget-card-footer widget-salidas-footer">
          <button
            type="button"
            onClick={() => navigate('/guardia/libro-guardia')}
            className="widget-link-btn"
            title="Ir al Libro de Guardia completo con historial de intervenciones"
          >
            Ver Libro de Guardia completo →
          </button>
        </div>
      </div>

      {/* ── MODAL: NUEVA INTERVENCIÓN / DESPACHO ────────────────────────────── */}
      <Modal
        isOpen={modalDespacho}
        onClose={() => setModalDespacho(false)}
        title="Nueva Intervención"
        maxWidth="680px"
        className="modal-despacho-intervencion"
      >
        <form onSubmit={handleGuardarDespacho} className="form-despacho-intervencion">
          {/* Si ya hay intervenciones activas, permitir asociar */}
          {listaIncidentes.length > 0 && (
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>VINCULAR A INTERVENCIÓN EXISTENTE</label>
              </div>
              <select
                className="input-solido"
                value={incidenteSeleccionadoId}
                onChange={(e) => {
                  const val = e.target.value;
                  setIncidenteSeleccionadoId(val);
                  if (val !== 'nuevo') {
                    const inc = listaIncidentes.find((i) => i.incidenteId === val);
                    if (inc) {
                      setDireccion(inc.direccion || '');
                      setBarrio(inc.barrio || '');
                      setTipoSiniestro(inc.tipoSiniestro);
                      setCodigoIntervencion(formatearCodigoIntervencion(inc.tipoSiniestro));
                      setTelefonoLlamado(inc.telefonoLlamado || '');
                      setNotaGuardia(inc.notaGuardia || '');
                    }
                  }
                }}
              >
                <option value="nuevo">Crear Nueva Intervención</option>
                {listaIncidentes.map((inc) => (
                  <option key={inc.incidenteId} value={inc.incidenteId}>
                    Vincular a: {inc.direccion} ({inc.tipoSiniestro})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fila: N° de Parte y Código/Tipo de Intervención */}
          <div className="form-row-solido">
            <div className="form-col-solido" style={{ flex: '0 0 160px' }}>
              <div className="label-wrap-solido">
                <label>N° DE PARTE</label>
              </div>
              <input
                type="text"
                className="input-solido"
                placeholder="Ej: 142/2026"
                value={numeroParte}
                onChange={(e) => setNumeroParte(e.target.value)}
              />
            </div>

            <div className="form-col-solido" style={{ flex: 1 }}>
              <div className="label-wrap-solido">
                <label>TIPO DE INTERVENCIÓN (CÓDIGO OFICIAL) *</label>
              </div>
              <SearchableSelect
                value={codigoIntervencion}
                onChange={handleSelectCodigoIntervencion}
                options={opcionesIntervenciones}
                placeholder="Escribir código o tipo (ej: 01-101, incendio, colisión)..."
                required
              />
            </div>
          </div>

          {/* Fila: Unidad y chofer */}
          <div className="form-row-solido">
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>UNIDAD *</label>
              </div>
              <SearchableSelect
                value={unidadSeleccionadaId}
                onChange={handleSelectUnidad}
                options={opcionesUnidades}
                placeholder="Seleccionar unidad..."
                required
              />
            </div>

            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>CHOFER *</label>
              </div>
              <SearchableSelect
                value={choferSeleccionadoId}
                onChange={(val) => setChoferSeleccionadoId(val)}
                options={opcionesChoferes}
                placeholder="Seleccionar chofer..."
                required
              />
            </div>
          </div>

          {/* Fila: Guardia / Recepción del llamado */}
          <div className="form-row-solido">
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>GUARDIA</label>
              </div>
              <SearchableSelect
                value={recepcionistaId}
                onChange={(val, opt) => {
                  setRecepcionistaId(val);
                  if (opt?.meta) {
                    const m = opt.meta as MiembroItem;
                    setRecepcionistaNombre(`${m.ordenOperativo ? `${m.ordenOperativo} - ` : ''}${m.apellido} ${m.nombre}`.replace(/^[-\s]+/, ''));
                  } else {
                    const m = choferes.find((c) => c.id === val);
                    setRecepcionistaNombre(m ? `${m.ordenOperativo ? `${m.ordenOperativo} - ` : ''}${m.apellido} ${m.nombre}`.replace(/^[-\s]+/, '') : '');
                  }
                }}
                options={opcionesGuardia}
                placeholder="Seleccionar bombero de guardia..."
              />
            </div>
          </div>

          {/* Fila: Dirección y Barrio */}
          <div className="form-row-solido">
            <div className="form-col-solido" style={{ flex: 1.5 }}>
              <div className="label-wrap-solido">
                <label>DIRECCIÓN DE LA INTERVENCIÓN *</label>
              </div>
              <input
                type="text"
                className="input-solido"
                placeholder="Ej: Av. San Martín 1234"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                required
              />
            </div>

            <div className="form-col-solido" style={{ flex: 1 }}>
              <div className="label-wrap-solido">
                <label>BARRIO</label>
              </div>
              <input
                type="text"
                className="input-solido"
                placeholder="Ej: Centro / Los Olmos"
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
              />
            </div>
          </div>

          {/* Fila: Teléfono solicitante y Kilometraje de salida */}
          <div className="form-row-solido">
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>TELÉFONO SOLICITANTE</label>
              </div>
              <input
                type="tel"
                className="input-solido"
                placeholder="Ej: 353-4123456"
                value={telefonoLlamado}
                onChange={(e) => setTelefonoLlamado(e.target.value)}
              />
            </div>

            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>KM DE SALIDA *</label>
              </div>
              <input
                type="number"
                min="0"
                className="input-solido"
                value={kmSalida}
                onChange={(e) => setKmSalida(Number(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          {/* Fila: Horarios: Llamado y Salida */}
          <div className="form-row-solido">
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>HORA DE LLAMADO *</label>
              </div>
              <input
                type="time"
                className="input-solido"
                value={horaLlamado}
                onChange={(e) => setHoraLlamado(e.target.value)}
                required
              />
            </div>

            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>HORA DE SALIDA *</label>
              </div>
              <input
                type="time"
                className="input-solido"
                value={horaSalida}
                onChange={(e) => setHoraSalida(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Nota de Guardia */}
          <div className="form-col-solido">
            <div className="label-wrap-solido">
              <label>NOTA DE GUARDIA</label>
            </div>
            <textarea
              className="input-solido"
              rows={2}
              placeholder="Observaciones iniciales del servicio o datos aportados por el llamado..."
              value={notaGuardia}
              onChange={(e) => setNotaGuardia(e.target.value)}
            />
          </div>

          {/* Botones de Acción */}
          <div className="modal-solido-actions modal-solido-actions--row">
            <button
              type="button"
              className="btn-solido-cancel"
              onClick={() => setModalDespacho(false)}
              disabled={guardandoDespacho}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-solido-primary"
              disabled={guardandoDespacho}
            >
              <Send size={16} />
              <span>{guardandoDespacho ? 'Despachando...' : 'Despachar Unidad'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: REGISTRAR REGRESO ────────────────────────────────────────── */}
      <Modal
        isOpen={modalRegreso}
        onClose={() => {
          setModalRegreso(false);
          setSalidaARegresar(null);
        }}
        title={`Registrar Regreso · ${salidaARegresar?.unidadNombre || 'Unidad'}`}
        maxWidth="540px"
      >
        {salidaARegresar && (
          <form onSubmit={handleConfirmarRegreso} className="form-regreso-salida">
            {/* Resumen de la Unidad y Salida */}
            <div className="regreso-resumen-box">
              <div className="regreso-resumen-col">
                <span className="resumen-label">Unidad</span>
                <strong className="resumen-val">{salidaARegresar.unidadNombre}</strong>
              </div>
              <div className="regreso-resumen-col">
                <span className="resumen-label">Chofer</span>
                <span className="resumen-val">{salidaARegresar.choferNombre || '—'}</span>
              </div>
              <div className="regreso-resumen-col">
                <span className="resumen-label">Dirección</span>
                <span className="resumen-val">{salidaARegresar.direccion}</span>
              </div>
              <div className="regreso-resumen-col">
                <span className="resumen-label">Salida</span>
                <span className="resumen-val">
                  {salidaARegresar.horaSalida} hs ({salidaARegresar.kmSalida} km)
                </span>
              </div>
            </div>

            {/* Hora Llegada (al lugar) */}
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>HORA LLEGADA AL LUGAR (OPCIONAL)</label>
              </div>
              <input
                type="time"
                className="input-solido"
                value={horaLlegadaRegreso}
                onChange={(e) => setHoraLlegadaRegreso(e.target.value)}
                placeholder="--:--"
              />
            </div>

            {/* Hora Regreso a Cuartel */}
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>HORA DE REGRESO AL CUARTEL *</label>
              </div>
              <input
                type="time"
                className="input-solido"
                value={horaRegreso}
                onChange={(e) => setHoraRegreso(e.target.value)}
                required
              />
            </div>

            {/* Kilometraje de Regreso */}
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>KM DE REGRESO *</label>
              </div>
              <input
                type="number"
                min={salidaARegresar.kmSalida}
                className={`input-solido ${esKmInvalido ? 'input-error' : ''}`}
                value={kmRegreso}
                onChange={(e) => setKmRegreso(e.target.value)}
                required
              />
              {esKmInvalido && (
                <span className="error-aviso-km">
                  <AlertCircle size={13} />
                  El KM de regreso no puede ser menor a {salidaARegresar.kmSalida} km.
                </span>
              )}
            </div>

            {/* Cálculo en Vivo de Kilómetros Recorridos */}
            <div className="box-km-calculados">
              <span className="km-calculados-label">Distancia recorrida:</span>
              <strong className="km-calculados-valor">
                {kmRecorridosCalculados} KM
              </strong>
            </div>

            {/* Botones de Acción */}
            <div className="modal-solido-actions modal-solido-actions--row">
              <button
                type="button"
                className="btn-solido-cancel"
                onClick={() => {
                  setModalRegreso(false);
                  setSalidaARegresar(null);
                }}
                disabled={guardandoRegreso}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-solido-primary"
                disabled={guardandoRegreso || esKmInvalido}
              >
                <Check size={16} />
                <span>{guardandoRegreso ? 'Finalizando...' : 'Confirmar Regreso'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
};

export default WidgetSalidasActivas;
