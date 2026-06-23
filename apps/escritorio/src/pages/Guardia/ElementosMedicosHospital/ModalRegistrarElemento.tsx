// src/pages/Guardia/ElementosMedicosHospital/ModalRegistrarElemento.tsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../app/firebase-config';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { Save, Settings, Trash2, Plus, X } from 'lucide-react';
import { mostrarToast } from '../../../utils/toast';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import type { ElementoMedicoHospital, ConfigLista, UnidadRef } from './types';
import './ModalRegistrarElemento.css';

interface Unidad { id: string; nombre: string; }
interface Props { onClose: () => void; onGuardado: () => void; }

// ─── Autocompletes ────────────────────────────────────────
const AutocompleteUnidad: React.FC<{unidades: Unidad[], seleccionada: UnidadRef | null, onSeleccionar: (u: UnidadRef | null) => void}> = ({ unidades, seleccionada, onSeleccionar }) => {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtradas = query.length >= 1 ? unidades.filter(u => u.nombre.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : unidades.slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="autocomplete-wrap" ref={ref}>
      {seleccionada ? (
        <div className="tag-seleccionado">
          <span className="tag-texto">{seleccionada.nombre}</span>
          <button type="button" className="tag-cerrar" onClick={() => onSeleccionar(null)}>×</button>
        </div>
      ) : (
        <>
          <input type="text" placeholder="Buscar móvil o unidad..." value={query} onChange={e => { setQuery(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)} className="input-solido" />
          {abierto && filtradas.length > 0 && (
            <ul className="autocomplete-dropdown">
              {filtradas.map(u => ( <li key={u.id} onMouseDown={() => {onSeleccionar({id: u.id, nombre: u.nombre}); setQuery(''); setAbierto(false);}}>{u.nombre}</li> ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

const AutocompleteDinamico: React.FC<{opciones: string[], valor: string, onChange: (v: string) => void, placeholder: string}> = ({ opciones, valor, onChange, placeholder }) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtradas = opciones.filter(op => op.toLowerCase().includes(valor.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="autocomplete-wrap" ref={ref}>
      <input type="text" placeholder={placeholder} value={valor} onChange={e => { onChange(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)} className="input-solido" />
      {abierto && filtradas.length > 0 && (
        <ul className="autocomplete-dropdown">
          {filtradas.map((op, idx) => ( <li key={idx} onMouseDown={() => { onChange(op); setAbierto(false); }}>{op}</li> ))}
        </ul>
      )}
    </div>
  );
};

// ─── Modal Principal ──────────────────────────────────────────────
const ModalRegistrarElemento: React.FC<Props> = ({ onClose, onGuardado }) => {
  const { user } = useUser();
  const [listaElementos, setListaElementos] = useState<string[]>([]);
  const [listaHospitales, setListaHospitales] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [elemento, setElemento] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [hospital, setHospital] = useState('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadRef | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [gestionModal, setGestionModal] = useState<{ abierto: boolean; tipo: 'elementos_medicos' | 'hospitales' | null }>({ abierto: false, tipo: null });
  const [nuevoItemTexto, setNuevoItemTexto] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [snapUnidades, docElementos, docHospitales] = await Promise.all([
          getDocs(collection(db, 'unidades')),
          getDoc(doc(db, 'config_guardia', 'elementos_medicos')),
          getDoc(doc(db, 'config_guardia', 'hospitales')),
        ]);
        setUnidades(snapUnidades.docs.map(d => ({ id: d.id, nombre: (d.data().nombre as string) ?? '' })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true })));
        setListaElementos(docElementos.exists() ? (docElementos.data() as ConfigLista).items ?? [] : []);
        setListaHospitales(docHospitales.exists() ? (docHospitales.data() as ConfigLista).items ?? [] : []);
      } catch (err) { mostrarToast('Error al cargar datos de Firebase.'); }
    };
    cargarDatos();
  }, []);

  const handleAgregarOpcion = async () => {
    const { tipo } = gestionModal;
    if (!tipo || !nuevoItemTexto.trim()) return;
    const valor = nuevoItemTexto.trim();
    const listaActual = tipo === 'elementos_medicos' ? listaElementos : listaHospitales;
    
    if (listaActual.includes(valor)) { mostrarToast('Opción ya existe.'); return; }
    try {
      const nuevaLista = [...listaActual, valor];
      await setDoc(doc(db, 'config_guardia', tipo), { items: nuevaLista }, { merge: true });
      if (tipo === 'elementos_medicos') { setListaElementos(nuevaLista); setElemento(valor); } 
      else { setListaHospitales(nuevaLista); setHospital(valor); }
      setNuevoItemTexto(''); mostrarToast('Opción añadida.');
    } catch (err) { mostrarToast('Error al guardar.'); }
  };

  const handleEliminarOpcion = async (item: string) => {
    const { tipo } = gestionModal;
    if (!tipo || !window.confirm(`¿Eliminar "${item}"?`)) return;
    try {
      const nuevaLista = (tipo === 'elementos_medicos' ? listaElementos : listaHospitales).filter(i => i !== item);
      await setDoc(doc(db, 'config_guardia', tipo), { items: nuevaLista }, { merge: true });
      if (tipo === 'elementos_medicos') { setListaElementos(nuevaLista); if (elemento === item) setElemento(''); } 
      else { setListaHospitales(nuevaLista); if (hospital === item) setHospital(''); }
      mostrarToast('Opción eliminada.');
    } catch (err) { mostrarToast('Error al eliminar.'); }
  };

  const handleGuardar = async () => {
    if (!user) return;
    if (!elemento.trim() || !hospital.trim() || !unidadSeleccionada || cantidad < 1) { mostrarToast('Completá todos los campos.'); return; }
    
    setGuardando(true);
    try {
      const operador = await buildOperador(user.uid);
      const docData: Omit<ElementoMedicoHospital, 'id'> = {
        elemento: elemento.trim(), cantidad, hospital: hospital.trim(),
        unidadId: unidadSeleccionada.id, unidadNombre: unidadSeleccionada.nombre,
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
        estado: 'pendiente', registradoPorUid: user.uid, registradoPorNombre: operador.nombre,
        fechaRegistro: Timestamp.now(), anio: new Date().getFullYear(),
      };

      const ref_ = await addDoc(collection(db, 'elementos_medicos_hospital'), docData);
      await registrarAuditoria({ accion: 'crear', coleccion: 'elementos_medicos_hospital', docId: ref_.id, docResumen: `${cantidad}x ${docData.elemento} en ${docData.hospital}`, operador, detalles: { descripcion: `Depósito registrado.` } });

      mostrarToast('Elemento registrado correctamente.');
      onGuardado();
    } catch (err) { mostrarToast('Error al guardar.'); } 
    finally { setGuardando(false); }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      
      {/* CONTENEDOR UNIFICADO Y SÓLIDO */}
      <div className="modal-solido-container">
        
        {/* HEADER BLANCO */}
        <div className="modal-solido-header">
          <h3 className="modal-solido-title">Registrar Elemento</h3>
          <button className="btn-icon-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* BODY GRIS CLARO */}
        <div className="modal-solido-body">
            
          <div className="form-row-solido">
            <div className="form-col-solido col-main">
              <div className="label-wrap-solido">
                <label>Elemento</label>
                <button type="button" className="btn-editar-solido" onClick={() => setGestionModal({ abierto: true, tipo: 'elementos_medicos' })}>
                  <Settings size={14} /> Editar
                </button>
              </div>
              <AutocompleteDinamico opciones={listaElementos} valor={elemento} onChange={setElemento} placeholder="Ej: Lanza, Tabla espinal..." />
            </div>
            <div className="form-col-solido col-side">
              <div className="label-wrap-solido"><label>CANT.</label></div>
              <input type="number" min={1} value={cantidad} onChange={e => setCantidad(Math.max(1, Number(e.target.value)))} className="input-solido txt-centro" />
            </div>
          </div>

          <div className="form-row-solido">
            <div className="form-col-solido col-main">
              <div className="label-wrap-solido">
                <label>Destino (Hospital)</label>
                <button type="button" className="btn-editar-solido" onClick={() => setGestionModal({ abierto: true, tipo: 'hospitales' })}>
                  <Settings size={14} /> Editar
                </button>
              </div>
              <AutocompleteDinamico opciones={listaHospitales} valor={hospital} onChange={setHospital} placeholder="Ej: Hospital Pasteur..." />
            </div>
            <div className="form-col-solido col-main">
              <div className="label-wrap-solido"><label>Unidad que lo dejó</label></div>
              <AutocompleteUnidad unidades={unidades} seleccionada={unidadSeleccionada} onSeleccionar={setUnidadSeleccionada} />
            </div>
          </div>

          <div className="form-col-solido" style={{ marginTop: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>OBSERVACIONES (OPCIONAL)</label>
            <textarea rows={2} placeholder="Info adicional sobre a quién se lo entregaron, sala, etc..." value={observaciones} onChange={e => setObservaciones(e.target.value)} className="input-solido textarea-solido" />
          </div>

          <div className="modal-solido-actions">
            <button type="button" className="btn-solido-primary" onClick={handleGuardar} disabled={guardando}>
              <Save size={18} /> {guardando ? 'Registrando...' : 'Confirmar Registro'}
            </button>
            <button type="button" className="btn-solido-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>

        </div>
      </div>

      {/* Mini Modal para editar listas permanentes (Mantiene el mismo estilo limpio) */}
      {gestionModal.abierto && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-solido-container" style={{ maxWidth: '440px' }}>
            <div className="modal-solido-header">
              <h3 className="modal-solido-title">Gestionar {gestionModal.tipo === 'elementos_medicos' ? 'Elementos' : 'Hospitales'}</h3>
              <button type="button" className="btn-icon-close" onClick={() => setGestionModal({ abierto: false, tipo: null })}><X size={20} /></button>
            </div>
            <div className="modal-solido-body">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input type="text" className="input-solido" placeholder="Añadir nuevo valor..." value={nuevoItemTexto} onChange={e => setNuevoItemTexto(e.target.value)} />
                <button type="button" className="btn-solido-add" onClick={handleAgregarOpcion}><Plus size={16} /> Agregar</button>
              </div>
              <div className="lista-solida-container">
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {(gestionModal.tipo === 'elementos_medicos' ? listaElementos : listaHospitales).map((item, idx) => (
                    <li key={idx} className="lista-solida-item">
                      <span>{item}</span>
                      <button type="button" className="btn-solido-danger" onClick={() => handleEliminarOpcion(item)}><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn-solido-secondary" onClick={() => setGestionModal({ abierto: false, tipo: null })}>Finalizar Ajustes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalRegistrarElemento;