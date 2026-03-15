// src/components/MainLayout/MainLayout.tsx
import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import IdentificarMiembro from '../../pages/Login/IdentificarMiembro';
import { useUser } from '../../context/UserContext';
import './MainLayout.css';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { miembroActivo } = useUser();

  return (
    <div className="main-layout">
      <Sidebar />
      <div className={`main-content ${!miembroActivo ? 'blurred' : ''}`}>
        {children}
      </div>
      {/* Modal de identificación */}
      {!miembroActivo && <IdentificarMiembro />}
    </div>
  );
};

export default MainLayout;
