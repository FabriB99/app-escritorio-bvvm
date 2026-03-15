import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../components/MainLayout/MainLayout';
import Inicio from '../pages/Inicio/Inicio';
import InicioBombero from '../pages/Inicio/InicioBombero'
import Login from '../pages/Login/Login';
import LoginBiblioteca from '../pages/Login/LoginBiblioteca';

// Unidades
import Unidades from '../pages/Unidades/Unidades';
import CrearUnidad from '../pages/CrearUnidad/CrearUnidad';
import EditarUnidad from '../pages/EditarUnidad/EditarUnidad';
import UnidadDetalle from '../pages/UnidadDetalle/UnidadDetalle';
import HistorialRevisiones from '../pages/HistorialRevisiones/HistorialRevisiones';
import SeleccionarUnidadRevision from '../pages/SeleccionarUnidadRevision/SeleccionarUnidadRevision';
import CombustibleLista from '../pages/CombustibleLista/CombustibleLista';
import GeneradorInforme from '../pages/GeneradorInforme/GeneradorInforme';
import Vencimientos from '../pages/Vencimientos/Vencimientos';

// Guardia
import Choferes from '../pages/Choferes/VistaChoferes';
import AreasProtegidasLista from '../pages/AreasProtegidas/AreasProtegidasLista';
import AgregarArea from "../pages/AreasProtegidas/AgregarArea";
import EditarArea from "../pages/AreasProtegidas/EditarArea";

// Admin
import AdminPanel from "../pages/Admin/PanelAdmin";
import AdminIdentidades from "../pages/Admin/AdminIdentidades"
import AdminCrearIdentidad from "../pages/Admin/AdminCrearIdentidad";
import AdminEditarIdentidad from "../pages/Admin/AdminEditarIdentidad";
import AuditoriaLista from "../pages/Admin/AuditoriaLista";

// Biblioteca
import Biblioteca from '../pages/Biblioteca/Biblioteca';
import EditarBiblioteca from '../pages/Biblioteca/EditarBiblioteca';
import NuevaSeccion from '../pages/Biblioteca/NuevaSeccion';
import EditarSeccion from '../pages/Biblioteca/EditarSeccion';
import ListadoSecciones from '../pages/Biblioteca/ListadoSecciones';
import GruposBiblioteca from '../pages/Biblioteca/GruposBiblioteca';
import VistaSeccion from '../pages/Biblioteca/Secciones/VistaSeccion';
import VistaPreviaArchivo from '../pages/Biblioteca/Secciones/VistaPreviaArchivo';
import RegistroAccesos from '../pages/Biblioteca/RegistroAccesos';

// Legajos
import Legajos from '../pages/Legajos/LegajosLista';
import AgregarLegajo from '../pages/Legajos/AgregarLegajo';
import LegajoDetalle from '../pages/Legajos/LegajoDetalle';
import EditarLegajo from '../pages/Legajos/EditarLegajo';

import RutaProtegida from '../routes/RutaProtegida';
import AuthRedirect from '../routes/AuthRedirect';

import { useUser } from '../context/UserContext';
import LoadingScreen from '../pages/LoadingScreen/LoadingScreen';

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

          {/* Biblioteca Virtual: login y rutas protegidas por dni, con contexto propio */}
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

          {/* Rutas unidades con auth */}
          <Route
            path="/unidades"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia', 'graduados']}>
                <MainLayout>
                  <Unidades />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/crear-unidad"
            element={
              <RutaProtegida rolesPermitidos={['admin']}>
                <MainLayout>
                  <CrearUnidad />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/editar-unidad/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                <MainLayout>
                  <EditarUnidad />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/unidad/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia', 'graduados']}>
                <MainLayout>
                  <UnidadDetalle />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/seleccionar-unidad-historial"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia', 'graduados']}>
                <MainLayout>
                  <SeleccionarUnidadRevision />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/historial-revisiones/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia', 'graduados']}>
                <MainLayout>
                  <HistorialRevisiones />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/combustible"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia', 'graduados']}>
                <MainLayout>
                  <CombustibleLista />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/generador-informe"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia', 'graduados']}>
                <MainLayout>
                  <GeneradorInforme />
                </MainLayout>
              </RutaProtegida>
            }
          />

          <Route
            path="/areas-protegidas"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
                <MainLayout>
                  <AreasProtegidasLista />
                </MainLayout>
              </RutaProtegida>
            }
          />

          <Route
            path="/agregar-area"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
                <MainLayout>
                  <AgregarArea />
                </MainLayout>
              </RutaProtegida>
            }
          />

          <Route
            path="/editar-area/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
                <MainLayout>
                  <EditarArea />
                </MainLayout>
              </RutaProtegida>
            }
          />

          {/* Rutas Legajos con auth */}
          <Route
            path="/legajos"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'legajo', 'graduados']}>
                <MainLayout>
                  <Legajos />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/agregar-legajo"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'legajo', 'jefatura']}>
                <MainLayout>
                  <AgregarLegajo />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/legajo/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'legajo', 'bombero', 'graduados']}>
                <MainLayout>
                  <LegajoDetalle />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/editar-legajo/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'legajo', 'jefatura']}>
                <MainLayout>
                  <EditarLegajo />
                </MainLayout>
              </RutaProtegida>
            }
          />

          {/* Biblioteca Virtual administración (admin, jefatura, graduados) */}
          <Route
            path="/editar-biblioteca"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                <MainLayout>
                  <EditarBiblioteca />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/editar-biblioteca/secciones/nueva"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                <MainLayout>
                  <NuevaSeccion />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/editar-seccion/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                <MainLayout>
                  <EditarSeccion />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/editar-biblioteca/secciones"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                <MainLayout>
                  <ListadoSecciones />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/editar-biblioteca/grupos"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                <MainLayout>
                  <GruposBiblioteca />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/editar-biblioteca/registro"
            element={
              <RutaProtegida rolesPermitidos={['admin']}>
                  <MainLayout>
                    <RegistroAccesos />
                  </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/vencimientos"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'graduados']}>
                <MainLayout>
                  <Vencimientos />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/choferes"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia', 'graduados']}>
                <MainLayout>
                  <Choferes />
                </MainLayout>
              </RutaProtegida>
            }
          />

          {/* Administración */}
          <Route
            path="/admin"
            element={
              <RutaProtegida rolesPermitidos={['admin']}>
                <MainLayout>
                  <AdminPanel />
                </MainLayout>
              </RutaProtegida>
            }
          />

          <Route
            path="/admin/identidades"
            element={
              <RutaProtegida rolesPermitidos={['admin']}>
                <MainLayout>
                  <AdminIdentidades />
                </MainLayout>
              </RutaProtegida>
            }
          />

          <Route
            path="/admin/crear-identidad"
            element={
              <RutaProtegida rolesPermitidos={['admin']}>
                <MainLayout>
                  <AdminCrearIdentidad />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/editar-identidad/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin']}>
                <MainLayout>
                  <AdminEditarIdentidad />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/auditoria"
            element={
              <RutaProtegida rolesPermitidos={['admin']}>
                <MainLayout>
                  <AuditoriaLista />
                </MainLayout>
              </RutaProtegida>
            }
          />

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
