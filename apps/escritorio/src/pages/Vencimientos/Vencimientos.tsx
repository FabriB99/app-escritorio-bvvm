import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Vencimientos.css';
import { CalendarDays, Check, ChevronDown, Plus, RefreshCw, Search, X } from 'lucide-react';
import { FaRegDotCircle, FaTrash } from 'react-icons/fa';
import { db } from '../../app/firebase-config';
import { addDoc, collection, deleteDoc, doc, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import Header from '../../components/Header';
import {
  TipoUnidadChofer,
  HabilitacionesChofer,
  CATEGORIAS_CHOFER,
} from '../../types/unidades';

/* =========================================================
   TIPOS
   ========================================================= */

type TipoVencimiento = 'vtv' | 'carnet';

type FiltroEstado = 'todos' | 'vigente' | 'proximo' | 'vencido';

type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
  ordenOperativo?: number;
  activo?: boolean;
};

type UnidadFirestore = {
  id: string;
  nombre: string;
  categoria?: TipoUnidadChofer;
};

type Vencimiento = {
  id: string;
  tipo: TipoVencimiento;
  fecha: string;
  nombre: string;

  // Carnet
  miembroId?: string;
  tipoCarnet?: string[];
  habilitacionesChofer?: HabilitacionesChofer;

  // VTV
  unidadId?: string;

  // Compatibilidad con documentos antiguos
  esChofer?: boolean;
  unidadesChofer?: string[];
};

/* =========================================================
   CONSTANTES
   ========================================================= */

const tiposCarnetDisponibles = [
  'A1.2', 'A1.3', 'A1.4', 'A3', 'B1', 'B2', 'C1', 'C2', 'C3', 'D2', 'D4', 'E1',
];

/* =========================================================
   UTILIDADES
   ========================================================= */

const normalizarTexto = (texto: string) =>
  texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const obtenerNombreMiembro = (miembro: Miembro) => `${miembro.apellido}, ${miembro.nombre}`;

const formatearFecha = (fechaISO: string) => {
  if (!fechaISO) return '-';
  const [year, month, day] = fechaISO.split('-');
  return `${day}/${month}/${year}`;
};

const obtenerFechaLocalISO = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const obtenerEstado = (fechaISO: string): FiltroEstado => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fecha = new Date(`${fechaISO}T00:00:00`);
  fecha.setHours(0, 0, 0, 0);

  if (fecha < hoy) return 'vencido';

  const dias = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (dias <= 30) return 'proximo';

  return 'vigente';
};

const obtenerHabilitaciones = (vencimiento: Vencimiento): HabilitacionesChofer => {
  if (vencimiento.habilitacionesChofer) {
    return vencimiento.habilitacionesChofer;
  }

  // Compatibilidad con documentos antiguos
  if (vencimiento.esChofer && vencimiento.unidadesChofer?.length) {
    const habilitaciones: HabilitacionesChofer = {};

    vencimiento.unidadesChofer.forEach((unidad) => {
      if (CATEGORIAS_CHOFER.includes(unidad as TipoUnidadChofer)) {
        habilitaciones[unidad as TipoUnidadChofer] = 'habilitado';
      }
    });

    return habilitaciones;
  }

  return {};
};

/* =========================================================
   COMPONENTE
   ========================================================= */

const Vencimientos: React.FC = () => {
  const [tab, setTab] = useState<TipoVencimiento>('carnet');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Vencimiento | null>(null);

  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [unidades, setUnidades] = useState<UnidadFirestore[]>([]);

  const [fecha, setFecha] = useState('');
  const [nombre, setNombre] = useState('');

  // Carnet
  const [miembroId, setMiembroId] = useState('');
  const [busquedaBombero, setBusquedaBombero] = useState('');
  const [selectorBomberoAbierto, setSelectorBomberoAbierto] = useState(false);
  const [tipoCarnet, setTipoCarnet] = useState<string[]>([]);
  const [habilitacionesChofer, setHabilitacionesChofer] = useState<HabilitacionesChofer>({});

  // VTV
  const [unidadId, setUnidadId] = useState('');
  const [busquedaUnidad, setBusquedaUnidad] = useState('');
  const [selectorUnidadAbierto, setSelectorUnidadAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [filtroAbierto, setFiltroAbierto] = useState(false);

  const [modalEliminar, setModalEliminar] = useState<{
    abierto: boolean;
    id?: string;
    nombre?: string;
  }>({ abierto: false });

  const selectorBomberoRef = useRef<HTMLDivElement>(null);
  const selectorUnidadRef = useRef<HTMLDivElement>(null);
  const filtroRef = useRef<HTMLDivElement>(null);

  /* =======================================================
     FIRESTORE
     ======================================================= */

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vencimientos'), (snapshot) => {
      const datos: Vencimiento[] = snapshot.docs.map((documento) => {
        const data = documento.data();

        let fechaStr = '';
        if (data.fecha instanceof Timestamp) {
          fechaStr = obtenerFechaLocalISO(data.fecha.toDate());
        }

        return {
          id: documento.id,
          tipo: data.tipo,
          nombre: data.nombre || '',
          fecha: fechaStr,
          miembroId: data.miembroId,
          tipoCarnet: data.tipoCarnet || [],
          habilitacionesChofer: data.habilitacionesChofer,
          unidadId: data.unidadId,
          esChofer: data.esChofer || false,
          unidadesChofer: data.unidadesChofer || [],
        };
      });

      setVencimientos(datos);
    });

    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'miembros'), (snapshot) => {
      const datos: Miembro[] = snapshot.docs
        .map((documento) => {
          const data = documento.data();
          return {
            id: documento.id,
            nombre: data.nombre || '',
            apellido: data.apellido || '',
            ordenOperativo: data.ordenOperativo,
            activo: data.activo !== false,
          };
        })
        .filter((miembro) => miembro.activo !== false)
        .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'));

      setMiembros(datos);
    });

    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'unidades'), (snapshot) => {
      const datos: UnidadFirestore[] = snapshot.docs
        .map((documento) => {
          const data = documento.data();
          return {
            id: documento.id,
            nombre: data.nombre || '',
            categoria: data.categoria as TipoUnidadChofer | undefined,
          };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

      setUnidades(datos);
    });

    return unsub;
  }, []);

  /* =======================================================
     BOMBERO / UNIDAD SELECCIONADOS
     ======================================================= */

  const bomberoSeleccionado = useMemo(
    () => miembros.find((miembro) => miembro.id === miembroId),
    [miembros, miembroId]
  );

  const unidadSeleccionada = useMemo(
    () => unidades.find((unidad) => unidad.id === unidadId),
    [unidades, unidadId]
  );

  /* =======================================================
     CARNETS / VTV EXISTENTES (para no duplicar)
     ======================================================= */

  const bomberosConCarnet = useMemo(() => {
    const ids = new Set<string>();
    const nombres = new Set<string>();

    vencimientos
      .filter((v) => v.tipo === 'carnet')
      .forEach((vencimiento) => {
        if (vencimiento.miembroId) ids.add(vencimiento.miembroId);
        if (vencimiento.nombre) nombres.add(normalizarTexto(vencimiento.nombre));
      });

    return { ids, nombres };
  }, [vencimientos]);

  const unidadesConVtv = useMemo(() => {
    const ids = new Set<string>();

    vencimientos
      .filter((v) => v.tipo === 'vtv' && v.unidadId)
      .forEach((vencimiento) => ids.add(vencimiento.unidadId as string));

    return ids;
  }, [vencimientos]);

  /* =======================================================
     BOMBEROS / UNIDADES DISPONIBLES PARA EL SELECTOR
     ======================================================= */

  const bomberosDisponibles = useMemo(() => {
    const busquedaNormalizada = normalizarTexto(busquedaBombero.trim());

    return miembros.filter((miembro) => {
      const nombreCompleto = obtenerNombreMiembro(miembro);
      const nombreNormalizado = normalizarTexto(nombreCompleto);
      const nombreViejoNormalizado = normalizarTexto(`${miembro.nombre} ${miembro.apellido}`);
      const seleccionado = miembro.id === miembroId;

      if (!seleccionado) {
        if (bomberosConCarnet.ids.has(miembro.id)) return false;
        if (
          bomberosConCarnet.nombres.has(nombreNormalizado) ||
          bomberosConCarnet.nombres.has(nombreViejoNormalizado)
        ) {
          return false;
        }
      }

      if (!busquedaNormalizada) return true;

      const orden = miembro.ordenOperativo?.toString() || '';

      return (
        nombreNormalizado.includes(busquedaNormalizada) ||
        nombreViejoNormalizado.includes(busquedaNormalizada) ||
        orden.includes(busquedaNormalizada)
      );
    });
  }, [miembros, miembroId, busquedaBombero, bomberosConCarnet]);

  const unidadesDisponibles = useMemo(() => {
    const busquedaNormalizada = normalizarTexto(busquedaUnidad.trim());

    return unidades.filter((unidad) => {
      const nombreNormalizado = normalizarTexto(unidad.nombre);
      const seleccionada = unidad.id === unidadId;

      if (!seleccionada && unidadesConVtv.has(unidad.id)) return false;
      if (!busquedaNormalizada) return true;

      return nombreNormalizado.includes(busquedaNormalizada);
    });
  }, [unidades, unidadId, busquedaUnidad, unidadesConVtv]);

  /* =======================================================
     CLICK FUERA
     ======================================================= */

  useEffect(() => {
    const manejarClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (selectorBomberoRef.current && !selectorBomberoRef.current.contains(target)) {
        setSelectorBomberoAbierto(false);
      }

      if (selectorUnidadRef.current && !selectorUnidadRef.current.contains(target)) {
        setSelectorUnidadAbierto(false);
      }

      if (filtroRef.current && !filtroRef.current.contains(target)) {
        setFiltroAbierto(false);
      }
    };

    document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, []);

  /* =======================================================
     DATOS DE LA TABLA
     ======================================================= */

  const datosTab = useMemo(
    () => vencimientos.filter((v) => v.tipo === tab),
    [vencimientos, tab]
  );

  const datosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda.trim());

    return datosTab
      .filter((vencimiento) => {
        const estado = obtenerEstado(vencimiento.fecha);
        if (filtroEstado !== 'todos' && estado !== filtroEstado) return false;
        if (!texto) return true;
        return normalizarTexto(vencimiento.nombre).includes(texto);
      })
      .sort((a, b) => {
        const estadoA = obtenerEstado(a.fecha);
        const estadoB = obtenerEstado(b.fecha);
        const prioridad: Record<FiltroEstado, number> = {
          vencido: 0, proximo: 1, vigente: 2, todos: 3,
        };

        if (prioridad[estadoA] !== prioridad[estadoB]) {
          return prioridad[estadoA] - prioridad[estadoB];
        }

        return new Date(`${a.fecha}T00:00:00`).getTime() - new Date(`${b.fecha}T00:00:00`).getTime();
      });
  }, [datosTab, busqueda, filtroEstado]);

  /* =======================================================
     RESUMEN
     ======================================================= */

  const resumen = useMemo(() => {
    const datos = datosTab;

    return {
      total: datos.length,
      vencidos: datos.filter((v) => obtenerEstado(v.fecha) === 'vencido').length,
      proximos: datos.filter((v) => obtenerEstado(v.fecha) === 'proximo').length,
      vigentes: datos.filter((v) => obtenerEstado(v.fecha) === 'vigente').length,
    };
  }, [datosTab]);

  /* =======================================================
     MODAL
     ======================================================= */

  const abrirModal = (vencimiento?: Vencimiento) => {
    if (vencimiento) {
      setSelected(vencimiento);
      setFecha(vencimiento.fecha);
      setNombre(vencimiento.nombre);

      setMiembroId(vencimiento.miembroId || '');
      setBusquedaBombero('');
      setSelectorBomberoAbierto(false);
      setTipoCarnet(vencimiento.tipoCarnet || []);
      setHabilitacionesChofer(obtenerHabilitaciones(vencimiento));

      setUnidadId(vencimiento.unidadId || '');
      // Si es un registro viejo sin unidadId, precargamos el nombre en el
      // buscador para que sea fácil encontrar y vincular la unidad correcta.
      setBusquedaUnidad(vencimiento.unidadId ? '' : vencimiento.nombre);
      setSelectorUnidadAbierto(!vencimiento.unidadId);
    } else {
      setSelected(null);
      setFecha('');
      setNombre('');

      setMiembroId('');
      setBusquedaBombero('');
      setSelectorBomberoAbierto(false);
      setTipoCarnet([]);
      setHabilitacionesChofer({});

      setUnidadId('');
      setBusquedaUnidad('');
      setSelectorUnidadAbierto(false);
    }

    setModalOpen(true);
  };

  /* =======================================================
     SELECCIONAR BOMBERO / UNIDAD
     ======================================================= */

  const seleccionarBombero = (miembro: Miembro) => {
    setMiembroId(miembro.id);
    setNombre(obtenerNombreMiembro(miembro));
    setBusquedaBombero('');
    setSelectorBomberoAbierto(false);
  };

  const cambiarBombero = () => {
    setMiembroId('');
    setNombre('');
    setBusquedaBombero('');
    setSelectorBomberoAbierto(true);
  };

  const seleccionarUnidad = (unidad: UnidadFirestore) => {
    setUnidadId(unidad.id);
    setNombre(unidad.nombre);
    setBusquedaUnidad('');
    setSelectorUnidadAbierto(false);
  };

  const cambiarUnidad = () => {
    setUnidadId('');
    setNombre('');
    setBusquedaUnidad('');
    setSelectorUnidadAbierto(true);
  };

  /* =======================================================
     GUARDAR
     ======================================================= */

  const guardarVencimiento = async () => {
    if (!fecha) {
      toast.error('Seleccioná una fecha de vencimiento.');
      return;
    }

    if (tab === 'carnet' && !miembroId) {
      toast.error('Seleccioná un bombero.');
      return;
    }

    if (tab === 'vtv' && !unidadId) {
      toast.error('Seleccioná una unidad.');
      return;
    }

    if (tab === 'carnet' && tipoCarnet.length === 0) {
      toast.error('Seleccioná al menos un tipo de carnet.');
      return;
    }

    const fechaTimestamp = Timestamp.fromDate(new Date(`${fecha}T00:00:00`));

    const datos: Record<string, unknown> = {
      tipo: tab,
      nombre: nombre.trim(),
      fecha: fechaTimestamp,
    };

    if (tab === 'carnet') {
      datos.miembroId = miembroId;
      datos.tipoCarnet = tipoCarnet;
      datos.habilitacionesChofer = habilitacionesChofer;
    }

    if (tab === 'vtv') {
      datos.unidadId = unidadId;
    }

    try {
      if (selected?.id) {
        await updateDoc(doc(db, 'vencimientos', selected.id), datos);
        toast.success(tab === 'carnet' ? 'Carnet actualizado correctamente.' : 'VTV actualizada correctamente.');
      } else {
        await addDoc(collection(db, 'vencimientos'), datos);
        toast.success(tab === 'carnet' ? 'Carnet agregado correctamente.' : 'VTV agregada correctamente.');
      }

      setModalOpen(false);
    } catch (error) {
      console.error('Error guardando el vencimiento:', error);
      toast.error(tab === 'carnet' ? 'No se pudo guardar el carnet.' : 'No se pudo guardar la VTV.');
    }
  };

  /* =======================================================
     ELIMINAR
     ======================================================= */

  const abrirModalEliminar = (vencimiento: Vencimiento) => {
    setModalEliminar({ abierto: true, id: vencimiento.id, nombre: vencimiento.nombre });
  };

  const confirmarEliminar = async () => {
    if (!modalEliminar.id) return;

    try {
      await deleteDoc(doc(db, 'vencimientos', modalEliminar.id));
      setModalEliminar({ abierto: false });
      toast.success('Vencimiento eliminado correctamente.');
    } catch (error) {
      console.error('Error eliminando:', error);
      toast.error('No se pudo eliminar el vencimiento.');
    }
  };

  /* =======================================================
     RENDER ESTADO
     ======================================================= */

  const renderEstado = (fechaISO: string) => {
    const estado = obtenerEstado(fechaISO);

    if (estado === 'vencido') {
      return <span className="estado estado-vencido"><FaRegDotCircle />Vencido</span>;
    }
    if (estado === 'proximo') {
      return <span className="estado estado-proximo"><FaRegDotCircle />Próximo</span>;
    }
    return <span className="estado estado-vigente"><FaRegDotCircle />Vigente</span>;
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="vencimientos">
      <Header
        title="Vencimientos"
        extraButtons={[{ label: '', icon: Plus, onClick: () => abrirModal() }]}
      />

      <section className="vencimientos-resumen">
        <div className="resumen-item">
          <div className="resumen-icon resumen-icon-total"><CalendarDays size={19} /></div>
          <div>
            <strong>{resumen.total}</strong>
            <span>{tab === 'carnet' ? 'Carnets registrados' : 'VTV registradas'}</span>
          </div>
        </div>

        <div className="resumen-item">
          <div className="resumen-icon resumen-icon-vigente"><Check size={19} /></div>
          <div><strong>{resumen.vigentes}</strong><span>Vigentes</span></div>
        </div>

        <div className="resumen-item">
          <div className="resumen-icon resumen-icon-proximo"><FaRegDotCircle /></div>
          <div><strong>{resumen.proximos}</strong><span>Próximos a vencer</span></div>
        </div>

        <div className="resumen-item">
          <div className="resumen-icon resumen-icon-vencido"><FaRegDotCircle /></div>
          <div><strong>{resumen.vencidos}</strong><span>Vencidos</span></div>
        </div>
      </section>

      <div className="vencimientos-tabs">
        <button
          className={tab === 'carnet' ? 'activo' : ''}
          onClick={() => { setTab('carnet'); setBusqueda(''); setFiltroEstado('todos'); }}
        >
          Carnets de conducir
        </button>

        <button
          className={tab === 'vtv' ? 'activo' : ''}
          onClick={() => { setTab('vtv'); setBusqueda(''); setFiltroEstado('todos'); }}
        >
          VTV
        </button>
      </div>

      <section className="vencimientos-toolbar">
        <div className="vencimientos-busqueda">
          <Search size={18} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={tab === 'carnet' ? 'Buscar bombero...' : 'Buscar unidad...'}
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} className="busqueda-limpiar">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filtro-estado" ref={filtroRef}>
          <button type="button" className="filtro-estado-boton" onClick={() => setFiltroAbierto(!filtroAbierto)}>
            <span>
              {filtroEstado === 'todos' ? 'Todos los estados'
                : filtroEstado === 'vigente' ? 'Vigentes'
                : filtroEstado === 'proximo' ? 'Próximos'
                : 'Vencidos'}
            </span>
            <ChevronDown size={16} />
          </button>

          {filtroAbierto && (
            <div className="filtro-estado-menu">
              {[
                { value: 'todos', label: 'Todos los estados' },
                { value: 'vencido', label: 'Vencidos' },
                { value: 'proximo', label: 'Próximos a vencer' },
                { value: 'vigente', label: 'Vigentes' },
              ].map((opcion) => (
                <button
                  type="button"
                  key={opcion.value}
                  className={filtroEstado === opcion.value ? 'seleccionado' : ''}
                  onClick={() => { setFiltroEstado(opcion.value as FiltroEstado); setFiltroAbierto(false); }}
                >
                  {opcion.label}
                  {filtroEstado === opcion.value && <Check size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="vencimientos-tabla-wrapper">
        <div className="vencimientos-tabla-scroll">
          <table className="vencimientos-tabla">
            <thead>
              <tr>
                <th>{tab === 'carnet' ? 'Bombero' : 'Unidad'}</th>
                {tab === 'carnet' && <th>Carnet</th>}
                <th>Estado</th>
                <th>Vencimiento</th>
                <th className="columna-acciones"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>

            <tbody>
              {datosFiltrados.map((vencimiento) => (
                <tr key={vencimiento.id}>
                  <td>
                    <div className="celda-principal">
                      <strong>{vencimiento.nombre}</strong>
                      {tab === 'carnet' && (() => {
                        const miembroVinculado = vencimiento.miembroId
                          ? miembros.find((m) => m.id === vencimiento.miembroId)
                          : undefined;

                        if (miembroVinculado?.ordenOperativo) {
                          return <span>Orden Nº {miembroVinculado.ordenOperativo}</span>;
                        }

                        // Sin miembroId (o sin orden cargado): registro viejo
                        // todavía no vinculado a un miembro real.
                        return <span className="celda-alerta-sin-vinculo">Sin vincular a un bombero — editá para vincularlo</span>;
                      })()}
                      {tab === 'vtv' && !vencimiento.unidadId && (
                        <span className="celda-alerta-sin-vinculo">Sin vincular a una unidad — editá para vincularla</span>
                      )}
                    </div>
                  </td>

                  {tab === 'carnet' && (
                    <td>
                      <div className="carnets-lista">
                        {(vencimiento.tipoCarnet || []).map((carnet) => (
                          <span key={carnet} className="carnet-chip">{carnet}</span>
                        ))}
                      </div>
                    </td>
                  )}

                  <td>{renderEstado(vencimiento.fecha)}</td>

                  <td>
                    <div className={`fecha-celda fecha-${obtenerEstado(vencimiento.fecha)}`}>
                      <strong>{formatearFecha(vencimiento.fecha)}</strong>
                      {obtenerEstado(vencimiento.fecha) === 'vencido' && <span>Requiere renovación</span>}
                      {obtenerEstado(vencimiento.fecha) === 'proximo' && <span>Próximo vencimiento</span>}
                    </div>
                  </td>

                  <td>
                    <div className="acciones">
                      <button type="button" title="Editar" onClick={() => abrirModal(vencimiento)}>
                        <RefreshCw size={16} />
                      </button>
                      <button type="button" title="Eliminar" onClick={() => abrirModalEliminar(vencimiento)}>
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {datosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={tab === 'carnet' ? 5 : 4}>
                    <div className="tabla-vacia">
                      <div className="tabla-vacia-icon"><Search size={22} /></div>
                      <strong>No se encontraron resultados</strong>
                      <span>Probá cambiar la búsqueda o el filtro seleccionado.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-vencimientos" onClick={() => setModalOpen(false)}>
          <div className="modal-vencimientos-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span>{tab === 'carnet' ? 'CARNET DE CONDUCIR' : 'VTV'}</span>
                <h2>{selected ? 'Actualizar vencimiento' : 'Nuevo vencimiento'}</h2>
                <p>
                  {tab === 'carnet'
                    ? 'Registrá la documentación y su fecha de vencimiento.'
                    : 'Registrá la fecha de vencimiento de la unidad.'}
                </p>
              </div>
              <button type="button" className="modal-cerrar" onClick={() => setModalOpen(false)}>
                <X size={19} />
              </button>
            </div>

            <div className="modal-body">
              {tab === 'vtv' && (
                <div className="form-seccion">
                  <div className="form-seccion-titulo">
                    <div>
                      <strong>Unidad</strong>
                      <span>Seleccioná la unidad a la que corresponde esta VTV.</span>
                    </div>
                  </div>

                  <div className="selector-bombero" ref={selectorUnidadRef}>
                    {!unidadSeleccionada ? (
                      <>
                        <div className="bombero-buscador">
                          <Search size={18} />
                          <input
                            type="text"
                            value={busquedaUnidad}
                            onChange={(e) => { setBusquedaUnidad(e.target.value); setSelectorUnidadAbierto(true); }}
                            onFocus={() => setSelectorUnidadAbierto(true)}
                            placeholder="Buscar unidad por nombre..."
                            autoComplete="off"
                          />
                          {busquedaUnidad && (
                            <button type="button" className="bombero-buscador-limpiar" onClick={() => setBusquedaUnidad('')}>
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {selectorUnidadAbierto && (
                          <div className="bombero-resultados">
                            {unidadesDisponibles.length > 0 ? (
                              unidadesDisponibles.map((unidad) => (
                                <button
                                  type="button"
                                  className="bombero-opcion"
                                  key={unidad.id}
                                  onClick={() => seleccionarUnidad(unidad)}
                                >
                                  <span>{unidad.nombre}</span>
                                  {unidad.categoria && <small>{unidad.categoria}</small>}
                                </button>
                              ))
                            ) : (
                              <div className="bombero-sin-resultados">No hay unidades disponibles.</div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bombero-seleccionado">
                        <div>
                          <strong>{unidadSeleccionada.nombre}</strong>
                          {unidadSeleccionada.categoria && <small>{unidadSeleccionada.categoria}</small>}
                        </div>
                        <button type="button" onClick={cambiarUnidad}>Cambiar</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'carnet' && (
                <>
                  <div className="form-seccion">
                    <div className="form-seccion-titulo">
                      <div>
                        <strong>Bombero</strong>
                        <span>Seleccioná el titular del carnet.</span>
                      </div>
                    </div>

                    <div className="selector-bombero" ref={selectorBomberoRef}>
                      {!bomberoSeleccionado ? (
                        <>
                          <div className="bombero-buscador">
                            <Search size={18} />
                            <input
                              type="text"
                              value={busquedaBombero}
                              onChange={(e) => { setBusquedaBombero(e.target.value); setSelectorBomberoAbierto(true); }}
                              onFocus={() => setSelectorBomberoAbierto(true)}
                              placeholder="Buscar por apellido, nombre u orden..."
                              autoComplete="off"
                            />
                            {busquedaBombero && (
                              <button type="button" className="bombero-buscador-limpiar" onClick={() => setBusquedaBombero('')}>
                                <X size={16} />
                              </button>
                            )}
                          </div>

                          {selectorBomberoAbierto && (
                            <div className="bombero-resultados">
                              {bomberosDisponibles.length > 0 ? (
                                bomberosDisponibles.map((miembro) => (
                                  <button
                                    type="button"
                                    className="bombero-opcion"
                                    key={miembro.id}
                                    onClick={() => seleccionarBombero(miembro)}
                                  >
                                    <span>{obtenerNombreMiembro(miembro)}</span>
                                    {miembro.ordenOperativo && <small>Orden Nº {miembro.ordenOperativo}</small>}
                                  </button>
                                ))
                              ) : (
                                <div className="bombero-sin-resultados">No hay bomberos disponibles.</div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bombero-seleccionado">
                          <div>
                            <strong>{obtenerNombreMiembro(bomberoSeleccionado)}</strong>
                            {bomberoSeleccionado.ordenOperativo && <small>Orden Nº {bomberoSeleccionado.ordenOperativo}</small>}
                          </div>
                          <button type="button" onClick={cambiarBombero}>Cambiar</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-seccion">
                    <div className="form-seccion-titulo">
                      <div>
                        <strong>Vencimiento</strong>
                        <span>Fecha hasta la que tiene validez.</span>
                      </div>
                    </div>

                    <div className="form-campo">
                      <label>Fecha</label>
                      <div className="input-icono">
                        <CalendarDays size={18} />
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="form-seccion">
                    <div className="form-seccion-titulo">
                      <div>
                        <strong>Categorías del carnet</strong>
                        <span>Seleccioná todas las categorías que figuren en la documentación.</span>
                      </div>
                    </div>

                    <div className="carnet-selector">
                      {tiposCarnetDisponibles.map((tipo) => {
                        const activo = tipoCarnet.includes(tipo);
                        return (
                          <label key={tipo} className={activo ? 'activo' : ''}>
                            <input
                              type="checkbox"
                              checked={activo}
                              onChange={() =>
                                setTipoCarnet((prev) =>
                                  prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
                                )
                              }
                            />
                            <span>{tipo}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-seccion">
                    <div className="form-seccion-titulo">
                      <div>
                        <strong>Habilitaciones de conducción</strong>
                        <span>Opcional. Marcá las categorías que puede conducir esta persona.</span>
                      </div>
                    </div>

                    <div className="habilitaciones-grid">
                      {CATEGORIAS_CHOFER.map((tipo) => {
                        const estado = habilitacionesChofer[tipo];
                        const seleccionada = Boolean(estado);

                        return (
                          <div key={tipo} className={`habilitacion-card ${seleccionada ? 'seleccionada' : ''}`}>
                            <label>
                              <input
                                type="checkbox"
                                checked={seleccionada}
                                onChange={() =>
                                  setHabilitacionesChofer((prev) => {
                                    const nuevo = { ...prev };
                                    if (nuevo[tipo]) {
                                      delete nuevo[tipo];
                                    } else {
                                      nuevo[tipo] = 'habilitado';
                                    }
                                    return nuevo;
                                  })
                                }
                              />
                              <span>{tipo}</span>
                            </label>

                            {seleccionada && (
                              <button
                                type="button"
                                className={estado === 'aprendizaje' ? 'estado-aprendizaje' : 'estado-habilitacion'}
                                onClick={() =>
                                  setHabilitacionesChofer((prev) => ({
                                    ...prev,
                                    [tipo]: estado === 'habilitado' ? 'aprendizaje' : 'habilitado',
                                  }))
                                }
                              >
                                {estado === 'aprendizaje' ? 'Aprendizaje' : 'Habilitado'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="ayuda-habilitaciones">
                      <span>*</span>
                      Tocá el estado de una categoría para alternar entre habilitado y aprendizaje.
                    </div>
                  </div>
                </>
              )}

              {tab === 'vtv' && (
                <div className="form-seccion">
                  <div className="form-seccion-titulo">
                    <div>
                      <strong>Vencimiento</strong>
                      <span>Fecha hasta la que tiene validez la VTV.</span>
                    </div>
                  </div>

                  <div className="form-campo">
                    <label>Fecha</label>
                    <div className="input-icono">
                      <CalendarDays size={18} />
                      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="boton-cancelar" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="button" className="boton-guardar" onClick={guardarVencimiento}>
                {selected ? 'Guardar cambios' : 'Guardar vencimiento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEliminar.abierto && (
        <div className="modal-vencimientos modal-confirmacion" onClick={() => setModalEliminar({ abierto: false })}>
          <div className="confirmacion-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirmacion-icono"><FaTrash /></div>
            <h2>Eliminar vencimiento</h2>
            <p>¿Seguro que querés eliminar el vencimiento de <strong>{modalEliminar.nombre}</strong>?</p>

            <div className="confirmacion-botones">
              <button type="button" onClick={() => setModalEliminar({ abierto: false })}>Cancelar</button>
              <button type="button" className="boton-eliminar" onClick={confirmarEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vencimientos;