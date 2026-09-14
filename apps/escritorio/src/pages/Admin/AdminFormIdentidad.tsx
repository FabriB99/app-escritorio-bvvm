import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../app/firebase-config";
import Header from "../../components/Header";
import { toast } from "sonner";
import { User, Shield, KeyRound, ArrowLeft, Check } from "lucide-react";
import {
  CATEGORIAS_ORDEN,
  ROLES_ORDEN,
  ROLES_LABELS,
} from "./identidadesConstants";
import "./AdminFormIdentidad.css";

type Grado = {
  id: string;
  nombre: string;
  categoria: string;
  orden: number;
  activo: boolean;
};

const AdminFormIdentidad: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [pin, setPin] = useState("");
  const [categoria, setCategoria] = useState("Bomberos");
  const [grado, setGrado] = useState("");
  const [ordenOperativo, setOrdenOperativo] = useState<number>(0);
  const [grupoSemana, setGrupoSemana] = useState<number>(1);
  const [roles, setRoles] = useState<string[]>(["bombero"]);
  const [activo, setActivo] = useState(true);

  const [grados, setGrados] = useState<Grado[]>([]);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);

  const normalizarDni = (valor: string) => valor.replace(/\D/g, "");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "grados"), (snapshot) => {
      const data: Grado[] = snapshot.docs.map((gDoc) => {
        const d = gDoc.data();
        return {
          id: gDoc.id,
          nombre: (d.nombre as string) ?? "",
          categoria: (d.categoria as string) ?? "",
          orden: typeof d.orden === "number" ? d.orden : 999,
          activo: d.activo !== false,
        };
      });

      setGrados(data.filter((g) => g.activo).sort((a, b) => a.orden - b.orden));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!esEdicion || !id) return;

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
          setRoles(data.roles || ["bombero"]);
          setGrado(data.grado || "");
          setOrdenOperativo(data.ordenOperativo ?? data.ordenMerito ?? data.numero ?? 0);
          setGrupoSemana(data.grupoSemana ?? 0);
          setActivo(data.activo !== false);
        } else {
          toast.error("El usuario solicitado no existe.");
          navigate("/admin/identidades");
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error("Error al cargar la información del usuario.");
      })
      .finally(() => setCargando(false));
  }, [esEdicion, id, navigate]);

  useEffect(() => {
    setGrado((prev) => {
      if (!prev) return "";
      const existe = grados.some((g) => g.categoria === categoria && g.nombre === prev);
      return existe ? prev : "";
    });
  }, [categoria, grados]);

  const gradosFiltrados = grados.filter((g) => g.categoria === categoria);

  const toggleRole = (rol: string) => {
    setRoles((prev) =>
      prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dniNormalizado = normalizarDni(dni);
    if (!dniNormalizado) {
      toast.error("El DNI es obligatorio.");
      return;
    }

    if (![0, 1, 2, 3].includes(Number(grupoSemana))) {
      toast.error("El grupo de semana debe ser 0, 1, 2 o 3.");
      return;
    }

    setGuardando(true);

    try {
      const payload = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dniNormalizado,
        pin: pin.trim(),
        categoria,
        grado,
        ordenOperativo: Number(ordenOperativo),
        grupoSemana: Number(grupoSemana),
        roles: roles.map((r) => r.toLowerCase()),
        activo,
      };

      if (esEdicion && id) {
        await Promise.all([
          updateDoc(doc(db, "miembros", id), payload),
          setDoc(doc(db, "usuariosBiblioteca", dniNormalizado), payload, { merge: true }),
        ]);
        toast.success("Usuario actualizado correctamente.");
      } else {
        const coincidencia = await getDocs(
          query(collection(db, "miembros"), where("dni", "==", dniNormalizado))
        );

        if (!coincidencia.empty) {
          toast.error("Ya existe un miembro registrado con ese DNI.");
          setGuardando(false);
          return;
        }

        const nuevoDocRef = doc(collection(db, "miembros"));
        await Promise.all([
          setDoc(nuevoDocRef, payload),
          setDoc(doc(db, "usuariosBiblioteca", dniNormalizado), payload, { merge: true }),
        ]);
        toast.success("Usuario creado exitosamente.");
      }

      navigate("/admin/identidades");
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Ocurrió un error al procesar los datos.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="admin-form-identidad">
        <Header title="Cargando perfil..." onBack={() => navigate("/admin/identidades")} />
        <div className="form-cargando">Cargando datos del usuario...</div>
      </div>
    );
  }

  return (
    <div className="admin-form-identidad">
      <Header
        title={esEdicion ? "Editar Identidad" : "Nueva Identidad"}
        onBack={() => navigate("/admin/identidades")}
      />

      <div className="form-identidad-layout">
        <form onSubmit={handleSubmit} className="form-identidad-contenido">
          <section className="form-tarjeta-seccion">
            <div className="seccion-cabecera">
              <div className="seccion-icono"><User size={18} /></div>
              <div>
                <h3>Información Personal</h3>
                <p>Datos identificatorios y credenciales de acceso a la guardia.</p>
              </div>
            </div>

            <div className="form-grid-campos">
              <div className="form-grupo">
                <label>Apellido</label>
                <input
                  type="text"
                  placeholder="Ej: Pérez"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                />
              </div>

              <div className="form-grupo">
                <label>Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Juan"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="form-grupo">
                <label>DNI (Usuario)</label>
                <input
                  type="text"
                  placeholder="Sin puntos ni espacios"
                  value={dni}
                  onChange={(e) => setDni(normalizarDni(e.target.value))}
                  required
                />
              </div>

              <div className="form-grupo">
                <label>PIN de Acceso</label>
                <input
                  type="password"
                  placeholder="****"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-tarjeta-seccion">
            <div className="seccion-cabecera">
              <div className="seccion-icono"><Shield size={18} /></div>
              <div>
                <h3>Jerarquía y Operativa</h3>
                <p>Escalafón, orden de mérito y turno de guardia semanal.</p>
              </div>
            </div>

            <div className="form-grid-campos">
              <div className="form-grupo">
                <label>Categoría Jerárquica</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS_ORDEN.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-grupo">
                <label>Grado Asignado</label>
                <select value={grado} onChange={(e) => setGrado(e.target.value)}>
                  <option value="">Seleccionar grado...</option>
                  {gradosFiltrados.map((g) => (
                    <option key={g.id} value={g.nombre}>{g.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-grupo">
                <label>Orden Operativo (№)</label>
                <input
                  type="number"
                  value={ordenOperativo}
                  onChange={(e) => setOrdenOperativo(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-grupo">
                <label>Grupo Semana (0 al 3)</label>
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
          </section>

          <section className="form-tarjeta-seccion">
            <div className="seccion-cabecera">
              <div className="seccion-icono"><KeyRound size={18} /></div>
              <div>
                <h3>Roles y Permisos</h3>
                <p>Módulos a los que el usuario tiene acceso en el sistema.</p>
              </div>
            </div>

            <div className="roles-selector-grid">
              {ROLES_ORDEN.map((rol) => {
                const activo = roles.includes(rol);
                return (
                  <button
                    key={rol}
                    type="button"
                    className={`rol-chip-boton ${activo ? 'activo' : ''}`}
                    onClick={() => toggleRole(rol)}
                  >
                    <div className="rol-chip-indicador">
                      {activo && <Check size={13} />}
                    </div>
                    <span>{ROLES_LABELS[rol] || rol}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="form-acciones-footer">
            <button
              type="button"
              className="btn-cancelar-form"
              onClick={() => navigate("/admin/identidades")}
              disabled={guardando}
            >
              <ArrowLeft size={16} />
              <span>Volver</span>
            </button>

            <button
              type="submit"
              className="btn-guardar-form"
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : esEdicion
                ? "Guardar Cambios"
                : "Crear Identidad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminFormIdentidad;