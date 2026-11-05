// src/routes/RutaProtegida.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PageLoader from '../components/PageLoader/PageLoader';

interface RutaProtegidaProps {
  children: React.ReactNode;
  rolesPermitidos?: string[];
}

const rutaSegunRol = (rol: string | undefined) => {
  switch (rol) {
    case 'admin':
    case 'jefatura':
    case 'guardia':
    case 'graduados':
      return '/unidades';
    case 'legajo':
      return '/legajos';
    case 'bombero':
      return '/inicio-bombero';
    default:
      return '/login';
  }
};

const RutaProtegida: React.FC<RutaProtegidaProps> = ({ children, rolesPermitidos }) => {
  const { user, loading } = useUser();
  const rol = user?.rol;

  if (loading && !user) return <PageLoader />;

  if (!user?.uid) return <Navigate to="/login" replace />;

  if (rolesPermitidos && !rolesPermitidos.includes(rol || '')) {
    return <Navigate to={rutaSegunRol(rol)} replace />;
  }

  return <>{children}</>;
};

export default RutaProtegida;
