import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, setDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import Header from "../../components/Header";
import "./AdminEditarIdentidad.css";

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

const AdminEditarIdentidad = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [pin, setPin] = useState("");
  const [categoria, setCategoria] = useState("Bomberos");
  const [roles, setRoles] = useState<string[]>([]);
  const [grado, setGrado] = useState("");
  const [ordenOperativo, setOrdenOperativo] = useState<number>(0);
  const [grupoSemana, setGrupoSemana] = useState<number>(1);

  const [grados, setGrados] = useState<Grado[]>([]);
  const [mensaje, setMensaje] = useState("");

  const rolesDisponibles = ["admin", "jefatura", "graduados", "guardia", "legajo", "bombero"];
  const normalizarDni = (valor: string) => valor.replace(/\D/g, "");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "grados"), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          nombre: d.nombre ?? "",
          categoria: d.categoria ?? "",
          orden: d.orden ?? 999,
          activo: d.activo !== false
        };
      });

      setGrados(
        data
          .filter(g => g.activo)
          .sort((a, b) => a.orden - b.orden)
      );
    });
    return () => unsubscribe();
  }, []);

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
          setCategoria(data.categoria || "Bomberos");
          setRoles(data.roles || []);
          setGrado(data.grado || "");
          setOrdenOperativo(data.ordenOperativo ?? data.ordenMerito ?? data.numero ?? 0);
          setGrupoSemana(data.grupoSemana ?? 1);
        }
      })
      .catch(() => setMensaje("❌ Error al cargar usuario."));
  }, [id]);

  useEffect(() => {
    setGrado((prev) => {
      if (!prev) return "";
      const existe = grados.some((g) => g.categoria === categoria && g.nombre === prev);
      return existe ? prev : "";
    });
  }, [categoria, grados]);

  const gradosFiltrados = grados.filter((g) => g.categoria === categoria);

  const toggleRole = (rol: string, checked: boolean) => {
    setRoles(prev => checked ? [...prev, rol] : prev.filter(r => r !== rol));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setMensaje("");

    const dniNormalizado = normalizarDni(dni);
    if (!dniNormalizado) {
      setMensaje("❌ El DNI es obligatorio.");
      return;
    }
    if (![0, 1, 2, 3].includes(Number(grupoSemana))) {
      setMensaje("❌ El grupo de semana debe ser 0, 1, 2 o 3.");
      return;
    }
    
    try {
      const payload = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dniNormalizado,
        pin,
        categoria,
        roles,
        grado,
        // 2. Quitamos el "|| 1" para que no sobreescriba el 0
        ordenOperativo: Number(ordenOperativo), 
        grupoSemana: Number(grupoSemana), 
      };

      await Promise.all([
        setDoc(doc(db, "miembros", id), payload, { merge: true }),
        setDoc(doc(db, "usuariosBiblioteca", dniNormalizado), payload, { merge: true }),
      ]);

      setMensaje("✅ Usuario actualizado correctamente.");
      setTimeout(() => navigate("/admin/identidades"), 1500);
    } catch (error) {
      setMensaje("❌ Error al actualizar usuario.");
    }
  };

  return (
    <div className="admin-identidad__contenedor">
      <Header title="Editar Usuario" onBack={() => navigate("/admin/identidades")} />

      <form className="admin-identidad__formulario" onSubmit={handleSubmit}>
        <div className="admin-identidad__tarjeta">
          <h2 className="admin-identidad__seccion-titulo">Información Personal</h2>

          <div className="admin-identidad__fila-doble">
            <div className="admin-identidad__campo">
              <label>Apellido</label>
              <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Ej: Perez" />
            </div>
            <div className="admin-identidad__campo">
              <label>Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan" />
            </div>
          </div>

          <div className="admin-identidad__fila-doble">
            <div className="admin-identidad__campo">
              <label>DNI (Usuario)</label>
              <input value={dni} onChange={(e) => setDni(normalizarDni(e.target.value))} placeholder="Sin puntos" />
            </div>
            <div className="admin-identidad__campo">
              <label>PIN de Acceso</label>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="****" />
            </div>
          </div>

          <h2 className="admin-identidad__seccion-titulo">Jerarquía y Grado</h2>

          <div className="admin-identidad__fila-doble">
            <div className="admin-identidad__campo">
              <label>Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-identidad__campo">
              <label>Orden Operativo</label>
              <input
                type="number"
                value={ordenOperativo}
                onChange={(e) => setOrdenOperativo(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="admin-identidad__fila-doble">
            <div className="admin-identidad__campo">
              <label>Grado Específico</label>
              <select value={grado} onChange={(e) => setGrado(e.target.value)}>
                <option value="">Seleccionar grado</option>
                {gradosFiltrados.map(g => (
                  <option key={g.id} value={g.nombre}>{g.nombre}</option>
                ))}
              </select>
            </div>
            <div className="admin-identidad__campo">
              <label>Grupo Semana (1-3)</label>
              <input
                type="number"
                min={0}
                max={3}
                value={grupoSemana}
                onChange={(e) => setGrupoSemana(Number(e.target.value))}
              />
            </div>
          </div>

          <h2 className="admin-identidad__seccion-titulo">Permisos de Sistema</h2>
          <div className="admin-identidad__checkboxes">
            {rolesDisponibles.map((rol) => (
              <label key={rol}>
                <input
                  type="checkbox"
                  checked={roles.includes(rol)}
                  onChange={(e) => toggleRole(rol, e.target.checked)}
                />
                {rol.charAt(0).toUpperCase() + rol.slice(1)}
              </label>
            ))}
          </div>

          <div className="admin-identidad__footer">
            <button type="submit" className="admin-identidad__btn-principal">
              Guardar Cambios
            </button>
          </div>

          {mensaje && (
            <p className={`admin-identidad__mensaje ${mensaje.includes('✅') ? 'exito' : 'error'}`}>
              {mensaje}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdminEditarIdentidad;