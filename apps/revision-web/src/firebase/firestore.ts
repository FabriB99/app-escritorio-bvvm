import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase-config";

import { Unidad } from "../../../shared/types/Unidad";
import { Ubicacion, Elemento } from "../../../shared/types/Ubicacion";
import { SalidaUnidad } from "../../../shared/types/SalidaUnidad";

export type EstadoElemento = "Operativo" | "Con falla" | "Faltante";

export interface MiembroRevision {
  id: string;
  nombre: string;
  apellido: string;
  ordenOperativo?: number | string;
  activo?: boolean;
}

export interface RevisionData {
  unidadId: string;
  bombero: string;
  bomberos?: string[];
  observaciones: string;
  elementos: Record<string, EstadoElemento>;
}

// 🏷️ Helper para formatear la etiqueta de cada bombero:
// Si tiene ordenOperativo: "112 - Pérez Luis Eduardo"
// Si no tiene ordenOperativo: "Pérez Luis Eduardo"
export function formatearEtiquetaMiembro(miembro: MiembroRevision): string {
  const tieneOrden =
    miembro.ordenOperativo !== undefined &&
    miembro.ordenOperativo !== null &&
    String(miembro.ordenOperativo).trim() !== "";

  const nombreCompleto = `${miembro.apellido || ""} ${miembro.nombre || ""}`.trim();

  if (tieneOrden) {
    return `${miembro.ordenOperativo} - ${nombreCompleto}`;
  }
  return nombreCompleto;
}

// 🧑‍🚒 Obtener miembros activos ordenados por ordenOperativo ascendente
export const getMiembros = async (): Promise<MiembroRevision[]> => {
  const snapshot = await getDocs(collection(db, "miembros"));
  const miembros: MiembroRevision[] = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<MiembroRevision, "id">),
  }));

  return miembros
    .filter((m) => m.activo !== false)
    .sort((a, b) => {
      const ordenA =
        a.ordenOperativo !== undefined && a.ordenOperativo !== null && String(a.ordenOperativo).trim() !== ""
          ? Number(a.ordenOperativo)
          : 999999;
      const ordenB =
        b.ordenOperativo !== undefined && b.ordenOperativo !== null && String(b.ordenOperativo).trim() !== ""
          ? Number(b.ordenOperativo)
          : 999999;

      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      return (a.apellido || "").localeCompare(b.apellido || "");
    });
};

// ✅ Obtener todas las unidades
export const getUnidades = async (): Promise<Unidad[]> => {
  const snapshot = await getDocs(collection(db, "unidades"));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Unidad, "id">),
  }));
};

// ⚡ OPTIMIZADO: Obtiene todas las ubicaciones y pide sus elementos EN PARALELO
export const getUbicacionesConElementos = async (
  unidadId: string
): Promise<Ubicacion[]> => {
  const ubicacionesQuery = query(
    collection(db, "ubicaciones"),
    where("unidad_id", "==", unidadId),
    orderBy("orden")
  );
  const ubicacionesSnap = await getDocs(ubicacionesQuery);

  const promesasUbicaciones = ubicacionesSnap.docs.map(async (ubicacionDoc) => {
    const ubicacionId = ubicacionDoc.id;
    const ubicacionNombre = ubicacionDoc.data().nombre;

    const elementosQuery = query(
      collection(db, "elementos"),
      where("ubicacion_id", "==", ubicacionId),
      orderBy("orden")
    );
    const elementosSnap = await getDocs(elementosQuery);

    const elementos: Elemento[] = elementosSnap.docs.map((elDoc) => ({
      id: elDoc.id,
      ...(elDoc.data() as Omit<Elemento, "id">),
    }));

    return { id: ubicacionId, nombre: ubicacionNombre, elementos };
  });

  return Promise.all(promesasUbicaciones);
};

// ⚡ OPTIMIZADO: Usa writeBatch para guardar la revisión y todos los elementos en 1 solo viaje a Firebase
export async function addRevision(data: RevisionData): Promise<void> {
  const batch = writeBatch(db);

  // 1. Preparamos el documento de la revisión
  const revisionRef = doc(collection(db, "revisiones"));
  batch.set(revisionRef, {
    unidadId: data.unidadId,
    bombero: data.bombero,
    ...(data.bomberos ? { bomberos: data.bomberos } : { bomberos: [data.bombero] }),
    observaciones: data.observaciones,
    fecha: serverTimestamp(),
    elementos: data.elementos,
  });

  // 2. Preparamos la actualización de cada elemento en el mismo paquete
  Object.entries(data.elementos).forEach(([elementoId, estado]) => {
    const elementoRef = doc(db, "elementos", elementoId);
    batch.update(elementoRef, { estado });
  });

  // 3. Ejecutamos todo junto de forma segura
  await batch.commit();
}

// ✅ Actualizar el combustible y registrar fecha de control
export async function updateCombustibleUnidad(
  unidadId: string,
  combustible: string
): Promise<void> {
  const unidadRef = doc(db, "unidades", unidadId);
  await updateDoc(unidadRef, {
    combustible,
    fechaControlCombustible: serverTimestamp(),
  });
}

// 🚨 Salidas en vivo: Suscribirse a salidas activas ("en_camino" o "en_lugar")
export const suscribirSalidasActivas = (
  callback: (salidas: SalidaUnidad[]) => void
): Unsubscribe => {
  const salidasQuery = query(
    collection(db, "salidas_unidades"),
    where("estado", "in", ["en_camino", "en_lugar"])
  );

  return onSnapshot(
    salidasQuery,
    (snapshot) => {
      const salidas: SalidaUnidad[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<SalidaUnidad, "id">),
      }));
      callback(salidas);
    },
    (error) => {
      console.error("❌ Error al suscribirse a salidas activas:", error);
    }
  );
};

// 📍 Marcar arribo de unidad en el lugar del siniestro
export const marcarArriboUnidad = async (
  salidaId: string,
  horaActual: string
): Promise<void> => {
  const salidaRef = doc(db, "salidas_unidades", salidaId);
  await updateDoc(salidaRef, {
    horaLlegada: horaActual,
    estado: "en_lugar",
  });
};