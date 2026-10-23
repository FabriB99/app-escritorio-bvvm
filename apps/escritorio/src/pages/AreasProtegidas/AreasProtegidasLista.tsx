// src/pages/AreasProtegidas/AreasProtegidasLista.tsx
import React, { useEffect, useRef, useState } from "react";
import { useUser } from "../../context/UserContext";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  ShieldCheck,
  Building2,
  MapPin,
  Phone,
  User,
  MoreVertical,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "./AreasProtegidasLista.css";
import Header from "../../components/Header";
import ModalDetalleArea from "./ModalDetalleArea";
import { registrarAuditoria, buildOperador } from "../../utils/auditoria";

interface AreaProtegida {
  id: string;
  nombre: string;
  direcciones: string[];
  responsable?: string;
  telefono?: string;
}

const AreasProtegidasLista: React.FC = () => {
  const { user, miembroActivo } = useUser();
  const [areas, setAreas] = useState<AreaProtegida[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modal detalle
  const [areaSeleccionada, setAreaSeleccionada] = useState<AreaProtegida | null>(null);

  // Modal eliminar
  const [areaAEliminar, setAreaAEliminar] = useState<AreaProtegida | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Menú de 3 puntitos
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const puedeEditar = ["admin", "jefatura", "guardia"].includes(user?.rol || "");

  useEffect(() => {
    const q = query(collection(db, "areas_protegidas"), orderBy("nombre"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nuevos = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AreaProtegida, "id">),
        }));
        setAreas(nuevos.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")));
        setLoading(false);
      },
      (error) => {
        console.error("Error al cargar áreas protegidas:", error);
        toast.error("No se pudieron cargar las áreas protegidas.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    if (!menuAbiertoId) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbiertoId(null);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [menuAbiertoId]);

  const eliminarArea = async (area: AreaProtegida) => {
    setEliminando(true);
    try {
      await deleteDoc(doc(db, "areas_protegidas", area.id));

      await registrarAuditoria({
        accion: "eliminar",
        coleccion: "areas_protegidas",
        docId: area.id,
        docResumen: `Área protegida: ${area.nombre}`,
        operador: buildOperador(miembroActivo, user?.rol),
        detalles: {
          descripcion: `Se eliminó el área protegida "${area.nombre}"`,
          snapshot: {
            nombre: area.nombre,
            direcciones: area.direcciones,
            responsable: area.responsable,
            telefono: area.telefono,
          },
        },
      });

      toast.success(`Área "${area.nombre}" eliminada correctamente.`);
      setAreaAEliminar(null);
    } catch (error) {
      console.error("Error al eliminar área:", error);
      toast.error("Ocurrió un error al eliminar el área protegida.");
    } finally {
      setEliminando(false);
    }
  };

  // Buscador inteligente: nombre, direcciones, responsable o teléfono
  const termino = buscar.trim().toLowerCase();
  const areasFiltradas = termino
    ? areas.filter((a) => {
        const campos = [
          a.nombre,
          a.responsable,
          a.telefono,
          ...(Array.isArray(a.direcciones) ? a.direcciones : []),
        ];
        return campos.some((c) => (c || "").toLowerCase().includes(termino));
      })
    : areas;

  return (
    <div className="apla-lista-container">
      <Header
        title="Áreas Protegidas"
        extraButtons={
          puedeEditar
            ? [
                {
                  key: "agregar-area",
                  icon: Plus,
                  onClick: () => navigate("/agregar-area"),
                  ariaLabel: "Agregar nueva área protegida",
                },
              ]
            : []
        }
      />

      <div className="apla-page-head">
        <ShieldCheck size={18} />
        <span>Gestión de áreas operativas protegidas</span>
      </div>

      <div className="apla-toolbar">
        <div className="apla-buscador-container">
          <Search size={16} className="apla-icono-lupa" />
          <input
            id="apla-buscar"
            className="apla-buscar"
            type="text"
            placeholder="Buscar por nombre, dirección, responsable o teléfono..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          {buscar && (
            <button
              type="button"
              className="apla-buscar-clear"
              onClick={() => setBuscar("")}
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="apla-total-badge">
          {areasFiltradas.length} {areasFiltradas.length === 1 ? "área" : "áreas"}
        </span>
      </div>

      <div className="cards-container">
        {areasFiltradas.map((area) => {
          const direcciones = Array.isArray(area.direcciones) ? area.direcciones : [];
          const menuAbierto = menuAbiertoId === area.id;

          return (
            <div
              key={area.id}
              className={`card ${menuAbierto ? "card--menu-open" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => setAreaSeleccionada(area)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setAreaSeleccionada(area);
                }
              }}
            >
              <div className="apla-card-head">
                <span className="apla-building-box">
                  <Building2 size={18} />
                </span>
                <h3 className="apla-card-title">{area.nombre}</h3>
              </div>

              {puedeEditar && (
                <div
                  className="apla-menu-wrapper"
                  ref={menuAbierto ? menuRef : undefined}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={`apla-menu-trigger ${menuAbierto ? "is-active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuAbiertoId(menuAbierto ? null : area.id);
                    }}
                    aria-label="Más opciones"
                    aria-haspopup="menu"
                    aria-expanded={menuAbierto}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {menuAbierto && (
                    <div className="apla-dropdown-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className="apla-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAbiertoId(null);
                          navigate(`/editar-area/${area.id}`);
                        }}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="apla-dropdown-item apla-dropdown-item--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAbiertoId(null);
                          setAreaAEliminar(area);
                        }}
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="apla-card-body">
                <div className="apla-card-detail">
                  <MapPin size={14} />
                  <p>{direcciones[0] || "Sin dirección registrada"}</p>
                  {direcciones.length > 1 && (
                    <span className="apla-mas-badge">+{direcciones.length - 1} más</span>
                  )}
                </div>

                {area.responsable && (
                  <div className="apla-card-detail">
                    <User size={14} />
                    <p>{area.responsable}</p>
                  </div>
                )}

                <div className="apla-card-detail">
                  <Phone size={14} />
                  <p className={!area.telefono ? "apla-muted" : ""}>
                    {area.telefono || "Sin teléfono"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {loading && <p className="apla-loading-text">Cargando áreas...</p>}
        {!loading && areasFiltradas.length === 0 && (
          <p className="apla-no-results">No se encontraron áreas protegidas.</p>
        )}
      </div>

      {/* Modal Detalle */}
      {areaSeleccionada && (
        <ModalDetalleArea
          area={areaSeleccionada}
          puedeEditar={puedeEditar}
          onClose={() => setAreaSeleccionada(null)}
        />
      )}

      {/* Modal Eliminar */}
      {areaAEliminar && (
        <div className="apla-modal-overlay" onClick={() => !eliminando && setAreaAEliminar(null)}>
          <div className="apla-modal-container" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar eliminación</h3>
            <p>
              ¿Estás seguro que querés eliminar el área protegida{" "}
              <strong>{areaAEliminar.nombre}</strong>?
            </p>
            <div className="apla-modal-buttons">
              <button
                onClick={() => eliminarArea(areaAEliminar)}
                className="apla-btn-confirmar"
                disabled={eliminando}
              >
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
              <button
                onClick={() => setAreaAEliminar(null)}
                className="apla-btn-cancelar"
                disabled={eliminando}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AreasProtegidasLista;
