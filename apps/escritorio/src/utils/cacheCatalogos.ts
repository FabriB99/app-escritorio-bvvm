// src/utils/cacheCatalogos.ts
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../app/firebase-config';
import type { UnidadRef, ConfigLista } from '../pages/Guardia/ElementosMedicosHospital/types';

export interface CatalogosGuardia {
  unidades: UnidadRef[];
  elementos: string[];
  hospitales: string[];
}

interface CacheState {
  unidades: UnidadRef[] | null;
  elementos: string[] | null;
  hospitales: string[] | null;
}

const cache: CacheState = {
  unidades: null,
  elementos: null,
  hospitales: null,
};

/**
 * Obtiene los catálogos de guardia (unidades, elementos médicos y hospitales).
 * Si ya se encuentran en memoria de sesión, los retorna de forma inmediata
 * evitando lecturas duplicadas en Firestore.
 */
export const getCatalogosGuardia = async (forzarRecarga = false): Promise<CatalogosGuardia> => {
  const promesas: Promise<unknown>[] = [];

  // Unidades
  if (!cache.unidades || forzarRecarga) {
    promesas.push(
      getDocs(collection(db, 'unidades')).then(snap => {
        cache.unidades = snap.docs
          .map(d => ({ id: d.id, nombre: (d.data().nombre as string) ?? '' }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
      })
    );
  }

  // Elementos médicos
  if (!cache.elementos || forzarRecarga) {
    promesas.push(
      getDoc(doc(db, 'config_guardia', 'elementos_medicos')).then(snap => {
        cache.elementos = snap.exists() ? ((snap.data() as ConfigLista).items ?? []) : [];
      })
    );
  }

  // Hospitales / Centros médicos
  if (!cache.hospitales || forzarRecarga) {
    promesas.push(
      getDoc(doc(db, 'config_guardia', 'hospitales')).then(snap => {
        cache.hospitales = snap.exists() ? ((snap.data() as ConfigLista).items ?? []) : [];
      })
    );
  }

  if (promesas.length > 0) {
    await Promise.all(promesas);
  }

  return {
    unidades: cache.unidades ?? [],
    elementos: cache.elementos ?? [],
    hospitales: cache.hospitales ?? [],
  };
};

/**
 * Invalida total o parcialmente la caché en memoria.
 * @param tipo Opcional: 'unidades' | 'elementos' | 'hospitales'
 */
export const invalidarCacheCatalogos = (tipo?: 'unidades' | 'elementos' | 'hospitales') => {
  if (!tipo) {
    cache.unidades = null;
    cache.elementos = null;
    cache.hospitales = null;
  } else {
    cache[tipo] = null;
  }
};

/**
 * Actualiza directamente la caché en memoria para una lista específica,
 * permitiendo una respuesta inmediata sin necesidad de roundtrips.
 */
export const actualizarCacheCatalogos = (tipo: 'elementos' | 'hospitales', items: string[]) => {
  cache[tipo] = items;
};
