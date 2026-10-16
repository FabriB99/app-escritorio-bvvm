// src/types/unidades.ts

export type TipoUnidadChofer =
  | 'Maestranza'
  | 'Ambulancias'
  | 'Livianas'
  | 'Pesadas'
  | 'Escalera';

export const CATEGORIAS_CHOFER: TipoUnidadChofer[] = [
  'Maestranza',
  'Ambulancias',
  'Livianas',
  'Pesadas',
  'Escalera',
];

export type EstadoHabilitacion = 'habilitado' | 'aprendizaje';

export type HabilitacionesChofer = Partial<Record<TipoUnidadChofer, EstadoHabilitacion>>;

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

export const CATEGORIA_SUGERIDA_POR_TIPO: Record<TipoUnidad, TipoUnidadChofer> = {
  'Ambulancia': 'Ambulancias',
  'Unidad de Incendio Estructural': 'Pesadas',
  'Unidad de Incendio Forestal': 'Livianas',
  'Unidad de Abastecimiento': 'Pesadas',
  'Unidad de Rescate Urbano': 'Livianas',
  'Unidad de Transporte Personal': 'Livianas',
  'Unidad de Logística': 'Maestranza',
  'Escalera Mecánica': 'Escalera',
  'Unidad de Rescate Vehicular': 'Livianas',
  'Unidad de Rescate Acuático': 'Livianas',
};

export type EstadoElemento = 'Operativo' | 'Con falla' | 'Faltante';

export interface Elemento {
  id: string;
  nombre: string;
  cantidad: number;
  estado?: EstadoElemento;
  ubicacion_id?: string;
  orden?: number;
}

export interface Ubicacion {
  id: string;
  nombre: string;
  unidad_id?: string;
  orden?: number;
  elementos: Elemento[];
}

export interface Unidad {
  id: string;
  nombre: string;
  numero?: string | number;
  tipo?: TipoUnidad | string;
  categoria?: TipoUnidadChofer;
  modelo?: string;
  patente?: string;
  estado?: 'En servicio' | 'Fuera de servicio' | 'En mantenimiento' | string;
  kilometraje?: string;
  combustible: string; // Ahora sí es obligatorio en TypeScript
  fechaControlCombustible?: any;
  imagenUrl?: string;
}