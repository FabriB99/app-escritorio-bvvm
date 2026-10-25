import { ReactNode, lazy } from 'react';

// Páginas de acceso frecuente / inicio (Carga directa para renderizado instantáneo)
import DashboardGuardia from '../pages/Guardia/Dashboard/DashboardGuardia';
import Unidades from '../pages/Unidades/Unidades';

// Páginas secundarias y de uso específico (Carga diferida / Lazy loading)
// Unidades & Revisiones
const EditarUnidad = lazy(() => import('../pages/EditarUnidad/EditarUnidad'));
const UnidadDetalle = lazy(() => import('../pages/UnidadDetalle/UnidadDetalle'));
const HistorialRevisiones = lazy(() => import('../pages/HistorialRevisiones/HistorialRevisiones'));
const SeleccionarUnidadRevision = lazy(() => import('../pages/SeleccionarUnidadRevision/SeleccionarUnidadRevision'));
const CombustibleLista = lazy(() => import('../pages/CombustibleLista/CombustibleLista'));
const GeneradorInforme = lazy(() => import('../pages/GeneradorInforme/GeneradorInforme'));
const Vencimientos = lazy(() => import('../pages/Vencimientos/Vencimientos'));

// Guardia & Operaciones
const Choferes = lazy(() => import('../pages/Choferes/VistaChoferes'));
const AreasProtegidasLista = lazy(() => import('../pages/AreasProtegidas/AreasProtegidasLista'));
const AgregarEditarArea = lazy(() => import('../pages/AreasProtegidas/AgregarEditarArea'));
const ListadoNovedadesGuardia = lazy(() => import('../pages/Guardia/Dashboard/ListadoNovedadesGuardia'));
const ListadoElementosMedicos = lazy(() => import('../pages/Guardia/ElementosMedicosHospital/ListadoElementosMedicos'));

// Admin
const AdminPanel = lazy(() => import('../pages/Admin/PanelAdmin'));
const AdminIdentidades = lazy(() => import('../pages/Admin/AdminIdentidades'));
const AdminGrados = lazy(() => import('../pages/Admin/AdminGrados'));
const AdminFormIdentidad = lazy(() => import('../pages/Admin/AdminFormIdentidad'));
const AuditoriaLista = lazy(() => import('../pages/Admin/AuditoriaLista'));

// Biblioteca (administración)
const EditarBiblioteca = lazy(() => import('../pages/Biblioteca/EditarBiblioteca'));
const NuevaSeccion = lazy(() => import('../pages/Biblioteca/NuevaSeccion'));
const EditarSeccion = lazy(() => import('../pages/Biblioteca/EditarSeccion'));
const ListadoSecciones = lazy(() => import('../pages/Biblioteca/ListadoSecciones'));
const GruposBiblioteca = lazy(() => import('../pages/Biblioteca/GruposBiblioteca'));
const RegistroAccesos = lazy(() => import('../pages/Biblioteca/RegistroAccesos'));

// Legajos
const Legajos = lazy(() => import('../pages/Legajos/LegajosLista'));
const AgregarLegajo = lazy(() => import('../pages/Legajos/AgregarLegajo'));
const LegajoDetalle = lazy(() => import('../pages/Legajos/LegajoDetalle'));
const EditarLegajo = lazy(() => import('../pages/Legajos/EditarLegajo'));

export interface RutaProtegidaConfig {
  path: string;
  element: ReactNode;
  roles: string[];
}

export const rutasProtegidas: RutaProtegidaConfig[] = [
  { path: '/dashboard-guardia', element: <DashboardGuardia />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
  { path: '/guardia', element: <DashboardGuardia />, roles: ['admin', 'jefatura', 'guardia', 'graduados'] },
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
  { path: '/editar-biblioteca', element: <EditarBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/secciones/nueva', element: <NuevaSeccion />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-seccion/:id', element: <EditarSeccion />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/secciones', element: <ListadoSecciones />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/grupos', element: <GruposBiblioteca />, roles: ['admin', 'jefatura', 'graduados'] },
  { path: '/editar-biblioteca/registro', element: <RegistroAccesos />, roles: ['admin'] },
  { path: '/admin', element: <AdminPanel />, roles: ['admin'] },
  { path: '/admin/identidades', element: <AdminIdentidades />, roles: ['admin'] },
  { path: '/admin/grados', element: <AdminGrados />, roles: ['admin'] },
  { path: '/admin/crear-identidad', element: <AdminFormIdentidad />, roles: ['admin'] },
  { path: '/admin/editar-identidad/:id', element: <AdminFormIdentidad />, roles: ['admin'] },
  { path: '/admin/auditoria', element: <AuditoriaLista />, roles: ['admin'] },
];
