// src/pages/Guardia/ElementosMedicosHospital/ListadoElementosMedicos.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../app/firebase-config';
import {
  collection, getDocs, doc, updateDoc, setDoc, getDoc, Timestamp, orderBy, query,
} from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { Plus, Settings, CheckCircle, X, Trash2, PlusCircle } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import { mostrarToast } from '../../../utils/toast';
import Header from '../../../components/Header';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';

// Cambiamos la importación vieja por el nuevo modal premium
import ModalRegistrarElemento from './ModalRegistrarElemento';

import type { ElementoMedicoHospital, ConfigLista, EstadoElemento } from './types';
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
  const { user } = useUser();
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleRecuperar = async () => {
    if (!user) return;
    setGuardando(true);
    try {
      const operador = await buildOperador(user.uid);

      await updateDoc(doc(db, 'elementos_medicos_hospital', registro.id), {
        estado: 'recuperado',
        fechaRecuperacion: Timestamp.now(),
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

      mostrarToast('Marcado como recuperado.');
      onRecuperado();
    } catch (err) {
      console.error(err);
      mostrarToast('Error al actualizar. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container--sm">
        <div className="modal-header">
          <h3 className="modal-title">Confirmar recuperación</h3>
          <button className="btn-icon-modal" onClick={onCerrar}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="info-box">
            <p><strong>Elemento:</strong> {nombreElemento(registro)} (x{registro.cantidad})</p>
            <p><strong>Hospital:</strong> {nombreHospital(registro)}</p>
            <p><strong>Unidad:</strong> {registro.unidadNombre}</p>
            <p><strong>Depositado:</strong> {formatFecha(registro.fechaRegistro)}</p>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Observaciones de recuperación (opcional)</label>
            <textarea
              rows={3}
              placeholder="Ej: Recuperado sin novedad, faltaba 1 unidad..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="btn-primary" onClick={handleRecuperar} disabled={guardando}>
            <CheckCircle size={16} />
            {guardando ? 'Guardando...' : 'Confirmar recuperación'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Configuración (solo admin) ────────────────────────────────────────

interface ModalConfigProps {
  onCerrar: () => void;
}

const ModalConfig: React.FC<ModalConfigProps> = ({ onCerrar }) => {
  const { user } = useUser();
  const [tab, setTab] = useState<'elementos' | 'hospitales'>('elementos');
  const [elementos, setElementos] = useState<string[]>([]);
  const [hospitales, setHospitales] = useState<string[]>([]);
  const [nuevoElemento, setNuevoElemento] = useState('');
  const [nuevoHospital, setNuevoHospital] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const [docEl, docHosp] = await Promise.all([
        getDoc(doc(db, 'config_guardia', 'elementos_medicos')),
        getDoc(doc(db, 'config_guardia', 'hospitales')),
      ]);
      setElementos(docEl.exists() ? (docEl.data() as ConfigLista).items : []);
      setHospitales(docHosp.exists() ? (docHosp.data() as ConfigLista).items : []);
    };
    cargar();
  }, []);

  const guardarLista = async (colDoc: string, items: string[], descripcion: string) => {
    if (!user) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, 'config_guardia', colDoc), { items });
      const operador = await buildOperador(user.uid);
      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'config_guardia',
        docId: colDoc,
        docResumen: descripcion,
        operador,
      });
      mostrarToast('Lista guardada correctamente.');
    } catch (err) {
      console.error(err);
      mostrarToast('Error al guardar. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Elementos ──
  const agregarElemento = () => {
    const val = nuevoElemento.trim();
    if (!val) return;
    if (elementos.includes(val)) { mostrarToast('Ya existe ese elemento.'); return; }
    setElementos(prev => [...prev, val]);
    setNuevoElemento('');
  };
  const eliminarElemento = (i: number) => setElementos(prev => prev.filter((_, idx) => idx !== i));
  const guardarElementos = () =>
    guardarLista('elementos_medicos', elementos, `Actualizó lista de elementos médicos (${elementos.length} ítems)`);

  // ── Hospitales ──
  const agregarHospital = () => {
    const val = nuevoHospital.trim();
    if (!val) return;
    if (hospitales.includes(val)) { mostrarToast('Ya existe ese hospital.'); return; }
    setHospitales(prev => [...prev, val]);
    setNuevoHospital('');
  };
  const eliminarHospital = (i: number) => setHospitales(prev => prev.filter((_, idx) => idx !== i));
  const guardarHospitales = () =>
    guardarLista('hospitales', hospitales, `Actualizó lista de hospitales (${hospitales.length} ítems)`);

  const listaActual = tab === 'elementos' ? elementos : hospitales;
  const nuevoActual = tab === 'elementos' ? nuevoElemento : nuevoHospital;
  const setNuevoActual = tab === 'elementos' ? setNuevoElemento : setNuevoHospital;
  const agregarActual = tab === 'elementos' ? agregarElemento : agregarHospital;
  const eliminarActual = tab === 'elementos' ? eliminarElemento : eliminarHospital;
  const guardarActual = tab === 'elementos' ? guardarElementos : guardarHospitales;
  const placeholderActual = tab === 'elementos' ? 'Ej: Collar cervical' : 'Ej: Hospital Regional Pasteur';

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container--md">
        <div className="modal-header">
          <h3 className="modal-title">Configuración de listas</h3>
          <button className="btn-icon-modal" onClick={onCerrar}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="config-tabs">
            <button
              className={`config-tab ${tab === 'elementos' ? 'config-tab--active' : ''}`}
              onClick={() => setTab('elementos')}
            >
              Elementos
            </button>
            <button
              className={`config-tab ${tab === 'hospitales' ? 'config-tab--active' : ''}`}
              onClick={() => setTab('hospitales')}
            >
              Centro médico
            </button>
          </div>

          {/* Lista actual */}
          <div className="config-lista">
            {listaActual.length === 0 && (
              <p className="config-lista--vacia">No hay ítems. Agregá uno abajo.</p>
            )}
            {listaActual.map((item, i) => (
              <div key={i} className="config-item">
                <span>{item}</span>
                <button
                  className="btn-icon-danger"
                  onClick={() => eliminarActual(i)}
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Agregar nuevo */}
          <div className="config-agregar">
            <input
              type="text"
              placeholder={placeholderActual}
              value={nuevoActual}
              onChange={e => setNuevoActual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarActual()}
            />
            <button className="btn-agregar" onClick={agregarActual}>
              <PlusCircle size={16} /> Agregar
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCerrar}>Cerrar</button>
          <button className="btn-primary" onClick={guardarActual} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

type FiltroEstado = 'todos' | EstadoElemento;

const ListadoElementosMedicos: React.FC = () => {
  const { user } = useUser(); // Eliminamos navigate que no se usaba
  const esAdmin = (user as any)?.role === 'admin';

  const [registros, setRegistros] = useState<(ElementoMedicoHospital & { id: string })[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [busqueda, setBusqueda] = useState('');

  const [modalNuevo, setModalNuevo] = useState(false);
  const [registroARecuperar, setRegistroARecuperar] = useState<(ElementoMedicoHospital & { id: string }) | null>(null);
  const [modalConfig, setModalConfig] = useState(false);

  // ── Carga ──────────────────────────────────────────────────────────────────

  const cargarRegistros = useCallback(async () => {
    setCargando(true);
    try {
      const q = query(
        collection(db, 'elementos_medicos_hospital'),
        orderBy('fechaRegistro', 'desc'),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ElementoMedicoHospital & { id: string }));
      setRegistros(data);
    } catch (err) {
      console.error(err);
      mostrarToast('Error al cargar registros.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarRegistros(); }, [cargarRegistros]);

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const registrosFiltrados = registros.filter(r => {
    const pasaEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
    const termino = busqueda.toLowerCase();
    const pasaBusqueda = !termino ||
      nombreElemento(r).toLowerCase().includes(termino) ||
      nombreHospital(r).toLowerCase().includes(termino) ||
      r.unidadNombre.toLowerCase().includes(termino);
    return pasaEstado && pasaBusqueda;
  });

  const cantPendientes = registros.filter(r => r.estado === 'pendiente').length;

  // ── Header buttons ─────────────────────────────────────────────────────────

  const headerButtons = [
    ...(esAdmin ? [{ icon: Settings, onClick: () => setModalConfig(true), ariaLabel: 'Configuración de listas' }] : []),
    { icon: Plus, onClick: () => setModalNuevo(true), ariaLabel: 'Registrar elemento' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="elementos-medicos-wrapper">
      <div className="listado-elementos-medicos">
        <Header title="Elementos médicos en hospital" extraButtons={headerButtons} />

        {/* Resumen rápido */}
        {cantPendientes > 0 && (
          <div className="alerta-pendientes">
            <CheckCircle size={16} />
            <span>{cantPendientes} {cantPendientes === 1 ? 'elemento pendiente' : 'elementos pendientes'} de recuperar</span>
          </div>
        )}

        {/* Filtros */}
        <div className="filtros-bar">
          <div className="filtros-estado">
            {(['todos', 'pendiente', 'recuperado'] as FiltroEstado[]).map(f => (
              <button
                key={f}
                className={`filtro-btn ${filtroEstado === f ? 'filtro-btn--active' : ''}`}
                onClick={() => setFiltroEstado(f)}
              >
                {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : 'Recuperados'}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="buscador"
            placeholder="Buscar por elemento, hospital o unidad..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
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
                  <th>Depositado</th>
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
                    <td className="col-fecha">{formatFecha(r.fechaRegistro)}</td>
                    <td>
                      <span className={`badge-estado badge-estado--${r.estado}`}>
                        {r.estado === 'pendiente' ? 'Pendiente' : 'Recuperado'}
                      </span>
                    </td>
                    <td className="col-fecha">
                      {r.estado === 'recuperado' ? formatFecha(r.fechaRecuperacion) : '—'}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

      {/* Modal configuración */}
      {modalConfig && (
        <ModalConfig onCerrar={() => { setModalConfig(false); }} />
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
    </div>
  );
};

export default ListadoElementosMedicos;