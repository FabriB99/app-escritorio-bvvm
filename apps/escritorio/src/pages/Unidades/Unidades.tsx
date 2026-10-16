// src/pages/Unidades/Unidades.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from "../../app/firebase-config";
import { doc, collection, onSnapshot, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Plus, Filter, X, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../../context/UserContext';
import Header from "../../components/Header";
import './Unidades.css';
import * as xlsx from 'xlsx';
import { TIPOS_UNIDAD, Unidad, Elemento } from '../../types/unidades';
import { registrarAuditoria, buildOperador } from '../../utils/auditoria';

const formatearClaseEstado = (estado?: string) =>
  estado
    ? estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    : "desconocido";

const Unidades: React.FC = () => {
  const { user, miembroActivo } = useUser();
  const navigate = useNavigate();
  const [units, setUnits] = useState<(Unidad & { ultima_revision?: any })[]>([]);
  const [unidadAEliminar, setUnidadAEliminar] = useState<(Unidad & { ultima_revision?: any }) | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'unidades'), snapshot => {
      const unidadesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Unidad & { ultima_revision?: any }));
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

  const eliminarUnidad = async () => {
    if (!unidadAEliminar) return;
    try {
      const id = unidadAEliminar.id;
      const [ubicSnap, elemSnap] = await Promise.all([
        getDocs(query(collection(db, 'ubicaciones'), where('unidad_id', '==', id))),
        getDocs(query(collection(db, 'elementos'), where('unidad_id', '==', id))),
      ]);

      const batch = writeBatch(db);
      elemSnap.docs.forEach(d => batch.delete(d.ref));
      ubicSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'unidades', id));
      await batch.commit();

      await registrarAuditoria({
        accion: 'eliminar',
        coleccion: 'unidades',
        docId: id,
        docResumen: `${unidadAEliminar.nombre} (${unidadAEliminar.patente || 'S/P'})`,
        operador: buildOperador(miembroActivo, user?.rol),
        detalles: { snapshot: unidadAEliminar },
      });

      toast.success("Unidad y su inventario eliminados con éxito.");
      setUnidadAEliminar(null);
    } catch (error) {
      console.error("Error al eliminar la unidad:", error);
      toast.error("Error al eliminar la unidad.");
    }
  };

  const handleExportarExcel = async () => {
    if (units.length === 0) {
      toast.warning("No hay unidades para exportar.");
      return;
    }

    toast.info("Generando Excel...");
    try {
      const elemSnap = await getDocs(collection(db, 'elementos'));
      const todosLosElementos = elemSnap.docs.map(d => ({ id: d.id, ...d.data() } as Elemento & { unidad_id?: string }));

      const wb = xlsx.utils.book_new();

      const datosResumen = units.map(u => ({
        'ID': u.id,
        'Nombre': u.nombre,
        'Tipo': u.tipo,
        'Categoría': u.categoria || 'Sin categoría',
        'Modelo': u.modelo,
        'Patente': u.patente,
        'Estado': u.estado
      }));
      const wsResumen = xlsx.utils.json_to_sheet(datosResumen);
      wsResumen['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      xlsx.utils.book_append_sheet(wb, wsResumen, "Resumen Unidades");

      const datosInventario: Record<string, any>[] = [];
      units.forEach(unidad => {
        const elemsUnidad = todosLosElementos
          .filter(e => e.unidad_id === unidad.id)
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

        elemsUnidad.forEach(elem => {
          datosInventario.push({
            'ID Unidad': unidad.id,
            'Nombre Unidad': unidad.nombre,
            'Elemento': elem.nombre,
            'Cantidad': elem.cantidad,
            'Estado': elem.estado || 'Desconocido'
          });
        });
      });

      const wsInventario = xlsx.utils.json_to_sheet(datosInventario);
      wsInventario['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 15 }];
      xlsx.utils.book_append_sheet(wb, wsInventario, "Inventario Detallado");

      xlsx.writeFile(wb, `Inventario_Unidades_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Archivo Excel descargado exitosamente.");
    } catch (error) {
      console.error("Error al exportar:", error);
      toast.error("Error al generar el archivo Excel.");
    }
  };

  const unidadesFiltradas = units.filter(u => !filtroTipo || u.tipo === filtroTipo);

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
        <Header title="Unidades" extraButtons={headerButtons} />

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
          {unidadesFiltradas.map(unidad => {
            const claseEstado = formatearClaseEstado(unidad.estado);
            return (
              <div key={unidad.id} className={`card estado-${claseEstado}`}>
                {user?.rol === 'admin' && (
                  <button className="btn-eliminar-tarjeta" onClick={() => setUnidadAEliminar(unidad)}>
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
                  <div className={`estado estado-${claseEstado}`}>
                    {unidad.estado || 'Desconocido'}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {unidadAEliminar && (
        <div className="modal">
          <div className="modal-content">
            <h3>¿Estás seguro de que quieres eliminar {unidadAEliminar.nombre}?</h3>
            <div className="modal-buttons">
              <button className="btn-eliminar-modal" onClick={eliminarUnidad}>Eliminar</button>
              <button className="btn-cancelar" onClick={() => setUnidadAEliminar(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Unidades;