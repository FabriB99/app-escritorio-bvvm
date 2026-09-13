// src/pages/Admin/AdminAjustes.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Award, ChevronRight } from "lucide-react";
import Header from "../../components/Header";
import "./AdminAjustes.css";

type OpcionAjuste = {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  ruta: string;
};

// Para agregar un nuevo ajuste en el futuro, solo hace falta sumar un
// objeto acá — la lista se renderiza sola.
const opcionesUsuarios: OpcionAjuste[] = [
  {
    id: "usuarios",
    titulo: "Gestión de usuarios",
    descripcion: "Crear, editar y desactivar identidades, roles y permisos de acceso.",
    icono: <Users size={20} />,
    ruta: "/admin/identidades",
  },
  {
    id: "grados",
    titulo: "Grados",
    descripcion: "Definir los grados disponibles para cada categoría jerárquica.",
    icono: <Award size={20} />,
    ruta: "/admin/grados",
  },
];

const AdminAjustes: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-ajustes__contenedor">
      <Header title="Ajustes del Sistema" onBack={() => window.history.back()} />

      <section className="admin-ajustes__intro">
        <div>
          <h1>Ajustes del sistema</h1>
          <p>Configuración general de la aplicación.</p>
        </div>
      </section>

      <section className="admin-ajustes__grupo">
        <h2 className="admin-ajustes__grupo-titulo">Usuarios y jerarquía</h2>

        <div className="admin-ajustes__lista">
          {opcionesUsuarios.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              className="admin-ajustes__item"
              onClick={() => navigate(opcion.ruta)}
            >
              <div className="admin-ajustes__item-icono">{opcion.icono}</div>

              <div className="admin-ajustes__item-texto">
                <strong>{opcion.titulo}</strong>
                <span>{opcion.descripcion}</span>
              </div>

              <ChevronRight size={18} className="admin-ajustes__item-flecha" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminAjustes;