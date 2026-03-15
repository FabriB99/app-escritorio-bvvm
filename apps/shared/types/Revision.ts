export interface Revision {
    unidadId: string;
    fecha: Date;
    bombero: string;
    observaciones?: string;
    ubicaciones: {
        ubicacionId: string;
        elementos: {
            elementoId: string;
            estado: string;
        }[];
    }[];
}
