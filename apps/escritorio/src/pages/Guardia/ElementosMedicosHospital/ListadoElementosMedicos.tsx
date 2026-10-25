import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../app/firebase-config';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, Timestamp, orderBy, query, limit,
} from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { Plus, Settings, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../../../components/Header';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';

import Modal from '../../../components/Modal';
import ModalRegistrarElemento from './ModalRegistrarElemento';
import ModalConfigGuardia from './ModalConfigGuardia';

import type { ElementoMedicoHospital, EstadoElemento } from './types';
import './ListadoElementosMedicos.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFecha = (ts?: Timestamp): string => {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const nombreElemento = (r: ElementoMedicoHospital) =>
  r.elemento === 'Otro' ? (r.elementoOtro ?? 'Otro') : r.elemento;

const nombreHospital = (r: ElementoMedicoHospital) =>
  r.hospital === 'Otro' ? (r.hospitalOtro ?? 'Otro') : r.hospital;

// ─── Modal Recuperación ───────────────────────────────────────────────────────

interface ModalRecuperacionProps {
  registro: ElementoMedicoHospital & { id: string };
  onCerrar: () => void;
  onRecuperado: () => void;
}

const ModalRecuperacion: React.FC<ModalRecuperacionProps> = ({ registro, onCerrar, onRecuperado }) => {
  const { user, miembroActivo } = useUser();
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleRecuperar = async () => {
    if (!user || !miembroActivo) return;
    setGuardando(true);
    try {
      const operador = buildOperador(miembroActivo, user.rol);

      await updateDoc(doc(db, 'elementos_medicos_hospital', registro.id), {
        estado: 'recuperado',
        fechaRecuperacion: Timestamp.now(),
        fechaResolucion: Timestamp.now(),
        resueltoPorUid: operador.uid,
        resueltoPorNombre: operador.nombre,
        ...(observaciones.trim() && { observacionesRecuperacion: observaciones.trim() }),
      });

      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'elementos_medicos_hospital',
        docId: registro.id,
        docResumen: `Recuperación: ${nombreElemento(registro)} (x${registro.cantidad})`,
        operador,
        detalles: {
          descripcion: `Marcó como recuperado de ${nombreHospital(registro)}`,
        },
      });

      toast.success('Marcado como recuperado.');
      onRecuperado();
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onCerrar} title="Confirmar recuperación" maxWidth="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="modal-info-box">
          <p><strong>Elemento:</strong> {nombreElemento(registro)} (x{registro.cantidad})</p>
          <p><strong>Hospital:</strong> {nombreHospital(registro)}</p>
          <p><strong>Unidad:</strong> {registro.unidadNombre}</p>
          <p><strong>Depositado:</strong> {formatFecha(registro.fechaRegistro)}</p>
        </div>
        <div className="form-col-solido">
          <div className="label-wrap-solido">
            <label>Observaciones de recuperación (opcional)</label>
          </div>
          <textarea
            className="input-solido"
            rows={3}
            placeholder="Ej: Recuperado sin novedad, faltaba 1 unidad..."
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
          />
        </div>
        <div className="modal-solido-actions modal-solido-actions--row">
          <button className="btn-solido-secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn-solido-primary btn-solido-primary--success" onClick={handleRecuperar} disabled={guardando}>
            <CheckCircle size={16} />
            {guardando ? 'Guardando...' : 'Confirmar recuperación'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

type FiltroEstado = 'todos' | EstadoElemento;

const ListadoElementosMedicos: React.FC = () => {
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();
  const esAdmin = user?.rol === 'admin';

  const [registros, setRegistros] = useState<(ElementoMedicoHospital & { id: string })[]>([]);
  const [cargando, setCargando] = useState(true);
  const [limite, setLimite] = useState(50);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [busqueda, setBusqueda] = useState('');

  const [modalNuevo, setModalNuevo] = useState(false);
  const [registroARecuperar, setRegistroARecuperar] = useState<(ElementoMedicoHospital & { id: string }) | null>(null);
  const [modalConfig, setModalConfig] = useState(false);

  // Estados para eliminación (solo admin)
  const [registroAEliminar, setRegistroAEliminar] = useState<(ElementoMedicoHospital & { id: string }) | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [modalLimpiarAntiguos, setModalLimpiarAntiguos] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  // ── Carga ──────────────────────────────────────────────────────────────────

  const cargarRegistros = useCallback(async () => {
    setCargando(true);
    try {
      const q = query(
        collection(db, 'elementos_medicos_hospital'),
        orderBy('fechaRegistro', 'desc'),
        limit(limite),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ElementoMedicoHospital & { id: string }));
      setRegistros(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar registros.');
    } finally {
      setCargando(false);
    }
  }, [limite]);

  useEffect(() => { cargarRegistros(); }, [cargarRegistros]);

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      const pasaEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
      const termino = busqueda.toLowerCase();
      const pasaBusqueda = !termino ||
        nombreElemento(r).toLowerCase().includes(termino) ||
        nombreHospital(r).toLowerCase().includes(termino) ||
        r.unidadNombre.toLowerCase().includes(termino);
      return pasaEstado && pasaBusqueda;
    });
  }, [registros, filtroEstado, busqueda]);

  const cantPendientes = useMemo(() => {
    return registros.filter(r => r.estado === 'pendiente').length;
  }, [registros]);

  // Registros recuperados con más de 30 días de antigüedad
  const recuperadosAntiguos = useMemo(() => {
    const limite30Dias = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return registros.filter(r => {
      if (r.estado !== 'recuperado') return false;
      const fechaMillis = r.fechaRecuperacion?.toMillis?.() ?? r.fechaRegistro?.toMillis?.() ?? 0;
      return fechaMillis > 0 && fechaMillis < limite30Dias;
    });
  }, [registros]);

  // ── Handlers de eliminación (Solo Admin) ────────────────────────────────────

  const handleEliminarIndividual = async () => {
    if (!user || !miembroActivo || !registroAEliminar?.id) return;
    setEliminando(true);
    try {
      const operador = buildOperador(miembroActivo, user.rol);
      await deleteDoc(doc(db, 'elementos_medicos_hospital', registroAEliminar.id));

      await registrarAuditoria({
        accion: 'eliminar',
        coleccion: 'elementos_medicos_hospital',
        docId: registroAEliminar.id,
        docResumen: `Eliminado: ${registroAEliminar.cantidad}x ${nombreElemento(registroAEliminar)}`,
        operador,
        detalles: {
          descripcion: `Eliminó registro de elemento médico recuperado de ${nombreHospital(registroAEliminar)}`
        }
      });

      toast.success('Registro eliminado.');
      setRegistroAEliminar(null);
      cargarRegistros();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar registro.');
    } finally {
      setEliminando(false);
    }
  };

  const handleLimpiarAntiguos = async () => {
    if (!user || !miembroActivo || recuperadosAntiguos.length === 0) return;
    setLimpiando(true);
    try {
      const batch = writeBatch(db);
      recuperadosAntiguos.forEach(r => {
        batch.delete(doc(db, 'elementos_medicos_hospital', r.id));
      });
      await batch.commit();

      const operador = buildOperador(miembroActivo, user.rol);
      await registrarAuditoria({
        accion: 'eliminar',
        coleccion: 'elementos_medicos_hospital',
        docId: 'batch-recuperados-30d',
        docResumen: `Limpieza: ${recuperadosAntiguos.length} elementos recuperados antiguos (+30 días)`,
        operador,
        detalles: {
          descripcion: `Eliminación masiva de ${recuperadosAntiguos.length} registros recuperados con más de 30 días de antigüedad.`
        }
      });

      toast.success(`Se eliminaron ${recuperadosAntiguos.length} registros antiguos.`);
      setModalLimpiarAntiguos(false);
      cargarRegistros();
    } catch (err) {
      console.error(err);
      toast.error('Error al limpiar registros antiguos.');
    } finally {
      setLimpiando(false);
    }
  };

  // ── Header buttons ─────────────────────────────────────────────────────────

  const headerButtons = [
    ...(esAdmin ? [{ icon: Settings, onClick: () => setModalConfig(true), ariaLabel: 'Configuración de listas' }] : []),
    { icon: Plus, onClick: () => setModalNuevo(true), ariaLabel: 'Registrar elemento' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="elementos-medicos-wrapper">
      <Header 
        title="Elementos médicos en hospital" 
        onBack={() => navigate('/guardia')} 
        extraButtons={headerButtons} 
      />

      {/* Resumen rápido */}
      {cantPendientes > 0 && (
        <div className="alerta-pendientes">
          <CheckCircle size={16} />
          <span>{cantPendientes} {cantPendientes === 1 ? 'elemento pendiente' : 'elementos pendientes'} de recuperar</span>
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="filtros-bar">
        <div className="filtros-izquierda">
          <div className="filtros-estado">
            {(['todos', 'pendiente', 'recuperado'] as FiltroEstado[]).map(f => (
              <button
                key={f}
                type="button"
                className={`filtro-btn ${filtroEstado === f ? 'filtro-btn--active' : ''}`}
                onClick={() => setFiltroEstado(f)}
              >
                {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : 'Recuperados'}
              </button>
            ))}
          </div>
        </div>

        <div className="filtros-derecha">
          <input
            type="text"
            className="buscador"
            placeholder="Buscar por elemento, hospital o unidad..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />

          {/* Botón Admin: Limpiar antiguos (+30 días) */}
          {esAdmin && recuperadosAntiguos.length > 0 && (
            <button
              type="button"
              className="btn-limpiar-antiguos"
              onClick={() => setModalLimpiarAntiguos(true)}
              title="Eliminar registros recuperados hace más de 30 días"
            >
              <Trash2 size={14} /> Limpiar antiguos (+30 días) ({recuperadosAntiguos.length})
            </button>
          )}
        </div>
      </div>

        {/* Tabla */}
        {cargando ? (
          <p className="estado-carga">Cargando...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p className="estado-vacio">No hay registros{filtroEstado !== 'todos' ? ` con estado "${filtroEstado}"` : ''}.</p>
        ) : (
          <div className="tabla-wrap">
            <table className="tabla-elementos">
              <thead>
                <tr>
                  <th>Elemento</th>
                  <th>Cant.</th>
                  <th>Hospital / Clínica</th>
                  <th>Unidad</th>
                  <th>Depositado por</th>
                  <th>Estado</th>
                  <th>Recuperado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className="elemento-nombre">{nombreElemento(r)}</span>
                      {r.observaciones && (
                        <span className="elemento-obs" title={r.observaciones}>ℹ</span>
                      )}
                    </td>
                    <td className="col-centro">{r.cantidad}</td>
                    <td>{nombreHospital(r)}</td>
                    <td>{r.unidadNombre}</td>
                    <td>{r.registradoPorNombre}</td>
                    <td>
                      <span className={`badge-estado badge-estado--${r.estado}`}>
                        {r.estado === 'pendiente' ? 'Pendiente' : 'Recuperado'}
                      </span>
                    </td>
                    <td className="col-fecha">
                      {r.estado === 'recuperado' ? (
                        <>
                          {formatFecha(r.fechaRecuperacion)}
                          {r.resueltoPorNombre && (
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {r.resueltoPorNombre}
                            </div>
                          )}
                          {r.observacionesRecuperacion && (
                            <span className="elemento-obs" title={r.observacionesRecuperacion}>ℹ</span>
                          )}
                        </>
                      ) : '—'}
                    </td>
                    <td className="col-accion">
                      {r.estado === 'pendiente' && (
                        <button
                          className="btn-recuperar"
                          onClick={() => setRegistroARecuperar(r)}
                          title="Marcar como recuperado"
                        >
                          <CheckCircle size={15} /> Recuperar
                        </button>
                      )}
                      {r.estado === 'recuperado' && esAdmin && (
                        <button
                          type="button"
                          className="btn-eliminar-item"
                          onClick={() => setRegistroAEliminar(r)}
                          title="Eliminar registro"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Botón Cargar Más Registros */}
      {registros.length >= limite && (
        <div className="contenedor-cargar-mas">
          <button
            type="button"
            className="btn-cargar-mas"
            onClick={() => setLimite(prev => prev + 50)}
            disabled={cargando}
          >
            {cargando ? 'Cargando registros...' : 'Cargar más registros (+50)'}
          </button>
        </div>
      )}

      {/* Renderizado directo del nuevo Modal Premium */}
      {modalNuevo && (
        <ModalRegistrarElemento
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { setModalNuevo(false); cargarRegistros(); }}
        />
      )}

      {/* Modal recuperación */}
      {registroARecuperar && (
        <ModalRecuperacion
          registro={registroARecuperar}
          onCerrar={() => setRegistroARecuperar(null)}
          onRecuperado={() => { setRegistroARecuperar(null); cargarRegistros(); }}
        />
      )}

      {/* Modal configuración unificado */}
      {modalConfig && (
        <ModalConfigGuardia
          isOpen={modalConfig}
          onClose={() => setModalConfig(false)}
        />
      )}

      {/* Modal Confirmar Eliminación Individual (Solo Admin) */}
      {registroAEliminar && (
        <Modal
          isOpen={!!registroAEliminar}
          onClose={() => setRegistroAEliminar(null)}
          title="Eliminar Registro"
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
              ¿Estás seguro de que deseas eliminar permanentemente este registro?
            </p>
            <div className="modal-info-box">
              <p><strong>Elemento:</strong> {nombreElemento(registroAEliminar)} (x{registroAEliminar.cantidad})</p>
              <p><strong>Hospital:</strong> {nombreHospital(registroAEliminar)}</p>
              <p><strong>Unidad:</strong> {registroAEliminar.unidadNombre}</p>
              <p><strong>Depositado:</strong> {formatFecha(registroAEliminar.fechaRegistro)}</p>
            </div>
            <div className="modal-solido-actions modal-solido-actions--row">
              <button className="btn-solido-secondary" onClick={() => setRegistroAEliminar(null)} disabled={eliminando}>
                Cancelar
              </button>
              <button className="btn-solido-danger" onClick={handleEliminarIndividual} disabled={eliminando}>
                <Trash2 size={16} />
                {eliminando ? 'Eliminando...' : 'Eliminar registro'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Confirmar Limpieza Masiva (+30 días) (Solo Admin) */}
      {modalLimpiarAntiguos && (
        <Modal
          isOpen={modalLimpiarAntiguos}
          onClose={() => setModalLimpiarAntiguos(false)}
          title="Limpiar Recuperados (+30 días)"
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
              Se eliminarán permanentemente <strong>{recuperadosAntiguos.length}</strong> {recuperadosAntiguos.length === 1 ? 'registro' : 'registros'} marcados como recuperados con más de 30 días de antigüedad.
            </p>
            <div className="modal-info-box" style={{ backgroundColor: '#fff1f2', borderColor: '#fecaca' }}>
              <p style={{ color: '#be123c', fontSize: '13px', margin: 0 }}>
                Esta acción no se puede deshacer. Los registros eliminados no podrán recuperarse.
              </p>
            </div>
            <div className="modal-solido-actions modal-solido-actions--row">
              <button className="btn-solido-secondary" onClick={() => setModalLimpiarAntiguos(false)} disabled={limpiando}>
                Cancelar
              </button>
              <button className="btn-solido-danger" onClick={handleLimpiarAntiguos} disabled={limpiando}>
                <Trash2 size={16} />
                {limpiando ? 'Eliminando...' : `Eliminar ${recuperadosAntiguos.length} registros`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ListadoElementosMedicos;