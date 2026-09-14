import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../app/firebase-config";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ShieldAlert,
  ChevronRight,
  MoreVertical,
  Users,
  Award,
} from "lucide-react";
import Header from "../../components/Header";
import { toast } from "sonner";
import { CATEGORIAS_ORDEN, Miembro } from "./identidadesConstants";
import "./AdminGrados.css";

type Grado = {
  id: string;
  nombre: string;
  categoria: string;
  orden: number;
  activo: boolean;
};

const AdminGrados: React.FC = () => {
  const navigate = useNavigate();

  // Estados principales
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>(CATEGORIAS_ORDEN[0]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario de creación rápida
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoOrden, setNuevoOrden] = useState<number>(1);
  const [creando, setCreando] = useState(false);

  // Edición inline
  const [editando, setEditando] = useState<Grado | null>(null);

  // Menú flotante de 3 puntos
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Modal confirmación eliminar
  const [modalEliminar, setModalEliminar] = useState<{
    abierto: boolean;
    grado: Grado | null;
    miembrosAfectados: number;
  }>({
    abierto: false,
    grado: null,
    miembrosAfectados: 0,
  });

  // Listener clicks para cerrar menú de 3 puntos
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbiertoId(null);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  // Carga en tiempo real de Grados y Miembros (para saber uso de cada grado)
  useEffect(() => {
    const unsubGrados = onSnapshot(collection(db, "grados"), (snapshot) => {
      const data: Grado[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          nombre: d.nombre ?? "",
          categoria: d.categoria ?? "",
          orden: Number(d.orden) || 0,
          activo: d.activo !== false,
        };
      });
      setGrados(data.filter((g) => g.activo).sort((a, b) => a.orden - b.orden));
      setCargando(false);
    });

    const unsubMiembros = onSnapshot(collection(db, "miembros"), (snapshot) => {
      const data = snapshot.docs.map((d) => d.data() as Miembro);
      setMiembros(data.filter((m) => m.activo !== false));
    });

    return () => {
      unsubGrados();
      unsubMiembros();
    };
  }, []);

  // Grados de la categoría activa
  const gradosCategoriaActiva = useMemo(() => {
    return grados.filter((g) => g.categoria === categoriaSeleccionada);
  }, [grados, categoriaSeleccionada]);

  // Actualizar orden sugerido al cambiar de categoría
  useEffect(() => {
    if (gradosCategoriaActiva.length > 0) {
      const maxOrden = Math.max(...gradosCategoriaActiva.map((g) => g.orden));
      setNuevoOrden(maxOrden + 1);
    } else {
      setNuevoOrden(1);
    }
  }, [categoriaSeleccionada, gradosCategoriaActiva]);

  // Contadores por categoría para el sidebar
  const conteoPorCategoria = useMemo(() => {
    const resultado: Record<string, number> = {};
    CATEGORIAS_ORDEN.forEach((cat) => {
      resultado[cat] = grados.filter((g) => g.categoria === cat).length;
    });
    return resultado;
  }, [grados]);

  // Cantidad de miembros asignados por cada grado
  const miembrosPorGrado = useMemo(() => {
    const resultado: Record<string, number> = {};
    miembros.forEach((m) => {
      if (m.grado) {
        resultado[m.grado] = (resultado[m.grado] || 0) + 1;
      }
    });
    return resultado;
  }, [miembros]);

  const handleCrearGrado = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) {
      toast.error("Ingresá el nombre del grado.");
      return;
    }

    const yaExiste = gradosCategoriaActiva.some(
      (g) => g.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (yaExiste) {
      toast.error(`El grado "${nombreLimpio}" ya existe en esta categoría.`);
      return;
    }

    setCreando(true);
    try {
      await addDoc(collection(db, "grados"), {
        nombre: nombreLimpio,
        categoria: categoriaSeleccionada,
        orden: Number(nuevoOrden),
        activo: true,
      });

      setNuevoNombre("");
      toast.success(`Grado "${nombreLimpio}" creado con éxito.`);
    } catch (error) {
      console.error(error);
      toast.error("Error al crear el grado.");
    } finally {
      setCreando(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!editando) return;
    const nombreLimpio = editando.nombre.trim();
    if (!nombreLimpio) {
      toast.error("El nombre no puede quedar vacío.");
      return;
    }

    try {
      await updateDoc(doc(db, "grados", editando.id), {
        nombre: nombreLimpio,
        orden: Number(editando.orden),
      });
      setEditando(null);
      toast.success("Grado actualizado.");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo actualizar el grado.");
    }
  };

  const solicitarEliminar = (grado: Grado) => {
    setMenuAbiertoId(null);
    const cantidadAfectada = miembrosPorGrado[grado.nombre] || 0;
    setModalEliminar({
      abierto: true,
      grado,
      miembrosAfectados: cantidadAfectada,
    });
  };

  const ejecutarEliminar = async () => {
    if (!modalEliminar.grado) return;
    try {
      await updateDoc(doc(db, "grados", modalEliminar.grado.id), { activo: false });
      toast.success(`Grado "${modalEliminar.grado.nombre}" eliminado.`);
      setModalEliminar({ abierto: false, grado: null, miembrosAfectados: 0 });
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar el grado.");
    }
  };

  return (
    <div className="admin-grados">
      <Header title="Configuración de Grados" onBack={() => navigate("/admin/identidades")} />

      <div className="grados-workspace">
        {/* PANEL IZQUIERDO: CATEGORÍAS */}
        <aside className="grados-sidebar">
          <div className="sidebar-header">
            <h3>Categorías</h3>
            <span>{CATEGORIAS_ORDEN.length} jerarquías</span>
          </div>

          <div className="sidebar-lista">
            {CATEGORIAS_ORDEN.map((cat) => {
              const activa = cat === categoriaSeleccionada;
              const cantidad = conteoPorCategoria[cat] || 0;

              return (
                <button
                  key={cat}
                  type="button"
                  className={`categoria-item ${activa ? "activo" : ""}`}
                  onClick={() => {
                    setCategoriaSeleccionada(cat);
                    setEditando(null);
                    setMenuAbiertoId(null);
                  }}
                >
                  <div className="categoria-item-info">
                    <span className="categoria-item-nombre">{cat}</span>
                    <span className="categoria-item-badge">{cantidad}</span>
                  </div>
                  <ChevronRight size={16} className="categoria-item-flecha" />
                </button>
              );
            })}
          </div>
        </aside>

        {/* ÁREA DERECHA: TABLA Y GESTIÓN */}
        <main className="grados-panel">
          {/* Header de la categoría activa */}
          <div className="panel-header">
            <div>
              <h2>{categoriaSeleccionada}</h2>
              <p>Escalafones registrados para esta categoría jerárquica.</p>
            </div>
            <div className="panel-total-badge">
              <Award size={16} />
              <span>{gradosCategoriaActiva.length} Grados</span>
            </div>
          </div>

          {/* Formulario de creación rápida inline */}
          <form onSubmit={handleCrearGrado} className="grados-creacion-barra">
            <div className="campo-orden">
              <label>Orden</label>
              <input
                type="number"
                min={0}
                value={nuevoOrden}
                onChange={(e) => setNuevoOrden(Number(e.target.value))}
                required
              />
            </div>

            <div className="campo-nombre">
              <label>Nombre del grado</label>
              <input
                type="text"
                placeholder="Ej: Sargento Primero, Cabo, Oficial..."
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-agregar-grado" disabled={creando}>
              <Plus size={16} />
              <span>{creando ? "Agregando..." : "Agregar Grado"}</span>
            </button>
          </form>

          {/* Tabla de grados */}
          {cargando ? (
            <div className="grados-cargando">Cargando datos...</div>
          ) : gradosCategoriaActiva.length === 0 ? (
            <div className="grados-vacio">
              <Award size={36} />
              <strong>No hay grados creados en esta categoría</strong>
              <span>Completá el formulario superior para registrar el primer grado.</span>
            </div>
          ) : (
            <div className="grados-tabla-contenedor">
              <table className="grados-tabla">
                <thead>
                  <tr>
                    <th style={{ width: "90px" }}>Orden</th>
                    <th>Grado</th>
                    <th style={{ width: "170px" }}>En uso</th>
                    <th style={{ width: "60px", textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {gradosCategoriaActiva.map((g) => {
                    const esEditando = editando?.id === g.id;
                    const menuEstaAbierto = menuAbiertoId === g.id;
                    const asignados = miembrosPorGrado[g.nombre] || 0;

                    if (esEditando) {
                      return (
                        <tr key={g.id} className="fila-editando">
                          <td>
                            <input
                              type="number"
                              className="input-inline-orden"
                              value={editando.orden}
                              onChange={(e) =>
                                setEditando({ ...editando, orden: Number(e.target.value) })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="input-inline-nombre"
                              value={editando.nombre}
                              onChange={(e) =>
                                setEditando({ ...editando, nombre: e.target.value })
                              }
                              autoFocus
                            />
                          </td>
                          <td colSpan={2}>
                            <div className="acciones-inline-wrap">
                              <button
                                type="button"
                                className="btn-inline-guardar"
                                onClick={handleGuardarEdicion}
                              >
                                <Check size={15} /> Guardar
                              </button>
                              <button
                                type="button"
                                className="btn-inline-cancelar"
                                onClick={() => setEditando(null)}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={g.id}>
                        <td>
                          <span className="badge-orden-tabla">#{g.orden}</span>
                        </td>
                        <td>
                          <strong className="nombre-grado-texto">{g.nombre}</strong>
                        </td>
                        <td>
                          <div className={`chip-uso ${asignados > 0 ? "activo" : ""}`}>
                            <Users size={13} />
                            <span>{asignados} {asignados === 1 ? "bombero" : "bomberos"}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div
                            className="menu-opciones-wrap"
                            ref={menuEstaAbierto ? menuRef : null}
                          >
                            <button
                              type="button"
                              className="btn-puntos-tabla"
                              onClick={() =>
                                setMenuAbiertoId(menuEstaAbierto ? null : g.id)
                              }
                            >
                              <MoreVertical size={16} />
                            </button>

                            {menuEstaAbierto && (
                              <div className="menu-opciones-dropdown">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuAbiertoId(null);
                                    setEditando(g);
                                  }}
                                >
                                  <Pencil size={14} />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  className="peligro"
                                  onClick={() => solicitarEliminar(g)}
                                >
                                  <Trash2 size={14} />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {modalEliminar.abierto && modalEliminar.grado && (
        <div className="modal-identidades" onClick={() => setModalEliminar({ abierto: false, grado: null, miembrosAfectados: 0 })}>
          <div className="confirmacion-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirmacion-icono icono-eliminar">
              <ShieldAlert size={22} />
            </div>

            <h2>Eliminar Grado</h2>

            <p>
              ¿Seguro que deseas eliminar el grado{" "}
              <strong>"{modalEliminar.grado.nombre}"</strong>?
            </p>

            {modalEliminar.miembrosAfectados > 0 && (
              <div className="alerta-afectados">
                <strong>Atención:</strong> Hay{" "}
                <strong>{modalEliminar.miembrosAfectados} bomberos</strong> con este grado
                asignado en su perfil actualmente.
              </div>
            )}

            <div className="confirmacion-botones">
              <button
                type="button"
                className="boton-cancelar"
                onClick={() => setModalEliminar({ abierto: false, grado: null, miembrosAfectados: 0 })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="boton-confirmar accion-eliminar"
                onClick={ejecutarEliminar}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGrados;