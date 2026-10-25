import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../../app/firebase-config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { Save, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { getCatalogosGuardia } from '../../../utils/cacheCatalogos';
import Modal from '../../../components/Modal';
import ModalConfigGuardia from './ModalConfigGuardia';
import type { ElementoMedicoHospital, UnidadRef } from './types';
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
          <input type="text" placeholder="Unidad..." value={query} onChange={e => { setQuery(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)} className="input-solido" />
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
  const { user, miembroActivo } = useUser();
  const esAdmin = user?.rol === 'admin';
  const [listaElementos, setListaElementos] = useState<string[]>([]);
  const [listaHospitales, setListaHospitales] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [elemento, setElemento] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [hospital, setHospital] = useState('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadRef | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modal de configuración de listas unificado
  const [configModal, setConfigModal] = useState<{ abierto: boolean; tab: 'elementos' | 'hospitales' }>({
    abierto: false,
    tab: 'elementos',
  });

  const cargarCatalogos = useCallback(async (forzar = false) => {
    try {
      const data = await getCatalogosGuardia(forzar);
      setUnidades(data.unidades);
      setListaElementos(data.elementos);
      setListaHospitales(data.hospitales);
    } catch {
      toast.error('Error al cargar datos de guardia.');
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  const handleGuardar = async () => {
    if (!user || !miembroActivo) return;
    if (!elemento.trim() || !hospital.trim() || !unidadSeleccionada || cantidad < 1) {
      toast.warning('Completá todos los campos.');
      return;
    }
    
    setGuardando(true);
    try {
      const operador = buildOperador(miembroActivo, user.rol);
      const docData: Omit<ElementoMedicoHospital, 'id'> = {
        elemento: elemento.trim(), cantidad, hospital: hospital.trim(),
        unidadId: unidadSeleccionada.id, unidadNombre: unidadSeleccionada.nombre,
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
        estado: 'pendiente', registradoPorUid: operador.uid, registradoPorNombre: operador.nombre,
        fechaRegistro: Timestamp.now(), anio: new Date().getFullYear(),
      };

      const ref_ = await addDoc(collection(db, 'elementos_medicos_hospital'), docData);
      await registrarAuditoria({ accion: 'crear', coleccion: 'elementos_medicos_hospital', docId: ref_.id, docResumen: `${cantidad}x ${docData.elemento} en ${docData.hospital}`, operador, detalles: { descripcion: `Depósito registrado.` } });

      toast.success('Elemento registrado correctamente.');
      onGuardado();
    } catch {
      toast.error('Error al guardar el elemento.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title="Registrar Elemento"
        maxWidth="680px"
        zIndex={9999}
        headerAction={
          esAdmin ? (
            <button
              type="button"
              className="btn-editar-solido"
              onClick={() => setConfigModal({ abierto: true, tab: 'elementos' })}
            >
              <Settings size={14} /> Configurar listas
            </button>
          ) : null
        }
      >
        <div className="form-row-solido">
          <div className="form-col-solido col-main">
            <div className="label-wrap-solido">
              <label>Elemento</label>
            </div>
            <AutocompleteDinamico opciones={listaElementos} valor={elemento} onChange={setElemento} placeholder="Ej: Collar cervical, Tabla rígida..." />
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
          <textarea rows={2} placeholder="Intervención que fué, donde..." value={observaciones} onChange={e => setObservaciones(e.target.value)} className="input-solido textarea-solido" />
        </div>

        <div className="modal-solido-actions">
          <button type="button" className="btn-solido-primary" onClick={handleGuardar} disabled={guardando}>
            <Save size={18} /> {guardando ? 'Registrando...' : 'Confirmar Registro'}
          </button>
          <button type="button" className="btn-solido-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Modal unificado para editar listas de guardia */}
      {configModal.abierto && (
        <ModalConfigGuardia
          isOpen={configModal.abierto}
          tabInicial={configModal.tab}
          onClose={() => setConfigModal(prev => ({ ...prev, abierto: false }))}
          onActualizado={() => cargarCatalogos(true)}
        />
      )}
    </>
  );
};

export default ModalRegistrarElemento;