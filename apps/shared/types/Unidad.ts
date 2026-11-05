export type TipoUnidadChofer =
  | 'Maestranza'
  | 'Ambulancias'
  | 'Livianas'
  | 'Pesadas'
  | 'Escalera';

export const TIPOS_UNIDAD = [
  'Ambulancia',
  'Unidad de Incendio Estructural',
  'Unidad de Incendio Forestal',
  'Unidad de Abastecimiento',
  'Unidad de Rescate Urbano',
  'Unidad de Transporte Personal',
  'Unidad de Logística',
  'Escalera Mecánica',
  'Unidad de Rescate Vehicular',
  'Unidad de Rescate Acuático',
] as const;

export type TipoUnidad = (typeof TIPOS_UNIDAD)[number];

export interface Unidad {
  id: string;
  nombre: string;
  numero?: string | number;
  tipo?: TipoUnidad | string;
  categoria?: TipoUnidadChofer;
  modelo?: string;
  patente?: string;
  estado?: 'En servicio' | 'Fuera de servicio' | 'En mantenimiento' | string;
  kilometraje?: number | string;
  combustible?: string;
  operativa?: boolean;
  ultima_revision?: any;
  fechaControlCombustible?: any;
  imagenUrl?: string;
}