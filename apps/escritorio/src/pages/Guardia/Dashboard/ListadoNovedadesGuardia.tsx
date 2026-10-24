// src/pages/Guardia/Dashboard/ListadoNovedadesGuardia.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../app/firebase-config';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, addDoc, Timestamp, orderBy, query
} from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { Plus, CheckCircle, Trash2, X, Save, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../../../components/Header';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import type { NovedadGuardia } from './types';
import './ListadoNovedadesGuardia.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFecha = (ts?: Timestamp): string => {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

type FiltroEstado = 'todas' | 'pendiente' | 'resuelta';
type FiltroCategoria = 'todas' | NovedadGuardia['categoria'];
type FiltroPrioridad = 'todas' | NovedadGuardia['prioridad'];

const ListadoNovedadesGuardia: React.FC = () => {
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();
  const esAdmin = user?.rol === 'admin';

  const [novedades, setNovedades] = useState<NovedadGuardia[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>('todas');
  const [filtroPrioridad, setFiltroPrioridad] = useState<FiltroPrioridad>('todas');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevaPrioridad, setNuevaPrioridad] = useState<NovedadGuardia['prioridad']>('media');
  const [nuevaCategoria, setNuevaCategoria] = useState<NovedadGuardia['categoria']>('vehiculos');
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  // Modal Resolver
  const [novedadAResolver, setNovedadAResolver] = useState<NovedadGuardia | null>(null);
  const [notaResolucion, setNotaResolucion] = useState('');
  const [resolviendo, setResolviendo] = useState(false);

  // Modal Eliminar Individual (Solo Admin)
  const [novedadAEliminar, setNovedadAEliminar] = useState<NovedadGuardia | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Modal Limpieza Masiva +30 días (Solo Admin)
  const [modalLimpiarAntiguas, setModalLimpiarAntiguas] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  // ── Carga de novedades ──────────────────────────────────────────────────────

  const cargarNovedades = useCallback(async () => {
    setCargando(true);
    try {
      const q = query(
        collection(db, 'novedades_guardia'),
        orderBy('fechaRegistro', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as NovedadGuardia));
      setNovedades(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar historial de novedades.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarNovedades();
  }, [cargarNovedades]);

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const novedadesFiltradas = useMemo(() => {
    return novedades.filter(n => {
      const pasaEstado = filtroEstado === 'todas' || n.estado === filtroEstado;
      const pasaCategoria = filtroCategoria === 'todas' || n.categoria === filtroCategoria;
      const pasaPrioridad = filtroPrioridad === 'todas' || n.prioridad === filtroPrioridad;

      const termino = busqueda.toLowerCase().trim();
      const pasaBusqueda = !termino ||
        n.titulo.toLowerCase().includes(termino) ||
        (n.descripcion && n.descripcion.toLowerCase().includes(termino)) ||
        (n.registradoPorNombre && n.registradoPorNombre.toLowerCase().includes(termino)) ||
        (n.resueltoPorNombre && n.resueltoPorNombre.toLowerCase().includes(termino));

      return pasaEstado && pasaCategoria && pasaPrioridad && pasaBusqueda;
    });
  }, [novedades, filtroEstado, filtroCategoria, filtroPrioridad, busqueda]);

  const cantPendientes = useMemo(() => {
    return novedades.filter(n => n.estado === 'pendiente').length;
  }, [novedades]);

  // Novedades resueltas con más de 30 días de antigüedad
  const resueltasAntiguas = useMemo(() => {
    const limite30Dias = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return novedades.filter(n => {
      if (n.estado !== 'resuelta') return false;
      const fechaMillis = n.fechaResolucion?.toMillis?.() ?? n.fechaRegistro?.toMillis?.() ?? 0;
      return fechaMillis > 0 && fechaMillis < limite30Dias;
    });
  }, [novedades]);

  // ── Acciones / Handlers ────────────────────────────────────────────────────

  const handleCrearNovedad = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !miembroActivo || !nuevoTitulo.trim()) return;
    setGuardandoNuevo(true);
    try {
      const operador = buildOperador(miembroActivo, user.rol);
      const nuevaNovedad: Omit<NovedadGuardia, 'id'> = {
        titulo: nuevoTitulo.trim(),
        descripcion: nuevaDescripcion.trim(),
        prioridad: nuevaPrioridad,
        categoria: nuevaCategoria,
        estado: 'pendiente',
        fechaRegistro: Timestamp.now(),
        registradoPorUid: operador.uid,
        registradoPorNombre: operador.nombre,
      };

      const ref = await addDoc(collection(db, 'novedades_guardia'), nuevaNovedad);

      await registrarAuditoria({
        accion: 'crear',
        coleccion: 'novedades_guardia',
        docId: ref.id,
        docResumen: `Novedad: ${nuevaNovedad.titulo}`,
        operador,
        detalles: { descripcion: `Prioridad: ${nuevaPrioridad} - Categoría: ${nuevaCategoria}` }
      });

      toast.success('Novedad registrada con éxito');
      setNuevoTitulo('');
      setNuevaDescripcion('');
      setModalNuevo(false);
      cargarNovedades();
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar la novedad');
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const handleConfirmarResolucion = async () => {
    if (!user || !miembroActivo || !novedadAResolver?.id) return;
    setResolviendo(true);
    try {
      const operador = buildOperador(miembroActivo, user.rol);
      const updateData: Partial<NovedadGuardia> = {
        estado: 'resuelta',
        fechaResolucion: Timestamp.now(),
        resueltoPorUid: operador.uid,
        resueltoPorNombre: operador.nombre,
        ...(notaResolucion.trim() && {
          notaResolucion: notaResolucion.trim(),
          observacionesResolucion: notaResolucion.trim(),
        }),
      };

      await updateDoc(doc(db, 'novedades_guardia', novedadAResolver.id), updateData);

      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'novedades_guardia',
        docId: novedadAResolver.id,
        docResumen: `Resolución: ${novedadAResolver.titulo}`,
        operador,
        detalles: {
          descripcion: `Marcó la novedad como resuelta.${notaResolucion.trim() ? ` Nota: ${notaResolucion.trim()}` : ''}`
        }
      });

      toast.success('Novedad marcada como resuelta.');
      setNovedadAResolver(null);
      setNotaResolucion('');
      cargarNovedades();
    } catch (err) {
      console.error(err);
      toast.error('Error al resolver novedad.');
    } finally {
      setResolviendo(false);
    }
  };

  const handleEliminarIndividual = async () => {
    if (!user || !miembroActivo || !novedadAEliminar?.id) return;
    setEliminando(true);
    try {
      const operador = buildOperador(miembroActivo, user.rol);
      await deleteDoc(doc(db, 'novedades_guardia', novedadAEliminar.id));

      await registrarAuditoria({
        accion: 'eliminar',
        coleccion: 'novedades_guardia',
        docId: novedadAEliminar.id,
        docResumen: `Eliminada novedad: ${novedadAEliminar.titulo}`,
        operador,
        detalles: {
          descripcion: `Eliminó registro de novedad resuelta "${novedadAEliminar.titulo}" (Categoría: ${novedadAEliminar.categoria})`
        }
      });

      toast.success('Novedad eliminada.');
      setNovedadAEliminar(null);
      cargarNovedades();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar novedad.');
    } finally {
      setEliminando(false);
    }
  };

  const handleLimpiarAntiguas = async () => {
    if (!user || !miembroActivo || resueltasAntiguas.length === 0) return;
    setLimpiando(true);
    try {
      const batch = writeBatch(db);
      resueltasAntiguas.forEach(n => {
        if (n.id) {
          batch.delete(doc(db, 'novedades_guardia', n.id));
        }
      });
      await batch.commit();

      const operador = buildOperador(miembroActivo, user.rol);
      await registrarAuditoria({
        accion: 'eliminar',
        coleccion: 'novedades_guardia',
        docId: 'batch-novedades-30d',
        docResumen: `Limpieza: ${resueltasAntiguas.length} novedades resueltas (+30 días)`,
        operador,
        detalles: {
          descripcion: `Eliminación masiva de ${resueltasAntiguas.length} novedades resueltas con más de 30 días de antigüedad.`
        }
      });

      toast.success(`Se eliminaron ${resueltasAntiguas.length} novedades antiguas.`);
      setModalLimpiarAntiguas(false);
      cargarNovedades();
    } catch (err) {
      console.error(err);
      toast.error('Error al limpiar novedades antiguas.');
    } finally {
      setLimpiando(false);
    }
  };

  // Header buttons
  const headerButtons = [
    { icon: Plus, onClick: () => setModalNuevo(true), ariaLabel: 'Nueva novedad' },
  ];

  return (
    <div className="listado-novedades-wrapper">
      <Header
        title="Historial de Novedades de Guardia"
        onBack={() => navigate('/guardia')}
        extraButtons={headerButtons}
      />

      {/* Alerta de pendientes */}
      {cantPendientes > 0 && (
        <div className="alerta-pendientes">
          <ClipboardList size={18} />
          <span>{cantPendientes} {cantPendientes === 1 ? 'novedad pendiente' : 'novedades pendientes'} de resolución</span>
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="filtros-bar">
        <div className="filtros-izquierda">
          <div className="filtros-estado">
            {(['todas', 'pendiente', 'resuelta'] as FiltroEstado[]).map(f => (
              <button
                key={f}
                type="button"
                className={`filtro-btn ${filtroEstado === f ? 'filtro-btn--active' : ''}`}
                onClick={() => setFiltroEstado(f)}
              >
                {f === 'todas' ? 'Todas' : f === 'pendiente' ? 'Pendientes' : 'Resueltas'}
              </button>
            ))}
          </div>

          <div className="filtros-selects">
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value as FiltroCategoria)}
              className="select-filtro"
              aria-label="Filtrar por categoría"
            >
              <option value="todas">Todas las categorías</option>
              <option value="vehiculos">Vehículos</option>
              <option value="edilicio">Edilicio</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="administrativo">Administrativo</option>
              <option value="otro">Otro</option>
            </select>

            <select
              value={filtroPrioridad}
              onChange={e => setFiltroPrioridad(e.target.value as FiltroPrioridad)}
              className="select-filtro"
              aria-label="Filtrar por prioridad"
            >
              <option value="todas">Todas las prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>

        <div className="filtros-derecha">
          <input
            type="text"
            className="buscador"
            placeholder="Buscar por título, detalle o personas..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />

          {/* Botón Admin: Limpiar antiguos (+30 días) */}
          {esAdmin && resueltasAntiguas.length > 0 && (
            <button
              type="button"
              className="btn-limpiar-antiguos"
              onClick={() => setModalLimpiarAntiguas(true)}
              title="Eliminar novedades resueltas hace más de 30 días"
            >
              <Trash2 size={14} /> Limpiar antiguos (+30 días) ({resueltasAntiguas.length})
            </button>
          )}
        </div>
      </div>

        {/* Tabla */}
        {cargando ? (
          <p className="estado-carga">Cargando historial de novedades...</p>
        ) : novedadesFiltradas.length === 0 ? (
          <p className="estado-vacio">No se encontraron novedades con los filtros seleccionados.</p>
        ) : (
          <div className="tabla-wrap">
            <table className="tabla-novedades">
              <thead>
                <tr>
                  <th>Prioridad</th>
                  <th>Categoría</th>
                  <th>Novedad / Detalle</th>
                  <th>Registrado</th>
                  <th>Estado</th>
                  <th>Resolución</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {novedadesFiltradas.map(n => (
                  <tr key={n.id}>
                    <td>
                      <span className={`badge-prioridad badge-${n.prioridad}`}>
                        {n.prioridad}
                      </span>
                    </td>
                    <td>
                      <span className="tag-categoria">
                        {n.categoria}
                      </span>
                    </td>
                    <td>
                      <span className="novedad-titulo">{n.titulo}</span>
                      {n.descripcion && (
                        <p className="novedad-desc">{n.descripcion}</p>
                      )}
                    </td>
                    <td className="col-fecha">
                      <strong>{formatFecha(n.fechaRegistro)}</strong>
                      <small>por {n.registradoPorNombre}</small>
                    </td>
                    <td>
                      <span className={`badge-estado badge-estado--${n.estado}`}>
                        {n.estado === 'pendiente' ? 'Pendiente' : 'Resuelta'}
                      </span>
                    </td>
                    <td className="col-resolucion">
                      {n.estado === 'resuelta' ? (
                        <>
                          <div className="col-fecha">
                            <strong>{formatFecha(n.fechaResolucion)}</strong>
                            {n.resueltoPorNombre && (
                              <small>por {n.resueltoPorNombre}</small>
                            )}
                          </div>
                          {(n.notaResolucion || n.observacionesResolucion) && (
                            <span 
                              className="nota-resolucion-tag" 
                              title={n.notaResolucion || n.observacionesResolucion}
                            >
                              Nota: {n.notaResolucion || n.observacionesResolucion}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td className="col-accion">
                      {n.estado === 'pendiente' && (
                        <button
                          type="button"
                          className="btn-resolver"
                          onClick={() => {
                            setNovedadAResolver(n);
                            setNotaResolucion('');
                          }}
                          title="Marcar como resuelta"
                        >
                          <CheckCircle size={15} /> Resolver
                        </button>
                      )}
                      {n.estado === 'resuelta' && esAdmin && (
                        <button
                          type="button"
                          className="btn-eliminar-item"
                          onClick={() => setNovedadAEliminar(n)}
                          title="Eliminar novedad"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Modal Registrar Nueva Novedad */}
      {modalNuevo && (
        <div className="modal-overlay">
          <div className="modal-solido-container">
            <div className="modal-solido-header">
              <h3 className="modal-solido-title">Registrar Nueva Novedad</h3>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setModalNuevo(false)}
                disabled={guardandoNuevo}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearNovedad} className="modal-solido-body">
              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>NOVEDAD / PENDIENTE</label>
                </div>
                <input
                  type="text"
                  placeholder="Escribir acá..."
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  className="input-solido"
                  required
                />
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>OBSERVACIÓN (OPCIONAL)</label>
                </div>
                <textarea
                  placeholder="Detalle adicional..."
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  className="input-solido"
                  rows={2}
                />
              </div>

              <div className="form-row-solido">
                <div className="form-col-solido">
                  <div className="label-wrap-solido">
                    <label>PRIORIDAD</label>
                  </div>
                  <select
                    value={nuevaPrioridad}
                    onChange={(e) => setNuevaPrioridad(e.target.value as any)}
                    className="input-solido"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div className="form-col-solido">
                  <div className="label-wrap-solido">
                    <label>CATEGORÍA</label>
                  </div>
                  <select
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value as any)}
                    className="input-solido"
                  >
                    <option value="vehiculos">Vehículos</option>
                    <option value="edilicio">Edilicio</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="modal-solido-actions">
                <button
                  type="submit"
                  className="btn-solido-primary"
                  disabled={guardandoNuevo}
                >
                  <Save size={18} /> {guardandoNuevo ? 'Guardando...' : 'Guardar Novedad'}
                </button>
                <button
                  type="button"
                  className="btn-solido-secondary"
                  onClick={() => setModalNuevo(false)}
                  disabled={guardandoNuevo}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Resolución */}
      {novedadAResolver && (
        <div className="modal-overlay">
          <div className="modal-solido-container modal-compacto-resolver">
            <div className="modal-solido-header">
              <h3 className="modal-solido-title">Confirmar Resolución</h3>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => {
                  setNovedadAResolver(null);
                  setNotaResolucion('');
                }}
                disabled={resolviendo}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-solido-body">
              <div className="modal-info-box">
                <span className="modal-info-label">Novedad a resolver:</span>
                <strong className="modal-info-title">{novedadAResolver.titulo}</strong>
                {novedadAResolver.descripcion && (
                  <p className="modal-info-desc">{novedadAResolver.descripcion}</p>
                )}
                <div className="modal-info-tags">
                  <span className={`badge-prioridad badge-${novedadAResolver.prioridad}`}>
                    {novedadAResolver.prioridad}
                  </span>
                  <span className="tag-categoria">
                    {novedadAResolver.categoria}
                  </span>
                </div>
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>NOTA DE RESOLUCIÓN (OPCIONAL)</label>
                </div>
                <textarea
                  placeholder="Ej: Se reparó la cerradura, vehículo entregado..."
                  value={notaResolucion}
                  onChange={(e) => setNotaResolucion(e.target.value)}
                  className="input-solido"
                  rows={3}
                />
              </div>

              <div className="modal-solido-actions modal-solido-actions--row">
                <button
                  type="button"
                  className="btn-solido-secondary"
                  onClick={() => {
                    setNovedadAResolver(null);
                    setNotaResolucion('');
                  }}
                  disabled={resolviendo}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-solido-primary btn-solido-primary--success"
                  onClick={handleConfirmarResolucion}
                  disabled={resolviendo}
                >
                  <CheckCircle size={18} />
                  {resolviendo ? 'Resolviendo...' : 'Confirmar resolución'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación Individual (Solo Admin) */}
      {novedadAEliminar && (
        <div className="modal-overlay">
          <div className="modal-container modal-container--sm">
            <div className="modal-header">
              <h3 className="modal-title">Eliminar Novedad</h3>
              <button
                className="btn-icon-modal"
                onClick={() => setNovedadAEliminar(null)}
                disabled={eliminando}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155' }}>
                ¿Estás seguro de que deseas eliminar permanentemente esta novedad resuelta?
              </p>
              <div className="info-box">
                <p><strong>Título:</strong> {novedadAEliminar.titulo}</p>
                {novedadAEliminar.descripcion && (
                  <p><strong>Detalle:</strong> {novedadAEliminar.descripcion}</p>
                )}
                <p><strong>Categoría:</strong> {novedadAEliminar.categoria.toUpperCase()}</p>
                <p><strong>Registrado:</strong> {formatFecha(novedadAEliminar.fechaRegistro)} por {novedadAEliminar.registradoPorNombre}</p>
                {novedadAEliminar.fechaResolucion && (
                  <p><strong>Resuelto:</strong> {formatFecha(novedadAEliminar.fechaResolucion)} por {novedadAEliminar.resueltoPorNombre}</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setNovedadAEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={handleEliminarIndividual}
                disabled={eliminando}
              >
                <Trash2 size={16} />
                {eliminando ? 'Eliminando...' : 'Eliminar novedad'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Limpieza Masiva (+30 días) (Solo Admin) */}
      {modalLimpiarAntiguas && (
        <div className="modal-overlay">
          <div className="modal-container modal-container--sm">
            <div className="modal-header">
              <h3 className="modal-title">Limpiar Resueltas (+30 días)</h3>
              <button
                className="btn-icon-modal"
                onClick={() => setModalLimpiarAntiguas(false)}
                disabled={limpiando}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                Se eliminarán permanentemente <strong>{resueltasAntiguas.length}</strong> {resueltasAntiguas.length === 1 ? 'novedad resuelta' : 'novedades resueltas'} con más de 30 días de antigüedad.
              </p>
              <div className="info-box" style={{ backgroundColor: '#fff1f2', borderColor: '#fecaca' }}>
                <p style={{ color: '#be123c', fontSize: '13px' }}>
                  Esta acción no se puede deshacer. Las novedades eliminadas no podrán recuperarse.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setModalLimpiarAntiguas(false)}
                disabled={limpiando}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={handleLimpiarAntiguas}
                disabled={limpiando}
              >
                <Trash2 size={16} />
                {limpiando ? 'Eliminando...' : `Eliminar ${resueltasAntiguas.length} novedades`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListadoNovedadesGuardia;
