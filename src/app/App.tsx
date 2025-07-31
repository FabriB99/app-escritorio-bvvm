import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../components/MainLayout/MainLayout';
import Inicio from '../pages/Inicio/Inicio';
import Login from '../pages/Login/Login';
import LoginBiblioteca from '../pages/Login/LoginBiblioteca';
import Unidades from '../pages/Unidades/Unidades';
import CrearUnidad from '../pages/CrearUnidad/CrearUnidad';
import EditarUnidad from '../pages/EditarUnidad/EditarUnidad';
import UnidadDetalle from '../pages/UnidadDetalle/UnidadDetalle';
import HistorialRevisiones from '../pages/HistorialRevisiones/HistorialRevisiones';
import SeleccionarUnidadRevision from '../pages/SeleccionarUnidadRevision/SeleccionarUnidadRevision';
import CombustibleLista from '../pages/CombustibleLista/CombustibleLista';
import GeneradorInforme from '../pages/GeneradorInforme/GeneradorInforme';

import Biblioteca from '../pages/Biblioteca/Biblioteca';
import EditarBiblioteca from '../pages/Biblioteca/EditarBiblioteca';
import AltaDNI from '../pages/Biblioteca/AltaDNI';
import ListadoDNIs from '../pages/Biblioteca/ListadoDNIs';
import VistaSeccion from '../pages/Biblioteca/Secciones/VistaSeccion';


import Legajos from '../pages/Legajos/LegajosLista';
import AgregarLegajo from '../pages/Legajos/AgregarLegajo';
import LegajoDetalle from '../pages/Legajos/LegajoDetalle';
import EditarLegajo from '../pages/Legajos/EditarLegajo';
import HistorialLegajo from '../pages/Legajos/HistorialLegajo';

import RutaProtegida from '../routes/RutaProtegida';
import AuthRedirect from '../routes/AuthRedirect';

import { useUser } from '../context/UserContext';
import LoadingScreen from '../pages/LoadingScreen/LoadingScreen';

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
          <Route path="/biblioteca-login" element={<LoginBiblioteca />} />

          <Route
            path="/unidades"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
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
              <RutaProtegida rolesPermitidos={['admin', 'jefatura']}>
                <MainLayout>
                  <EditarUnidad />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/unidad/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
                <MainLayout>
                  <UnidadDetalle />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/seleccionar-unidad-historial"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
                <MainLayout>
                  <SeleccionarUnidadRevision />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/historial-revisiones/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
                <MainLayout>
                  <HistorialRevisiones />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/combustible"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
                <MainLayout>
                  <CombustibleLista />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/generador-informe"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'guardia']}>
                <MainLayout>
                  <GeneradorInforme />
                </MainLayout>
              </RutaProtegida>
            }
          />

          {/* Rutas para Legajos */}
          <Route
            path="/legajos"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'legajo']}>
                <MainLayout>
                  <Legajos />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/agregar-legajo"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'legajo']}>
                <MainLayout>
                  <AgregarLegajo />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/legajo/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'jefatura', 'legajo']}>
                <MainLayout>
                  <LegajoDetalle />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/editar-legajo/:id"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'legajo']}>
                <MainLayout>
                  <EditarLegajo />
                </MainLayout>
              </RutaProtegida>
            }
          />
          <Route
            path="/historial"
            element={
              <RutaProtegida rolesPermitidos={['admin', 'legajo']}>
                <MainLayout>
                  <HistorialLegajo />
                </MainLayout>
              </RutaProtegida>
            }
          />

        {/* 📚 Biblioteca Virtual (solo admin y jefatura para editar) */}
        <Route
          path="/editar-biblioteca"
          element={
            <RutaProtegida rolesPermitidos={['admin', 'jefatura']}>
              <MainLayout>
                <EditarBiblioteca />
              </MainLayout>
            </RutaProtegida>
          }
        />
        <Route
          path="/editar-biblioteca/dnis"
          element={
            <RutaProtegida rolesPermitidos={['admin', 'jefatura']}>
              <MainLayout>
                <AltaDNI />
              </MainLayout>
            </RutaProtegida>
          }
        />
        <Route
          path="/editar-biblioteca/dnis/listado"
          element={
            <RutaProtegida rolesPermitidos={['admin', 'jefatura']}>
              <MainLayout>
                <ListadoDNIs />
              </MainLayout>
            </RutaProtegida>
          }
        />

        {/* Acceso general de bomberos a la Biblioteca Virtual */}
        <Route
          path="/biblioteca"
          element={
              <Biblioteca />
          }
        />
        <Route path="/biblioteca/seccion/:seccionId" element={<VistaSeccion />} />


          {/* Ruta fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthRedirect>
    </div>
  );
};

export default App;
