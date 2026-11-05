export type OrigenSalida = 'cuartel' | 'reasignada_en_calle';
export type EstadoSalida = 'en_camino' | 'en_lugar' | 'finalizada' | 'reasignada';

export interface SalidaUnidad {
  id?: string;
  incidenteId: string; // Permite agrupar varios móviles que salen al mismo siniestro
  fecha: string; // YYYY-MM-DD
  numeroGuardia?: string;
  numeroParte?: string;
  telefonoLlamado?: string;
  direccion: string;
  barrio?: string;
  tipoSiniestro: string;
  notaGuardia?: string;
  coordenadas?: { lat: number; lng: number } | null;
  unidadId: string;
  unidadNombre: string;
  choferId?: string | null;
  choferNombre?: string | null;
  recepcionistaId?: string | null;
  recepcionistaNombre?: string | null;
  horaLlamado: string;
  horaSalida: string;
  horaLlegada?: string | null; // Se marca desde el celular o la PC
  horaRegreso?: string | null;
  kmSalida: number;
  kmRegreso?: number | null;
  kmRecorridos?: number | null;
  origen?: OrigenSalida;
  estado: EstadoSalida;
  createdAt?: any;
}
