// src/pages/Guardia/ListadoCapacitaciones.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../app/firebase-config';
import {
  collection, getDocs, query, orderBy, doc,
  updateDoc, deleteDoc, addDoc, Timestamp, getDoc
} from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import { Plus, Pencil, Trash2, CheckCircle, ChevronDown, ChevronRight, X } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import { mostrarToast } from '../../utils/toast';
import Header from '../../components/Header';
import PCapacitaciones from './ParteCapacitaciones'; // 🛠️ Importamos el formulario para usarlo en el modal
import './ListadoCapacitaciones.css';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoActividad = 'capacitacion' | 'representacion' | 'organizativa';
type RolUsuario = 'admin' | 'jefatura' | 'guardia' | 'graduados' | string;

interface MiembroRef {
  id: string;
  nombre: string;
  apellido: string;
  ordenOperativo: string | number;
}

interface Autorizacion {
  autorizado: boolean;
  autorizadoPor: string;       // uid
  autorizadoPorNombre: string; // nombre legible
  autorizadoPorOrden: string;  // orden operativo
  fechaAutorizacion: Timestamp;
}

interface Capacitacion {
  id: string;
  tipoActividad: TipoActividad;
  fechaInicio: string;
  horaInicio: string;
  horaFin: string;
  lugarDireccion: string;
  nivelCapacitacion: string;
  descripcion: string;
  instructor: MiembroRef | null;
  participantes: MiembroRef[];
  personalGuardia: MiembroRef[];
  tipoDatos: 'dictada' | 'recibida';
  esObligatoria: boolean;
  esInterna: boolean;
  esExterna: boolean;
  usaUnidad: boolean | null;
  unidadNombre?: string;
  destino: string[];
  anio: number;
  autorizacion?: Autorizacion;
  creadoPor: string;
  fechaCreacion: Timestamp;
  ultimaEdicion?: {
    por: string;
    porNombre: string;
    fecha: Timestamp;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES_EDICION: RolUsuario[] = ['admin', 'jefatura', 'graduados'];
const ROLES_AUTORIZACION: RolUsuario[] = ['admin', 'jefatura', 'graduados'];

const TIPO_LABELS: Record<TipoActividad, { label: string; clase: string }> = {
  capacitacion:   { label: 'Capacitación',  clase: 'tipo--capacitacion' },
  representacion: { label: 'Representación', clase: 'tipo--representacion' },
  organizativa:   { label: 'Organizativa',   clase: 'tipo--organizativa' },
};

const formatFecha = (fecha: string) => {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
};

// ─── Modal de autorización ────────────────────────────────────────────────────

interface ModalAutorizacionProps {
  capacitacion: Capacitacion;
  usuarioNombre: string;
  usuarioOrden: string;
  onConfirmar: (obs: string) => void;
  onCerrar: () => void;
}

const ModalAutorizacion: React.FC<ModalAutorizacionProps> = ({
  capacitacion, usuarioNombre, usuarioOrden, onConfirmar, onCerrar,
}) => {
  const [obs, setObs] = useState('');

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Autorizar capacitación</h3>
          <button className="modal-close" onClick={onCerrar}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p className="modal-desc">
            Estás autorizando el registro del <strong>{formatFecha(capacitacion.fechaInicio)}</strong>
            {capacitacion.instructor && (
              <> a cargo de <strong>{capacitacion.instructor.nombre} {capacitacion.instructor.apellido}</strong></>
            )}.
          </p>
          <p className="modal-firmante">
            Firma: <strong>{usuarioOrden ? `${usuarioOrden} — ` : ''}{usuarioNombre}</strong>
          </p>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Observaciones (opcional)</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={3}
              placeholder="Agregar observaciones si corresponde..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
          <button className="btn-autorizar-confirm" onClick={() => onConfirmar(obs)}>
            <CheckCircle size={16} />
            Confirmar autorización
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de confirmación de eliminación ─────────────────────────────────────

interface ModalEliminarProps {
  onConfirmar: () => void;
  onCerrar: () => void;
}

const ModalEliminar: React.FC<ModalEliminarProps> = ({ onConfirmar, onCerrar }) => (
  <div className="modal-overlay" onClick={onCerrar}>
    <div className="modal-content modal-content--sm" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Eliminar capacitación</h3>
        <button className="modal-close" onClick={onCerrar}><X size={18} /></button>
      </div>
      <div className="modal-body">
        <p className="modal-desc">Esta acción es irreversible. La capacitación quedará registrada en auditoría.</p>
      </div>
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-eliminar-confirm" onClick={onConfirmar}>
          <Trash2 size={16} />
          Eliminar
        </button>
      </div>
    </div>
  </div>
);

// ─── Card de capacitación ─────────────────────────────────────────────────────

interface CapacitacionCardProps {
  cap: Capacitacion;
  puedeEditar: boolean;
  puedeAutorizar: boolean;
  onAutorizar: (cap: Capacitacion) => void;
  onEditar: (id: string) => void;
  onEliminar: (cap: Capacitacion) => void;
}

const CapacitacionCard: React.FC<CapacitacionCardProps> = ({
  cap, puedeEditar, puedeAutorizar, onAutorizar, onEditar, onEliminar,
}) => {
  const [expandida, setExpandida] = useState(false);
  const tipo = TIPO_LABELS[cap.tipoActividad] ?? TIPO_LABELS.capacitacion;
  const autorizada = cap.autorizacion?.autorizado === true;

  return (
    <div className={`cap-card ${autorizada ? 'cap-card--autorizada' : ''}`}>

      {/* Cabecera siempre visible */}
      <div className="cap-card__head" onClick={() => setExpandida(v => !v)}>
        <div className="cap-card__head-left">
          <span className={`badge-tipo ${tipo.clase}`}>{tipo.label}</span>
          <div className="cap-card__fechas">
            <span className="cap-card__fecha">{formatFecha(cap.fechaInicio)}</span>
            <span className="cap-card__horas">{cap.horaInicio} – {cap.horaFin} hs</span>
          </div>
          <div className="cap-card__lugar">{cap.lugarDireccion || '—'}</div>
        </div>

        <div className="cap-card__head-right">
          {autorizada ? (
            <span className="badge-estado badge-estado--ok">
              <CheckCircle size={12} /> Autorizada
            </span>
          ) : (
            <span className="badge-estado badge-estado--pending">Pendiente</span>
          )}
          <div className="cap-card__nivel">{cap.nivelCapacitacion}</div>
          <button className="cap-card__toggle" aria-label="Expandir">
            {expandida ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Detalle expandible */}
      {expandida && (
        <div className="cap-card__body">

          {/* Descripción */}
          {cap.descripcion && (
            <p className="cap-card__descripcion">{cap.descripcion}</p>
          )}

          <div className="cap-card__detail-grid">

            {/* Instructor */}
            {cap.instructor && (
              <div className="detail-item">
                <span className="detail-label">Instructor</span>
                <span className="detail-value">
                  {cap.instructor.ordenOperativo && (
                    <span className="orden-badge">{cap.instructor.ordenOperativo}</span>
                  )}
                  {cap.instructor.nombre} {cap.instructor.apellido}
                </span>
              </div>
            )}

            {/* Unidad */}
            {cap.usaUnidad && cap.unidadNombre && (
              <div className="detail-item">
                <span className="detail-label">Unidad</span>
                <span className="detail-value">{cap.unidadNombre}</span>
              </div>
            )}

            {/* Tipo de datos */}
            {cap.tipoActividad === 'capacitacion' && (
              <div className="detail-item">
                <span className="detail-label">Modalidad</span>
                <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                  {cap.tipoDatos}
                </span>
              </div>
            )}

            {/* Características */}
            <div className="detail-item">
              <span className="detail-label">Características</span>
              <span className="detail-value">
                {[
                  cap.esObligatoria && 'Obligatoria',
                  cap.esInterna && 'Interna',
                  cap.esExterna && 'Externa',
                ].filter(Boolean).join(' · ') || '—'}
              </span>
            </div>

            {/* Destino */}
            {cap.destino?.length > 0 && (
              <div className="detail-item detail-item--full">
                <span className="detail-label">Destino</span>
                <div className="detail-tags">
                  {cap.destino.map(d => (
                    <span key={d} className="detail-tag">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Participantes */}
            {cap.participantes?.length > 0 && (
              <div className="detail-item detail-item--full">
                <span className="detail-label">
                  Participantes ({cap.participantes.length})
                </span>
                <div className="detail-tags">
                  {cap.participantes.map(p => (
                    <span key={p.id} className="detail-tag detail-tag--miembro">
                      {p.ordenOperativo && (
                        <span className="orden-badge orden-badge--sm">{p.ordenOperativo}</span>
                      )}
                      {p.nombre} {p.apellido}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Personal de guardia */}
            {cap.personalGuardia?.length > 0 && (
              <div className="detail-item detail-item--full">
                <span className="detail-label">
                  Personal de guardia ({cap.personalGuardia.length})
                </span>
                <div className="detail-tags">
                  {cap.personalGuardia.map(p => (
                    <span key={p.id} className="detail-tag detail-tag--guardia">
                      {p.ordenOperativo && (
                        <span className="orden-badge orden-badge--sm">{p.ordenOperativo}</span>
                      )}
                      {p.nombre} {p.apellido}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Autorización */}
          {autorizada && cap.autorizacion && (
            <div className="cap-card__autorizacion">
              <CheckCircle size={14} />
              Autorizado por <strong>{cap.autorizacion.autorizadoPorNombre}</strong>
              {cap.autorizacion.autorizadoPorOrden && (
                <> (orden {cap.autorizacion.autorizadoPorOrden})</>
              )}
              {' · '}
              {cap.autorizacion.fechaAutorizacion?.toDate
                ? cap.autorizacion.fechaAutorizacion.toDate().toLocaleDateString('es-AR')
                : '—'}
            </div>
          )}

          {/* Última edición */}
          {cap.ultimaEdicion && (
            <div className="cap-card__auditoria">
              Última edición por <strong>{cap.ultimaEdicion.porNombre}</strong>
              {' · '}
              {cap.ultimaEdicion.fecha?.toDate
                ? cap.ultimaEdicion.fecha.toDate().toLocaleDateString('es-AR')
                : '—'}
            </div>
          )}

          {/* Acciones */}
          <div className="cap-card__actions">
            {!autorizada && puedeAutorizar && (
              <button className="btn-action btn-action--autorizar" onClick={() => onAutorizar(cap)}>
                <CheckCircle size={15} />
                Autorizar
              </button>
            )}
            {puedeEditar && (
              <button className="btn-action btn-action--editar" onClick={() => onEditar(cap.id!)}>
                <Pencil size={15} />
                Editar
              </button>
            )}
            {puedeEditar && (
              <button className="btn-action btn-action--eliminar" onClick={() => onEliminar(cap)}>
                <Trash2 size={15} />
                Eliminar
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const ListadoCapacitaciones: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aniosAbiertos, setAniosAbiertos] = useState<Set<number>>(new Set());

  // Modales
  const [modalAutorizar, setModalAutorizar] = useState<Capacitacion | null>(null);
  const [modalEliminar, setModalEliminar] = useState<Capacitacion | null>(null);
  const [modalEditarId, setModalEditarId] = useState<string | null>(null); // 🛠️ ID de la cap que estamos editando en el modal

  // Datos del usuario actual para firma
  const [usuarioPerfil, setUsuarioPerfil] = useState<{
    nombre: string; ordenOperativo: string; rol: string;
  }>({ nombre: '', ordenOperativo: '', rol: '' });

  const rol = usuarioPerfil.rol as RolUsuario;
  const puedeEditar = ROLES_EDICION.includes(rol);
  const puedeAutorizar = ROLES_AUTORIZACION.includes(rol);

  // Función de refresco de datos (la sacamos afuera para poder llamarla al guardar el modal)
  const cargarCapacitaciones = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'capacitaciones'), orderBy('fechaInicio', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Capacitacion));
      setCapacitaciones(data);
    } catch (err) {
      console.error('Error al recargar:', err);
    }
  }, [user]);

  // ── Carga inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    const cargar = async () => {
      if (!user) return;
      setCargando(true);
      try {
        // Perfil del usuario actual (para firma y permisos)
        const snapUsuario = await getDoc(doc(db, 'usuarios', user.uid));
        if (snapUsuario.exists()) {
          const d = snapUsuario.data();
          setUsuarioPerfil({
            nombre: `${d.nombre ?? ''} ${d.apellido ?? ''}`.trim(),
            ordenOperativo: d.ordenOperativo ? String(d.ordenOperativo) : '',
            rol: d.rol ?? '',
          });
        }

        await cargarCapacitaciones();

        // Abrir el año más reciente por defecto la primera vez
        if (capacitaciones.length > 0) {
          const anioMax = Math.max(...capacitaciones.map(c => c.anio ?? new Date(c.fechaInicio).getFullYear()));
          setAniosAbiertos(new Set([anioMax]));
        }
      } catch (err) {
        console.error('Error al cargar:', err);
        mostrarToast('Error al cargar capacitaciones.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [user, cargarCapacitaciones]);

  // Ejecución de apertura inicial por defecto una vez cargadas las capacitaciones
  useEffect(() => {
    if (capacitaciones.length > 0 && aniosAbiertos.size === 0) {
      const anioMax = Math.max(...capacitaciones.map(c => c.anio ?? new Date(c.fechaInicio).getFullYear()));
      setAniosAbiertos(new Set([anioMax]));
    }
  }, [capacitaciones]);

  // ── Agrupado por año ──────────────────────────────────────────────────────

  const porAnio = capacitaciones.reduce<Record<number, Capacitacion[]>>((acc, cap) => {
    const anio = cap.anio ?? new Date(cap.fechaInicio).getFullYear();
    if (!acc[anio]) acc[anio] = [];
    acc[anio].push(cap);
    return acc;
  }, {});

  const aniosOrdenados = Object.keys(porAnio)
    .map(Number)
    .sort((a, b) => b - a);

  const toggleAnio = (anio: number) => {
    setAniosAbiertos(prev => {
      const next = new Set(prev);
      next.has(anio) ? next.delete(anio) : next.add(anio);
      return next;
    });
  };

  // ── Autorizar ─────────────────────────────────────────────────────────────

  const handleAutorizar = useCallback(async (obs: string) => {
    if (!modalAutorizar || !user) return;
    try {
      const autorizacion: Autorizacion = {
        autorizado: true,
        autorizadoPor: user.uid,
        autorizadoPorNombre: usuarioPerfil.nombre,
        autorizadoPorOrden: usuarioPerfil.ordenOperativo,
        fechaAutorizacion: Timestamp.now(),
      };

      await updateDoc(doc(db, 'capacitaciones', modalAutorizar.id!), { autorizacion });

      // Auditoría
      await addDoc(collection(db, 'auditoria'), {
        accion: 'autorizar_capacitacion',
        entidad: 'capacitaciones',
        entidadId: modalAutorizar.id,
        realizadoPor: user.uid,
        realizadoPorNombre: usuarioPerfil.nombre,
        observaciones: obs || null,
        fecha: Timestamp.now(),
      });

      setCapacitaciones(prev =>
        prev.map(c => c.id === modalAutorizar.id ? { ...c, autorizacion } : c)
      );
      setModalAutorizar(null);
      mostrarToast('Capacitación autorizada.');
    } catch (err) {
      console.error(err);
      mostrarToast('Error al autorizar.');
    }
  }, [modalAutorizar, user, usuarioPerfil]);

  // ── Eliminar ──────────────────────────────────────────────────────────────

  const handleEliminar = useCallback(async () => {
    if (!modalEliminar || !user) return;
    try {
      // Auditoría antes de borrar (guarda snapshot del doc)
      await addDoc(collection(db, 'auditoria'), {
        accion: 'eliminar_capacitacion',
        entidad: 'capacitaciones',
        entidadId: modalEliminar.id,
        snapshot: JSON.stringify(modalEliminar),
        realizadoPor: user.uid,
        realizadoPorNombre: usuarioPerfil.nombre,
        fecha: Timestamp.now(),
      });

      await deleteDoc(doc(db, 'capacitaciones', modalEliminar.id!));

      setCapacitaciones(prev => prev.filter(c => c.id !== modalEliminar.id));
      setModalEliminar(null);
      mostrarToast('Capacitación eliminada.');
    } catch (err) {
      console.error(err);
      mostrarToast('Error al eliminar.');
    }
  }, [modalEliminar, user, usuarioPerfil]);

  // Callback para cuando termine la edición exitosa dentro de PCapacitaciones
  const handleModalEdicionGuardado = () => {
    setModalEditarId(null);
    cargarCapacitaciones(); // Refrescamos la lista actual
    mostrarToast('Cambios guardados con éxito.');
  };

  // ── Header ────────────────────────────────────────────────────────────────

  const headerButtons = [
    {
      icon: Plus,
      onClick: () => navigate('/p-capacitaciones'),
      ariaLabel: 'Nueva capacitación',
    },
  ];

  // ── Stats rápidas ─────────────────────────────────────────────────────────

  const anioActual = new Date().getFullYear();
  const capsAnioActual = capacitaciones.filter(c =>
    (c.anio ?? new Date(c.fechaInicio).getFullYear()) === anioActual
  );
  const totalAutorizadas = capsAnioActual.filter(c => c.autorizacion?.autorizado).length;
  const totalPendientes = capsAnioActual.length - totalAutorizadas;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="listado-cap">
        <Header title="Capacitaciones" extraButtons={headerButtons} />

        {/* Stats rápidas del año actual */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-card__num">{capsAnioActual.length}</span>
            <span className="stat-card__label">Total {anioActual}</span>
          </div>
          <div className="stat-card stat-card--ok">
            <span className="stat-card__num">{totalAutorizadas}</span>
            <span className="stat-card__label">Autorizadas</span>
          </div>
          <div className="stat-card stat-card--pending">
            <span className="stat-card__num">{totalPendientes}</span>
            <span className="stat-card__label">Pendientes</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__num">
              {capsAnioActual.filter(c => c.tipoActividad === 'capacitacion').length}
            </span>
            <span className="stat-card__label">Capacitaciones</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__num">
              {capsAnioActual.filter(c => c.tipoActividad !== 'capacitacion').length}
            </span>
            <span className="stat-card__label">Rep. / Org.</span>
          </div>
        </div>

        {/* Listado agrupado por año */}
        {cargando ? (
          <div className="listado-cap__loading">Cargando...</div>
        ) : capacitaciones.length === 0 ? (
          <div className="listado-cap__empty">
            <p>No hay capacitaciones registradas.</p>
            <button className="btn-nueva" onClick={() => navigate('/p-capacitaciones')}>
              <Plus size={16} /> Registrar la primera
            </button>
          </div>
        ) : (
          aniosOrdenados.map(anio => (
            <div key={anio} className="anio-grupo">

              {/* Cabecera del año */}
              <button
                className="anio-grupo__header"
                onClick={() => toggleAnio(anio)}
              >
                <div className="anio-grupo__title">
                  <span className="anio-grupo__year">{anio}</span>
                  <span className="anio-grupo__count">
                    {porAnio[anio].length} registro{porAnio[anio].length !== 1 ? 's' : ''}
                  </span>
                  <span className="anio-grupo__auth">
                    {porAnio[anio].filter(c => c.autorizacion?.autorizado).length} autorizado{porAnio[anio].filter(c => c.autorizacion?.autorizado).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="anio-grupo__chevron">
                  {aniosAbiertos.has(anio) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </button>

              {/* Cards del año */}
              {aniosAbiertos.has(anio) && (
                <div className="anio-grupo__body">
                  {porAnio[anio].map(cap => (
                    <CapacitacionCard
                      key={cap.id}
                      cap={cap}
                      puedeEditar={puedeEditar}
                      puedeAutorizar={puedeAutorizar && !cap.autorizacion?.autorizado}
                      onAutorizar={setModalAutorizar}
                      onEditar={id => setModalEditarId(id)} // 🛠️ En vez de navegar, setea el ID para abrir el modal
                      onEliminar={setModalEliminar}
                    />
                  ))}
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* Modal autorizar */}
      {modalAutorizar && (
        <ModalAutorizacion
          capacitacion={modalAutorizar}
          usuarioNombre={usuarioPerfil.nombre}
          usuarioOrden={usuarioPerfil.ordenOperativo}
          onConfirmar={handleAutorizar}
          onCerrar={() => setModalAutorizar(null)}
        />
      )}

      {/* Modal eliminar */}
      {modalEliminar && (
        <ModalEliminar
          onConfirmar={handleEliminar}
          onCerrar={() => setModalEliminar(null)}
        />
      )}

      {/* 🛠️ MODAL DE EDICIÓN INCORPORADO */}
      {modalEditarId && (
        <div className="modal-overlay modal-overlay--edicion" onClick={() => setModalEditarId(null)}>
          {/* Le damos una clase más grande (.modal-content--lg) porque los formularios suelen requerir espacio */}
          <div className="modal-content modal-content--lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar registro</h3>
              <button className="modal-close" onClick={() => setModalEditarId(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: 'calc(80vh - 100px)', overflowY: 'auto' }}>
              {/* Pasamos el idCapacitacionEdicion o una prop similar para que tu formulario reconozca 
                que está en modo edición. Ajustá la prop al nombre real que use tu componente PCapacitaciones
              */}
              <PCapacitaciones 
                idEdicion={modalEditarId} 
                isModal={true} 
                onGuardado={handleModalEdicionGuardado} 
              />
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        toastClassName="toast-style"
      />
    </>
  );
};

export default ListadoCapacitaciones;