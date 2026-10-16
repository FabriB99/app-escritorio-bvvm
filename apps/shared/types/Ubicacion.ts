import { Elemento } from "./Elemento";

export interface Ubicacion {
  id: string;
  nombre: string;
  unidad_id?: string;
  orden?: number;
  elementos: Elemento[];
}

export type { Elemento }; 