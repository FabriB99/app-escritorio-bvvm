// src/components/MainLayout/MainLayout.tsx
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import PageLoader from '../PageLoader/PageLoader';
import IdentificarMiembro from '../../pages/Login/IdentificarMiembro';
import { useUser } from '../../context/UserContext';
import './MainLayout.css';

const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { miembroActivo } = useUser();

  return (
    <div className="main-layout">
      <Sidebar />
      <div className={`main-content ${!miembroActivo ? 'blurred' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          {children ?? <Outlet />}
        </Suspense>
      </div>
      {/* Modal de identificación */}
      {!miembroActivo && <IdentificarMiembro />}
    </div>
  );
};

export default MainLayout;
