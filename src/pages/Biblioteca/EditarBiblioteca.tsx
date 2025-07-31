import React from 'react';
import { useNavigate } from 'react-router-dom';
import './EditarBiblioteca.css';

const EditarBiblioteca: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="crear-unidad__contenedor-principal">
      <div className="crear-unidad__encabezado">
        <button
          className="crear-unidad__btn-volver"
          onClick={() => navigate(-1)}
        >
          ← Volver
        </button>
        <h1 className="crear-unidad__titulo">Panel de Biblioteca Virtual</h1>
      </div>

      <div className="crear-unidad__formulario">
        <div className="crear-unidad__tarjeta">
          <h2 className="crear-unidad__seccion-titulo">Opciones de administración</h2>

          <div className="crear-unidad__grid">
            <button
              className="crear-unidad__btn-principal"
              onClick={() => navigate('/editar-biblioteca/archivos')}
            >
              Editar Biblioteca (archivos)
            </button>

            <button
              className="crear-unidad__btn-principal"
              onClick={() => navigate('/editar-biblioteca/dnis')}
            >
              Alta de DNIs autorizados
            </button>

            <button
              className="crear-unidad__btn-principal"
              onClick={() => navigate('/editar-biblioteca/dnis/listado')}
            >
              Listado de DNIs autorizados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditarBiblioteca;
