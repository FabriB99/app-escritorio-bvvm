export type EstadoElemento = "Operativo" | "Con falla" | "Faltante";

export interface Elemento {
  id: string;
  nombre: string;
  cantidad: number;
  estado?: EstadoElemento;
  ubicacion_id?: string;
  orden?: number;
}