// src/types/unidades.ts
//
// Tipos y constantes compartidas entre Vencimientos, VistaChoferes, Unidades
// y UnidadDetalle. Antes estaban duplicados en cada componente por separado;
// ahora viven en un solo lugar para que no se desincronicen.

/**
 * Categoría "de chofer" de una unidad. Es una clasificación GRUESA
 * (5 grupos) usada para habilitaciones de choferes y para vincular VTV.
 * No confundir con `TipoUnidad`, que es la clasificación detallada del
 * vehículo (10 tipos) que se usa en la ficha técnica.
 */
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

/**
 * Tipo detallado de unidad (ficha técnica / inventario). Se mantiene
 * separado de la categoría de chofer a propósito: dos unidades del mismo
 * `tipo` podrían, en teoría, quedar en categorías distintas.
 */
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

/**
 * Sugerencia de categoría a partir del tipo detallado, para precargar el
 * campo `categoria` en el formulario de creación/edición de unidad. Es solo
 * una ayuda: el usuario la puede cambiar. Ajustá estos mapeos si no
 * corresponden a cómo lo clasifican en el cuerpo.
 */
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