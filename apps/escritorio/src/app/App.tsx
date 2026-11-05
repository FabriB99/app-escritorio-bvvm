import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../components/MainLayout/MainLayout';
import PageLoader from '../components/PageLoader/PageLoader';
import Inicio from '../pages/Inicio/Inicio';
import InicioBombero from '../pages/Inicio/InicioBombero';
import Login from '../pages/Login/Login';
import LoginBiblioteca from '../pages/Login/LoginBiblioteca';

const Biblioteca = lazy(() => import('../pages/Biblioteca/Biblioteca'));
const VistaSeccion = lazy(() => import('../pages/Biblioteca/Secciones/VistaSeccion'));
const VistaPreviaArchivo = lazy(() => import('../pages/Biblioteca/Secciones/VistaPreviaArchivo'));
const AdminBiblioteca = lazy(() => import('../pages/Biblioteca/AdminBiblioteca'));
const EnConstruccion = lazy(() => import('../pages/EnConstruccion/EnConstruccion'));

import RutaProtegida from '../routes/RutaProtegida';
import AuthRedirect from '../routes/AuthRedirect';
import { rutasProtegidas } from '../routes/routesConfig';

import { UsuarioBibliotecaProvider } from '../context/UsuarioBibliotecaContext';
import { Toaster } from 'sonner';

import './styles/variables.css';
import './App.css';

const App: React.FC = () => {
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
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/login" element={<Login />} />

          {/* Biblioteca Virtual (Vista Pública) */}
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
                <Suspense fallback={<PageLoader />}>
                  <Biblioteca />
                </Suspense>
              </UsuarioBibliotecaProvider>
            }
          />
          <Route
            path="/biblioteca/seccion/:ruta"
            element={
              <UsuarioBibliotecaProvider>
                <Suspense fallback={<PageLoader />}>
                  <VistaSeccion />
                </Suspense>
              </UsuarioBibliotecaProvider>
            }
          />
          <Route
            path="/biblioteca/previsualizar/:rutaSeccion/:archivoIndex"
            element={
              <UsuarioBibliotecaProvider>
                <Suspense fallback={<PageLoader />}>
                  <VistaPreviaArchivo />
                </Suspense>
              </UsuarioBibliotecaProvider>
            }
          />

          {/* Layout Principal persistente con Sidebar fijo y <Suspense fallback={<PageLoader />}> sobre <Outlet /> */}
          <Route element={<MainLayout />}>
            <Route
              path="/editar-biblioteca"
              element={
                <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                  <AdminBiblioteca />
                </RutaProtegida>
              }
            />
            <Route
              path="/editar-biblioteca/secciones"
              element={
                <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                  <AdminBiblioteca />
                </RutaProtegida>
              }
            />

            <Route
              path="/mis-estadisticas"
              element={
                <RutaProtegida rolesPermitidos={['bombero']}>
                  <EnConstruccion
                    titulo="Mis Estadísticas"
                    mensaje="Estamos preparando tu panel de estadísticas. Pronto estará disponible."
                  />
                </RutaProtegida>
              }
            />

            {rutasProtegidas.map(({ path, element, roles }) => (
              <Route
                key={path}
                path={path}
                element={
                  <RutaProtegida rolesPermitidos={roles}>
                    {element}
                  </RutaProtegida>
                }
              />
            ))}

            <Route
              path="/inicio-bombero"
              element={
                <RutaProtegida rolesPermitidos={['bombero']}>
                  <InicioBombero />
                </RutaProtegida>
              }
            />
          </Route>

          {/* Ruta fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthRedirect>
    </div>
  );
};

export default App;
