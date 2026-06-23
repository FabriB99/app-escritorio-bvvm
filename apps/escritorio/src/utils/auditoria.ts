// src/utils/auditoria.ts
//
// Sistema de auditoría centralizado para BVVM.
//
// PRINCIPIO CLAVE: toda la información del operador se resuelve y se guarda
// en el momento de ESCRIBIR el log. El panel de auditoría lee el documento
// tal cual está — nunca necesita hacer lookups secundarios.
//
// Estructura del documento en Firestore (colección: "auditoria"):
// {
//   fecha:      Timestamp     — cuándo ocurrió
//   accion:     string        — "crear" | "editar" | "eliminar" | "autorizar"
//   coleccion:  string        — qué colección fue afectada
//   docId:      string        — ID del documento afectado
//   docResumen: string        — descripción legible del doc (ej: "Capacitación 22/05/2026")
//   operador: {
//     uid:      string        — uid de Firebase Auth
//     nombre:   string        — nombre completo
//     rol:      string        — rol en el sistema
//   }
//   detalles: {
//     descripcion?: string    — texto libre opcional
//     cambios?: [{            — solo en "editar"
//       campo:    string
//       anterior: any
//       nuevo:    any
//     }]
//     snapshot?: object       — copia del doc completo (solo en "eliminar")
//   }
// }

import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { db } from "../app/firebase-config";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type AccionAuditoria = "crear" | "editar" | "eliminar" | "autorizar";

export interface CampoModificado {
  campo: string;
  anterior: any;
  nuevo: any;
}

export interface Operador {
  uid: string;
  nombre: string;
  rol: string;
}

export interface RegistroAuditoria {
  accion: AccionAuditoria;
  coleccion: string;
  docId: string;
  docResumen: string;   // texto legible — ej: "Capacitación 22/05/2026 — Cuartel"
  operador: Operador;
  detalles?: {
    descripcion?: string;
    cambios?: CamboModificado[];
    snapshot?: Record<string, any>;
  };
}

// Alias para no romper si alguien lo importa con typo (ver abajo)
type CamboModificado = CampoModificado;

// ─── buildOperador ────────────────────────────────────────────────────────────
//
// Lee el documento del usuario desde Firestore y construye el objeto Operador.
// Llamar esto ANTES de registrarAuditoria garantiza que nombre y rol
// siempre estén presentes en el log, sin depender de lookups posteriores.
//
// Uso:
//   const operador = await buildOperador(user.uid);
//   await registrarAuditoria({ ..., operador });

export const buildOperador = async (uid: string): Promise<Operador> => {
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    if (snap.exists()) {
      const d = snap.data() as Record<string, any>;
      const nombre = [d.nombre, d.apellido].filter(Boolean).join(" ").trim();
      return {
        uid,
        nombre: nombre || `uid:${uid}`,
        rol: d.rol ?? "desconocido",
      };
    }
  } catch (err) {
    // Sin permisos o doc no existe — usamos fallback
    console.warn("buildOperador: no se pudo leer usuarios/" + uid, err);
  }
  return { uid, nombre: `uid:${uid}`, rol: "desconocido" };
};

// ─── calcularDiff ─────────────────────────────────────────────────────────────
//
// Compara dos versiones de un objeto y devuelve solo los campos que cambiaron.
// Ignora campos de metadatos internos.
//
// Uso:
//   const cambios = calcularDiff(docAntes, docDespues);
//   await registrarAuditoria({ accion: "editar", detalles: { cambios } });

const CAMPOS_IGNORADOS = new Set([
  "fechaCreacion", "fechaEdicion", "creadoPor", "id",
  "autorizacion",  // la autorización tiene su propio log
]);

export const calcularDiff = (
  anterior: Record<string, any>,
  nuevo: Record<string, any>
): CampoModificado[] => {
  if (!anterior || !nuevo) return [];

  const keys = Array.from(
    new Set([...Object.keys(anterior), ...Object.keys(nuevo)])
  ).filter(k => !CAMPOS_IGNORADOS.has(k));

  return keys.reduce<CampoModificado[]>((acc, key) => {
    const va = anterior[key];
    const vn = nuevo[key];
    const sa = JSON.stringify(va ?? null);
    const sn = JSON.stringify(vn ?? null);
    if (sa !== sn) {
      acc.push({ campo: key, anterior: va ?? null, nuevo: vn ?? null });
    }
    return acc;
  }, []);
};

// ─── registrarAuditoria ───────────────────────────────────────────────────────
//
// Escribe el log en Firestore. Lanza error si falla — el caller decide
// si interrumpe la operación o solo loguea.

export const registrarAuditoria = async (registro: RegistroAuditoria): Promise<void> => {
  await addDoc(collection(db, "auditoria"), {
    fecha:      serverTimestamp(),
    accion:     registro.accion,
    coleccion:  registro.coleccion,
    docId:      registro.docId,
    docResumen: registro.docResumen,
    operador:   registro.operador,
    detalles:   registro.detalles ?? null,
  });
};
