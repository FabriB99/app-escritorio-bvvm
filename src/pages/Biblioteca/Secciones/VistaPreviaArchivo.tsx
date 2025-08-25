// src/pages/Biblioteca/Secciones/VistaPreviaArchivo.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaTimes,
  FaDownload,
  FaFile,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileAlt,
} from 'react-icons/fa';
import { db } from '../../../app/firebase-config';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';

interface Archivo {
  nombre: string;
  fecha?: string;
  url: string;
  tipo?: string; // 'archivo' | 'link'
  peso?: number;
}

const EXT_IMAGENES = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
const EXT_VIDEOS = ['mp4', 'webm', 'ogg'];
const EXT_AUDIOS = ['mp3', 'wav', 'aac', 'ogg'];

const VistaPreviaArchivo: React.FC = () => {
  const { rutaSeccion, archivoIndex } = useParams<{ rutaSeccion: string; archivoIndex: string }>();
  const navigate = useNavigate();

  const [archivo, setArchivo] = useState<Archivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewBlobRef = useRef<Blob | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchSeccion = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const q = query(collection(db, 'secciones'), where('ruta', '==', rutaSeccion));
        const snap = await getDocs(q);
        if (snap.empty) {
          navigate('/biblioteca');
          return;
        }
        const doc = snap.docs[0];
        const data = doc.data() as DocumentData;

        const idx = parseInt(archivoIndex || '0', 10);
        const archivos = data.tabs?.[0]?.archivos || [];

        if (idx < 0 || idx >= archivos.length) {
          navigate(`/biblioteca/seccion/${rutaSeccion}`);
          return;
        }
        setArchivo(archivos[idx]);
      } catch (e) {
        console.error('Error fetching section:', e);
        setErrorMsg('Error cargando archivo.');
        navigate('/biblioteca');
      } finally {
        setLoading(false);
      }
    };

    if (rutaSeccion) fetchSeccion();
  }, [rutaSeccion, archivoIndex, navigate]);

  useEffect(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    previewBlobRef.current = null;
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
      fetchAbortRef.current = null;
    }

    if (!archivo) return;

    // si es link externo -> no intentamos fetch de blob
    if (archivo.tipo === 'link') return;

    const ext = archivo.nombre.split('.').pop()?.toLowerCase() || '';
    const necesitaBlobForPreview =
      ext === 'pdf' || EXT_IMAGENES.includes(ext) || EXT_VIDEOS.includes(ext) || EXT_AUDIOS.includes(ext);

    if (!necesitaBlobForPreview) return;

    const ac = new AbortController();
    fetchAbortRef.current = ac;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(archivo.url, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        previewBlobRef.current = blob;
        const objUrl = URL.createObjectURL(blob);
        setPreviewUrl(objUrl);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Error fetching preview blob:', err);
        setErrorMsg('No se pudo cargar la vista previa (problema de red/CORS o archivo).');
      } finally {
        setLoading(false);
        fetchAbortRef.current = null;
      }
    })();

    return () => {
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
        fetchAbortRef.current = null;
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      previewBlobRef.current = null;
      setPreviewUrl(null);
    };
  }, [archivo?.url, archivo?.nombre, archivo?.tipo]);

  const ext = archivo?.nombre.split('.').pop()?.toLowerCase() || '';

  const getIconForExtension = (e: string) => {
    if (['doc', 'docx'].includes(e)) return <FaFileWord size={80} color="#2B579A" />;
    if (['xls', 'xlsx', 'csv'].includes(e)) return <FaFileExcel size={80} color="#217346" />;
    if (['ppt', 'pptx'].includes(e)) return <FaFilePowerpoint size={80} color="#D24726" />;
    if (['zip', 'rar'].includes(e)) return <FaFileArchive size={80} color="#8E44AD" />;
    if (['txt'].includes(e)) return <FaFileAlt size={80} color="#5D6D7E" />;
    return <FaFile size={80} color="#ccc" />;
  };

  const handleDescargar = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!archivo || archivo.tipo === 'link') return;

    try {
      let blob: Blob | null = previewBlobRef.current;
      if (!blob) {
        const res = await fetch(archivo.url);
        if (!res.ok) throw new Error('Error al descargar');
        blob = await res.blob();
      }

      const urlObj = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlObj;
      link.download = archivo.nombre;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(urlObj), 1000);
    } catch (err) {
      console.error('Error descargando archivo:', err);
      alert('No se pudo descargar el archivo.');
    }
  };

  const renderPreviewArea = () => {
    if (!archivo) return null;

    // caso especial: link externo
    if (archivo.tipo === 'link') {
      return (
        <div style={{ textAlign: 'center', color: 'white', padding: 20 }}>
          <p>Este recurso es un enlace externo:</p>
          <a
            href={archivo.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#4da3ff',
              textDecoration: 'underline',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Abrir enlace
          </a>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div style={{ color: 'white', textAlign: 'center', padding: 20 }}>
          <p>{errorMsg}</p>
          <button onClick={handleDescargar} style={downloadButtonStyle}>
            <FaDownload /> Descargar
          </button>
        </div>
      );
    }

    if (ext === 'pdf' && previewUrl) {
      return (
        <div style={previewContainerStyle}>
          <iframe src={previewUrl} title={archivo.nombre} style={mediaStyle} />
        </div>
      );
    }

    if (EXT_IMAGENES.includes(ext) && previewUrl) {
      return (
        <div style={previewContainerStyle}>
          <img src={previewUrl} alt={archivo.nombre} style={mediaStyle} />
        </div>
      );
    }

    if (EXT_VIDEOS.includes(ext) && previewUrl) {
      return (
        <div style={previewContainerStyle}>
          <video controls src={previewUrl} style={mediaStyle} />
        </div>
      );
    }

    if (EXT_AUDIOS.includes(ext) && previewUrl) {
      return (
        <div style={{ width: '100%', padding: '0 16px' }}>
          <audio controls src={previewUrl} style={{ width: '100%' }} />
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {getIconForExtension(ext)}
        <div style={{ fontSize: 18 }}>{archivo.nombre}</div>
      </div>
    );
  };

  const headerHeight = 64;
  const containerStyle: React.CSSProperties = { height: '100vh', display: 'flex', flexDirection: 'column', background: '#111' };
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 18px',
    backgroundColor: '#222',
    color: '#fff',
    height: headerHeight,
    boxSizing: 'border-box',
  };
  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 12,
    overflow: 'hidden',
    gap: 12,
  };
  const previewContainerStyle: React.CSSProperties = {
    flex: 1,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
  };
  const mediaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    border: 'none',
    borderRadius: 6,
    boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
  };
  const footerControlsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    alignItems: 'center',
    padding: '8px 0',
  };
  const downloadButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '8px 14px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Cargando vista previa...</div>;
  }

  if (!archivo) {
    return <div style={{ padding: 20 }}>Archivo no encontrado</div>;
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: 12 }}>{archivo.nombre}</h3>
        <div>
          <button
            onClick={() => navigate(`/biblioteca/seccion/${rutaSeccion}`)}
            title="Cerrar vista previa"
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}
          >
            <FaTimes />
          </button>
        </div>
      </header>

      <main style={mainStyle}>
        {renderPreviewArea()}

        <div style={footerControlsStyle}>
          {typeof archivo.peso === 'number' && archivo.tipo !== 'link' && (
            <div style={{ color: '#ddd', fontWeight: 600 }}>
              {archivo.peso >= 1024 * 1024
                ? `${(archivo.peso / (1024 * 1024)).toFixed(2)} MB`
                : `${(archivo.peso / 1024).toFixed(0)} KB`}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VistaPreviaArchivo;
