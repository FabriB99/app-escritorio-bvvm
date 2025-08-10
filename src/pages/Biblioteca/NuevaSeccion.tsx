import React, { useState, useEffect } from 'react';
import { db } from '../../app/firebase-config';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FaBookOpen, FaTrash } from 'react-icons/fa';
import './NuevaSeccion.css'

type Grupo = {
  id: string;
  nombre: string;
  orden: number;
};

type Tab = {
  id: string;
  nombre: string;
};

const NuevaSeccion: React.FC = () => {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [ruta, setRuta] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [grupo, setGrupo] = useState('');
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([{ id: '', nombre: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGrupos = async () => {
      const snapshot = await getDocs(query(collection(db, 'grupos_biblioteca'), orderBy('orden')));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Grupo, 'id'>),
      }));
      setGrupos(data);
      if (data.length > 0) {
        setGrupo(data[0].nombre);
      }
    };
    fetchGrupos();
  }, []);

  const handleTabChange = (index: number, value: string) => {
    const newTabs = [...tabs];
    newTabs[index].nombre = value;
    newTabs[index].id = value.toLowerCase().trim().replace(/\s+/g, '-');
    setTabs(newTabs);
  };

  const agregarTab = () => setTabs([...tabs, { id: '', nombre: '' }]);

  const quitarTab = (index: number) => {
    if (tabs.length === 1) return;
    setTabs(tabs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim() || !ruta.trim()) {
      setError('Completá los campos Nombre y Ruta.');
      return;
    }
    if (tabs.some(t => !t.nombre.trim())) {
      setError('Todos los tabs deben tener nombre.');
      return;
    }

    setLoading(true);

    try {
      const seccionesSnapshot = await getDocs(collection(db, 'secciones'));
      let maxOrden = 0;
      seccionesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (typeof data.orden === 'number' && data.orden > maxOrden) {
          maxOrden = data.orden;
        }
      });

      await addDoc(collection(db, 'secciones'), {
        nombre: nombre.trim(),
        ruta: ruta.trim().toLowerCase(),
        descripcion: grupo === 'Generales' ? descripcion.trim() : '',
        grupo,
        tabs,
        orden: maxOrden + 1,
        creadoEn: serverTimestamp(),
      });

      navigate('/editar-biblioteca/secciones');
    } catch (err) {
      console.error('Error guardando sección:', err);
      setError('Error al guardar la sección.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nueva-seccion__contenedor">
      <header className="nueva-seccion__header">
        <button
          className="nueva-seccion__btn-volver"
          onClick={() => navigate('/editar-biblioteca/secciones')}
          aria-label="Volver"
        >
          ↩ Regresar
        </button>

        <div className="nueva-seccion__titulo-contenedor">
          <h1 className="nueva-seccion__titulo">
            <FaBookOpen className="nueva-seccion__icono" />
            Nueva sección
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="nueva-seccion__form">
        <div className="nueva-seccion__grid">
          <label>
            Nombre:
            <input value={nombre} 
            onChange={e => setNombre(e.target.value)} 
            placeholder="ej: Reglamentos y Leyes" 
            required 
            />
          </label>

          <label>
            Ruta (URL):
            <input
              value={ruta}
              onChange={e => setRuta(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="ej: reglamentos-leyes"
              required
            />
          </label>

          <label>
            Grupo:
            <select value={grupo} onChange={e => setGrupo(e.target.value)} required>
              {grupos.map(g => (
                <option key={g.id} value={g.nombre}>{g.nombre}</option>
              ))}
            </select>
          </label>

          {grupo === 'Generales' && (
            <label className="nueva-seccion__descripcion">
              Descripción:
              <input
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="ej: Documentación reglamentaria..."
              />
            </label>
          )}
        </div>

        <fieldset>
          <legend>Tabs</legend>
          {tabs.map((tab, i) => (
            <div key={i} className="tab-row">
              <input
                value={tab.nombre}
                placeholder={`Nombre...`}
                onChange={e => handleTabChange(i, e.target.value)}
                required
              />
              <button type="button" onClick={() => quitarTab(i)} disabled={tabs.length === 1}>
                <FaTrash className="tab-row button" />
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarTab}>
            + Agregar tab
          </button>
        </fieldset>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Crear sección'}
        </button>
      </form>
    </div>
  );
};

export default NuevaSeccion;
