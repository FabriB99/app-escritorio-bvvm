import { ReactNode } from 'react';

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
import AgregarArea from '../pages/AreasProtegidas/AgregarArea';
import EditarArea from '../pages/AreasProtegidas/EditarArea';
import ListadoCapacitaciones from '../pages/Guardia/Capacitaciones/ListadoCapacitaciones';
import ParteCapacitaciones from '../pages/Guardia/Capacitaciones/ParteCapacitaciones';
import DashboardGuardia from '../pages/Guardia/Dashboard/DashboardGuardia';

// Admin
import AdminPanel from '../pages/Admin/PanelAdmin';
import AdminIdentidades from '../pages/Admin/AdminIdentidades';
import AdminGrados from '../pages/Admin/AdminGrados';
import AdminCrearIdentidad from '../pages/Admin/AdminCrearIdentidad';
import AdminEditarIdentidad from '../pages/Admin/AdminEditarIdentidad';
import AuditoriaLista from '../pages/Admin/AuditoriaLista';

// Biblioteca (administración)
import EditarBiblioteca from '../pages/Biblioteca/EditarBiblioteca';
import NuevaSeccion from '../pages/Biblioteca/NuevaSeccion';
import EditarSeccion from '../pages/Biblioteca/EditarSeccion';
import ListadoSecciones from '../pages/Biblioteca/ListadoSecciones';
import GruposBiblioteca from '../pages/Biblioteca/GruposBiblioteca';
import RegistroAccesos from '../pages/Biblioteca/RegistroAccesos';

// Legajos
import Legajos from '../pages/Legajos/LegajosLista';
import AgregarLegajo from '../pages/Legajos/AgregarLegajo';
import LegajoDetalle from '../pages/Legajos/LegajoDetalle';
import EditarLegajo from '../pages/Legajos/EditarLegajo';

export interface RutaProtegidaConfig {
  path: string;
  element: ReactNode;
  roles: string[];
}

export const rutasProtegidas: RutaProtegidaConfig[] = [
  { path: '/dashboard-guardia', element: <DashboardGuardia />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/unidades', element: <Unidades />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/crear-unidad', element: <CrearUnidad />, roles: ['admin'] },
  { path: '/editar-unidad/:id', element: <EditarUnidad />, roles: ['admin', 'jefatura', 'graduados', 'guardia'] },
  { path: '/unidad/:id', element: <UnidadDetalle />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/seleccionar-unidad-historial', element: <SeleccionarUnidadRevision />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/historial-revisiones/:id', element: <HistorialRevisiones />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/combustible', element: <CombustibleLista />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/generador-informe', element: <GeneradorInforme />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/vencimientos', element: <Vencimientos />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/areas-protegidas', element: <AreasProtegidasLista />, roles: ['admin', 'jefatura', 'guardia'] },
  { path: '/agregar-area', element: <AgregarArea />, roles: ['admin', 'jefatura', 'guardia'] },
  { path: '/editar-area/:id', element: <EditarArea />, roles: ['admin', 'jefatura', 'guardia'] },
  { path: '/p-capacitaciones', element: <ParteCapacitaciones />, roles: ['admin', 'jefatura', 'guardia'] },
  { path: '/listado-capacitaciones', element: <ListadoCapacitaciones />, roles: ['admin', 'jefatura', 'guardia'] },
  { path: '/choferes', element: <Choferes />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/legajos', element: <Legajos />, roles: ['admin', 'jefatura', 'legajo', 'graduados'] },
  { path: '/agregar-legajo', element: <AgregarLegajo />, roles: ['admin', 'legajo', 'jefatura'] },
  { path: '/legajo/:id', element: <LegajoDetalle />, roles: ['admin', 'jefatura', 'legajo', 'bombero', 'graduados'] },
  { path: '/editar-legajo/:id', element: <EditarLegajo />, roles: ['admin', 'legajo', 'jefatura'] },
  { path: '/editar-biblioteca', element: <EditarBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/secciones/nueva', element: <NuevaSeccion />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-seccion/:id', element: <EditarSeccion />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/secciones', element: <ListadoSecciones />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/grupos', element: <GruposBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/registro', element: <RegistroAccesos />, roles: ['admin'] },
  { path: '/admin', element: <AdminPanel />, roles: ['admin'] },
  { path: '/admin/identidades', element: <AdminIdentidades />, roles: ['admin'] },
  { path: '/admin/grados', element: <AdminGrados />, roles: ['admin'] },
  { path: '/admin/crear-identidad', element: <AdminCrearIdentidad />, roles: ['admin'] },
  { path: '/admin/editar-identidad/:id', element: <AdminEditarIdentidad />, roles: ['admin'] },
  { path: '/admin/auditoria', element: <AuditoriaLista />, roles: ['admin'] },
];
