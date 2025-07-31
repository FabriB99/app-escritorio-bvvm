// src/pages/Legajos/LegajosLista.tsx
import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { collection, query, orderBy, startAfter, limit, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { FaPlus, FaHistory, FaSearch, FaTrashAlt, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./LegajosLista.css";
import { registrarCambioLegajo } from "../../utils/registrarCambioLegajo";

interface Legajo {
  id: string;
  apellido: string;
  nombre: string;
  numeroLegajo: number;
}

const BATCH_SIZE = 20;

const LegajosLista: React.FC = () => {
  const { user } = useUser();
  const [legajos, setLegajos] = useState<Legajo[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Estados para el modal
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [legajoAEliminar, setLegajoAEliminar] = useState<Legajo | null>(null);

  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    cargarLegajos(true);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      if (
        container.scrollHeight - container.scrollTop <=
          container.clientHeight + 100 &&
        !loading &&
        hasMore
      ) {
        cargarLegajos();
      }
    };

    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [loading, hasMore, lastDoc]);

  const cargarLegajos = async (reset = false) => {
    if (!hasMore && !reset) return;
    setLoading(true);

    try {
      const legajosRef = collection(db, "legajos");
      let q = reset
        ? query(legajosRef, orderBy("apellido"), limit(BATCH_SIZE))
        : query(legajosRef, orderBy("apellido"), startAfter(lastDoc), limit(BATCH_SIZE));

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const nuevos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Legajo, "id">),
        }));

        setLegajos((prev) => (reset ? nuevos : [...prev, ...nuevos]));
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === BATCH_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error cargando legajos:", error);
    }
    setLoading(false);
  };

  const eliminarLegajo = async (id: string) => {
    try {
      const docRef = doc(db, "legajos", id);
      const docSnap = await getDoc(docRef);
      const datosPrevios = docSnap.exists() ? docSnap.data() : null;

      await deleteDoc(docRef);
      setLegajos((prev) => prev.filter((l) => l.id !== id));

      if (user && datosPrevios) {
        await registrarCambioLegajo({
          legajoId: id,
          accion: "eliminado",
          tipoCambio: "legajo completo",
          usuarioId: user.uid || "desconocido",
          usuarioRol: user.rol || "desconocido",
          datosPrevios,
          datosNuevos: null,
        });
      }
    } catch (error) {
      console.error("Error al eliminar legajo:", error);
      alert("Ocurrió un error al eliminar el legajo.");
    }
  };

  const legajosFiltrados = legajos.filter((l) =>
    `${l.apellido} ${l.nombre}`.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div className="legajos-lista-container" ref={scrollContainerRef}>
      <header className="legajos-header">
        <h2 className="legajos-title">Legajos</h2>

        {puedeEditar && (
          <>
            <button
              className="btn-agregar"
              title="Agregar nuevo legajo"
              onClick={() => navigate("/agregar-legajo")}
            >
              <FaPlus />
            </button>

            <button
              className="btn-ver-historial"
              title="Ver historial"
              onClick={() => navigate("/historial")}
            >
              <FaHistory />
            </button>
          </>
        )}
      </header>

      <div className="buscador-container">
        <FaSearch className="icono-lupa" />
        <input
          className="legajos-buscar"
          type="text"
          placeholder="Buscar por apellido..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      <div className="legajos-lista">
        {legajosFiltrados.map((legajo) => (
          <div key={legajo.id} className="legajo-card">
            <div className="legajo-info">
              <p className="legajo-nombre">
                {legajo.apellido}, {legajo.nombre}
              </p>
              <p className="legajo-numero">Legajo N° {legajo.numeroLegajo}</p>
            </div>
            <div className="legajo-acciones">
              <button
                title="Ver legajo"
                onClick={() => navigate(`/legajo/${legajo.id}`)}
              >
                <FaEye />
              </button>
              {puedeEditar && (
                <button
                  title="Eliminar legajo"
                  onClick={() => {
                    setLegajoAEliminar(legajo);
                    setModalEliminarVisible(true);
                  }}
                >
                  <FaTrashAlt />
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="loading-text">Cargando más legajos...</p>}
        {!loading && legajosFiltrados.length === 0 && (
          <p className="no-results">No se encontraron legajos.</p>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {modalEliminarVisible && legajoAEliminar && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h3>Confirmar eliminación</h3>
            <p>¿Estás seguro que querés eliminar el legajo de {legajoAEliminar.apellido}, {legajoAEliminar.nombre}?</p>
            <div className="modal-buttons">
              <button
                onClick={async () => {
                  await eliminarLegajo(legajoAEliminar.id);
                  setModalEliminarVisible(false);
                  setLegajoAEliminar(null);
                }}
                className="btn-confirmar"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => {
                  setModalEliminarVisible(false);
                  setLegajoAEliminar(null);
                }}
                className="btn-cancelar"
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

export default LegajosLista;
