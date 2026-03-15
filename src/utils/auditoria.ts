// src/utils/auditoria.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../app/firebase-config";

export type AccionAuditoria = "crear" | "editar" | "eliminar";

export interface RegistroAuditoria {
  coleccion: string;                // ej: "legajos"
  accion: AccionAuditoria;          // "crear" | "editar" | "eliminar"
  tipoCambio?: string;              // opcional: "ascenso", "curso", "sancion", etc.
  docId: string;                    // id del documento afectado (ej el legajo.id)
  miembro: { uid: string; rol: string };
  datosNuevos?: any;
  datosAnteriores?: any;
}

export const registrarAuditoria = async (registro: RegistroAuditoria) => {
  try {
    await addDoc(collection(db, "auditoria"), {
      ...registro,
      fecha: serverTimestamp(),
    });
  } catch (err) {
    // No cortamos la UX: logueamos y re-lanzamos por si querés manejarlo
    console.error("Error registrando auditoría:", err);
    throw err;
  }
};
