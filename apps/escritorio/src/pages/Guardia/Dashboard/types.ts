// src/pages/Guardia/Dashboard/types.ts
import { Timestamp } from 'firebase/firestore';

export interface NovedadGuardia {
  id?: string;
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  categoria: 'vehiculos' | 'edilicio' | 'administrativo' | 'mantenimiento' | 'otro';
  estado: 'pendiente' | 'resuelta';
  fechaRegistro: Timestamp;
  registradoPorUid: string;
  registradoPorNombre: string;
  fechaResolucion?: Timestamp;
  resueltoPorUid?: string;
  resueltoPorNombre?: string;
}