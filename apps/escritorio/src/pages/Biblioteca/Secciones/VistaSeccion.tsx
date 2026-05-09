import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSearch, FaDownload, FaEye, FaExternalLinkAlt } from 'react-icons/fa';
import { db } from '../../../app/firebase-config';
import {
  collection,
  query,
  where,
  getDocs,
  DocumentData,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import '../biblioteca.css';
import './VistaSeccion.css';
import logo from '/logo-bomberos.png';
import { invoke } from "@tauri-apps/api/core";

import { useUsuarioBiblioteca } from '../../../context/UsuarioBibliotecaContext';

interface Archivo {
  nombre: string;
  fecha: number;
  url: string;
  tipo?: 'archivo' | 'link';
}

interface Tab {
  id: string;
  nombre: string;
  archivos: Archivo[];
}

interface Seccion {
  id: string;
  titulo: string;
  descripcion?: string;
  ruta: string;
  grupo: string;
  tabs: Tab[];
}

const VistaSeccion: React.FC = () => {
  const { ruta } = useParams<{ ruta: string }>();
  const navigate = useNavigate();
  const { usuario } = useUsuarioBiblioteca();

  const [seccion, setSeccion] = useState<Seccion | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabActivo, setTabActivo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const archivosPorPagina = 10;

  const inputRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Cargar sección desde Firestore
  useEffect(() => {
    const fetchSeccion = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'secciones'), where('ruta', '==', ruta));
        const snap = await getDocs(q);
        if (snap.empty) {
          navigate('/biblioteca');
          return;
        }
        const doc = snap.docs[0];
        const data = doc.data() as DocumentData;

        setSeccion({
          id: doc.id,
          titulo: data.nombre,
          descripcion: data.descripcion || '',
          ruta: data.ruta || '',
          grupo: data.grupo || '',
          tabs: (data.tabs || []).map((tab: any) => ({
            ...tab,
            archivos: tab.archivos || [],
          })),
        });

        setTabActivo(data.tabs?.[0]?.id || '');
        setPaginaActual(1);
      } catch (e) {
        console.error('Error al cargar la sección:', e);
        navigate('/biblioteca');
      } finally {
        setLoading(false);
      }
    };

    if (ruta) fetchSeccion();
  }, [ruta, navigate]);

  // Ajustar slider de tabs
  const ajustarSlider = () => {
    if (!tabsRef.current || !sliderRef.current) return;
    const tabs = Array.from(tabsRef.current.children).filter((el) =>
      el.classList.contains('vista-tab')
    ) as HTMLElement[];
    const activeTab = tabs.find((tab) =>
      tab.classList.contains('vista-tab-activo')
    );
    if (!activeTab) return;

    const contenedorRect = tabsRef.current.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const left = tabRect.left - contenedorRect.left;
    const width = tabRect.width;
    sliderRef.current.style.width = `${width}px`;
    sliderRef.current.style.transform = `translateX(${left}px)`;
  };

  useEffect(() => {
    ajustarSlider();
    window.addEventListener('resize', ajustarSlider);
    return () => window.removeEventListener('resize', ajustarSlider);
  }, [tabActivo, seccion]);

  // Foco en búsqueda
  useEffect(() => {
    if (busquedaAbierta && inputRef.current) inputRef.current.focus();
  }, [busquedaAbierta]);

  const cambiarTab = (id: string) => {
    if (id === tabActivo) return;
    setTabActivo(id);
    setPaginaActual(1);
  };

  const toggleBusqueda = () => {
    setBusquedaAbierta((open) => !open);
    if (busquedaAbierta) setBusqueda('');
  };

  const abrirVistaPrevia = (archivoIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!seccion) return;
    navigate(`/biblioteca/previsualizar/${seccion.ruta}/${archivoIndex}`);
  };

  const formatFecha = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return '';
    const d = new Date(timestamp);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  };

  const registrarDescarga = async (archivoNombre: string) => {
    if (!seccion) return;
    try {
      await addDoc(collection(db, 'logs_descargas'), {
        archivoNombre,
        seccion: seccion.titulo,
        usuario: usuario?.nombre || 'Anónimo',
        dni: usuario?.dni || '00000000',
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error registrando descarga:', error);
    }
  };

  const descargarArchivo = async (archivo: Archivo, e: React.MouseEvent) => {
    e.stopPropagation();
    registrarDescarga(archivo.nombre);
    try {
      const response = await fetch(archivo.url);
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = archivo.nombre;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      alert('No se pudo descargar el archivo.');
    }
  };

  // Abrir link externo usando Tauri (invoke)
  const abrirLinkExterno = async (archivo: Archivo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!archivo.url) return;

    try {
      let url = archivo.url;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

      await invoke('abrir_en_navegador', { url });
    } catch (error) {
      console.error('No se pudo abrir el link:', error);
      alert('No se pudo abrir el link en el navegador.');
    }
  };

  const tabActual = seccion?.tabs.find((tab) => tab.id === tabActivo);

  const archivosFiltrados = tabActual?.archivos.filter((archivo) =>
    archivo.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const archivosPagina =
    archivosFiltrados?.slice(
      (paginaActual - 1) * archivosPorPagina,
      paginaActual * archivosPorPagina
    ) || [];

  const totalPaginas = Math.ceil((archivosFiltrados?.length || 0) / archivosPorPagina);

  return (
    <div className="vista-seccion">
      <header className="biblioteca-header">
        <div className="biblioteca-header-left">
          <img
            src={logo}
            alt="Logo Bomberos"
            className="biblioteca-logo"
            onClick={() => navigate('/biblioteca')}
            title="Volver a la Biblioteca"
          />
          <div className="biblioteca-titulo-container">
            <h1 className="biblioteca-titulo">Biblioteca Virtual</h1>
            <p className="biblioteca-subtitulo">Cuerpo de Bomberos Voluntarios Villa María</p>
          </div>
        </div>

        <div className="biblioteca-busqueda">
          <FaSearch
            className="biblioteca-icono-busqueda"
            onClick={toggleBusqueda}
            title="Buscar"
            style={{ cursor: 'pointer' }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`biblioteca-busqueda-input ${busquedaAbierta ? 'abierto' : ''}`}
            onBlur={() => setBusquedaAbierta(false)}
          />
        </div>
      </header>

      <main className="vista-container">
        {loading ? (
          <div className="vista-spinner-container">
            <div className="vista-spinner" />
            <p>Cargando sección...</p>
          </div>
        ) : (
          <>
            <section className="vista-titulo">
              <h2>{seccion?.titulo}</h2>
              {seccion?.descripcion && <p>{seccion.descripcion}</p>}
            </section>

            <nav className="vista-tabs" ref={tabsRef}>
              {seccion?.tabs?.map((tab) => (
                <div
                  key={tab.id}
                  className={`vista-tab ${tab.id === tabActivo ? 'vista-tab-activo' : ''}`}
                  onClick={() => cambiarTab(tab.id)}
                >
                  {tab.nombre}
                </div>
              ))}
              <div className="vista-tab-slider" ref={sliderRef} />
            </nav>

            <section className="vista-tab-content">
              {archivosPagina.length > 0 ? (
                <>
                  <ul className="archivos-lista">
                    {archivosPagina.map((archivo, index) => (
                      <li key={archivo.url} style={{ cursor: 'default' }}>
                        <div className="archivos-nombre">{archivo.nombre}</div>
                        <div className="archivos-meta">
                          <span className="archivos-fecha">{formatFecha(archivo.fecha)}</span>
                          <div className="archivos-acciones">
                            {archivo.tipo === 'archivo' ? (
                              <>
                                <button
                                  type="button"
                                  title="Vista previa"
                                  onClick={(e) =>
                                    abrirVistaPrevia(
                                      (paginaActual - 1) * archivosPorPagina + index,
                                      e
                                    )
                                  }
                                  className="boton-icono"
                                >
                                  <FaEye className="archivo-icono" />
                                </button>
                                <button
                                  type="button"
                                  title="Descargar"
                                  onClick={(e) => descargarArchivo(archivo, e)}
                                  className="boton-icono"
                                >
                                  <FaDownload className="archivo-icono" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                title="Abrir link"
                                onClick={(e) => abrirLinkExterno(archivo, e)}
                                className="boton-icono"
                              >
                                <FaExternalLinkAlt className="archivo-icono" />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {totalPaginas > 1 && (
                    <div className="vista-paginacion">
                      <button
                        disabled={paginaActual === 1}
                        onClick={() => setPaginaActual(paginaActual - 1)}
                      >
                        Anterior
                      </button>
                      <span>
                        Página {paginaActual} / {totalPaginas}
                      </span>
                      <button
                        disabled={paginaActual === totalPaginas}
                        onClick={() => setPaginaActual(paginaActual + 1)}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p>No hay archivos en esta sección.</p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default VistaSeccion;
