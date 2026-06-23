// src/pages/Guardia/ElementosMedicosHospital/ParteElementoMedico.tsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../app/firebase-config';
import { collection, addDoc, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { Save } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import { mostrarToast } from '../../../utils/toast';
import Header from '../../../components/Header';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import type { ElementoMedicoHospital, ConfigLista, UnidadRef } from './types';
import './ParteElementoMedico.css';

// ─── Interfaces locales ───────────────────────────────────────────────────────
interface Unidad { id: string; nombre: string; }
interface Props { isModal?: boolean; onGuardado?: () => void; }

// ─── Autocomplete de unidad ──────────────────────────────────────────────────
interface AutocompleteUnidadProps {
  unidades: Unidad[];
  seleccionada: UnidadRef | null;
  onSeleccionar: (u: UnidadRef | null) => void;
}

const AutocompleteUnidad: React.FC<AutocompleteUnidadProps> = ({ unidades, seleccionada, onSeleccionar }) => {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtradas = query.length >= 1
    ? unidades.filter(u => u.nombre.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : unidades.slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const seleccionar = (u: Unidad) => {
    onSeleccionar({ id: u.id, nombre: u.nombre });
    setQuery('');
    setAbierto(false);
  };

  return (
    <div className="autocomplete-wrap" ref={ref}>
      {seleccionada ? (
        <div className="miembro-tag">
          <div className="miembro-tag__info">
            <span className="miembro-tag__nombre">{seleccionada.nombre}</span>
          </div>
          <button type="button" className="miembro-tag__remove" onClick={() => onSeleccionar(null)}>×</button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Buscar unidad..."
            value={query}
            onChange={e => { setQuery(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
          />
          {abierto && filtradas.length > 0 && (
            <ul className="autocomplete-dropdown">
              {filtradas.map(u => (
                <li key={u.id} onMouseDown={() => seleccionar(u)}>
                  <span className="dropdown-nombre">{u.nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const ParteElementoMedico: React.FC<Props> = ({ isModal = false, onGuardado }) => {
  const { user } = useUser();
  const [listaElementos, setListaElementos] = useState<string[]>([]);
  const [listaHospitales, setListaHospitales] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [elemento, setElemento] = useState('');
  const [elementoOtro, setElementoOtro] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [hospital, setHospital] = useState('');
  const [hospitalOtro, setHospitalOtro] = useState('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadRef | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const esElementoOtro = elemento === 'Otro';
  const esHospitalOtro = hospital === 'Otro';

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [snapUnidades, docElementos, docHospitales] = await Promise.all([
          getDocs(collection(db, 'unidades')),
          getDoc(doc(db, 'config_guardia', 'elementos_medicos')),
          getDoc(doc(db, 'config_guardia', 'hospitales')),
        ]);

        const unidadesData = snapUnidades.docs
          .map(d => ({ id: d.id, nombre: (d.data().nombre as string) ?? '' }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
        setUnidades(unidadesData);

        const elementos: string[] = docElementos.exists() ? (docElementos.data() as ConfigLista).items ?? [] : [];
        const hospitales: string[] = docHospitales.exists() ? (docHospitales.data() as ConfigLista).items ?? [] : [];

        setListaElementos([...elementos, 'Otro']);
        setListaHospitales([...hospitales, 'Otro']);

        if (elementos.length > 0) setElemento(elementos[0]);
        if (hospitales.length > 0) setHospital(hospitales[0]);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        mostrarToast('Error al cargar datos de Firebase.');
      }
    };
    cargarDatos();
  }, []);

  const handleGuardar = async () => {
    if (!user) return;
    if (!elemento) { mostrarToast('Seleccioná un elemento médico.'); return; }
    if (esElementoOtro && !elementoOtro.trim()) { mostrarToast('Especificá el elemento médico.'); return; }
    if (!hospital) { mostrarToast('Seleccioná un hospital o clínica.'); return; }
    if (esHospitalOtro && !hospitalOtro.trim()) { mostrarToast('Especificá el hospital o clínica.'); return; }
    if (!unidadSeleccionada) { mostrarToast('Seleccioná la unidad que dejó el elemento.'); return; }
    if (cantidad < 1) { mostrarToast('La cantidad debe ser al menos 1.'); return; }

    setGuardando(true);
    try {
      const operador = await buildOperador(user.uid);
      const ahora = Timestamp.now();

      const docData: Omit<ElementoMedicoHospital, 'id'> = {
        elemento,
        ...(esElementoOtro && { elementoOtro: elementoOtro.trim() }),
        cantidad,
        hospital,
        ...(esHospitalOtro && { hospitalOtro: hospitalOtro.trim() }),
        unidadId: unidadSeleccionada.id,
        unidadNombre: unidadSeleccionada.nombre,
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
        estado: 'pendiente',
        registradoPorUid: user.uid,
        registradoPorNombre: operador.nombre,
        fechaRegistro: ahora,
        anio: new Date().getFullYear(),
      };

      const ref_ = await addDoc(collection(db, 'elementos_medicos_hospital'), docData);
      const nombreElemento = esElementoOtro ? elementoOtro.trim() : elemento;
      const nombreHospital = esHospitalOtro ? hospitalOtro.trim() : hospital;

      await registrarAuditoria({
        accion: 'crear',
        coleccion: 'elementos_medicos_hospital',
        docId: ref_.id,
        docResumen: `${cantidad}x ${nombreElemento} en ${nombreHospital}`,
        operador,
        detalles: { descripcion: `La unidad ${unidadSeleccionada.nombre} registró el depósito.` }
      });

      mostrarToast('Elemento registrado correctamente.');
      setElementoOtro('');
      setCantidad(1);
      setHospitalOtro('');
      setUnidadSeleccionada(null);
      setObservaciones('');

      if (isModal && onGuardado) {
        setTimeout(() => onGuardado(), 800);
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      mostrarToast('Error al guardar. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="elementos-medicos-wrapper">
      <div className={`parte-elemento-medico ${isModal ? 'es-modal-compacto' : ''}`}>
        {!isModal && <Header title="Registrar elemento médico en hospital" extraButtons={[]} />}

        <div className="form-card compact-card">
          
          {/* Fila 1: Elemento y Cantidad */}
          <div className="form-grid-2 form-row-compact">
            <div className="form-group">
              <label>Elemento Médico</label>
              <select value={elemento} onChange={e => { setElemento(e.target.value); setElementoOtro(''); }}>
                {listaElementos.length === 0 && <option value="">— Sin elementos —</option>}
                {listaElementos.map(el => <option key={el} value={el}>{el}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input type="number" min={1} value={cantidad} onChange={e => setCantidad(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>

          {esElementoOtro && (
            <div className="form-group form-row-compact">
              <label>Especificá el elemento</label>
              <input type="text" placeholder="Ej: Saturímetro portátil" value={elementoOtro} onChange={e => setElementoOtro(e.target.value)} />
            </div>
          )}

          {/* Fila 2: Destino y Unidad */}
          <div className="form-grid-2 form-row-compact">
            <div className="form-group">
              <label>Destino (Hospital/Clínica)</label>
              <select value={hospital} onChange={e => { setHospital(e.target.value); setHospitalOtro(''); }}>
                {listaHospitales.length === 0 && <option value="">— Sin hospitales —</option>}
                {listaHospitales.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Unidad / Móvil</label>
              <AutocompleteUnidad unidades={unidades} seleccionada={unidadSeleccionada} onSeleccionar={setUnidadSeleccionada} />
            </div>
          </div>

          {esHospitalOtro && (
            <div className="form-group form-row-compact">
              <label>Especificá el hospital o clínica</label>
              <input type="text" placeholder="Ej: Clínica San Martín" value={hospitalOtro} onChange={e => setHospitalOtro(e.target.value)} />
            </div>
          )}

          {/* Fila 3: Observaciones */}
          <div className="form-group form-row-compact">
            <label>Observaciones (opcional)</label>
            <textarea rows={2} placeholder="Info adicional sobre el elemento dejado..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
          </div>

          {/* Botón guardar */}
          <div className="form-card--actions form-row-compact" style={{ marginTop: '10px' }}>
            <button className="btn-guardar" onClick={handleGuardar} disabled={guardando} style={{ width: isModal ? '100%' : 'auto', justifyContent: 'center' }}>
              <Save size={18} />
              {guardando ? 'Guardando...' : 'Registrar elemento dejado'}
            </button>
          </div>
          
        </div>
      </div>

      <ToastContainer position="top-center" autoClose={2000} hideProgressBar closeOnClick pauseOnHover={false} draggable={false} toastClassName="toast-style" />
    </div>
  );
};

export default ParteElementoMedico;