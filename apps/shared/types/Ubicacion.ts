export interface Elemento {
    id: string;
    nombre: string;
    cantidad: number;
}

export interface Ubicacion {
    id: string;
    nombre: string;
    elementos: Elemento[];
}
