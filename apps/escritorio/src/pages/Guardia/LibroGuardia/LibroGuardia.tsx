// src/pages/Guardia/LibroGuardia/LibroGuardia.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../app/firebase-config';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Calendar,
  Truck,
  Flame,
  Search,
  Filter,
  RotateCcw,
  AlertCircle,
  CornerDownLeft,
  Pencil,
  MoreVertical,
  Trash2,
  Check,
  Plus,
  Send,
} from 'lucide-react';
import Header from '../../../components/Header';
import Modal from '../../../components/Modal';
import PageLoader from '../../../components/PageLoader/PageLoader';
import SearchableSelect, { SearchableOption } from '../../../components/SearchableSelect/SearchableSelect';
import {
  CODIGOS_INTERVENCION,
  CodigoIntervencion,
  formatearCodigoIntervencion,
  obtenerDescripcionIntervencion,
} from '../constants';
import { SalidaUnidad } from '../Dashboard/types';
import './LibroGuardia.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFechaHoy = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getHoraActual = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatearFechaVisual = (fechaStr?: string | null): string => {
  if (!fechaStr) return '—';
  const parts = fechaStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return fechaStr;
};

const formatearUnidadCorta = (nombre?: string | null): string => {
  if (!nombre) return '—';
  return nombre.replace(/unidad\s*/i, 'U').trim();
};

const extraerOrden = (texto?: string | null): string => {
  if (!texto) return '—';
  const partes = texto.split('-');
  return partes[0]?.trim() || texto;
};

interface UnidadItem {
  id: string;
  nombre: string;
  kilometraje?: string | number;
  estado?: string;
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

const LibroGuardia: React.FC = () => {
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();
  const esAdmin = user?.rol === 'admin';

  const [salidas, setSalidas] = useState<SalidaUnidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [limiteRegistros, setLimiteRegistros] = useState<number>(100);

  // Catálogos
  const [unidadesList, setUnidadesList] = useState<string[]>([]);
  const [unidadesFull, setUnidadesFull] = useState<UnidadItem[]>([]);
  const [choferesList, setChoferesList] = useState<MiembroItem[]>([]);

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [filtroUnidad, setFiltroUnidad] = useState<string>('todas');
  const [filtroSiniestro, setFiltroSiniestro] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal para Nueva Intervención
  const [modalNuevaIntervencion, setModalNuevaIntervencion] = useState(false);
  const [nuevaNumeroParte, setNuevaNumeroParte] = useState('');
  const [nuevaUnidadId, setNuevaUnidadId] = useState('');
  const [nuevaChoferId, setNuevaChoferId] = useState('');
  const [nuevaRecepcionistaId, setNuevaRecepcionistaId] = useState('');
  const [nuevaRecepcionistaNombre, setNuevaRecepcionistaNombre] = useState('');
  const [nuevaCodigoIntervencion, setNuevaCodigoIntervencion] = useState('');
  const [nuevaTipoSiniestro, setNuevaTipoSiniestro] = useState('');
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevaBarrio, setNuevaBarrio] = useState('');
  const [nuevaTelefono, setNuevaTelefono] = useState('');
  const [nuevaHoraLlamado, setNuevaHoraLlamado] = useState(getHoraActual());
  const [nuevaHoraSalida, setNuevaHoraSalida] = useState(getHoraActual());
  const [nuevaKmSalida, setNuevaKmSalida] = useState<number | string>(0);
  const [nuevaNotaGuardia, setNuevaNotaGuardia] = useState('');
  const [guardandoNueva, setGuardandoNueva] = useState(false);

  // Modal para Editar Intervención Completa
  const [salidaAEditar, setSalidaAEditar] = useState<SalidaUnidad | null>(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [editNumeroParte, setEditNumeroParte] = useState('');
  const [editCodigoIntervencion, setEditCodigoIntervencion] = useState('');
  const [editTipoSiniestro, setEditTipoSiniestro] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editBarrio, setEditBarrio] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editChoferId, setEditChoferId] = useState('');
  const [editChoferNombre, setEditChoferNombre] = useState('');
  const [editRecepcionistaId, setEditRecepcionistaId] = useState('');
  const [editRecepcionistaNombre, setEditRecepcionistaNombre] = useState('');
  const [editHoraLlamado, setEditHoraLlamado] = useState('');
  const [editHoraSalida, setEditHoraSalida] = useState('');
  const [editHoraLlegada, setEditHoraLlegada] = useState('');
  const [editHoraRegreso, setEditHoraRegreso] = useState('');
  const [editKmSalida, setEditKmSalida] = useState<number | string>(0);
  const [editKmRegreso, setEditKmRegreso] = useState<number | string>('');
  const [editNotaGuardia, setEditNotaGuardia] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Modal para registrar regreso rápido
  const [salidaARegresar, setSalidaARegresar] = useState<SalidaUnidad | null>(null);
  const [modalRegreso, setModalRegreso] = useState(false);
  const [horaLlegadaRegreso, setHoraLlegadaRegreso] = useState('');
  const [horaRegreso, setHoraRegreso] = useState(getHoraActual());
  const [kmRegreso, setKmRegreso] = useState<number | string>('');
  const [guardandoRegreso, setGuardandoRegreso] = useState(false);

  // Modal para confirmar eliminación
  const [salidaAEliminar, setSalidaAEliminar] = useState<SalidaUnidad | null>(null);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Menú flotante de acciones por fila
  const [menuAccionesAbiertoId, setMenuAccionesAbiertoId] = useState<string | null>(null);

  // Cerrar menú de acciones al hacer clic fuera
  useEffect(() => {
    if (!menuAccionesAbiertoId) return;
    const handleClicAfuera = () => {
      setMenuAccionesAbiertoId(null);
    };
    window.addEventListener('click', handleClicAfuera);
    return () => window.removeEventListener('click', handleClicAfuera);
  }, [menuAccionesAbiertoId]);

  // ── Cargar registros del Libro de Guardia ──────────────────────────────────
  const cargarSalidas = useCallback(async () => {
    setCargando(true);
    try {
      const q = query(
        collection(db, 'salidas_unidades'),
        orderBy('fecha', 'desc'),
        limit(limiteRegistros)
      );

      const snap = await getDocs(q);
      const data: SalidaUnidad[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SalidaUnidad, 'id'>),
      }));

      // Extraer nombres únicos de unidades para el filtro
      const setU = new Set<string>();
      data.forEach((s) => {
        if (s.unidadNombre) setU.add(s.unidadNombre);
      });
      setUnidadesList(Array.from(setU).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })));

      setSalidas(data);
    } catch (err) {
      console.error('Error al cargar salidas del libro de guardia:', err);
      toast.error('Error al cargar el libro de guardia');
    } finally {
      setCargando(false);
    }
  }, [limiteRegistros]);

  useEffect(() => {
    cargarSalidas();
  }, [cargarSalidas]);

  // ── Cargar Unidades y Choferes para modales ────────────────────────────────
  const cargarCatalogos = async () => {
    try {
      const snapU = await getDocs(collection(db, 'unidades'));
      const listU = snapU.docs
        .map((d) => ({ id: d.id, ...d.data() } as UnidadItem))
        .filter((u) => u.estado !== 'Fuera de servicio')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
      setUnidadesFull(listU);

      // Consultar usuarios con rol guardia si existen
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

      const snapM = await getDocs(collection(db, 'miembros'));
      const listM = snapM.docs
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
      setChoferesList(listM);
    } catch (err) {
      console.error('Error cargando catalogos:', err);
    }
  };

  // ── Opciones para SearchableSelect de Nueva Intervención ───────────────────
  const opcionesUnidadesNueva = useMemo(() => {
    return unidadesFull.map((u) => ({
      value: u.id,
      label: u.nombre,
      sublabel: u.kilometraje ? `${u.kilometraje} km` : '0 km',
      badge: u.estado || 'Operativa',
      meta: u,
    }));
  }, [unidadesFull]);

  const opcionesChoferesNueva = useMemo(() => {
    return choferesList.map((c) => {
      const nombreCompleto = `${c.apellido} ${c.nombre}`;
      return {
        value: c.id,
        label: c.ordenOperativo ? `| ${nombreCompleto}` : nombreCompleto,
        badge: c.ordenOperativo ? `${c.ordenOperativo}` : undefined,
        meta: c,
      };
    });
  }, [choferesList]);

  // Opciones de Guardia: Primero miembros con rol de Guardia, luego el resto
  const opcionesGuardiaNueva = useMemo(() => {
    const sortFn = (a: MiembroItem, b: MiembroItem) => {
      const numA = Number(a.ordenOperativo) || 9999;
      const numB = Number(b.ordenOperativo) || 9999;
      if (numA !== numB) return numA - numB;
      return a.apellido.localeCompare(b.apellido, 'es');
    };

    const guardias = choferesList.filter((c) => c.esGuardia).sort(sortFn);
    const otros = choferesList.filter((c) => !c.esGuardia).sort(sortFn);

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
  }, [choferesList]);

  const opcionesIntervenciones = useMemo(() => {
    return CODIGOS_INTERVENCION.map((ci: CodigoIntervencion) => ({
      value: ci.codigo,
      label: `| ${ci.descripcion}`,
      sublabel: ci.categoria,
      badge: ci.codigo,
      meta: ci,
    }));
  }, []);

  const handleAbrirNuevaIntervencion = () => {
    cargarCatalogos();
    const ahora = getHoraActual();
    setNuevaNumeroParte('');
    setNuevaUnidadId('');
    setNuevaChoferId('');
    setNuevaCodigoIntervencion('');
    setNuevaTipoSiniestro('');
    setNuevaDireccion('');
    setNuevaBarrio('');
    setNuevaTelefono('');
    setNuevaHoraLlamado(ahora);
    setNuevaHoraSalida(ahora);
    setNuevaKmSalida(0);
    setNuevaNotaGuardia('');

    if (miembroActivo) {
      setNuevaRecepcionistaId(miembroActivo.id);
      const mMatch = choferesList.find((m) => m.id === miembroActivo.id);
      const orden = mMatch?.ordenOperativo || (miembroActivo as any).ordenOperativo;
      const nom = `${orden ? `${orden} - ` : ''}${miembroActivo.apellido} ${miembroActivo.nombre}`.replace(/^[-\s]+/, '');
      setNuevaRecepcionistaNombre(nom);
    } else {
      setNuevaRecepcionistaId('');
      setNuevaRecepcionistaNombre('');
    }

    setModalNuevaIntervencion(true);
  };

  const handleSelectUnidadNueva = (id: string, opt?: SearchableOption) => {
    setNuevaUnidadId(id);
    const u = (opt?.meta as UnidadItem) || unidadesFull.find((item) => item.id === id);
    if (u && u.kilometraje !== undefined && u.kilometraje !== null) {
      const parsedKm = Number(u.kilometraje);
      setNuevaKmSalida(isNaN(parsedKm) ? 0 : parsedKm);
    } else {
      setNuevaKmSalida(0);
    }
  };

  const handleGuardarNuevaIntervencion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaUnidadId) {
      toast.error('Debe seleccionar una unidad');
      return;
    }
    if (!nuevaChoferId) {
      toast.error('Debe seleccionar un chofer');
      return;
    }
    if (!nuevaCodigoIntervencion && !nuevaTipoSiniestro.trim()) {
      toast.error('Seleccioná el código de intervención');
      return;
    }
    if (!nuevaDireccion.trim()) {
      toast.error('La dirección de la intervención es obligatoria');
      return;
    }

    const unidadObj = unidadesFull.find((u) => u.id === nuevaUnidadId);
    const choferObj = choferesList.find((c) => c.id === nuevaChoferId);
    const recObj = choferesList.find((c) => c.id === nuevaRecepcionistaId);
    const unidadNombre = unidadObj ? unidadObj.nombre : 'Unidad';
    const choferNombre = choferObj
      ? `${choferObj.ordenOperativo ? `${choferObj.ordenOperativo} - ` : ''}${choferObj.apellido} ${choferObj.nombre}`
      : 'Sin chofer';
    const recepcionistaNombreFinal = nuevaRecepcionistaNombre || (recObj ? `${recObj.ordenOperativo ? `${recObj.ordenOperativo} - ` : ''}${recObj.apellido} ${recObj.nombre}`.replace(/^[-\s]+/, '') : '');

    const kmSalidaNum = Number(nuevaKmSalida) || 0;
    const incidenteId = `INC-${Date.now()}`;

    setGuardandoNueva(true);
    try {
      const operador = buildOperador(miembroActivo, user?.rol);

      const nuevaSalida: Omit<SalidaUnidad, 'id'> = {
        incidenteId,
        fecha: getFechaHoy(),
        numeroParte: nuevaNumeroParte.trim() || '',
        direccion: nuevaDireccion.trim(),
        barrio: nuevaBarrio.trim(),
        tipoSiniestro: nuevaTipoSiniestro,
        telefonoLlamado: nuevaTelefono.trim(),
        notaGuardia: nuevaNotaGuardia.trim(),
        unidadId: nuevaUnidadId,
        unidadNombre,
        choferId: nuevaChoferId,
        choferNombre,
        recepcionistaId: nuevaRecepcionistaId || undefined,
        recepcionistaNombre: recepcionistaNombreFinal || undefined,
        horaLlamado: nuevaHoraLlamado.trim() || getHoraActual(),
        horaSalida: nuevaHoraSalida.trim() || getHoraActual(),
        horaLlegada: null,
        horaRegreso: null,
        kmSalida: kmSalidaNum,
        kmRegreso: null,
        kmRecorridos: null,
        origen: 'cuartel',
        estado: 'en_camino',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'salidas_unidades'), nuevaSalida);

      await registrarAuditoria({
        accion: 'crear',
        coleccion: 'salidas_unidades',
        docId: docRef.id,
        docResumen: `Intervención ${unidadNombre} - ${nuevaDireccion.trim()}`,
        operador,
        detalles: {
          descripcion: `Nueva intervención registrada desde el Libro de Guardia. Unidad: ${unidadNombre}, Dirección: ${nuevaDireccion.trim()}.`,
        },
      });

      toast.success(`Intervención de ${unidadNombre} despachada con éxito`);
      setModalNuevaIntervencion(false);
      cargarSalidas();
    } catch (err) {
      console.error('Error al crear intervención:', err);
      toast.error('Error al registrar la intervención');
    } finally {
      setGuardandoNueva(false);
    }
  };

  // ── Filtrado de datos ──────────────────────────────────────────────────────
  const salidasFiltradas = useMemo(() => {
    return salidas.filter((s) => {
      if (filtroFecha && s.fecha !== filtroFecha) return false;
      if (filtroUnidad !== 'todas' && s.unidadNombre !== filtroUnidad) return false;
      if (filtroSiniestro !== 'todos' && !s.tipoSiniestro.includes(filtroSiniestro)) return false;
      if (filtroEstado !== 'todos' && s.estado !== filtroEstado) return false;

      if (busqueda.trim()) {
        const term = busqueda.toLowerCase().trim();
        const coincide =
          (s.direccion && s.direccion.toLowerCase().includes(term)) ||
          (s.barrio && s.barrio.toLowerCase().includes(term)) ||
          (s.choferNombre && s.choferNombre.toLowerCase().includes(term)) ||
          (s.numeroParte && s.numeroParte.toLowerCase().includes(term)) ||
          (s.unidadNombre && s.unidadNombre.toLowerCase().includes(term)) ||
          (s.tipoSiniestro && s.tipoSiniestro.toLowerCase().includes(term)) ||
          (s.telefonoLlamado && s.telefonoLlamado.toLowerCase().includes(term)) ||
          (s.notaGuardia && s.notaGuardia.toLowerCase().includes(term));

        if (!coincide) return false;
      }

      return true;
    });
  }, [salidas, filtroFecha, filtroUnidad, filtroSiniestro, filtroEstado, busqueda]);

  const hayFiltrosActivos = useMemo(() => {
    return (
      Boolean(filtroFecha) ||
      filtroUnidad !== 'todas' ||
      filtroSiniestro !== 'todos' ||
      filtroEstado !== 'todos' ||
      Boolean(busqueda.trim())
    );
  }, [filtroFecha, filtroUnidad, filtroSiniestro, filtroEstado, busqueda]);

  const handleLimpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroUnidad('todas');
    setFiltroSiniestro('todos');
    setFiltroEstado('todos');
    setBusqueda('');
  };

  // ── Exportación a Excel ────────────────────────────────────────────────────
  const exportarAExcel = () => {
    if (salidasFiltradas.length === 0) {
      toast.error('No hay registros para exportar con los filtros seleccionados');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      const datos = salidasFiltradas.map((s, idx) => ({
        'N°': idx + 1,
        'Fecha': s.fecha || '—',
        'N° Teléfono': s.telefonoLlamado || '—',
        'Cód. Intervención': formatearCodigoIntervencion(s.tipoSiniestro),
        'Tipo de Intervención': obtenerDescripcionIntervencion(s.tipoSiniestro),
        'Dirección': `${s.direccion || ''}${s.barrio ? ` (B° ${s.barrio})` : ''}`,
        'Unidad': s.unidadNombre || '—',
        'Chofer': s.choferNombre || '—',
        'H. Llamado': s.horaLlamado || '—',
        'H. Salida': s.horaSalida || '—',
        'H. Arribo': s.horaLlegada || '—',
        'H. Regreso': s.horaRegreso || '—',
        'KM Salida': s.kmSalida ?? '—',
        'KM Regreso': s.kmRegreso ?? '—',
        'KM Recorridos': s.kmRecorridos !== null && s.kmRecorridos !== undefined ? s.kmRecorridos : '—',
        'Guardia Receptor': s.recepcionistaNombre || '—',
        'N° de Parte': s.numeroParte || '—',
        'Estado':
          s.estado === 'en_camino'
            ? 'En camino'
            : s.estado === 'en_lugar'
              ? 'En el lugar'
              : s.estado === 'finalizada'
                ? 'Finalizada'
                : s.estado,
        'Nota de Guardia': s.notaGuardia || '',
      }));

      const ws = XLSX.utils.json_to_sheet(datos);

      ws['!cols'] = [
        { wch: 6 },  // N°
        { wch: 12 }, // Fecha
        { wch: 16 }, // N° Teléfono
        { wch: 16 }, // Cód. Intervención
        { wch: 30 }, // Tipo de Intervención
        { wch: 32 }, // Dirección
        { wch: 16 }, // Unidad
        { wch: 24 }, // Chofer
        { wch: 12 }, // H. Llamado
        { wch: 12 }, // H. Salida
        { wch: 12 }, // H. Arribo
        { wch: 12 }, // H. Regreso
        { wch: 12 }, // KM Salida
        { wch: 12 }, // KM Regreso
        { wch: 14 }, // KM Recorridos
        { wch: 24 }, // Guardia Receptor
        { wch: 14 }, // N° de Parte
        { wch: 14 }, // Estado
        { wch: 35 }, // Nota de Guardia
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Libro de Guardia');
      const nombreArchivo = `Libro_Guardia_Intervenciones_${filtroFecha || getFechaHoy()}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
      toast.success(`Exportados ${datos.length} registros a ${nombreArchivo}`);
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      toast.error('Error al generar el archivo Excel');
    }
  };

  // ── Modal de Edición Completa de Intervención ──────────────────────────────
  const handleAbrirEditar = (salida: SalidaUnidad) => {
    cargarCatalogos();
    setSalidaAEditar(salida);
    setEditNumeroParte(salida.numeroParte || '');
    setEditDireccion(salida.direccion || '');
    setEditBarrio(salida.barrio || '');
    setEditTelefono(salida.telefonoLlamado || '');
    const cod = formatearCodigoIntervencion(salida.codigoIntervencion || salida.tipoSiniestro);
    setEditCodigoIntervencion(cod);
    setEditTipoSiniestro(salida.tipoSiniestro || '');

    setEditChoferId(salida.choferId || '');
    setEditChoferNombre(salida.choferNombre || '');
    if (!salida.choferId && salida.choferNombre) {
      const ordenCh = salida.choferNombre.split('-')[0].trim();
      const matchCh = choferesList.find((c) => String(c.ordenOperativo) === ordenCh);
      if (matchCh) setEditChoferId(matchCh.id);
    }

    setEditRecepcionistaId(salida.recepcionistaId || '');
    setEditRecepcionistaNombre(salida.recepcionistaNombre || '');
    if (!salida.recepcionistaId && salida.recepcionistaNombre) {
      const ordenRec = salida.recepcionistaNombre.split('-')[0].trim();
      const matchRec = choferesList.find((c) => String(c.ordenOperativo) === ordenRec);
      if (matchRec) setEditRecepcionistaId(matchRec.id);
    }

    setEditHoraLlamado(salida.horaLlamado || '');
    setEditHoraSalida(salida.horaSalida || '');
    setEditHoraLlegada(salida.horaLlegada || '');
    setEditHoraRegreso(salida.horaRegreso || '');
    setEditKmSalida(salida.kmSalida || 0);
    setEditKmRegreso(salida.kmRegreso !== null && salida.kmRegreso !== undefined ? salida.kmRegreso : '');
    setEditNotaGuardia(salida.notaGuardia || '');
    setModalEditar(true);
  };

  const editKmRecorridosCalc = useMemo(() => {
    const sal = Number(editKmSalida) || 0;
    const reg = Number(editKmRegreso);
    if (isNaN(reg) || reg < sal) return null;
    return reg - sal;
  }, [editKmSalida, editKmRegreso]);

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salidaAEditar?.id) return;

    if (!editDireccion.trim()) {
      toast.error('La dirección de la intervención es obligatoria');
      return;
    }
    if (!editCodigoIntervencion && !editTipoSiniestro.trim()) {
      toast.error('Seleccioná el código de intervención');
      return;
    }

    setGuardandoEdicion(true);
    try {
      const operador = buildOperador(miembroActivo, user?.rol);

      const salNum = Number(editKmSalida) || 0;
      const regNum = editKmRegreso !== '' ? Number(editKmRegreso) : null;
      const recNum = regNum !== null && regNum >= salNum ? regNum - salNum : null;

      const chObj = choferesList.find((c) => c.id === editChoferId);
      const recObj = choferesList.find((c) => c.id === editRecepcionistaId);
      const finalChoferNombre = editChoferNombre || (chObj ? `${chObj.ordenOperativo ? `${chObj.ordenOperativo} - ` : ''}${chObj.apellido} ${chObj.nombre}`.replace(/^[-\s]+/, '') : '');
      const finalRecepcionistaNombre = editRecepcionistaNombre || (recObj ? `${recObj.ordenOperativo ? `${recObj.ordenOperativo} - ` : ''}${recObj.apellido} ${recObj.nombre}`.replace(/^[-\s]+/, '') : '');

      const updateData: Partial<SalidaUnidad> = {
        numeroParte: editNumeroParte.trim(),
        direccion: editDireccion.trim(),
        barrio: editBarrio.trim(),
        telefonoLlamado: editTelefono.trim(),
        codigoIntervencion: editCodigoIntervencion || undefined,
        tipoSiniestro: editTipoSiniestro.trim(),
        choferId: editChoferId || null,
        choferNombre: finalChoferNombre.trim() || null,
        recepcionistaId: editRecepcionistaId || null,
        recepcionistaNombre: finalRecepcionistaNombre.trim() || null,
        horaLlamado: editHoraLlamado.trim() || salidaAEditar.horaLlamado,
        horaSalida: editHoraSalida.trim() || salidaAEditar.horaSalida,
        horaLlegada: editHoraLlegada.trim() || null,
        horaRegreso: editHoraRegreso.trim() || null,
        kmSalida: salNum,
        kmRegreso: regNum,
        kmRecorridos: recNum,
        notaGuardia: editNotaGuardia.trim(),
      };

      await updateDoc(doc(db, 'salidas_unidades', salidaAEditar.id), updateData);

      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'salidas_unidades',
        docId: salidaAEditar.id,
        docResumen: `Edición de Intervención ${salidaAEditar.unidadNombre} - ${editDireccion}`,
        operador,
        detalles: {
          descripcion: `Modificó intervención: Dir: ${editDireccion}, Tipo: ${editTipoSiniestro}, N° parte: ${editNumeroParte}, Chofer: ${finalChoferNombre}, Horas y Kilometrajes.`,
        },
      });

      setSalidas((prev) =>
        prev.map((s) => (s.id === salidaAEditar.id ? { ...s, ...updateData } : s))
      );

      toast.success('Intervención actualizada correctamente');
      setModalEditar(false);
      setSalidaAEditar(null);
    } catch (err) {
      console.error('Error al editar intervención:', err);
      toast.error('Error al guardar cambios');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // ── Modal de Regreso Rápido desde la Tabla ─────────────────────────────────
  const handleAbrirRegresoDesdeTabla = (salida: SalidaUnidad) => {
    setSalidaARegresar(salida);
    setHoraLlegadaRegreso(salida.horaLlegada || '');
    setHoraRegreso(getHoraActual());
    setKmRegreso(salida.kmSalida || 0);
    setModalRegreso(true);
  };

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

  const handleConfirmarRegresoDesdeTabla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salidaARegresar?.id) return;

    const kmSalidaNum = Number(salidaARegresar.kmSalida) || 0;
    const kmRegresoNum = Number(kmRegreso);

    if (isNaN(kmRegresoNum) || kmRegresoNum < kmSalidaNum) {
      toast.error('El KM de regreso no puede ser menor al de salida');
      return;
    }

    setGuardandoRegreso(true);
    try {
      const operador = buildOperador(miembroActivo, user?.rol);
      const kmRecorridosFinal = kmRegresoNum - kmSalidaNum;
      const horaRegresoFinal = horaRegreso.trim() || getHoraActual();

      await updateDoc(doc(db, 'salidas_unidades', salidaARegresar.id), {
        estado: 'finalizada',
        horaLlegada: horaLlegadaRegreso.trim() || salidaARegresar.horaLlegada || null,
        horaRegreso: horaRegresoFinal,
        kmRegreso: kmRegresoNum,
        kmRecorridos: kmRecorridosFinal,
      });

      if (salidaARegresar.unidadId) {
        await updateDoc(doc(db, 'unidades', salidaARegresar.unidadId), {
          kilometraje: String(kmRegresoNum),
        });
      }

      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'salidas_unidades',
        docId: salidaARegresar.id,
        docResumen: `Regreso ${salidaARegresar.unidadNombre} - ${kmRecorridosFinal} KM`,
        operador,
        detalles: {
          descripcion: `Unidad ${salidaARegresar.unidadNombre} regresó a las ${horaRegresoFinal} hs. KM final: ${kmRegresoNum}.`,
        },
      });

      setSalidas((prev) =>
        prev.map((s) =>
          s.id === salidaARegresar.id
            ? {
              ...s,
              estado: 'finalizada',
              horaLlegada: horaLlegadaRegreso.trim() || salidaARegresar.horaLlegada || null,
              horaRegreso: horaRegresoFinal,
              kmRegreso: kmRegresoNum,
              kmRecorridos: kmRecorridosFinal,
            }
            : s
        )
      );

      toast.success(`Regreso de ${salidaARegresar.unidadNombre} registrado con éxito`);
      setModalRegreso(false);
      setSalidaARegresar(null);
    } catch (err) {
      console.error('Error al registrar regreso:', err);
      toast.error('Error al guardar el regreso');
    } finally {
      setGuardandoRegreso(false);
    }
  };

  // ── Eliminación de Registro de Intervención ───────────────────────────────
  const handleAbrirEliminar = (salida: SalidaUnidad) => {
    if (!esAdmin) {
      toast.error('Solo un administrador puede eliminar registros');
      return;
    }
    setSalidaAEliminar(salida);
    setModalEliminar(true);
  };

  const handleConfirmarEliminar = async () => {
    if (!esAdmin) {
      toast.error('Solo un administrador puede eliminar registros');
      return;
    }
    if (!salidaAEliminar?.id) return;
    setEliminando(true);
    try {
      const operador = buildOperador(miembroActivo, user?.rol);

      await deleteDoc(doc(db, 'salidas_unidades', salidaAEliminar.id));

      await registrarAuditoria({
        accion: 'eliminar',
        coleccion: 'salidas_unidades',
        docId: salidaAEliminar.id,
        docResumen: `Eliminación intervención ${salidaAEliminar.unidadNombre} - ${salidaAEliminar.direccion}`,
        operador,
        detalles: {
          descripcion: `Se eliminó el registro de intervención de la unidad ${salidaAEliminar.unidadNombre} con fecha ${formatearFechaVisual(salidaAEliminar.fecha)} y dirección ${salidaAEliminar.direccion}.`,
        },
      });

      // Remover del estado local para actualización inmediata
      setSalidas((prev) => prev.filter((s) => s.id !== salidaAEliminar.id));

      toast.success('Intervención eliminada');
      setModalEliminar(false);
      setSalidaAEliminar(null);
    } catch (err) {
      console.error('Error al eliminar intervención:', err);
      toast.error('Error al eliminar la intervención');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="libro-guardia-page-wrapper">
      {/* Header Institucional con "+ Nueva Intervención" y "Exportar a Excel" */}
      <Header
        title="Registro de Intervenciones"
        onBack={() => navigate('/guardia')}
        extraButtons={[
          {
            key: 'btn-nueva-intervencion',
            label: 'Nueva Intervención',
            icon: Plus,
            onClick: handleAbrirNuevaIntervencion,
            className: 'header-btn-nueva-intervencion',
            title: 'Registrar una nueva intervención',
          },
          {
            key: 'btn-exportar-excel',
            label: '',
            icon: FileSpreadsheet,
            onClick: exportarAExcel,
            className: 'header-btn-excel-libro',
            title: 'Exportar los datos del registro de intervenciones',
          },
        ]}
      />

      <div className="libro-guardia-container">
        {/* Barra de Filtros */}
        <div className="libro-filtros-card">
          <div className="filtros-grid">
            {/* Filtro Fecha */}
            <div className="filtro-item">
              <label className="filtro-label">
                <Calendar size={13} />
                <span>FECHA</span>
              </label>
              <div className="filtro-fecha-wrap">
                <input
                  type="date"
                  className="input-filtro"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                />
                <button
                  type="button"
                  className={`btn-pill-filtro ${filtroFecha === getFechaHoy() ? 'btn-pill-active' : ''}`}
                  onClick={() => setFiltroFecha(getFechaHoy())}
                  title="Filtrar por las intervenciones de hoy"
                >
                  Hoy
                </button>
                {filtroFecha && (
                  <button
                    type="button"
                    className="btn-pill-filtro"
                    onClick={() => setFiltroFecha('')}
                    title="Ver todas las fechas"
                  >
                    Todas
                  </button>
                )}
              </div>
            </div>

            {/* Filtro Unidad */}
            <div className="filtro-item">
              <label className="filtro-label">
                <Truck size={13} />
                <span>UNIDAD</span>
              </label>
              <select
                className="input-filtro"
                value={filtroUnidad}
                onChange={(e) => setFiltroUnidad(e.target.value)}
              >
                <option value="todas">Todas las unidades</option>
                {unidadesList.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Tipo de Siniestro */}
            <div className="filtro-item">
              <label className="filtro-label">
                <Flame size={13} />
                <span>INTERVENCIÓN</span>
              </label>
              <select
                className="input-filtro"
                value={filtroSiniestro}
                onChange={(e) => setFiltroSiniestro(e.target.value)}
              >
                <option value="todos">Todas las intervenciones</option>
                {CODIGOS_INTERVENCION.map((ci: CodigoIntervencion) => (
                  <option key={ci.codigo} value={ci.codigo}>
                    {ci.codigo} · {ci.descripcion}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Estado */}
            <div className="filtro-item">
              <label className="filtro-label">
                <Filter size={13} />
                <span>ESTADO</span>
              </label>
              <select
                className="input-filtro"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="en_camino">En calle (En camino)</option>
                <option value="en_lugar">En el lugar</option>
                <option value="finalizada">Finalizada (En base)</option>
              </select>
            </div>

            {/* Buscador General */}
            <div className="filtro-item filtro-item-busqueda">
              <label className="filtro-label">
                <Search size={13} />
                <span>BUSCADOR GENERAL</span>
              </label>
              <div className="input-busqueda-wrap">
                <input
                  type="text"
                  className="input-filtro input-busqueda"
                  placeholder="Dirección, chofer, N° parte, teléfono o unidad..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button
                    type="button"
                    className="btn-limpiar-busqueda"
                    onClick={() => setBusqueda('')}
                    title="Limpiar búsqueda"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Barra inferior de estado de filtros */}
          <div className="filtros-footer">
            <span className="filtros-conteo-txt">
              Mostrando <strong>{salidasFiltradas.length}</strong> de {salidas.length} intervenciones
            </span>

            {hayFiltrosActivos && (
              <button
                type="button"
                className="btn-reset-filtros"
                onClick={handleLimpiarFiltros}
              >
                <RotateCcw size={13} />
                <span>Restablecer filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabla Cronológica - Sin scroll horizontal (100% de ancho adaptado) */}
        <div className="libro-tabla-card">
          {cargando ? (
            <PageLoader texto="Cargando registros del Libro de Guardia..." />
          ) : salidasFiltradas.length === 0 ? (
            <div className="libro-empty-box">
              <AlertCircle size={32} className="libro-empty-icon" />
              <p className="libro-empty-title">No se encontraron intervenciones con los filtros aplicados</p>
              <p className="libro-empty-sub">
                Intentá modificar la fecha, unidad o términos de búsqueda.
              </p>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  className="btn-solido-cancel"
                  onClick={handleLimpiarFiltros}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="tabla-clean-fit-wrap tabla-libro-wrap">
              <table className="tabla-libro-guardia libro-tabla-fit">
                <thead>
                  <tr>
                    <th className="th-fecha">FECHA</th>
                    <th className="th-llamante">N° TELÉFONO</th>
                    <th className="th-intervencion">INTERVENCIÓN</th>
                    <th className="th-direccion">DIRECCIÓN / BARRIO</th>
                    <th className="th-h-llam text-center">H. LLAM.</th>
                    <th className="th-h-sal text-center">H. SAL.</th>
                    <th className="th-h-lleg text-center">H. LLEG.</th>
                    <th className="th-h-reg text-center">H. REG.</th>
                    <th className="th-unidad text-center">UNIDAD</th>
                    <th className="th-chofer text-center">CHOFER</th>
                    <th className="th-km-sal text-center">KM SAL.</th>
                    <th className="th-km-reg text-center">KM REG.</th>
                    <th className="th-km-tot text-center">KM TOT.</th>
                    <th className="th-guardia text-center">GUARDIA</th>
                    <th className="th-parte text-center">N° PARTE</th>
                    <th className="th-estado-acciones"></th>
                  </tr>
                </thead>
                <tbody>
                  {salidasFiltradas.map((salida) => {
                    const enCalle = salida.estado === 'en_camino';
                    const enLugar = salida.estado === 'en_lugar';

                    const codigoNumerico = formatearCodigoIntervencion(
                      salida.codigoIntervencion || salida.tipoSiniestro
                    );
                    const esCodigoOficial = /^\d{2}-\d{3}$/.test(codigoNumerico);
                    const descripcionTexto = obtenerDescripcionIntervencion(salida.tipoSiniestro);
                    const tituloIntervencion = descripcionTexto
                      ? (esCodigoOficial ? `${codigoNumerico} - ${descripcionTexto}` : descripcionTexto)
                      : (salida.tipoSiniestro || codigoNumerico || '');

                    const kmTotalesTexto = salida.kmRecorridos != null
                      ? `${salida.kmRecorridos} km`
                      : (salida.kmRegreso != null && salida.kmSalida != null
                          ? `${Number(salida.kmRegreso) - Number(salida.kmSalida)} km`
                          : '—');

                    return (
                      <tr key={salida.id} className={`fila-salida-fit fila-estado-${salida.estado}`}>
                        {/* 1. FECHA */}
                        <td className="td-fecha">
                          <span className="txt-fecha-compacta">{formatearFechaVisual(salida.fecha)}</span>
                        </td>

                        {/* 2. N° TELÉFONO */}
                        <td className="td-llamante">
                          {salida.telefonoLlamado ? (
                            <span className="txt-telefono">{salida.telefonoLlamado}</span>
                          ) : (
                            <span className="txt-muted">—</span>
                          )}
                        </td>

                        {/* 3. INTERVENCIÓN: Solo badge con código numérico */}
                        <td className="td-intervencion">
                          {esCodigoOficial ? (
                            <span className="badge-codigo-solo" title={tituloIntervencion}>
                              {codigoNumerico}
                            </span>
                          ) : (
                            <span className="badge-codigo-legacy" title={tituloIntervencion}>
                              {salida.tipoSiniestro || '—'}
                            </span>
                          )}
                        </td>

                        {/* 4. DIRECCIÓN / BARRIO */}
                        <td className="td-direccion">
                          <div className="dir-fit-wrap">
                            <span className="dir-calle-bold">{salida.direccion || '—'}</span>
                            {salida.barrio && (
                              <span className="dir-barrio-sub">B° {salida.barrio}</span>
                            )}
                          </div>
                        </td>

                        {/* 5. H. LLAM. */}
                        <td className="td-h-llam text-center">
                          <span className="horario-val">{salida.horaLlamado || '—'}</span>
                        </td>

                        {/* 6. H. SAL. */}
                        <td className="td-h-sal text-center">
                          <span className="horario-val">{salida.horaSalida || '—'}</span>
                        </td>

                        {/* 7. H. LLEG. (ámbar si tiene dato) */}
                        <td className="td-h-lleg text-center">
                          <span className={`horario-val ${salida.horaLlegada ? 'horario-val--llegada' : 'txt-muted'}`}>
                            {salida.horaLlegada || '—'}
                          </span>
                        </td>

                        {/* 8. H. REG. (verde si tiene dato) */}
                        <td className="td-h-reg text-center">
                          <span className={`horario-val ${salida.horaRegreso ? 'horario-val--regreso' : 'txt-muted'}`}>
                            {salida.horaRegreso || '—'}
                          </span>
                        </td>

                        {/* 9. UNIDAD (U3, U16 en negrita) */}
                        <td className="td-unidad text-center">
                          <strong className="unidad-nombre-fit">{formatearUnidadCorta(salida.unidadNombre)}</strong>
                        </td>

                        {/* 10. CHOFER (Solo orden centrado con title completo) */}
                        <td className="td-chofer text-center">
                          <span
                            className="txt-orden"
                            title={salida.choferNombre || 'Sin asignar'}
                          >
                            {extraerOrden(salida.choferNombre)}
                          </span>
                        </td>

                        {/* 11. KM SAL. */}
                        <td className="td-km-sal text-center">
                          <span className="km-val">{salida.kmSalida != null ? salida.kmSalida : '—'}</span>
                        </td>

                        {/* 12. KM REG. */}
                        <td className="td-km-reg text-center">
                          <span className="km-val">{salida.kmRegreso != null ? salida.kmRegreso : '—'}</span>
                        </td>

                        {/* 13. KM TOT. (negrita verde) */}
                        <td className="td-km-tot text-center">
                          {kmTotalesTexto !== '—' ? (
                            <strong className="km-val--total">{kmTotalesTexto}</strong>
                          ) : (
                            <span className="txt-muted">—</span>
                          )}
                        </td>

                        {/* 14. GUARDIA (Solo orden centrado con title completo) */}
                        <td className="td-guardia text-center">
                          <span
                            className="txt-orden"
                            title={salida.recepcionistaNombre || 'Sin especificar'}
                          >
                            {extraerOrden(salida.recepcionistaNombre)}
                          </span>
                        </td>

                        {/* 15. N° PARTE */}
                        <td className="td-parte text-center">
                          {salida.numeroParte ? (
                            <span className="badge-parte-fit">{salida.numeroParte}</span>
                          ) : (
                            <span className="txt-muted">—</span>
                          )}
                        </td>

                        {/* 16. CELDA FINAL: ESTADO (solo punto) + ACCIONES */}
                        <td className="td-estado-acciones">
                          <div className="estado-acciones-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', position: 'relative' }}>
                            <span
                              className={`status-dot status-dot--${salida.estado}`}
                              title={
                                salida.estado === 'finalizada'
                                  ? 'Finalizada'
                                  : salida.estado === 'en_lugar'
                                  ? 'En el lugar'
                                  : salida.estado === 'en_camino'
                                  ? 'En camino'
                                  : salida.estado === 'reasignada'
                                  ? 'Reasignada'
                                  : salida.estado
                              }
                            />

                            <div className="acciones-dropdown-container">
                              <button
                                type="button"
                                className={`btn-acciones-trigger ${menuAccionesAbiertoId === salida.id ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idActual = salida.id ?? '';
                                  setMenuAccionesAbiertoId((prev) => (prev === idActual ? null : idActual));
                                }}
                                title="Más opciones"
                                aria-label="Más opciones"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {menuAccionesAbiertoId === salida.id && (
                                <div
                                  className="menu-acciones-dropdown"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(enCalle || enLugar) && (
                                    <button
                                      type="button"
                                      className="item-accion-dropdown item-accion-regreso"
                                      onClick={() => {
                                        setMenuAccionesAbiertoId(null);
                                        handleAbrirRegresoDesdeTabla(salida);
                                      }}
                                    >
                                      <CornerDownLeft size={14} />
                                      Registrar Regreso
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="item-accion-dropdown"
                                    onClick={() => {
                                      setMenuAccionesAbiertoId(null);
                                      handleAbrirEditar(salida);
                                    }}
                                  >
                                    <Pencil size={14} />
                                    Editar
                                  </button>
                                  {esAdmin && (
                                    <button
                                      type="button"
                                      className="item-accion-dropdown item-accion-eliminar"
                                      onClick={() => {
                                        setMenuAccionesAbiertoId(null);
                                        handleAbrirEliminar(salida);
                                      }}
                                    >
                                      <Trash2 size={14} />
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {salidas.length >= limiteRegistros && (
            <div className="tabla-cargar-mas">
              <button
                type="button"
                className="btn-cargar-mas"
                onClick={() => setLimiteRegistros((prev) => prev + 100)}
              >
                Cargar 100 registros anteriores...
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: NUEVA INTERVENCIÓN DIRECTA ───────────────────────────────── */}
      <Modal
        isOpen={modalNuevaIntervencion}
        onClose={() => setModalNuevaIntervencion(false)}
        title="Nueva Intervención · Despacho de Unidad"
        maxWidth="1000px"
        className="modal-despacho-intervencion"
      >
        <form onSubmit={handleGuardarNuevaIntervencion} className="form-despacho-intervencion">
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
                value={nuevaNumeroParte}
                onChange={(e) => setNuevaNumeroParte(e.target.value)}
              />
            </div>

            <div className="form-col-solido" style={{ flex: 1 }}>
              <div className="label-wrap-solido">
                <label>TIPO DE INTERVENCIÓN *</label>
              </div>
              <SearchableSelect
                value={nuevaCodigoIntervencion}
                onChange={(codigo, opt) => {
                  setNuevaCodigoIntervencion(codigo);
                  if (opt?.meta) {
                    const ci = opt.meta as CodigoIntervencion;
                    setNuevaTipoSiniestro(`${ci.codigo} - ${ci.descripcion}`);
                  } else {
                    setNuevaTipoSiniestro(codigo);
                  }
                }}
                options={opcionesIntervenciones}
                placeholder="Seleccionar código..."
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
                value={nuevaUnidadId}
                onChange={handleSelectUnidadNueva}
                options={opcionesUnidadesNueva}
                placeholder="Seleccionar unidad..."
                required
              />
            </div>

            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>CHOFER *</label>
              </div>
              <SearchableSelect
                value={nuevaChoferId}
                onChange={(val) => setNuevaChoferId(val)}
                options={opcionesChoferesNueva}
                placeholder="Seleccionar chofer..."
              />
            </div>
          </div>

          {/* Fila: Guardia */}
          <div className="form-row-solido">
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>GUARDIA</label>
              </div>
              <SearchableSelect
                value={nuevaRecepcionistaId}
                onChange={(val, opt) => {
                  setNuevaRecepcionistaId(val);
                  if (opt?.meta) {
                    const m = opt.meta as MiembroItem;
                    setNuevaRecepcionistaNombre(`${m.ordenOperativo ? `${m.ordenOperativo} - ` : ''}${m.apellido} ${m.nombre}`.replace(/^[-\s]+/, ''));
                  } else {
                    const m = choferesList.find((c) => c.id === val);
                    setNuevaRecepcionistaNombre(m ? `${m.ordenOperativo ? `${m.ordenOperativo} - ` : ''}${m.apellido} ${m.nombre}`.replace(/^[-\s]+/, '') : '');
                  }
                }}
                options={opcionesGuardiaNueva}
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
                value={nuevaDireccion}
                onChange={(e) => setNuevaDireccion(e.target.value)}
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
                value={nuevaBarrio}
                onChange={(e) => setNuevaBarrio(e.target.value)}
              />
            </div>
          </div>

          {/* Fila: Teléfono solicitante y KM Salida */}
          <div className="form-row-solido">
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>TELÉFONO SOLICITANTE</label>
              </div>
              <input
                type="tel"
                className="input-solido"
                placeholder="Ej: 353-4123456"
                value={nuevaTelefono}
                onChange={(e) => setNuevaTelefono(e.target.value)}
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
                value={nuevaKmSalida}
                onChange={(e) => setNuevaKmSalida(Number(e.target.value) || 0)}
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
                value={nuevaHoraLlamado}
                onChange={(e) => setNuevaHoraLlamado(e.target.value)}
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
                value={nuevaHoraSalida}
                onChange={(e) => setNuevaHoraSalida(e.target.value)}
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
              value={nuevaNotaGuardia}
              onChange={(e) => setNuevaNotaGuardia(e.target.value)}
            />
          </div>

          {/* Botones de Acción */}
          <div className="modal-solido-actions modal-solido-actions--row">
            <button
              type="button"
              className="btn-solido-cancel"
              onClick={() => setModalNuevaIntervencion(false)}
              disabled={guardandoNueva}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-solido-primary"
              disabled={guardandoNueva}
            >
              <Send size={16} />
              <span>{guardandoNueva ? 'Despachando...' : 'Despachar Unidad'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: EDITAR INTERVENCIÓN COMPLETA ──────────────────────────────── */}
      <Modal
        isOpen={modalEditar}
        onClose={() => {
          setModalEditar(false);
          setSalidaAEditar(null);
        }}
        title={`Editar Intervención · ${salidaAEditar?.unidadNombre || 'Unidad'}`}
        maxWidth="1000px"
        className="modal-despacho-intervencion"
      >
        {salidaAEditar && (
          <form onSubmit={handleGuardarEdicion} className="form-despacho-intervencion">
            {/* Resumen Superior */}
            <div className="modal-editar-resumen">
              <div className="modal-editar-resumen-item">
                <span className="resumen-item-label">Unidad</span>
                <strong className="resumen-item-val">{salidaAEditar.unidadNombre}</strong>
              </div>
              <div className="modal-editar-resumen-item">
                <span className="resumen-item-label">Fecha de Salida</span>
                <span className="resumen-item-val">{formatearFechaVisual(salidaAEditar.fecha)}</span>
              </div>
              <div className="modal-editar-resumen-item">
                <span className="resumen-item-label">Estado Actual</span>
                <span className="resumen-item-val">
                  {salidaAEditar.estado === 'en_camino'
                    ? 'En camino'
                    : salidaAEditar.estado === 'en_lugar'
                    ? 'En el lugar'
                    : salidaAEditar.estado === 'finalizada'
                    ? 'Finalizada'
                    : salidaAEditar.estado === 'reasignada'
                    ? 'Reasignada'
                    : salidaAEditar.estado}
                </span>
              </div>
            </div>

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
                  value={editNumeroParte}
                  onChange={(e) => setEditNumeroParte(e.target.value)}
                />
              </div>

              <div className="form-col-solido" style={{ flex: 1 }}>
                <div className="label-wrap-solido">
                  <label>TIPO DE INTERVENCIÓN *</label>
                </div>
                <SearchableSelect
                  value={editCodigoIntervencion}
                  onChange={(codigo, opt) => {
                    setEditCodigoIntervencion(codigo);
                    if (opt?.meta) {
                      const ci = opt.meta as CodigoIntervencion;
                      setEditTipoSiniestro(`${ci.codigo} - ${ci.descripcion}`);
                    } else {
                      setEditTipoSiniestro(codigo);
                    }
                  }}
                  options={opcionesIntervenciones}
                  placeholder="Seleccionar código..."
                  required
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
                  value={editDireccion}
                  onChange={(e) => setEditDireccion(e.target.value)}
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
                  value={editBarrio}
                  onChange={(e) => setEditBarrio(e.target.value)}
                />
              </div>
            </div>

            {/* Fila: Teléfono solicitante */}
            <div className="form-row-solido">
              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>TELÉFONO SOLICITANTE</label>
                </div>
                <input
                  type="tel"
                  className="input-solido"
                  placeholder="Ej: 353-4123456"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                />
              </div>
            </div>

            {/* Fila: Chofer y Guardia */}
            <div className="form-row-solido">
              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>CHOFER</label>
                </div>
                <SearchableSelect
                  value={editChoferId}
                  onChange={(val, opt) => {
                    setEditChoferId(val);
                    if (opt?.meta) {
                      const m = opt.meta as MiembroItem;
                      setEditChoferNombre(`${m.ordenOperativo ? `${m.ordenOperativo} - ` : ''}${m.apellido} ${m.nombre}`.replace(/^[-\s]+/, ''));
                    } else {
                      const m = choferesList.find((c) => c.id === val);
                      setEditChoferNombre(m ? `${m.ordenOperativo ? `${m.ordenOperativo} - ` : ''}${m.apellido} ${m.nombre}`.replace(/^[-\s]+/, '') : '');
                    }
                  }}
                  options={opcionesChoferesNueva}
                  placeholder="Seleccionar chofer..."
                />
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>GUARDIA</label>
                </div>
                <SearchableSelect
                  value={editRecepcionistaId}
                  onChange={(val, opt) => {
                    setEditRecepcionistaId(val);
                    if (opt?.meta) {
                      const m = opt.meta as MiembroItem;
                      setEditRecepcionistaNombre(`${m.ordenOperativo ? `${m.ordenOperativo} - ` : ''}${m.apellido} ${m.nombre}`.replace(/^[-\s]+/, ''));
                    } else {
                      const m = choferesList.find((c) => c.id === val);
                      setEditRecepcionistaNombre(m ? `${m.ordenOperativo ? `${m.ordenOperativo} - ` : ''}${m.apellido} ${m.nombre}`.replace(/^[-\s]+/, '') : '');
                    }
                  }}
                  options={opcionesGuardiaNueva}
                  placeholder="Seleccionar bombero de guardia..."
                />
              </div>
            </div>

            {/* Fila: Horarios (4 campos) */}
            <div className="form-row-solido">
              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>H. LLAMADO</label>
                </div>
                <input
                  type="time"
                  className="input-solido"
                  value={editHoraLlamado}
                  onChange={(e) => setEditHoraLlamado(e.target.value)}
                />
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>H. SALIDA</label>
                </div>
                <input
                  type="time"
                  className="input-solido"
                  value={editHoraSalida}
                  onChange={(e) => setEditHoraSalida(e.target.value)}
                />
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>H. ARRIBO</label>
                </div>
                <input
                  type="time"
                  className="input-solido"
                  value={editHoraLlegada}
                  onChange={(e) => setEditHoraLlegada(e.target.value)}
                  placeholder="--:--"
                />
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>H. REGRESO</label>
                </div>
                <input
                  type="time"
                  className="input-solido"
                  value={editHoraRegreso}
                  onChange={(e) => setEditHoraRegreso(e.target.value)}
                  placeholder="--:--"
                />
              </div>
            </div>

            {/* Fila: Kilometrajes */}
            <div className="form-row-solido">
              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>KM SALIDA</label>
                </div>
                <input
                  type="number"
                  min="0"
                  className="input-solido"
                  value={editKmSalida}
                  onChange={(e) => setEditKmSalida(Number(e.target.value) || 0)}
                />
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>KM REGRESO</label>
                </div>
                <input
                  type="number"
                  min={editKmSalida}
                  className="input-solido"
                  value={editKmRegreso}
                  onChange={(e) => setEditKmRegreso(e.target.value)}
                  placeholder="Odómetro al volver..."
                />
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>KM RECORRIDOS</label>
                </div>
                <div className="box-km-rec-preview">
                  {editKmRecorridosCalc !== null ? `${editKmRecorridosCalc} km` : '—'}
                </div>
              </div>
            </div>

            {/* Nota de Guardia */}
            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>NOTA DE GUARDIA</label>
              </div>
              <textarea
                className="input-solido"
                rows={3}
                placeholder="Observaciones de la intervención..."
                value={editNotaGuardia}
                onChange={(e) => setEditNotaGuardia(e.target.value)}
              />
            </div>

            {/* Acciones */}
            <div className="modal-solido-actions modal-solido-actions--row">
              <button
                type="button"
                className="btn-solido-cancel"
                onClick={() => {
                  setModalEditar(false);
                  setSalidaAEditar(null);
                }}
                disabled={guardandoEdicion}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-solido-primary"
                disabled={guardandoEdicion}
              >
                <Check size={16} />
                <span>{guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL: REGISTRAR REGRESO DIRECTO DESDE TABLA ────────────────────── */}
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
          <form onSubmit={handleConfirmarRegresoDesdeTabla} className="form-regreso-salida">
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

            <div className="form-col-solido">
              <div className="label-wrap-solido">
                <label>HORA LLEGADA AL LUGAR</label>
              </div>
              <input
                type="time"
                className="input-solido"
                value={horaLlegadaRegreso}
                onChange={(e) => setHoraLlegadaRegreso(e.target.value)}
              />
            </div>

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

            <div className="box-km-calculados">
              <span className="km-calculados-label">Distancia recorrida:</span>
              <strong className="km-calculados-valor">
                {kmRecorridosCalculados} KM
              </strong>
            </div>

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

      {/* ── MODAL: CONFIRMACIÓN DE ELIMINACIÓN ───────────────────────────────── */}
      <Modal
        isOpen={modalEliminar}
        onClose={() => {
          if (!eliminando) {
            setModalEliminar(false);
            setSalidaAEliminar(null);
          }
        }}
        title="¿Eliminar registro de intervención?"
        maxWidth="480px"
      >
        {salidaAEliminar && (
          <div className="modal-eliminar-contenido">
            <p className="modal-eliminar-aviso">
              Esta acción no se puede deshacer. Se eliminará permanentemente del Libro de Guardia el siguiente registro:
            </p>

            <div className="modal-info-box">
              <div className="modal-info-row">
                <span className="modal-info-label">Fecha:</span>{' '}
                <strong>{formatearFechaVisual(salidaAEliminar.fecha)}</strong>
              </div>
              <div className="modal-info-row">
                <span className="modal-info-label">Unidad:</span>{' '}
                <strong>{salidaAEliminar.unidadNombre}</strong>
              </div>
              <div className="modal-info-row">
                <span className="modal-info-label">Dirección:</span>{' '}
                <strong>{salidaAEliminar.direccion}</strong>
                {salidaAEliminar.barrio && <span> (B° {salidaAEliminar.barrio})</span>}
              </div>
              {salidaAEliminar.numeroParte && (
                <div className="modal-info-row">
                  <span className="modal-info-label">N° de Parte:</span>{' '}
                  <strong>{salidaAEliminar.numeroParte}</strong>
                </div>
              )}
            </div>

            <div className="modal-solido-actions modal-solido-actions--row" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn-solido-cancel"
                onClick={() => {
                  setModalEliminar(false);
                  setSalidaAEliminar(null);
                }}
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-solido-primary"
                onClick={handleConfirmarEliminar}
                disabled={eliminando}
                style={{ backgroundColor: '#ef4444' }}
              >
                <Trash2 size={16} />
                <span>{eliminando ? 'Eliminando...' : 'Eliminar Registro'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LibroGuardia;
