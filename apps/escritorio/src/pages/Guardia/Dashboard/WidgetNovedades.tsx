import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../app/firebase-config';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { toast } from 'sonner';
import { CheckCircle, ClipboardList, Plus, X, Save, Clock } from 'lucide-react';
import type { NovedadGuardia } from './types';

import './WidgetNovedades.css';

const CATEGORIAS_FILTRO: { id: 'todas' | NovedadGuardia['categoria']; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'vehiculos', label: 'Vehículos' },
  { id: 'edilicio', label: 'Edilicio' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
  { id: 'administrativo', label: 'Administrativo' },
  { id: 'otro', label: 'Otro' },
];

const prioridadPeso: Record<NovedadGuardia['prioridad'], number> = {
  alta: 3,
  media: 2,
  baja: 1,
};

export const formatearFechaHora = (ts?: Timestamp): string => {
  if (!ts) return '—';
  const d = ts.toDate();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const horas = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} · ${horas}:${mins} hs`;
};

const WidgetNovedades: React.FC = () => {
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();
  const [novedades, setNovedades] = useState<NovedadGuardia[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtro rápido por categoría
  const [categoriaFiltro, setCategoriaFiltro] = useState<'todas' | NovedadGuardia['categoria']>('todas');

  // Formulario de nueva novedad
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<'alta' | 'media' | 'baja'>('media');
  const [categoria, setCategoria] = useState<NovedadGuardia['categoria']>('vehiculos');
  const [guardandoNovedad, setGuardandoNovedad] = useState(false);

  // Modal de confirmación para resolver
  const [novedadAResolver, setNovedadAResolver] = useState<NovedadGuardia | null>(null);
  const [notaResolucion, setNotaResolucion] = useState('');
  const [resolviendo, setResolviendo] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'novedades_guardia'), where('estado', '==', 'pendiente'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as NovedadGuardia));
      setNovedades(data);
      setCargando(false);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Ordenamiento: prioridad (alta > media > baja) y luego fechaRegistro más reciente
  const novedadesOrdenadas = useMemo(() => {
    return [...novedades].sort((a, b) => {
      const pesoA = prioridadPeso[a.prioridad] ?? 0;
      const pesoB = prioridadPeso[b.prioridad] ?? 0;
      if (pesoB !== pesoA) {
        return pesoB - pesoA;
      }
      const timeA = a.fechaRegistro?.toMillis ? a.fechaRegistro.toMillis() : 0;
      const timeB = b.fechaRegistro?.toMillis ? b.fechaRegistro.toMillis() : 0;
      return timeB - timeA;
    });
  }, [novedades]);

  // Novedades filtradas en memoria
  const novedadesFiltradas = useMemo(() => {
    if (categoriaFiltro === 'todas') return novedadesOrdenadas;
    return novedadesOrdenadas.filter(nov => nov.categoria === categoriaFiltro);
  }, [novedadesOrdenadas, categoriaFiltro]);

  const handleCrearNovedad = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !miembroActivo || !titulo.trim()) return;
    setGuardandoNovedad(true);
    try {
      const operador = buildOperador(miembroActivo, user.rol);
      const nuevaNovedad: Omit<NovedadGuardia, 'id'> = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        prioridad,
        categoria,
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
        detalles: { descripcion: `Prioridad: ${prioridad} - Categoría: ${categoria}` }
      });

      toast.success('Novedad registrada con éxito');
      setTitulo('');
      setDescripcion('');
      setMostrarForm(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar la novedad');
    } finally {
      setGuardandoNovedad(false);
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

      toast.success('Novedad resuelta con éxito');
      setNovedadAResolver(null);
      setNotaResolucion('');
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar la novedad');
    } finally {
      setResolviendo(false);
    }
  };

  return (
    <>
      <div className="widget-card widget-card-novedades">
        {/* Header Limpio con Contador y Botón de Acción Suave */}
        <div className="widget-header">
          <div className="widget-header-title-wrap">
            <h3 className="widget-title">
              <ClipboardList size={20} color="#475569" />
              Novedades de Guardia
            </h3>
            <span className="widget-counter-badge" title={`${novedades.length} activas`}>
              {novedades.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMostrarForm(true)}
            className="btn-widget-action"
            title="Agregar novedad"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Filtro rápido por categoría */}
        {novedades.length > 0 && (
          <div className="widget-novedades-filtros">
            {CATEGORIAS_FILTRO.map((cat) => {
              const count = cat.id === 'todas'
                ? novedades.length
                : novedades.filter(n => n.categoria === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-pill ${categoriaFiltro === cat.id ? 'filter-pill--active' : ''}`}
                  onClick={() => setCategoriaFiltro(cat.id)}
                >
                  {cat.label}
                  {count > 0 && <span className="filter-pill-count">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Contenido / Listado con Scroll Interno Prolijo */}
        {cargando ? (
          <p className="widget-loading">Cargando...</p>
        ) : novedades.length === 0 ? (
          <p className="widget-empty-msg">Sin novedades pendientes por ahora.</p>
        ) : novedadesFiltradas.length === 0 ? (
          <p className="widget-empty-msg">
            No hay novedades pendientes en "{CATEGORIAS_FILTRO.find(c => c.id === categoriaFiltro)?.label}".
          </p>
        ) : (
          <ul className="widget-list widget-list-scrollable">
            {novedadesFiltradas.map(nov => (
              <li key={nov.id} className={`widget-list-item prioridad-${nov.prioridad}`}>
                <div className="novedad-item-content">
                  <strong className="novedad-item-title">{nov.titulo}</strong>
                  {nov.descripcion && (
                    <span className="novedad-item-desc">
                      {nov.descripcion}
                    </span>
                  )}
                  <div className="widget-meta-row">
                    <span className={`badge-prioridad badge-${nov.prioridad}`}>
                      {nov.prioridad}
                    </span>
                    <span className="widget-meta-tag widget-meta-tag--categoria">
                      {nov.categoria.toUpperCase()}
                    </span>
                    <span className="widget-meta-time">
                      <Clock size={12} className="widget-meta-tag-icon" />
                      {formatearFechaHora(nov.fechaRegistro)}
                    </span>
                    <span className="widget-meta-author">
                      · {nov.registradoPorNombre}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNovedadAResolver(nov);
                    setNotaResolucion('');
                  }}
                  title="Marcar como resuelta"
                  className="btn-action-round"
                >
                  <CheckCircle size={22} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Pie del Widget con enlace al historial completo */}
        {!cargando && (
          <div className="widget-card-footer">
            <button
              type="button"
              onClick={() => navigate('/guardia/novedades-historial')}
              className="widget-link-btn"
              title="Ir al historial completo de novedades de guardia"
            >
              Ver historial completo →
            </button>
          </div>
        )}
      </div>

      {/* Modal Registrar Nueva Novedad */}
      {mostrarForm && (
        <div className="modal-overlay">
          <div className="modal-solido-container">
            <div className="modal-solido-header">
              <h3 className="modal-solido-title">Registrar Nueva Novedad</h3>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setMostrarForm(false)}
                disabled={guardandoNovedad}
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
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
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
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
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
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
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
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
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
                  disabled={guardandoNovedad}
                >
                  <Save size={18} /> {guardandoNovedad ? 'Guardando...' : 'Guardar Novedad'}
                </button>
                <button
                  type="button"
                  className="btn-solido-secondary"
                  onClick={() => setMostrarForm(false)}
                  disabled={guardandoNovedad}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Compacto de Confirmación para Resolver Novedad */}
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
                  <span className="widget-meta-tag widget-meta-tag--categoria">
                    {novedadAResolver.categoria.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>NOTA DE RESOLUCIÓN (OPCIONAL)</label>
                </div>
                <textarea
                  placeholder="Ej: Se reparó la bisagra, vehículo operativo..."
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
    </>
  );
};

export default WidgetNovedades;