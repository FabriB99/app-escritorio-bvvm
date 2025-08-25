// src/pages/Biblioteca/EditarSeccion.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../app/firebase-config';
import './EditarSeccion.css';
import Header from "../../components/Header";
import { FaFolder, FaFileAlt, FaTrash, FaPlus, FaArrowUp, FaArrowDown, FaLink } from 'react-icons/fa';

type Archivo = {
  nombre: string;
  url: string;
  fecha: number;
  tipo?: 'archivo' | 'link';
};

type Tab = {
  id: string;
  nombre: string;
  archivos?: Archivo[];
};

const EditarSeccion: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [ruta, setRuta] = useState('');
  const [grupo, setGrupo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const cargarGrupos = async () => {
      try {
        const q = query(collection(db, 'grupos_biblioteca'), orderBy('orden'));
        const snapshot = await getDocs(q);
        const listaGrupos = snapshot.docs.map(doc => doc.data().nombre);
        setGrupos(listaGrupos);
      } catch (error) {
        console.error('Error al cargar grupos:', error);
      }
    };
    cargarGrupos();
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchSeccion = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'secciones', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNombre(data.nombre);
          setRuta(data.ruta);
          setGrupo(data.grupo);
          setDescripcion(data.descripcion || '');
          setTabs(data.tabs || []);
        } else {
          setError('Sección no encontrada');
        }
      } catch (error) {
        console.error(error);
        setError('Error al cargar la sección');
      }
    };
    fetchSeccion();
  }, [id]);

  const handleTabChange = (index: number, nombre: string) => {
    const nuevosTabs = [...tabs];
    nuevosTabs[index] = {
      ...nuevosTabs[index],
      nombre,
      id: nombre.toLowerCase().replace(/\s+/g, '-'),
    };
    setTabs(nuevosTabs);
  };

  const handleArchivoChange = (
    tabIndex: number,
    archivoIndex: number,
    campo: keyof Archivo,
    valor: string | number
  ) => {
    const nuevosTabs = [...tabs];
    const archivos = nuevosTabs[tabIndex].archivos || [];
    archivos[archivoIndex] = { ...archivos[archivoIndex], [campo]: valor };
    nuevosTabs[tabIndex].archivos = archivos;
    setTabs(nuevosTabs);
  };

  const handleFileUpload = (tabIndex: number, file: File) => {
    setError('');
    const storageRef = ref(storage, `biblioteca/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(prev => ({ ...prev, [tabIndex]: progress }));
      },
      (error) => {
        console.error('Error al subir archivo:', error);
        setError('No se pudo subir el archivo');
        setUploadProgress(prev => ({ ...prev, [tabIndex]: 0 }));
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        const nuevosTabs = [...tabs];
        const archivos = nuevosTabs[tabIndex].archivos || [];
        archivos.push({ nombre: file.name, url, fecha: Date.now(), tipo: 'archivo' });
        nuevosTabs[tabIndex].archivos = archivos;
        setTabs(nuevosTabs);
        setUploadProgress(prev => ({ ...prev, [tabIndex]: 0 }));
      }
    );
  };

  const agregarLink = (tabIndex: number) => {
    const nuevosTabs = [...tabs];
    const archivos = nuevosTabs[tabIndex].archivos || [];
    archivos.push({ nombre: '', url: '', fecha: Date.now(), tipo: 'link' });
    nuevosTabs[tabIndex].archivos = archivos;
    setTabs(nuevosTabs);
  };

  const quitarArchivo = (tabIndex: number, archivoIndex: number) => {
    const nuevosTabs = [...tabs];
    const archivos = nuevosTabs[tabIndex].archivos || [];
    archivos.splice(archivoIndex, 1);
    nuevosTabs[tabIndex].archivos = archivos;
    setTabs(nuevosTabs);
  };

  const agregarTab = () => setTabs([...tabs, { id: '', nombre: '', archivos: [] }]);
  const quitarTab = (index: number) => setTabs(tabs.filter((_, i) => i !== index));
  const abrirSelectorArchivo = (tabIndex: number) => {
    fileInputRefs.current[tabIndex]?.click();
  };

  const moverTab = (index: number, direccion: 'arriba' | 'abajo') => {
    const nuevosTabs = [...tabs];
    const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= nuevosTabs.length) return;
    [nuevosTabs[index], nuevosTabs[nuevoIndex]] = [nuevosTabs[nuevoIndex], nuevosTabs[index]];
    setTabs(nuevosTabs);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim() || !ruta.trim() || tabs.some(t => !t.nombre.trim())) {
      setError('Completá todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'secciones', id!), {
        nombre,
        ruta,
        grupo,
        descripcion: grupo === 'Generales' ? descripcion : '',
        tabs,
        actualizadoEn: serverTimestamp(),
      });
      navigate('/editar-biblioteca/secciones');
    } catch (error) {
      console.error(error);
      setError('Error al guardar los cambios');
    }
    setLoading(false);
  };

  return (
    <div className="editar-seccion__contenedor-principal">
      <Header
        title="Editar sección"
        onBack={() => navigate('/editar-biblioteca/secciones')}
      />

      <main className="editar-seccion__main">
        <form onSubmit={handleGuardar} className="editar-seccion__form">
          {error && <p className="editar-seccion__error">{error}</p>}

          <div className="editar-seccion__form-dos-columnas">
            <label className="editar-seccion__label">
              Nombre:
              <input
                className="editar-seccion__input"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </label>

            <label className="editar-seccion__label">
              Ruta:
              <input
                className="editar-seccion__input"
                value={ruta}
                onChange={e => setRuta(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                required
              />
            </label>

            <label className="editar-seccion__label">
              Grupo:
              <select
                className="editar-seccion__select"
                value={grupo}
                onChange={e => setGrupo(e.target.value)}
                required
              >
                <option value="">Seleccionar grupo</option>
                {grupos.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>

            {grupo === 'Generales' && (
              <label className="editar-seccion__label">
                Descripción:
                <input
                  className="editar-seccion__input"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                />
              </label>
            )}
          </div>

          <fieldset className="editar-seccion__fieldset">
            <legend className="editar-seccion__legend">
              <FaFolder style={{ marginRight: '6px' }} />
              Tabs
            </legend>

          {tabs.map((tab, i) => (
            <div key={i} className="editar-seccion__tab-card">
              <div className="editar-seccion__tab-header">
                <input
                  className="editar-seccion__tab-input"
                  value={tab.nombre}
                  onChange={e => handleTabChange(i, e.target.value)}
                  placeholder={`Nombre del tab ${i + 1}`}
                  required
                />

                <div className="editar-seccion__tab-actions">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => moverTab(i, 'arriba')}
                      title="Subir"
                      className="editar-seccion__btn editar-seccion__btn--mover"
                    >
                      <FaArrowUp />
                    </button>
                  )}

                  {i < tabs.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moverTab(i, 'abajo')}
                      title="Bajar"
                      className="editar-seccion__btn editar-seccion__btn--mover"
                    >
                      <FaArrowDown />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => quitarTab(i)}
                    className="editar-seccion__btn editar-seccion__btn--quitar-tab"
                    aria-label={`Eliminar tab ${tab.nombre || i + 1}`}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

                <div className="editar-seccion__archivos-area">
                  <h4 className="editar-seccion__archivos-titulo">
                    <FaFileAlt style={{ marginRight: '6px' }} />
                    Archivos y links
                  </h4>

                  {(tab.archivos || []).map((archivo, j) => (
                    <div key={j} className="editar-seccion__archivo-row">
                      <input
                        className="editar-seccion__archivo-input"
                        value={archivo.nombre}
                        onChange={e => handleArchivoChange(i, j, 'nombre', e.target.value)}
                        placeholder="Nombre del recurso"
                        required
                      />

                      {archivo.tipo === 'link' && (
                        <input
                          className="editar-seccion__archivo-input"
                          value={archivo.url}
                          onChange={e => handleArchivoChange(i, j, 'url', e.target.value)}
                          placeholder="Pegar link (Drive, YouTube, etc.)"
                          required
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => quitarArchivo(i, j)}
                        className="editar-seccion__btn editar-seccion__btn--quitar-archivo"
                        aria-label={`Eliminar recurso ${archivo.nombre}`}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}

                  {uploadProgress[i] > 0 && uploadProgress[i] < 100 && (
                    <progress
                      className="editar-seccion__upload-progress"
                      value={uploadProgress[i]}
                      max={100}
                    />
                  )}

                  <input
                    type="file"
                    style={{ display: 'none' }}
                    ref={el => (fileInputRefs.current[i] = el)}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(i, file);
                      if (e.target) e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => abrirSelectorArchivo(i)}
                    className="editar-seccion__btn editar-seccion__btn--agregar"
                  >
                    <FaPlus /> Agregar archivo
                  </button>

                  <button
                    type="button"
                    onClick={() => agregarLink(i)}
                    className="editar-seccion__btn editar-seccion__btn--agregar"
                  >
                    <FaLink /> Agregar link
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={agregarTab}
              className="editar-seccion__btn editar-seccion__btn--agregar"
            >
              <FaPlus /> Agregar tab
            </button>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="editar-seccion__btn editar-seccion__btn--guardar"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default EditarSeccion;
