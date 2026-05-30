// src/utils/auditoria.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../app/firebase-config";

export type AccionAuditoria = "crear" | "editar" | "eliminar";

export interface CampoModificado {
  campo: string;         // Ej: "lugar", "horas", "fecha"
  anterior: any;        // Valor antes de la edición
  nuevo: any;           // Valor después de la edición
}

export interface RegistroAuditoria {
  coleccion: string;        // Ej: "capacitaciones", "legajos"
  accion: AccionAuditoria;  // "crear" | "editar" | "eliminar"
  tipoCambio?: string;      // Opcional: "alta_curso", "autorizacion", etc.
  docId: string;            // ID del documento afectado
  
  operador: { 
    uid: string; 
    rol: string; 
    nombre?: string;        // Opcional: displayName del usuario
  };
  
  detalles?: {
    descripcionBreve?: string;     // Corregido: sin espacio intermedio
    cambios?: CampoModificado[];
    valoresCreados?: any;
  };
}

/**
 * Helper para calcular la diferencia exacta entre dos objetos (Diff).
 * Omite campos internos irrelevantes y detecta qué propiedades cambiaron.
 */
export const calcularDiff = (anterior: any, nuevo: any): CampoModificado[] => {
  const cambios: CampoModificado[] = [];
  if (!anterior || !nuevo) return cambios;

  const todasLasKeys = Array.from(new Set([...Object.keys(anterior), ...Object.keys(nuevo)]));

  for (const key of todasLasKeys) {
    if (key === "fechaCreacion" || key === "fechaEdicion" || key === "id") continue;

    const valAnterior = anterior[key];
    const valNuevo = nuevo[key];

    const strAnterior = typeof valAnterior === "object" ? JSON.stringify(valAnterior) : valAnterior;
    const strNuevo = typeof valNuevo === "object" ? JSON.stringify(valNuevo) : valNuevo;

    if (strAnterior !== strNuevo) {
      cambios.push({
        campo: key,
        anterior: valAnterior !== undefined ? valAnterior : null,
        nuevo: valNuevo !== undefined ? valNuevo : null,
      });
    }
  }

  return cambios;
};

/**
 * Registra una acción en la colección centralizada de auditoría en Firestore.
 */
export const registrarAuditoria = async (registro: RegistroAuditoria) => {
  try {
    await addDoc(collection(db, "auditoria"), {
      ...registro,
      fecha: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error registrando auditoría:", err);
    throw err;
  }
};