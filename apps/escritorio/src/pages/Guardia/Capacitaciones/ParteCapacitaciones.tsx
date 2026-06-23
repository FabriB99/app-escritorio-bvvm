// src/pages/Guardia/Capacitaciones/ParteCapacitaciones.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../../app/firebase-config';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, Timestamp, DocumentData } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { Save, List } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import { mostrarToast } from '../../../utils/toast';
import Header from '../../../components/Header';
import './ParteCapacitaciones.css';

// ─── Tipos e Interfaces ───────────────────────────────────────────────────────

interface Miembro {
  id: string;
  nombre: string;
  apellido: string;
  ordenOperativo: string | number;
  dni?: string;
  cargo?: string;
}

interface Unidad {
  id: string;
  nombre: string;
}

interface MiembroRef {
  id: string;
  nombre: string;
  apellido: string;
  ordenOperativo: string | number;
}

type TipoActividad = 'capacitacion' | 'representacion' | 'organizativa';

interface CapacitacionData {
  id?: string;
  tipoActividad: TipoActividad;
  esObligatoria: boolean;
  esInterna: boolean;
  esExterna: boolean;
  esCursoEspecial: boolean;
  usaUnidad: boolean | null;
  unidadId: string;
  unidadNombre: string;
  kmRegreso: string;
  controlSalidaNro: string;
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  horaInicioViaje: string;
  horaFinViaje: string;
  personalGuardia: MiembroRef[];
  horaInicioGuardia: string;
  horaFinGuardia: string;
  lugarDireccion: string;
  nivelCapacitacion: 'Cuartel' | 'Regional' | 'Federativa' | 'Nacional';
  instructor: MiembroRef | null;
  ayudantes: MiembroRef[];
  participantes: MiembroRef[];
  tipoDatos: 'dictada' | 'recibida';
  descripcion: string;
  destino: string[];
  anio: number;
  creadoPor: string;
  fechaCreacion: Timestamp;
}

// Interfaz para las props del componente (Soporta Modal y Edición)
interface ParteCapacitacionesProps {
  idEdicion?: string | null;
  isModal?: boolean;
  onGuardado?: () => void;
}

// ─── Opciones destino ─────────────────────────────────────────────────────────

const OPCIONES_DESTINO = [
  'Aspirantes 1er año', 'Aspirantes 2do', 'Aspirantes 3er año', 'Pasantes de Guardia',
  'Instrucción Grupo 1', 'Instrucción Grupo 2', 'Instrucción Grupo 3', 'I Nivel',
  'II Nivel', 'III Nivel', 'IV Nivel', 'Dpto. Rescate Acuático', 'Dpto. Mat-Pel',
  'Dpto. K9', 'Dpto. B.R.E.C.', 'Dpto. Socorrismo', 'Dpto. Rescate Vehicular',
  'Dpto. Psicología', 'Dpto. Incendio', 'Dpto. Incendio Forestal',
  'Dpto. Rescate con cuerdas', 'Dpto. Comunicaciones', 'Dpto. ERA', 'Dpto. Drones',
  'Dpto. Olimpiadas', 'Otros',
];

const FORM_INICIAL: CapacitacionData = {
  tipoActividad: 'capacitacion',
  esObligatoria: false,
  esInterna: false,
  esExterna: false,
  esCursoEspecial: false,
  usaUnidad: null,
  unidadId: '',
  unidadNombre: '',
  kmRegreso: '',
  controlSalidaNro: '',
  fechaInicio: new Date().toISOString().split('T')[0],
  horaInicio: '00:00',
  fechaFin: new Date().toISOString().split('T')[0],
  horaFin: '00:00',
  horaInicioViaje: '00:00',
  horaFinViaje: '00:00',
  personalGuardia: [],
  horaInicioGuardia: '00:00',
  horaFinGuardia: '00:00',
  lugarDireccion: '',
  nivelCapacitacion: 'Cuartel',
  instructor: null,
  ayudantes: [],
  participantes: [],
  tipoDatos: 'dictada',
  descripcion: '',
  destino: [],
  anio: new Date().getFullYear(),
  creadoPor: '',
  fechaCreacion: Timestamp.now(),
};

const displayMiembro = (m: MiembroRef): string => {
  const orden = m.ordenOperativo != null && m.ordenOperativo !== '' ? String(m.ordenOperativo) : null;
  return orden ? `${orden} — ${m.nombre} ${m.apellido}` : `${m.nombre} ${m.apellido}`;
};

// ─── Autocomplete — selección única ──────────────────────────────────────────

interface AutocompleteMiembroProps {
  label: string;
  placeholder?: string;
  miembros: Miembro[];
  seleccionado: MiembroRef | null;
  onSeleccionar: (m: MiembroRef | null) => void;
}

const AutocompleteMiembro: React.FC<AutocompleteMiembroProps> = ({
  label, placeholder = 'Buscar por nombre...', miembros, seleccionado, onSeleccionar,
}) => {
  const [queryText, setQueryText] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtrados = queryText.length >= 2
    ? miembros.filter(m =>
        `${m.nombre} ${m.apellido} ${m.ordenOperativo ?? ''}`
          .toLowerCase().includes(queryText.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const seleccionar = (m: Miembro) => {
    onSeleccionar({ id: m.id, nombre: m.nombre, apellido: m.apellido, ordenOperativo: m.ordenOperativo });
    setQueryText('');
    setAbierto(false);
  };

  return (
    <div className="form-group autocomplete-wrap" ref={ref}>
      <label>{label}</label>
      {seleccionado ? (
        <div className="miembro-tag">
          <div className="miembro-tag__info">
            {seleccionado.ordenOperativo != null && seleccionado.ordenOperativo !== '' && (
              <span className="miembro-tag__orden">{seleccionado.ordenOperativo}</span>
            )}
            <span className="miembro-tag__nombre">{seleccionado.nombre} {seleccionado.apellido}</span>
          </div>
          <button type="button" className="miembro-tag__remove" onClick={() => onSeleccionar(null)}>×</button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder={placeholder}
            value={queryText}
            onChange={e => { setQueryText(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
          />
          {abierto && filtrados.length > 0 && (
            <ul className="autocomplete-dropdown">
              {filtrados.map(m => (
                <li key={m.id} onMouseDown={() => seleccionar(m)}>
                  {m.ordenOperativo != null && m.ordenOperativo !== '' && (
                    <span className="dropdown-orden">{m.ordenOperativo}</span>
                  )}
                  <span className="dropdown-nombre">{m.nombre} {m.apellido}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

// ─── Autocomplete — selección múltiple ───────────────────────────────────────

interface AutocompleteMultiProps {
  label: string;
  placeholder?: string;
  miembros: Miembro[];
  seleccionados: MiembroRef[];
  onAgregar: (m: MiembroRef) => void;
  onQuitar: (id: string) => void;
  maxItems?: number;
  hint?: string;
}

const AutocompleteMulti: React.FC<AutocompleteMultiProps> = ({
  label, placeholder = 'Buscar por nombre...', miembros,
  seleccionados, onAgregar, onQuitar, maxItems, hint,
}) => {
  const [queryText, setQueryText] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const idsSeleccionados = seleccionados.map(m => m.id);
  const filtrados = queryText.length >= 2
    ? miembros.filter(m =>
        !idsSeleccionados.includes(m.id) &&
        `${m.nombre} ${m.apellido} ${m.ordenOperativo ?? ''}`
          .toLowerCase().includes(queryText.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const agregar = (m: Miembro) => {
    onAgregar({ id: m.id, nombre: m.nombre, apellido: m.apellido, ordenOperativo: m.ordenOperativo });
    setQueryText('');
    setAbierto(false);
  };

  const limitAlcanzado = maxItems !== undefined && seleccionados.length >= maxItems;

  return (
    <div className="form-group autocomplete-wrap" ref={ref}>
      <label>
        {label}
        {seleccionados.length > 0 && <span className="label-count">{seleccionados.length}</span>}
      </label>
      {seleccionados.length > 0 && (
        <div className="chips-wrap">
          {seleccionados.map(m => (
            <span key={m.id} className="miembro-chip">
              {displayMiembro(m)}
              <button type="button" onClick={() => onQuitar(m.id)}>×</button>
            </span>
          ))}
        </div>
      )}
      {!limitAlcanzado && (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder={placeholder}
            value={queryText}
            onChange={e => { setQueryText(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
          />
          {abierto && filtrados.length > 0 && (
            <ul className="autocomplete-dropdown">
              {filtrados.map(m => (
                <li key={m.id} onMouseDown={() => agregar(m)}>
                  {m.ordenOperativo != null && m.ordenOperativo !== '' && (
                    <span className="dropdown-orden">{m.ordenOperativo}</span>
                  )}
                  <span className="dropdown-nombre">{m.nombre} {m.apellido}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {hint && <p className="form-hint">{hint}</p>}
      {limitAlcanzado && maxItems && (
        <p className="form-hint">Máximo {maxItems} {maxItems === 1 ? 'ayudante' : 'ayudantes'}</p>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const ParteCapacitaciones: React.FC<ParteCapacitacionesProps> = ({
  idEdicion = null,
  isModal = false,
  onGuardado,
}) => {
  const navigate = useNavigate();
  const { id: idUrl } = useParams<{ id: string }>();
  const { user } = useUser();

  // Prioriza el ID que viene por props (Modal) sobre el de la URL
  const idEdicionActivo = idEdicion || idUrl;

  const [formData, setFormData] = useState<CapacitacionData>({
    ...FORM_INICIAL,
    creadoPor: user?.uid || '',
  });

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [guardando, setGuardando] = useState(false);

  // ── Carga inicial y ordenamiento ───────────────────────────────────────────

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [snapMiembros, snapUnidades] = await Promise.all([
          getDocs(collection(db, 'miembros')),
          getDocs(collection(db, 'unidades')),
        ]);

        // 1. Cargar y ordenar Miembros
        const miembrosData = snapMiembros.docs.map(d => ({ id: d.id, ...d.data() } as Miembro));
        miembrosData.sort((a, b) => {
          const oa = a.ordenOperativo != null ? String(a.ordenOperativo) : null;
          const ob = b.ordenOperativo != null ? String(b.ordenOperativo) : null;
          if (oa && ob) return oa.localeCompare(ob, 'es', { numeric: true });
          if (oa) return -1;
          if (ob) return 1;
          return (a.apellido ?? '').localeCompare(b.apellido ?? '', 'es');
        });
        setMiembros(miembrosData);

        // 2. Cargar y ordenar Unidades alfanuméricamente por el campo "nombre"
        const unidadesData = snapUnidades.docs.map(d => ({ id: d.id, ...d.data() } as Unidad));
        unidadesData.sort((a, b) => 
          (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { numeric: true })
        );
        setUnidades(unidadesData);

        // 3. Si hay un ID de edición activo, cargar el documento para editarlo
        if (idEdicionActivo) {
          const docRef = doc(db, 'capacitaciones', idEdicionActivo);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setFormData({ id: docSnap.id, ...docSnap.data() } as CapacitacionData);
          } else {
            mostrarToast('No se encontró el registro a editar.');
          }
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
        mostrarToast('Error al cargar datos de Firebase.');
      }
    };
    cargarDatos();
  }, [idEdicionActivo]);

  // Asegura que el uid del creador se asigne si cambia el contexto de usuario
  useEffect(() => {
    if (user?.uid && !idEdicionActivo) {
      setFormData(prev => ({ ...prev, creadoPor: user.uid }));
    }
  }, [user, idEdicionActivo]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUnidadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unidadId = e.target.value;
    const unidad = unidades.find(u => u.id === unidadId);
    setFormData(prev => ({ ...prev, unidadId, unidadNombre: unidad?.nombre ?? '' }));
  };

  const handleDestinoChange = (valor: string) => {
    setFormData(prev => ({
      ...prev,
      destino: prev.destino.includes(valor)
        ? prev.destino.filter(v => v !== valor)
        : [...prev.destino, valor],
    }));
  };

  const setUsaUnidad = (val: boolean) => {
    setFormData(prev => ({
      ...prev,
      usaUnidad: val,
      ...(val === false && {
        unidadId: '', unidadNombre: '', kmRegreso: '',
        controlSalidaNro: '', horaInicioViaje: '00:00', horaFinViaje: '00:00',
      }),
    }));
  };

  const agregarA = (campo: keyof CapacitacionData) => (m: MiembroRef) =>
    setFormData(prev => ({ ...prev, [campo]: [...(prev[campo] as MiembroRef[]), m] }));

  const quitarDe = (campo: keyof CapacitacionData) => (id: string) =>
    setFormData(prev => ({
      ...prev,
      [campo]: (prev[campo] as MiembroRef[]).filter(m => m.id !== id),
    }));

  // ── Guardar / Actualizar ───────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!user) return;

    if (!formData.lugarDireccion.trim()) {
      mostrarToast('Ingresá el lugar de la capacitación.');
      return;
    }
    if (!formData.instructor) {
      mostrarToast('Seleccioná un instructor o responsable.');
      return;
    }

    setGuardando(true);
    try {
      const docData: DocumentData = {
        ...formData,
        anio: new Date(formData.fechaInicio).getFullYear(),
        cantidadPersonal: formData.participantes.length,
      };

      if (idEdicionActivo) {
        // Modo Edición: actualiza el documento existente
        const docRef = doc(db, 'capacitaciones', idEdicionActivo);
        await updateDoc(docRef, docData);
        mostrarToast('Actualizado correctamente.');
      } else {
        // Modo Creación: añade un documento nuevo
        docData.fechaCreacion = Timestamp.now();
        docData.creadoPor = user.uid;
        await addDoc(collection(db, 'capacitaciones'), docData);
        setFormData({ ...FORM_INICIAL, creadoPor: user.uid });
        mostrarToast('Guardado correctamente.');
      }

      // Si actúa como modal, dispara callback, si no, redirige
      if (isModal && onGuardado) {
        setTimeout(() => onGuardado(), 1000);
      } else if (!isModal) {
        setTimeout(() => navigate('/listado-capacitaciones'), 1500);
      }

    } catch (err) {
      console.error('Error al guardar:', err);
      mostrarToast('Error al guardar. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const headerButtons = isModal ? [] : [
    { icon: List, onClick: () => navigate('/listado-capacitaciones'), ariaLabel: 'Ver capacitaciones' },
  ];

  return (
    <>
      <div className="parte-capacitaciones">
        {!isModal && <Header title={idEdicionActivo ? "Editar Control de Capacitación" : "Control de Capacitación"} extraButtons={headerButtons} />}

        {/* ── 1. Tipo de actividad ── */}
        <div className="form-card">
          <h3 className="section-title">Tipo de actividad</h3>
          <div className="tipo-actividad-grid">
            <label className={`tipo-actividad-card ${formData.tipoActividad === 'capacitacion' ? 'tipo-actividad-card--active' : ''}`}>
              <input type="radio" name="tipoActividad" value="capacitacion" checked={formData.tipoActividad === 'capacitacion'} onChange={handleChange} />
              <span className="tipo-actividad-card__titulo">Capacitación</span>
              <span className="tipo-actividad-card__desc">Actividad de formación y entrenamiento del personal.</span>
            </label>

            <label className={`tipo-actividad-card ${formData.tipoActividad === 'representacion' ? 'tipo-actividad-card--active' : ''}`}>
              <input type="radio" name="tipoActividad" value="representacion" checked={formData.tipoActividad === 'representacion'} onChange={handleChange} />
              <span className="tipo-actividad-card__titulo">Representación</span>
              <span className="tipo-actividad-card__desc">Viaje o asistencia a la regional, federativa u otro organismo.</span>
            </label>

            <label className={`tipo-actividad-card ${formData.tipoActividad === 'organizativa' ? 'tipo-actividad-card--active' : ''}`}>
              <input type="radio" name="tipoActividad" value="organizativa" checked={formData.tipoActividad === 'organizativa'} onChange={handleChange} />
              <span className="tipo-actividad-card__titulo">Organizativa</span>
              <span className="tipo-actividad-card__desc">Planificación interna del departamento, sin formación práctica.</span>
            </label>
          </div>
        </div>

        {/* ── 2. Características + Unidad ── */}
        <div className="form-card">
          <h3 className="section-title">Características</h3>
          <div className="checkboxes-row">
            {(
              [
                ['esObligatoria', 'Obligatoria'],
                ['esInterna', 'Interna'],
                ['esExterna', 'Externa'],
                ['esCursoEspecial', 'Cursos especiales'],
              ] as [keyof CapacitacionData, string][]
            ).map(([name, lbl]) => (
              <label key={name as string} className="checkbox-label">
                <input
                  type="checkbox"
                  name={name as string}
                  checked={formData[name] as boolean}
                  onChange={handleChange}
                />
                {lbl}
              </label>
            ))}
          </div>

          <div className="seccion-divider" />

          <p className="subsection-label">Unidad</p>
          <div className="unidad-row">
            <div className="form-group">
              <label>¿Se utilizó unidad?</label>
              <div className="radio-group">
                {[['true', 'Sí'], ['false', 'No']].map(([val, lbl]) => (
                  <label key={val} className="radio-label">
                    <input
                      type="radio"
                      name="usaUnidad"
                      checked={String(formData.usaUnidad) === val}
                      onChange={() => setUsaUnidad(val === 'true')}
                    />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            {formData.usaUnidad === true && (
              <>
                <div className="form-group">
                  <label>Unidad</label>
                  <select value={formData.unidadId} onChange={handleUnidadChange}>
                    <option value="">— Seleccioná —</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Km de regreso</label>
                  <input type="number" name="kmRegreso" value={formData.kmRegreso} onChange={handleChange} placeholder="0" min={0} />
                </div>
                <div className="form-group">
                  <label>Control de salida N°</label>
                  <input type="text" name="controlSalidaNro" value={formData.controlSalidaNro} onChange={handleChange} placeholder="Nro." />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 3. Fechas, horas y guardia ── */}
        <div className="form-card">
          <h3 className="section-title">Fechas, horas y guardia</h3>
          <p className="subsection-label">Actividad</p>
          <div className="form-grid-4" style={{ marginBottom: 18 }}>
            <div className="form-group">
              <label>Fecha inicio</label>
              <input type="date" name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Empezó Hs</label>
              <input type="time" name="horaInicio" value={formData.horaInicio} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Fecha fin</label>
              <input type="date" name="fechaFin" value={formData.fechaFin} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Terminó Hs</label>
              <input type="time" name="horaFin" value={formData.horaFin} onChange={handleChange} />
            </div>
          </div>

          {formData.usaUnidad === true && (
            <>
              <p className="subsection-label">
                Viaje <span className="subsection-hint">Horarios de traslado, no se suman a las horas</span>
              </p>
              <div className="form-grid-4" style={{ marginBottom: 18 }}>
                <div className="form-group">
                  <label>Salida Hs</label>
                  <input type="time" name="horaInicioViaje" value={formData.horaInicioViaje} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Regreso Hs</label>
                  <input type="time" name="horaFinViaje" value={formData.horaFinViaje} onChange={handleChange} />
                </div>
              </div>
            </>
          )}

          <p className="subsection-label">Personal de guardia</p>
          <div className="form-grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>Empezó Hs</label>
              <input type="time" name="horaInicioGuardia" value={formData.horaInicioGuardia} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Terminó Hs</label>
              <input type="time" name="horaFinGuardia" value={formData.horaFinGuardia} onChange={handleChange} />
            </div>
          </div>
          <AutocompleteMulti
            label="Miembros de guardia"
            miembros={miembros}
            seleccionados={formData.personalGuardia}
            onAgregar={agregarA('personalGuardia')}
            onQuitar={quitarDe('personalGuardia')}
          />
        </div>

        {/* ── 4. Lugar y nivel ── */}
        <div className="form-card">
          <h3 className="section-title">Lugar y nivel</h3>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Lugar, dirección de la Capacitación</label>
            <input type="text" name="lugarDireccion" value={formData.lugarDireccion} onChange={handleChange} placeholder="Ej: Cuartel Central..." />
          </div>
          <div className="form-group">
            <label>Nivel de la Capacitación</label>
            <div className="radio-group">
              {(['Cuartel', 'Regional', 'Federativa', 'Nacional'] as const).map(nivel => (
                <label key={nivel} className="radio-label">
                  <input type="radio" name="nivelCapacitacion" value={nivel} checked={formData.nivelCapacitacion === nivel} onChange={handleChange} />
                  {nivel}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── 5. A cargo de + Participantes ── */}
        <div className="form-card">
          <h3 className="section-title">A cargo de</h3>
          <div className="form-grid-2" style={{ marginBottom: 14 }}>
            <AutocompleteMiembro
              label="Instructor / Responsable"
              miembros={miembros}
              seleccionado={formData.instructor}
              onSeleccionar={m => setFormData(prev => ({ ...prev, instructor: m }))}
            />
            {formData.tipoActividad === 'capacitacion' && (
              <AutocompleteMulti
                label="Ayudantes (máx. 2)"
                placeholder="Buscar ayudante..."
                miembros={miembros}
                seleccionados={formData.ayudantes}
                onAgregar={agregarA('ayudantes')}
                onQuitar={quitarDe('ayudantes')}
                maxItems={2}
              />
            )}
          </div>

          <div className="seccion-divider" />

          <AutocompleteMulti
            label="Participantes"
            placeholder="Buscar bombero..."
            miembros={miembros}
            seleccionados={formData.participantes}
            onAgregar={agregarA('participantes')}
            onQuitar={quitarDe('participantes')}
            hint={formData.participantes.length > 0 ? `${formData.participantes.length} persona/s registrada/s` : undefined}
          />
        </div>

        {/* ── 6. Datos de la actividad ── */}
        <div className="form-card">
          <h3 className="section-title">Datos de la actividad</h3>
          {formData.tipoActividad === 'capacitacion' && (
            <div className="radio-group" style={{ marginBottom: 16 }}>
              {(['dictada', 'recibida'] as const).map(tipo => (
                <label key={tipo} className="radio-label radio-label--pill">
                  <input type="radio" name="tipoDatos" value={tipo} checked={formData.tipoDatos === tipo} onChange={handleChange} />
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </label>
              ))}
            </div>
          )}
          <div className="form-group">
            <label>Descripción</label>
            <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows={4} placeholder="Describí la actividad realizada..." />
          </div>
        </div>

        {/* ── 7. Destino de la misma ── */}
        <div className="form-card">
          <h3 className="section-title">Destino de la misma</h3>
          <div className="checkbox-grid">
            {OPCIONES_DESTINO.map(opt => (
              <label key={opt} className="checkbox-label">
                <input type="checkbox" checked={formData.destino.includes(opt)} onChange={() => handleDestinoChange(opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* ── Botón guardar ── */}
        <div className="form-card form-card--actions">
          <button className="btn-guardar" onClick={handleGuardar} disabled={guardando}>
            <Save size={18} />
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <ToastContainer position="top-center" autoClose={2000} hideProgressBar closeOnClick pauseOnHover={false} draggable={false} toastClassName="toast-style" />
    </>
  );
};

export default ParteCapacitaciones;