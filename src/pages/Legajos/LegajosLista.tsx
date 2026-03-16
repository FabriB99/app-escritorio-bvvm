import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { collection, query, orderBy, startAfter, limit, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { Plus, Search, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./LegajosLista.css";
import { registrarAuditoria } from "../../utils/auditoria";
import Header from "../../components/Header";

interface Legajo {
  id: string;
  apellido: string;
  nombre: string;
  numeroLegajo: number;
  categoria?: string;
}

const BATCH_SIZE = 20;

const LegajosLista: React.FC = () => {
  const { user, miembroActivo } = useUser();
  const [legajos, setLegajos] = useState<Legajo[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [legajoAEliminar, setLegajoAEliminar] = useState<Legajo | null>(null);

  const puedeEditar = user?.rol === "admin" || user?.rol === "jefatura" || user?.rol === "legajo";

  useEffect(() => { cargarLegajos(true); }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (container.scrollHeight - container.scrollTop <= container.clientHeight + 100 && !loading && hasMore) {
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
      const q = reset
        ? query(legajosRef, orderBy("apellido"), limit(BATCH_SIZE))
        : query(legajosRef, orderBy("apellido"), startAfter(lastDoc), limit(BATCH_SIZE));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const nuevos = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Legajo, "id">) }));
        setLegajos(prev => reset ? nuevos : [...prev, ...nuevos]);
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
    if (!miembroActivo) return;
    try {
      const docRef = doc(db, "legajos", id);
      const docSnap = await getDoc(docRef);
      const datosPrevios = docSnap.exists() ? docSnap.data() : null;
      await deleteDoc(docRef);
      setLegajos(prev => prev.filter(l => l.id !== id));
      if (datosPrevios) {
        await registrarAuditoria({
          coleccion: "legajos", accion: "eliminar", docId: id,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosNuevos: null, datosAnteriores: datosPrevios,
        });
      }
    } catch (error) {
      console.error("Error al eliminar legajo:", error);
    }
  };

  const getIniciales = (apellido: string, nombre: string) =>
    `${apellido.charAt(0)}${nombre.charAt(0)}`.toUpperCase();

  const legajosFiltrados = legajos.filter(l =>
    `${l.apellido} ${l.nombre}`.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div className="legajos-lista-container" ref={scrollContainerRef}>
      <Header
        title="Legajos"
        extraButtons={puedeEditar ? [{
          key: "agregar",
          icon: Plus,
          onClick: () => navigate("/agregar-legajo"),
          ariaLabel: "Agregar nuevo legajo",
        }] : []}
      />

      {/* Buscador + contador */}
      <div className="legajos-toolbar">
        <span className="legajos-contador">
          {legajosFiltrados.length} {legajosFiltrados.length === 1 ? "legajo" : "legajos"}
        </span>
        <div className="legajos-buscador-wrapper">
          <Search size={14} className="legajos-icono-lupa" />
          <input
            className="legajos-buscar"
            type="text"
            placeholder="Buscar por apellido..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="legajos-lista">
        {legajosFiltrados.map(legajo => (
          <div key={legajo.id} className="legajo-card">
            <div className="legajo-avatar">
              {getIniciales(legajo.apellido, legajo.nombre)}
            </div>
            <div className="legajo-info">
              <p className="legajo-nombre">{legajo.apellido}, {legajo.nombre}</p>
              <p className="legajo-numero">
                Legajo N° {legajo.numeroLegajo}
                {legajo.categoria && <span className="legajo-categoria">{legajo.categoria}</span>}
              </p>
            </div>
            <div className="legajo-acciones">
              <button className="btn-ver" onClick={() => navigate(`/legajo/${legajo.id}`)}>
                <Eye size={14} /> Ver legajo
              </button>
              {puedeEditar && (
                <button className="btn-eliminar" onClick={() => { setLegajoAEliminar(legajo); setModalEliminarVisible(true); }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="legajos-loading">Cargando...</p>}
        {!loading && legajosFiltrados.length === 0 && (
          <p className="legajos-empty">No se encontraron legajos.</p>
        )}
      </div>

      {/* Modal eliminar */}
      {modalEliminarVisible && legajoAEliminar && (
        <div className="modal-overlay" onClick={() => setModalEliminarVisible(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <h3>Confirmar eliminación</h3>
            <p>¿Seguro que querés eliminar el legajo de <strong>{legajoAEliminar.apellido}, {legajoAEliminar.nombre}</strong>?</p>
            <div className="modal-botones">
              <button className="btn-cancelar" onClick={() => { setModalEliminarVisible(false); setLegajoAEliminar(null); }}>
                Cancelar
              </button>
              <button className="btn-confirmar" onClick={async () => {
                await eliminarLegajo(legajoAEliminar.id);
                setModalEliminarVisible(false);
                setLegajoAEliminar(null);
              }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegajosLista;