// src/pages/Admin/AdminCrearIdentidad.tsx
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import Header from "../../components/Header";
import "./AdminCrearIdentidad.css";

const AdminCrearIdentidad = () => {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [pin, setPin] = useState("");
  const [categoria, setCategoria] = useState("Bombero");

  // Ahora roles es un array de strings
  const [roles, setRoles] = useState<string[]>(["guardia"]);

  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "miembros"), {
        nombre,
        apellido,
        dni,
        pin,
        categoria,
        roles: roles.map((r) => r.toLowerCase()), // se guardan en minúsculas
      });

      setMensaje("✅ Usuario creado correctamente.");
      setNombre("");
      setApellido("");
      setDni("");
      setPin("");
      setCategoria("Bombero");
      setRoles(["guardia"]);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      setMensaje("❌ Error al crear usuario.");
    }
  };

  // Lista de roles disponibles
  const rolesDisponibles = [
    "admin",
    "jefatura",
    "graduados",
    "guardia",
    "legajo",
    "bombero",
  ];

  const toggleRole = (rol: string, checked: boolean) => {
    if (checked) {
      setRoles((prev) => [...prev, rol]);
    } else {
      setRoles((prev) => prev.filter((r) => r !== rol));
    }
  };

  return (
    <div className="admin-identidad__contenedor">
      <Header title="Crear Usuario" onBack={() => window.history.back()} />

      <form className="admin-identidad__formulario" onSubmit={handleSubmit}>
        <div className="admin-identidad__tarjeta">
          <h2 className="admin-identidad__seccion-titulo">Nuevo Usuario</h2>

          <div className="admin-identidad__fila-doble">
            <div className="admin-identidad__campo">
              <label>Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
            </div>

            <div className="admin-identidad__campo">
              <label>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-identidad__fila-doble">
            <div className="admin-identidad__campo">
              <label>DNI</label>
              <input
                type="number"
                min={1000000}
                max={99999999}
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
              />
            </div>

            <div className="admin-identidad__campo">
              <label>PIN</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-identidad__fila-doble">
            <div className="admin-identidad__campo">
              <label>Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="Jefe">Jefe</option>
                <option value="Oficial">Oficial</option>
                <option value="Suboficial">Suboficial</option>
                <option value="Bombero">Bombero</option>
                <option value="Aspirante">Aspirante</option>
                <option value="Retirado">Retirado</option>
              </select>
            </div>

            <div className="admin-identidad__campo">
              <label>Roles</label>
              <div className="admin-identidad__checkboxes">
                {rolesDisponibles.map((rol) => (
                  <label key={rol}>
                    <input
                      type="checkbox"
                      value={rol}
                      checked={roles.includes(rol)}
                      onChange={(e) => toggleRole(rol, e.target.checked)}
                    />
                    {rol.charAt(0).toUpperCase() + rol.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-identidad__footer">
            <button type="submit" className="admin-identidad__btn-principal">
              Crear Usuario
            </button>
          </div>

          {mensaje && (
            <p
              className={`admin-identidad__mensaje ${
                mensaje.startsWith("✅") ? "exito" : "error"
              }`}
            >
              {mensaje}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdminCrearIdentidad;