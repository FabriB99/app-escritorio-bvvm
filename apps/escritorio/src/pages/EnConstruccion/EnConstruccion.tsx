// src/components/EnConstruccion/EnConstruccion.tsx
import React from 'react';
import './EnConstruccion.css';

interface Props {
  titulo?: string;
  mensaje?: string;
}

const EnConstruccion: React.FC<Props> = ({ 
  titulo = "Página en Construcción", 
  mensaje = "Esta funcionalidad se encuentra en desarrollo. Por favor, vuelve más tarde." 
}) => {
  return (
    <div className="en-construccion-container">
      <div className="en-construccion-card">
        <div className="en-construccion-icon-wrapper">
          {/* Icono de herramienta/obra */}
          <span className="en-construccion-icon">🛠️</span>
        </div>
        
        <h2 className="en-construccion-title">{titulo}</h2>
        <p className="en-construccion-text">{mensaje}</p>
        
        <div className="en-construccion-progress">
          <div className="en-construccion-bar"></div>
        </div>
        
        <p className="en-construccion-hint">
          Estamos trabajando para mejorar el sistema.
        </p>
      </div>
    </div>
  );
};

export default EnConstruccion;
