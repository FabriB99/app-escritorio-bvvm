import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../components/MainLayout/MainLayout';
import Inicio from '../pages/Inicio/Inicio';
import InicioBombero from '../pages/Inicio/InicioBombero';
import Login from '../pages/Login/Login';
import LoginBiblioteca from '../pages/Login/LoginBiblioteca';

// Carga diferida (Code Splitting / Lazy Loading) para páginas secundarias y pesadas
const Biblioteca = lazy(() => import('../pages/Biblioteca/Biblioteca'));
const VistaSeccion = lazy(() => import('../pages/Biblioteca/Secciones/VistaSeccion'));
const VistaPreviaArchivo = lazy(() => import('../pages/Biblioteca/Secciones/VistaPreviaArchivo'));
const EnConstruccion = lazy(() => import('../pages/EnConstruccion/EnConstruccion'));

import RutaProtegida from '../routes/RutaProtegida';
import AuthRedirect from '../routes/AuthRedirect';
import { rutasProtegidas } from '../routes/routesConfig';

import { useUser } from '../context/UserContext';
import LoadingScreen from '../pages/LoadingScreen/LoadingScreen';

import { UsuarioBibliotecaProvider } from '../context/UsuarioBibliotecaContext';
import { Toaster } from 'sonner';

import './styles/variables.css';
import './App.css';

const App: React.FC = () => {
  const { user } = useUser();

  if (user === undefined) {
    return <LoadingScreen />;
  }

  return (
    <div className="App">
      <Toaster
        position="top-right"
        closeButton
        expand={false}
        duration={3500}
        toastOptions={{
          className: 'toast-cuartel',
        }}
      />
      <AuthRedirect>
        <Suspense fallback={<LoadingScreen />}>
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
        </Suspense>
      </AuthRedirect>
    </div>
  );
};

export default App;