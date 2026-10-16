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
} from "firebase/firestore";
import { db } from "./firebase-config";

import { Unidad } from "../../../shared/types/Unidad";
import { Ubicacion, Elemento } from "../../../shared/types/Ubicacion";

export type EstadoElemento = "Operativo" | "Con falla" | "Faltante";

export interface RevisionData {
  unidadId: string;
  bombero: string;
  observaciones: string;
  elementos: Record<string, EstadoElemento>;
}

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