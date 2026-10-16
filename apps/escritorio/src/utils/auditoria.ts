// src/utils/auditoria.ts

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../app/firebase-config";
import type { MiembroActivo, RolUsuario } from "../context/UserContext";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type AccionAuditoria = "crear" | "editar" | "eliminar" | "autorizar";

export interface CampoModificado {
  campo: string;
  anterior: any;
  nuevo: any;
}

// Mantenemos el alias por si algún archivo viejo todavía lo importa con el error de tipeo
export type CamboModificado = CampoModificado;

export interface Operador {
  uid: string;
  nombre: string;
  rol: RolUsuario | string;
}

export interface RegistroAuditoria {
  accion: AccionAuditoria;
  coleccion: string;
  docId: string;
  docResumen: string;
  operador: Operador;
  detalles?: {
    descripcion?: string;
    cambios?: CampoModificado[];
    snapshot?: Record<string, any>;
  };
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

const CAMPOS_IGNORADOS = new Set([
  "fechaCreacion",
  "fechaEdicion",
  "creadoPor",
  "id",
  "autorizacion",
]);

/**
 * Convierte cualquier valor (incluyendo Timestamps de Firebase o undefined)
 * a un formato seguro para comparar y guardar en Firestore.
 */
const normalizarValor = (valor: any): any => {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === "object" && typeof valor.toDate === "function") {
    return valor.toDate().toISOString();
  }
  if (Array.isArray(valor)) {
    return valor.map(normalizarValor);
  }
  if (typeof valor === "object") {
    const limpio: Record<string, any> = {};
    for (const [k, v] of Object.entries(valor)) {
      if (v !== undefined) {
        limpio[k] = normalizarValor(v);
      }
    }
    return limpio;
  }
  return valor;
};

// ─── Funciones públicas ───────────────────────────────────────────────────────

export const buildOperador = (
  miembroActivo: Pick<MiembroActivo, "id" | "nombre" | "apellido"> | null,
  rol?: string
): Operador => {
  if (!miembroActivo) {
    return {
      uid: "desconocido",
      nombre: "Sin identificar",
      rol: rol ?? "desconocido",
    };
  }
  return {
    uid: miembroActivo.id,
    nombre: `${miembroActivo.nombre} ${miembroActivo.apellido}`.trim(),
    rol: rol ?? "desconocido",
  };
};

export const calcularDiff = (
  anterior: Record<string, any>,
  nuevo: Record<string, any>
): CampoModificado[] => {
  if (!anterior || !nuevo) return [];

  const keys = Array.from(
    new Set([...Object.keys(anterior), ...Object.keys(nuevo)])
  ).filter((k) => !CAMPOS_IGNORADOS.has(k));

  return keys.reduce<CampoModificado[]>((acc, key) => {
    const va = normalizarValor(anterior[key]);
    const vn = normalizarValor(nuevo[key]);

    if (JSON.stringify(va) !== JSON.stringify(vn)) {
      acc.push({ campo: key, anterior: va, nuevo: vn });
    }
    return acc;
  }, []);
};

export const registrarAuditoria = async (
  registro: RegistroAuditoria
): Promise<void> => {
  try {
    const detallesLimpios = registro.detalles
      ? normalizarValor(registro.detalles)
      : null;

    await addDoc(collection(db, "auditoria"), {
      fecha: serverTimestamp(),
      accion: registro.accion,
      coleccion: registro.coleccion,
      docId: registro.docId,
      docResumen: registro.docResumen || "Sin descripción",
      operador: registro.operador ?? {
        uid: "desconocido",
        nombre: "Sin identificar",
        rol: "desconocido",
      },
      detalles: detallesLimpios,
    });
  } catch (error) {
    // Logueamos en consola pero evitamos que un fallo menor de auditoría
    // rompa la operación principal que está haciendo el bombero
    console.error("Error al registrar auditoría en Firestore:", error);
  }
};