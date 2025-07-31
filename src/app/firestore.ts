import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase-config";

import { Unidad } from "../../../shared/types/Unidad";
import { Ubicacion, Elemento } from "../../../shared/types/Ubicacion";

// ✅ Obtener todas las unidades
export const getUnidades = async (): Promise<Unidad[]> => {
  const snapshot = await getDocs(collection(db, "unidades"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Unidad, "id">),
  }));
};

// ✅ Obtener ubicaciones con sus elementos para una unidad
export const getUbicacionesConElementos = async (
  unidadId: string
): Promise<Ubicacion[]> => {
  const ubicacionesQuery = query(
    collection(db, "ubicaciones"),
    where("unidad_id", "==", unidadId),
    orderBy("orden")
  );
  const ubicacionesSnap = await getDocs(ubicacionesQuery);
  const ubicaciones: Ubicacion[] = [];

  for (const ubicacionDoc of ubicacionesSnap.docs) {
    const ubicacionId = ubicacionDoc.id;
    const ubicacionNombre = ubicacionDoc.data().nombre;

    const elementosQuery = query(
      collection(db, "elementos"),
      where("ubicacion_id", "==", ubicacionId),
      orderBy("orden")
    );
    const elementosSnap = await getDocs(elementosQuery);

    const elementos: Elemento[] = elementosSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Elemento, "id">),
    }));

    ubicaciones.push({ id: ubicacionId, nombre: ubicacionNombre, elementos });
  }

  return ubicaciones;
};

// ✅ Guardar una revisión y actualizar estados de elementos
interface RevisionData {
  unidadId: string;
  bombero: string;
  observaciones: string;
  elementos: {
    [elementoId: string]: "Operativo" | "Con falla" | "Faltante";
  };
}

export async function addRevision(data: RevisionData) {
  const revisionRef = doc(collection(db, "revisiones"));
  await setDoc(revisionRef, {
    unidadId: data.unidadId,
    bombero: data.bombero,
    observaciones: data.observaciones,
    fecha: serverTimestamp(),
    elementos: data.elementos,
  });

  const updatePromises = Object.entries(data.elementos).map(
    async ([elementoId, estado]) => {
      const elementoRef = doc(db, "elementos", elementoId);
      await updateDoc(elementoRef, { estado });
    }
  );

  await Promise.all(updatePromises);
}

// ✅ Actualizar el combustible y registrar fecha de control
export async function updateCombustibleUnidad(
  unidadId: string,
  combustible: string
) {
  const unidadRef = doc(db, "unidades", unidadId);
  await updateDoc(unidadRef, {
    combustible,
    fechaControlCombustible: serverTimestamp(),
  });
}

