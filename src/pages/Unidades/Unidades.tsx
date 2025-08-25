// Unidades.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from "../../app/firebase-config";
import { deleteDoc, doc, collection, onSnapshot } from 'firebase/firestore';
import { FaFilter, FaPlus } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { ToastContainer } from 'react-toastify';
import { mostrarToast } from '../../utils/toast';
import { useUser } from '../../context/UserContext';
import Header from "../../components/Header";
import './Unidades.css';

interface Unidad {
  id: string;
  nombre: string;
  patente: string;
  modelo: string;
  ultima_revision: any;
  tipo: string;
  estado?: string;
}

const TIPOS_UNIDAD = [
  "Ambulancia",
  "Unidad de Incendio Estructural",
  "Unidad de Incendio Forestal",
  "Unidad de Abastecimiento",
  "Unidad de Rescate Urbano",
  "Unidad de Transporte de Personal",
  "Unidad de Logística",
  "Escalera Mecánica",
  "Unidad de Rescate Vehicular",
  "Unidad de Rescate Acuático"
];

const Unidades: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate(); // <-- useNavigate agregado
  const [units, setUnits] = useState<Unidad[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unidadAEliminar, setUnidadAEliminar] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'unidades'), snapshot => {
      const unidadesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unidad));
      unidadesData.sort((a, b) => {
        const numA = parseInt(a.nombre.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.nombre.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });
      setUnits(unidadesData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const abrirModalEliminar = (id: string) => {
    setUnidadAEliminar(id);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setUnidadAEliminar(null);
    setIsModalOpen(false);
  };

  const eliminarUnidad = async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'unidades', id));
      mostrarToast("Unidad eliminada con éxito.");
      cerrarModal();
    } catch (error) {
      console.error("Error al eliminar la unidad:", error);
    }
  };

  const unidadesFiltradas = units.filter(u => !filtroTipo || u.tipo === filtroTipo);

  // Botones del Header
  const headerButtons = [
    // Botón agregar (solo admin)
    ...(user?.rol === 'admin' ? [{
      icon: FaPlus,
      onClick: () => navigate("/crear-unidad"),
      ariaLabel: "Agregar unidad"
    }] : []),
    // Botón filtro
    {
      icon: FaFilter,
      onClick: () => setIsFilterOpen(!isFilterOpen),
      ariaLabel: "Filtrar unidades"
    }
  ];

  return (
    <>
      <div className="unidades">
        <Header
          title="Unidades"
          extraButtons={headerButtons}
        />

        {isFilterOpen && (
          <div className="filter-menu" ref={filterRef}>
            <label>Tipo de unidad:</label>
            <select onChange={(e) => setFiltroTipo(e.target.value)} value={filtroTipo}>
              <option value="">Todos los tipos</option>
              {TIPOS_UNIDAD.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
        )}

        <div className="cards-container">
          {unidadesFiltradas.map(unidad => (
            <div
              key={unidad.id}
              className={`card estado-${unidad.estado
                ? unidad.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
                : "desconocido"
              }`}
            >
              {user?.rol === 'admin' && (
                <button className="btn-eliminar-tarjeta" onClick={() => abrirModalEliminar(unidad.id)}>
                  <MdClose size={20} />
                </button>
              )}

              <Link to={`/unidad/${unidad.id}`} className="card-link">
                <h3>{unidad.nombre}</h3>
                <div className="tipo">{unidad.tipo}</div>
                <p>Modelo: {unidad.modelo}</p>
                <p>Última revisión: {unidad.ultima_revision?.seconds
                  ? new Date(unidad.ultima_revision.seconds * 1000).toLocaleDateString()
                  : 'Sin fecha'}
                </p>
                <div className={`estado estado-${unidad.estado
                  ? unidad.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
                  : "desconocido"
                }`}>
                  {unidad.estado || 'Desconocido'}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>¿Estás seguro de que quieres eliminar esta unidad?</h3>
            <div className="modal-buttons">
              <button className="btn-eliminar-modal" onClick={() => eliminarUnidad(unidadAEliminar!)}>Eliminar</button>
              <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        toastClassName="toast-style"
      />
    </>
  );
};

export default Unidades;
