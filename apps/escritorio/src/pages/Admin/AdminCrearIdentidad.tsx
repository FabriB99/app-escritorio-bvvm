// src/pages/Admin/AdminCrearIdentidad.tsx
import { useEffect, useState } from "react";
import { collection, doc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import Header from "../../components/Header";
import "./AdminCrearIdentidad.css";

type Grado = {
  id: string;
  nombre: string;
  categoria: string;
  orden: number;
  activo: boolean;
};

const CATEGORIAS = [
  "Oficiales Superiores",
  "Oficiales Jefes",
  "Oficiales Subalternos",
  "Suboficiales Superiores",
  "Suboficiales Subalternos",
  "Bomberos",
  "Aspirantes 3",
  "Aspirantes 2",
  "Aspirantes 1",
  "Brigada Auxiliar",
  "Retiro Efectivo",
];

const AdminCrearIdentidad = () => {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [pin, setPin] = useState("");
  const [categoria, setCategoria] = useState("Bomberos");
  const [grado, setGrado] = useState("");
  const [ordenOperativo, setOrdenOperativo] = useState<number>(0);
  const [grupoSemana, setGrupoSemana] = useState<number>(1);

  const [roles, setRoles] = useState<string[]>(["guardia"]);
  const [grados, setGrados] = useState<Grado[]>([]);

  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "grados"), (snapshot) => {
      const data: Grado[] = snapshot.docs.map((gradoDoc) => {
        const d = gradoDoc.data();
        return {
          id: gradoDoc.id,
          nombre: (d.nombre as string) ?? "",
          categoria: (d.categoria as string) ?? "",
          orden: typeof d.orden === "number" ? d.orden : 999,
          activo: d.activo !== false,
        };
      });

      setGrados(
        data
          .filter((g) => g.activo)
          .sort((a, b) => a.orden - b.orden)
      );
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setGrado("");
  }, [categoria]);

  const normalizarDni = (valor: string) => valor.replace(/\D/g, "");
  const gradosFiltrados = grados.filter((g) => g.categoria === categoria);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    const dniNormalizado = normalizarDni(dni);
    if (!dniNormalizado) {
      setMensaje("❌ El DNI es obligatorio.");
      return;
    }

    // 1. Validación estricta con Number()
    if (![0, 1, 2, 3].includes(Number(grupoSemana))) {
      setMensaje("❌ El grupo de semana debe ser 0, 1, 2 o 3.");
      return;
    }

    try {
      const miembroExistente = await getDocs(
        query(collection(db, "miembros"), where("dni", "==", dniNormalizado))
      );
      if (!miembroExistente.empty) {
        setMensaje("❌ Ya existe una identidad con ese DNI.");
        return;
      }

      const nuevoMiembroRef = doc(collection(db, "miembros"));
      const payloadMiembro = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dniNormalizado,
        pin,
        categoria,
        grado,
        // 2. Quitamos los fallbacks "|| 1" para que el 0 sea un valor legal
        ordenOperativo: Number(ordenOperativo),
        grupoSemana: Number(grupoSemana),
        roles: roles.map((r) => r.toLowerCase()),
      };

      await Promise.all([
        setDoc(nuevoMiembroRef, payloadMiembro),
        setDoc(doc(db, "usuariosBiblioteca", dniNormalizado), payloadMiembro, { merge: true }),
      ]);

      setMensaje("✅ Usuario creado correctamente.");
      setNombre("");
      setApellido("");
      setDni("");
      setPin("");
      setCategoria("Bomberos");
      setGrado("");
      setOrdenOperativo(0);
      setGrupoSemana(1);
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
                type="text"
                value={dni}
                onChange={(e) => setDni(normalizarDni(e.target.value))}
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
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-identidad__campo">
              <label>Grado</label>
              <select value={grado} onChange={(e) => setGrado(e.target.value)}>
                <option value="">Seleccionar grado</option>
                {gradosFiltrados.map((g) => (
                  <option key={g.id} value={g.nombre}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-identidad__fila-doble">
            <div className="admin-identidad__campo">
              <label>Orden Operativo</label>
              <input
                type="number"
                value={ordenOperativo}
                onChange={(e) => setOrdenOperativo(Number(e.target.value))}
                required
              />
            </div>

            <div className="admin-identidad__campo">
              <label>Grupo Semana (1-3)</label>
              <input
                type="number"
                min={0}
                max={3}
                value={grupoSemana}
                onChange={(e) => setGrupoSemana(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="admin-identidad__fila-doble">
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