// src/pages/AreasProtegidas/AreasProtegidasLista.tsx
import React, { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { Plus, Search, Trash2, Eye, Pencil, ShieldCheck, Building2, MapPin, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./AreasProtegidasLista.css";
import Header from "../../components/Header";
import ModalDetalleArea from "./ModalDetalleArea";

interface AreaProtegida {
  id: string;
  nombre: string;
  direcciones: string[];
  responsable?: string;
  telefono?: string;
}

const AreasProtegidasLista: React.FC = () => {
  const { user } = useUser();
  const [areas, setAreas] = useState<AreaProtegida[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modal detalle
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [areaSeleccionada, setAreaSeleccionada] = useState<AreaProtegida | null>(null);

  // Modal eliminar
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [areaAEliminar, setAreaAEliminar] = useState<AreaProtegida | null>(null);

  const puedeEditar = ["admin", "jefatura", "guardia"].includes(user?.rol || "");

  useEffect(() => {
    const areasRef = collection(db, "areas_protegidas");
    const q = query(areasRef, orderBy("nombre"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const nuevos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<AreaProtegida, "id">),
        }));
        setAreas(nuevos.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      } else {
        setAreas([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const eliminarArea = async (id: string) => {
    try {
      await deleteDoc(doc(db, "areas_protegidas", id));
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error al eliminar área:", error);
      alert("Ocurrió un error al eliminar el área protegida.");
    }
  };

  const areasFiltradas = areas.filter((a) =>
    a.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div className="apla-lista-container">
      <Header
        title="Áreas Protegidas"
        onBack={() => navigate(-1)}
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

      <div className="apla-buscador-container">
        <Search size={16} className="apla-icono-lupa" />
        <input
          className="apla-buscar"
          type="text"
          placeholder="Buscar por nombre..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      <div className="cards-container">
        {areasFiltradas.map((area) => (
          <div key={area.id} className="card">
            <div className="apla-card-head">
              <Building2 size={20} className="apla-building-icon" />
              <h3 className="apla-card-title">{area.nombre}</h3>
            </div>

            <div className="apla-card-detail">
              <MapPin size={14} />
              <p>{area.direcciones?.[0] || "Sin dirección registrada"}</p>
            </div>

            <div className="apla-card-detail">
              <Phone size={14} />
              <p>{area.telefono || "Sin teléfono registrado"}</p>
            </div>

            <div className="apla-acciones">
              <button
                title="Ver detalle"
                className="apla-btn-accion"
                onClick={() => {
                  setAreaSeleccionada(area);
                  setModalDetalleVisible(true);
                }}
                aria-label="Ver detalle"
              >
                <Eye size={16} />
              </button>

              {puedeEditar && (
                <>
                  <button
                    title="Editar área"
                    className="apla-btn-accion"
                    onClick={() => navigate(`/editar-area/${area.id}`)}
                    aria-label="Editar área"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    title="Eliminar área"
                    className="apla-btn-accion"
                    onClick={() => {
                      setAreaAEliminar(area);
                      setModalEliminarVisible(true);
                    }}
                    aria-label="Eliminar área"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {loading && <p className="apla-loading-text">Cargando áreas...</p>}
        {!loading && areasFiltradas.length === 0 && (
          <p className="apla-no-results">No se encontraron áreas protegidas.</p>
        )}
      </div>

      {/* Modal Detalle */}
      {modalDetalleVisible && areaSeleccionada && (
        <ModalDetalleArea
          area={areaSeleccionada}
          onClose={() => {
            setModalDetalleVisible(false);
            setAreaSeleccionada(null);
          }}
        />
      )}

      {/* Modal Eliminar */}
      {modalEliminarVisible && areaAEliminar && (
        <div className="apla-modal-overlay">
          <div className="apla-modal-container">
            <h3>Confirmar eliminación</h3>
            <p>
              ¿Estás seguro que querés eliminar el área protegida{" "}
              <strong>{areaAEliminar.nombre}</strong>?
            </p>
            <div className="apla-modal-buttons">
              <button
                onClick={async () => {
                  await eliminarArea(areaAEliminar.id);
                  setModalEliminarVisible(false);
                  setAreaAEliminar(null);
                }}
                className="apla-btn-confirmar"
              >
                Eliminar
              </button>
              <button
                onClick={() => {
                  setModalEliminarVisible(false);
                  setAreaAEliminar(null);
                }}
                className="apla-btn-cancelar"
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
