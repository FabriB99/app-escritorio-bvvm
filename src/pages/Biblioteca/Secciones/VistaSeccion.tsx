import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';
import './VistaSeccion.css';

// 🔸 Datos temporales
const mockDatos: Record<string, {
  titulo: string;
  descripcion: string;
  tabs: {
    id: string;
    nombre: string;
    archivos: {
      nombre: string;
      fecha: string;
      url: string;
    }[];
  }[];
}> = {
  'procedimientos': {
    titulo: 'Procedimientos Operativos',
    descripcion: 'Manuales internos y procedimientos de intervención',
    tabs: [
      {
        id: 'manuales',
        nombre: 'Manuales',
        archivos: [
          { nombre: 'Manual 1', fecha: '2025-07-20', url: '/docs/manual1.pdf' },
          { nombre: 'Manual 2', fecha: '2025-07-25', url: '/docs/manual2.pdf' }
        ]
      },
      {
        id: 'videos',
        nombre: 'Videos',
        archivos: [
          { nombre: 'Video 1', fecha: '2025-07-21', url: '/videos/video1.mp4' }
        ]
      }
    ]
  },
  'socorrismo': {
    titulo: 'Departamento Socorrismo',
    descripcion: 'Material de capacitación del área',
    tabs: [
      {
        id: 'capacitacion',
        nombre: 'Capacitación',
        archivos: [
          { nombre: 'Curso RCP', fecha: '2025-07-10', url: '/docs/rcp.pdf' }
        ]
      }
    ]
  }
};

const VistaSeccion: React.FC = () => {
  const { seccionId } = useParams();
  const navigate = useNavigate();
  const datos = mockDatos[seccionId || ''];

  const [tabActivo, setTabActivo] = useState<string>(
    datos?.tabs?.[0]?.id || ''
  );

  if (!datos) return <div className="vista-error">Sección no encontrada.</div>;

  const tabActual = datos.tabs.find(tab => tab.id === tabActivo);

  return (
    <div className="vista-seccion">
      {/* Header */}
      <header className="vista-header">
        <div className="vista-header-left">
          <img
            src="/logo-bomberos.png"
            alt="Logo Bomberos"
            className="vista-logo"
            onClick={() => navigate('/biblioteca')}
          />
          <div className="vista-header-texto">
            <h1>Biblioteca Virtual</h1>
            <span>Cuerpo de Bomberos Voluntarios Villa María</span>
          </div>
        </div>
        <button
          className="vista-volver"
          onClick={() => navigate('/biblioteca')}
          aria-label="Volver a Biblioteca Virtual"
        >
          <BiArrowBack size={20} />
          Volver
        </button>
      </header>

      {/* Contenido */}
      <main className="vista-container">
        <section className="vista-titulo">
          <h2>{datos.titulo}</h2>
          {datos.descripcion && <p>{datos.descripcion}</p>}
        </section>

        {/* Tabs */}
        <nav className="vista-tabs">
          {datos.tabs?.map(tab => (
            <div
              key={tab.id}
              className={`vista-tab ${tab.id === tabActivo ? 'vista-tab-activo' : ''}`}
              onClick={() => setTabActivo(tab.id)}
            >
              {tab.nombre}
            </div>
          ))}
        </nav>

        {/* Contenido del tab activo */}
        <section className="vista-tab-content">
          {tabActual?.archivos.length ? (
            <ul className="archivos-lista">
              {tabActual.archivos.map((archivo, index) => (
                <li key={index}>
                  <div className="archivos-nombre">{archivo.nombre}</div>
                  <div className="archivos-fecha">{archivo.fecha}</div>
                  <div className="archivos-acciones">
                    <a href={archivo.url} target="_blank" rel="noopener noreferrer">
                      <button aria-label={`Ver ${archivo.nombre}`}>Ver</button>
                    </a>
                    <a href={archivo.url} download>
                      <button aria-label={`Descargar ${archivo.nombre}`}>Descargar</button>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay archivos en esta sección.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default VistaSeccion;
