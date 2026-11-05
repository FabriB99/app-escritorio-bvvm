import { ReactNode } from 'react';

// Importación directa de todas las páginas para transiciones instantáneas sin pantallas de carga intermedias
// Guardia & Operaciones
import DashboardGuardia from '../pages/Guardia/Dashboard/DashboardGuardia';
import ListadoNovedadesGuardia from '../pages/Guardia/Dashboard/ListadoNovedadesGuardia';
import ListadoElementosMedicos from '../pages/Guardia/ElementosMedicosHospital/ListadoElementosMedicos';
import LibroGuardia from '../pages/Guardia/LibroGuardia/LibroGuardia';
import Choferes from '../pages/Choferes/VistaChoferes';
import AreasProtegidasLista from '../pages/AreasProtegidas/AreasProtegidasLista';
import AgregarEditarArea from '../pages/AreasProtegidas/AgregarEditarArea';

// Unidades & Revisiones
import Unidades from '../pages/Unidades/Unidades';
import EditarUnidad from '../pages/EditarUnidad/EditarUnidad';
import UnidadDetalle from '../pages/UnidadDetalle/UnidadDetalle';
import HistorialRevisiones from '../pages/HistorialRevisiones/HistorialRevisiones';
import SeleccionarUnidadRevision from '../pages/SeleccionarUnidadRevision/SeleccionarUnidadRevision';
import CombustibleLista from '../pages/CombustibleLista/CombustibleLista';
import GeneradorInforme from '../pages/GeneradorInforme/GeneradorInforme';
import Vencimientos from '../pages/Vencimientos/Vencimientos';

// Admin
import AdminPanel from '../pages/Admin/PanelAdmin';
import AdminIdentidades from '../pages/Admin/AdminIdentidades';
import AdminGrados from '../pages/Admin/AdminGrados';
import AdminFormIdentidad from '../pages/Admin/AdminFormIdentidad';
import AuditoriaLista from '../pages/Admin/AuditoriaLista';

// Biblioteca (administración unificada Master-Detail)
import AdminBiblioteca from '../pages/Biblioteca/AdminBiblioteca';

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
  { path: '/guardia', element: <DashboardGuardia />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/guardia/libro-guardia', element: <LibroGuardia />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/libro-guardia', element: <LibroGuardia />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/guardia/novedades-historial', element: <ListadoNovedadesGuardia />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/novedades-historial', element: <ListadoNovedadesGuardia />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/elementos-medicos', element: <ListadoElementosMedicos />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/guardia/elementos-medicos', element: <ListadoElementosMedicos />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/unidades', element: <Unidades />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/crear-unidad', element: <EditarUnidad />, roles: ['admin'] },
  { path: '/editar-unidad/:id', element: <EditarUnidad />, roles: ['admin', 'jefatura', 'graduados', 'guardia'] },
  { path: '/unidad/:id', element: <UnidadDetalle />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/seleccionar-unidad-historial', element: <SeleccionarUnidadRevision />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/historial-revisiones/:id', element: <HistorialRevisiones />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/combustible', element: <CombustibleLista />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/generador-informe', element: <GeneradorInforme />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/vencimientos', element: <Vencimientos />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/areas-protegidas', element: <AreasProtegidasLista />, roles: ['admin', 'jefatura', 'guardia'] },
  { path: '/agregar-area', element: <AgregarEditarArea />, roles: ['admin', 'jefatura', 'guardia'] },
  { path: '/editar-area/:id', element: <AgregarEditarArea />, roles: ['admin', 'jefatura', 'guardia'] },
  { path: '/choferes', element: <Choferes />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/legajos', element: <Legajos />, roles: ['admin', 'jefatura', 'legajo', 'graduados'] },
  { path: '/agregar-legajo', element: <AgregarLegajo />, roles: ['admin', 'legajo', 'jefatura'] },
  { path: '/legajo/:id', element: <LegajoDetalle />, roles: ['admin', 'jefatura', 'legajo', 'bombero', 'graduados'] },
  { path: '/editar-legajo/:id', element: <EditarLegajo />, roles: ['admin', 'legajo', 'jefatura'] },
  { path: '/editar-biblioteca', element: <AdminBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/admin-biblioteca', element: <AdminBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/secciones', element: <AdminBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/secciones/nueva', element: <AdminBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-seccion/:id', element: <AdminBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/grupos', element: <AdminBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/registro', element: <AdminBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/admin', element: <AdminPanel />, roles: ['admin'] },
  { path: '/admin/identidades', element: <AdminIdentidades />, roles: ['admin'] },
  { path: '/admin/grados', element: <AdminGrados />, roles: ['admin'] },
  { path: '/admin/crear-identidad', element: <AdminFormIdentidad />, roles: ['admin'] },
  { path: '/admin/editar-identidad/:id', element: <AdminFormIdentidad />, roles: ['admin'] },
  { path: '/admin/auditoria', element: <AuditoriaLista />, roles: ['admin'] },
];
