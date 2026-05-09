// src/pages/LoadingScreen.tsx
import React from "react";
import "./LoadingScreen.css";

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-logo-wrapper">
        <img
          src="/logo-bomberos.png" // Cambia esta ruta por la real
          alt="Logo"
          className="loading-logo"
        />
      </div>
      <div className="loading-text">
        Cargando
        <span className="dot">.</span>
        <span className="dot">.</span>
        <span className="dot">.</span>
      </div>
    </div>
  );
};

export default LoadingScreen;
