export type Unidad = {
    id: string;
    nombre: string;
    tipo?: string;
    modelo?: string;
    patente?: string;
    estado?: string;
    kilometraje?: string;
    combustible?: string; // <--- esto debe ser obligatorio (no opcional ni undefined)
};
