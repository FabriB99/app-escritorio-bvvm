export type Miembro = {
    id: string;
    nombre: string;
    apellido: string;
    dni?: string;
    pin: string;
    ordenOperativo: number;
    grupoSemana: number;
    roles: string[];
    categoria: string;
    grado?: string;
    activo: boolean;
  };
  
  export const CATEGORIAS_ORDEN = [
    "Oficiales Superiores",
    "Oficiales Jefes",
    "Oficiales Subalternos",
    "Suboficiales Superiores",
    "Suboficiales Subalternos",
    "Bomberos",
    "Aspirantes",
    "Brigada Auxiliar",
    "Retiro Efectivo",
  ];
  
  export const ROLES_ORDEN = ["admin", "jefatura", "graduados", "guardia", "legajo", "bombero"];
  
  export const ROLES_LABELS: Record<string, string> = {
    admin: "Administrador",
    jefatura: "Jefatura",
    graduados: "Graduados",
    guardia: "Guardia",
    legajo: "Legajo",
    bombero: "Bombero",
  };