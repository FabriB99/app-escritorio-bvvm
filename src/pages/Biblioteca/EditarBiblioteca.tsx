import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBookOpen, FaIdCard,  } from 'react-icons/fa';
import './EditarBiblioteca.css';
{/*FaChartBar*/}
const EditarBiblioteca: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="panel-biblioteca__contenedor-principal">
      <header className="panel-biblioteca__header">
        <h1 className="panel-biblioteca__titulo">Panel de Biblioteca Virtual</h1>
      </header>

      <main className="panel-biblioteca__grid">
        <div
          className="panel-biblioteca__card"
          onClick={() => navigate('/editar-biblioteca/secciones')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/editar-biblioteca/secciones'); }}
        >
          <FaBookOpen className="panel-biblioteca__icono" />
          <h3>Administrar Biblioteca</h3>
          <p>Secciones, grupos y archivos.</p>
        </div>

        <div
          className="panel-biblioteca__card"
          onClick={() => navigate('/editar-biblioteca/dnis/listado')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/editar-biblioteca/dnis/listado'); }}
        >
          <FaIdCard className="panel-biblioteca__icono" />
          <h3>DNIs autorizados</h3>
          <p>Gestión de accesos permitidos.</p>
        </div>

        {/*<div
          className="panel-biblioteca__card"
          onClick={() => navigate('/editar-biblioteca/metricas')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/editar-biblioteca/metricas'); }}
        >
          <FaChartBar className="panel-biblioteca__icono" />
          <h3>Métricas</h3>
          <p>Estadísticas y uso del sistema.</p>
        </div>*/}
      </main>
    </div>
  );
};

export default EditarBiblioteca;
