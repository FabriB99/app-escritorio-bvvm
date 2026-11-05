// src/pages/Guardia/constants.ts

export interface CodigoIntervencion {
  codigo: string;
  descripcion: string;
  categoria: string;
}

export const CODIGOS_INTERVENCION: CodigoIntervencion[] = [
  // 01. INCENDIO
  { codigo: '01-101', descripcion: 'Fuego en vivienda', categoria: 'Incendio' },
  { codigo: '01-102', descripcion: 'Fuego en industria', categoria: 'Incendio' },
  { codigo: '01-103', descripcion: 'Fuego en rodados', categoria: 'Incendio' },
  { codigo: '01-104', descripcion: 'Fuego en comercio', categoria: 'Incendio' },
  { codigo: '01-105', descripcion: 'Fuego en circuito eléctrico', categoria: 'Incendio' },
  { codigo: '01-108', descripcion: 'Quema de pastizales, sembrados y fardos', categoria: 'Incendio' },

  // 02. ACCIDENTES
  { codigo: '02-111', descripcion: 'Colisión generalizada, vuelco', categoria: 'Accidentes' },
  { codigo: '02-112', descripcion: 'Colisión auto - peatón', categoria: 'Accidentes' },
  { codigo: '02-113', descripcion: 'Colisión auto - bicicleta', categoria: 'Accidentes' },
  { codigo: '02-114', descripcion: 'Colisión auto - moto / camión - moto / moto - moto', categoria: 'Accidentes' },
  { codigo: '02-115', descripcion: 'Colisión auto - camión', categoria: 'Accidentes' },
  { codigo: '02-116', descripcion: 'Colisión camión - colectivo', categoria: 'Accidentes' },
  { codigo: '02-117', descripcion: 'Caída de bicicleta', categoria: 'Accidentes' },
  { codigo: '02-118', descripcion: 'Colisión auto - auto', categoria: 'Accidentes' },
  { codigo: '02-119', descripcion: 'Caída de moto', categoria: 'Accidentes' },
  { codigo: '02-120', descripcion: 'Colisión moto - peatón', categoria: 'Accidentes' },

  // 03. SALVATAJE
  { codigo: '03-121', descripcion: 'Descompostura en vía pública, domicilio', categoria: 'Salvataje' },
  { codigo: '03-122', descripcion: 'Intervención delictiva (herida de arma, robo, riña)', categoria: 'Salvataje' },
  { codigo: '03-123', descripcion: 'Intento de suicidio', categoria: 'Salvataje' },
  { codigo: '03-124', descripcion: 'Suicidio', categoria: 'Salvataje' },
  { codigo: '03-125', descripcion: 'Accidente laboral', categoria: 'Salvataje' },

  // 04. RESCATE
  { codigo: '04-130', descripcion: 'Rescate de persona', categoria: 'Rescate' },
  { codigo: '04-131', descripcion: 'Rescate de persona con vida en río', categoria: 'Rescate' },
  { codigo: '04-132', descripcion: 'Muerte por inmersión', categoria: 'Rescate' },
  { codigo: '04-133', descripcion: 'Lluvias, anegamientos e inundación', categoria: 'Rescate' },
  { codigo: '04-134', descripcion: 'Rescate de animales', categoria: 'Rescate' },
  { codigo: '04-135', descripcion: 'Incidentes con materiales peligrosos', categoria: 'Rescate' },
  { codigo: '04-136', descripcion: 'Retiro de óbito', categoria: 'Rescate' },

  // 05. MANTENIMIENTO / TAREAS GENERALES
  { codigo: '05-140', descripcion: 'Tareas varias (combustible, compras, reparaciones)', categoria: 'Mantenimiento' },
  { codigo: '05-141', descripcion: 'Prevenciones varias (Afuco, Anfiteatro, etc.)', categoria: 'Mantenimiento' },
  { codigo: '05-142', descripcion: 'Suministro de Agua (Piletas, PL, etc.)', categoria: 'Mantenimiento' },

  // 06. ORGANIZACIÓN FUNCIONAL
  { codigo: '06-150', descripcion: 'Capacitaciones varias', categoria: 'Organización' },
  { codigo: '06-151', descripcion: 'Actos varios (Entrega libros, aniversarios)', categoria: 'Organización' },
];

/**
 * Busca un código de intervención por código o texto de descripción.
 */
export const buscarCodigoIntervencion = (valor: string): CodigoIntervencion | undefined => {
  if (!valor) return undefined;
  const v = valor.trim().toLowerCase();
  return CODIGOS_INTERVENCION.find(
    (c) => c.codigo.toLowerCase() === v || c.descripcion.toLowerCase() === v || `${c.codigo} - ${c.descripcion}`.toLowerCase() === v
  );
};

/**
 * Extrae el código (ej: "01-101") de un texto que contenga código o descripción.
 */
export const formatearCodigoIntervencion = (texto?: string): string => {
  if (!texto) return '—';
  const match = texto.match(/^(\d{2}-\d{3})/);
  if (match) return match[1];

  // Si no empieza directamente por el código, buscar coincidencia por descripción
  const item = CODIGOS_INTERVENCION.find(
    (c) => c.descripcion.toLowerCase() === texto.toLowerCase() || texto.includes(c.codigo)
  );
  if (item) return item.codigo;

  return texto;
};

/**
 * Extrae la descripción legible de una intervención
 */
export const obtenerDescripcionIntervencion = (texto?: string): string => {
  if (!texto) return '';
  const item = CODIGOS_INTERVENCION.find(
    (c) => c.codigo === texto || `${c.codigo} - ${c.descripcion}` === texto || texto.startsWith(c.codigo)
  );
  if (item) return item.descripcion;
  return texto;
};
