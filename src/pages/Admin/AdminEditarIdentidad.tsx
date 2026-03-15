// src/pages/Admin/AdminEditarIdentidad.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import Header from "../../components/Header";
import "./AdminEditarIdentidad.css"; // reutilizamos los mismos estilos

const AdminEditarIdentidad = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [pin, setPin] = useState("");
  const [categoria, setCategoria] = useState("Bombero");
  const [roles, setRoles] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");

  // Lista de roles disponibles
  const rolesDisponibles = ["admin", "jefatura", "graduados", "guardia", "legajo", "bombero"];

  // Cargar datos existentes
  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, "miembros", id);
    getDoc(docRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setNombre(data.nombre || "");
          setApellido(data.apellido || "");
          setDni(data.dni || "");
          setPin(data.pin || "");
          setCategoria(data.categoria || "Bombero");
          setRoles(data.roles || []);
        } else {
          setMensaje("❌ Usuario no encontrado.");
        }
      })
      .catch((err) => {
        console.error("Error al cargar usuario:", err);
        setMensaje("❌ Error al cargar usuario.");
      });
  }, [id]);

  const toggleRole = (rol: string, checked: boolean) => {
    if (checked) {
      setRoles((prev) => [...prev, rol]);
    } else {
      setRoles((prev) => prev.filter((r) => r !== rol));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await setDoc(
        doc(db, "miembros", id),
        {
          nombre,
          apellido,
          dni,
          pin,
          categoria,
          roles: roles.map((r) => r.toLowerCase()),
        },
        { merge: true }
      );

      setMensaje("✅ Usuario actualizado correctamente.");
      setTimeout(() => navigate("/admin/identidades"), 1500);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      setMensaje("❌ Error al actualizar usuario.");
    }
  };

  return (
    <div className="admin-identidad__contenedor">
      <Header title="Editar Usuario" onBack={() => navigate("/admin/identidades")} />

      <form className="admin-identidad__formulario" onSubmit={handleSubmit}>
        <div className="admin-identidad__tarjeta">
          <h2 className="admin-identidad__seccion-titulo">Editar Usuario</h2>

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
              Guardar Cambios
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

export default AdminEditarIdentidad;
