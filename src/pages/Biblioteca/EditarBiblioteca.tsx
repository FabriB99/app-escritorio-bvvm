import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBookOpen, FaIdCard } from 'react-icons/fa';
import './EditarBiblioteca.css';
import Header from "../../components/Header";

const EditarBiblioteca: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="panel-biblioteca__contenedor-principal">
      <Header
        title="Biblioteca Virtual"
      />

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
          onClick={() => navigate('/editar-biblioteca/registro')} 
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/editar-biblioteca/registro'); }}
        >
          <FaIdCard className="panel-biblioteca__icono" />
          <h3>Registro de accesos</h3>
          <p>Historial de entradas a Biblioteca Virtual.</p>
        </div>
      </main>
    </div>
  );
};

export default EditarBiblioteca;
