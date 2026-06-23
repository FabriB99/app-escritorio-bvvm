// src/pages/Guardia/ElementosMedicosHospital/types.ts

export type EstadoElemento = 'pendiente' | 'recuperado';

export interface UnidadRef {
  id: string;
  nombre: string;
}

export interface ElementoMedicoHospital {
  id?: string;

  // Elemento
  elemento: string;         // Valor de la lista o "Otro"
  elementoOtro?: string;    // Solo si elemento === "Otro"

  // Cantidad
  cantidad: number;

  // Destino
  hospital: string;         // Valor de la lista o "Otro"
  hospitalOtro?: string;    // Solo si hospital === "Otro"

  // Unidad que lo dejó
  unidadId: string;
  unidadNombre: string;

  // Observaciones al depositar
  observaciones?: string;

  // Estado
  estado: EstadoElemento;

  // Auditoría de creación
  registradoPorUid: string;
  registradoPorNombre: string;
  fechaRegistro: import('firebase/firestore').Timestamp;

  // Recuperación
  fechaRecuperacion?: import('firebase/firestore').Timestamp;
  observacionesRecuperacion?: string;

  // Meta
  anio: number;
}

// Documentos de configuración en config_guardia/
export interface ConfigLista {
  items: string[];
}