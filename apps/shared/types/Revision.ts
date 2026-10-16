import { EstadoElemento } from "./Elemento";

export interface Revision {
  id?: string;
  unidadId: string;
  fecha: any; // Soporta Timestamp de Firestore o Date
  bombero: string;
  observaciones?: string;
  // Guardamos un diccionario plano por ID de elemento (ej: { "elem_123": "Operativo" }) 
  // para que sea súper rápido de consultar y procesar en Firestore
  elementos: Record<string, EstadoElemento>;
}