import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../components/MainLayout/MainLayout';
import Inicio from '../pages/Inicio/Inicio';
import InicioBombero from '../pages/Inicio/InicioBombero';
import Login from '../pages/Login/Login';
import LoginBiblioteca from '../pages/Login/LoginBiblioteca';

import Biblioteca from '../pages/Biblioteca/Biblioteca';
import VistaSeccion from '../pages/Biblioteca/Secciones/VistaSeccion';
import VistaPreviaArchivo from '../pages/Biblioteca/Secciones/VistaPreviaArchivo';

import RutaProtegida from '../routes/RutaProtegida';
import AuthRedirect from '../routes/AuthRedirect';
import { rutasProtegidas } from '../routes/routesConfig';

import { useUser } from '../context/UserContext';
import LoadingScreen from '../pages/LoadingScreen/LoadingScreen';
import EnConstruccion from '../pages/EnConstruccion/EnConstruccion';

import { UsuarioBibliotecaProvider } from '../context/UsuarioBibliotecaContext';

import './styles/variables.css';
import './App.css';


const App: React.FC = () => {
  const { user } = useUser();

  if (user === undefined) {
    return <LoadingScreen />;
  }

  return (
    <div className="App">
      <AuthRedirect>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/login" element={<Login />} />

          {/* Biblioteca Virtual */}
          <Route
            path="/biblioteca-login"
            element={
              <UsuarioBibliotecaProvider>
                <LoginBiblioteca />
              </UsuarioBibliotecaProvider>
            }
          />
          <Route
            path="/biblioteca"
            element={
              <UsuarioBibliotecaProvider>
                <Biblioteca />
              </UsuarioBibliotecaProvider>
            }
          />
          <Route
            path="/biblioteca/seccion/:ruta"
            element={
              <UsuarioBibliotecaProvider>
                <VistaSeccion />
              </UsuarioBibliotecaProvider>
            }
          />
          <Route
            path="/biblioteca/previsualizar/:rutaSeccion/:archivoIndex"
            element={
              <UsuarioBibliotecaProvider>
                <VistaPreviaArchivo />
              </UsuarioBibliotecaProvider>
            }
          />

          {/* Página en Construcción */}
          <Route
            path="/mis-estadisticas"
            element={
              <RutaProtegida rolesPermitidos={['bombero']}>
                <MainLayout>
                  <EnConstruccion 
                    titulo="Mis Estadísticas" 
                    mensaje="Estamos preparando tu panel de estadísticas. Pronto estará disponible." 
                  />
                </MainLayout>
              </RutaProtegida>
            }
          />

          {rutasProtegidas.map(({ path, element, roles }) => (
            <Route
              key={path}
              path={path}
              element={
                <RutaProtegida rolesPermitidos={roles}>
                  <MainLayout>{element}</MainLayout>
                </RutaProtegida>
              }
            />
          ))}

          <Route
            path="/inicio-bombero"
            element={
              <RutaProtegida rolesPermitidos={['bombero']}>
                <MainLayout>
                  <InicioBombero />
                </MainLayout>
              </RutaProtegida>
            }
          />

          {/* Ruta fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthRedirect>
    </div>
  );
};

export default App;
