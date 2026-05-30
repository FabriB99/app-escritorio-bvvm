// src/pages/Unidades/Unidades.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from "../../app/firebase-config";
import { deleteDoc, doc, collection, onSnapshot, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Plus, Filter, X, FileSpreadsheet } from 'lucide-react';
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

interface Elemento {
  id: string;
  nombre: string;
  cantidad: string;
  estado: string;
}

const TIPOS_UNIDAD = [
  "Ambulancia",
  "Unidad de Incendio Estructural",
  "Unidad de Incendio Forestal",
  "Unidad de Abastecimiento",
  "Unidad de Rescate Urbano",
  "Unidad de Transporte Personal",
  "Unidad de Logística",
  "Escalera Mecánica",
  "Unidad de Rescate Vehicular",
  "Unidad de Rescate Acuático"
];

const Unidades: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
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

  // Lógica de Exportación a Excel
  const handleExportarExcel = async () => {
    if (units.length === 0) {
      mostrarToast("No hay unidades para exportar.");
      return;
    }

    mostrarToast("Cargando datos detallados...");

    try {
      // 1. Cargar elementos de todas las unidades en paralelo
      const promesas = units.map(async (unidad) => {
        const q = query(
          collection(db, 'elementos'),
          where('unidad_id', '==', unidad.id),
          orderBy('nombre')
        );
        const querySnapshot = await getDocs(q);
        
        const elementos: Elemento[] = [];
        querySnapshot.forEach((doc) => {
          elementos.push({ id: doc.id, ...doc.data() } as Elemento);
        });
        
        return { unidadId: unidad.id, elementos };
      });

      const resultados = await Promise.all(promesas);
      
      // 2. Importar xlsx dinámicamente
      const xlsx = await import('xlsx');
      const wb = xlsx.utils.book_new();

      // --- Hoja 1: Resumen Unidades ---
      const datosResumen = units.map(u => ({
        'ID': u.id,
        'Nombre': u.nombre,
        'Tipo': u.tipo,
        'Modelo': u.modelo,
        'Patente': u.patente,
        'Estado': u.estado
      }));
      const wsResumen = xlsx.utils.json_to_sheet(datosResumen);
      wsResumen['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      xlsx.utils.book_append_sheet(wb, wsResumen, "Resumen Unidades");

      // --- Hoja 2: Inventario Detallado ---
      const datosInventario: any[] = [];
      resultados.forEach(item => {
        const unidad = units.find(u => u.id === item.unidadId);
        if (!unidad) return;

        item.elementos.forEach(elem => {
          datosInventario.push({
            'ID Unidad': unidad.id,
            'Nombre Unidad': unidad.nombre,
            'Elemento': elem.nombre,
            'Cantidad': elem.cantidad,
            'Estado': elem.estado
          });
        });
      });

      const wsInventario = xlsx.utils.json_to_sheet(datosInventario);
      wsInventario['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 15 }];
      xlsx.utils.book_append_sheet(wb, wsInventario, "Inventario Detallado");

      // 3. Descargar
      xlsx.writeFile(wb, `Inventario_Unidades_${new Date().toISOString().slice(0, 10)}.xlsx`);
      mostrarToast("Archivo Excel descargado exitosamente.");

    } catch (error) {
      console.error("Error al exportar:", error);
      mostrarToast("Error al generar el archivo Excel.");
    }
  };

  // Botones del Header
  const headerButtons = [
    ...(user?.rol === 'admin' ? [{
      icon: Plus,
      onClick: () => navigate("/crear-unidad"),
      ariaLabel: "Agregar unidad"
    }] : []),
    {
      icon: Filter,
      onClick: () => setIsFilterOpen(!isFilterOpen),
      ariaLabel: "Filtrar unidades"
    },
    ...(user?.rol === 'admin' ? [{
      icon: FileSpreadsheet,
      onClick: handleExportarExcel,
      ariaLabel: "Exportar a Excel",
      className: "btn-exportar-header"
    }] : [])
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
                  <X size={18} />
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
