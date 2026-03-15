// src/pages/Admin/AuditoriaLista.tsx
import React, { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { format, parse } from "date-fns";
import { FaEye, FaTrash } from "react-icons/fa";
import Header from "../../components/Header";
import "./AuditoriaLista.css";

interface LogAuditoria {
  id: string;
  miembroNombre: string;
  rol: string;
  accion: string;
  coleccion: string;
  docId: string;
  timestamp: any;
  datosAnteriores?: any;
  datosNuevos?: any;
}

const AuditoriaLista: React.FC = () => {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [logSeleccionado, setLogSeleccionado] = useState<LogAuditoria | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Helper para obtener nombre amigable de un doc ---
  const obtenerNombreDoc = async (coleccion: string, docId: string) => {
    if (!docId) return "-";
    try {
      const docRef = doc(db, coleccion, docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return docId;
      const data = docSnap.data() as any;
      if (coleccion === "legajos") return `${data.apellido || ""} ${data.nombre || ""}`.trim() || docId;
      if (coleccion === "otros") return data.nombre || data.titulo || docId;
      return docId;
    } catch {
      return docId;
    }
  };

  const cargarLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "auditoria"), orderBy("fecha", "desc"));
      const snapshot = await getDocs(q);

      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const d = docSnap.data() as any;
          let miembroNombre = "Desconocido";
          let rol = "-";

          if (d.miembro?.uid) {
            const miembroDoc = await getDoc(doc(db, "miembros", d.miembro.uid));
            if (miembroDoc.exists()) {
              const mData = miembroDoc.data();
              miembroNombre = `${mData.nombre} ${mData.apellido}`;
              rol = mData.roles?.join(", ") ?? "-";
            }
          } else if (d.miembro) {
            rol = d.miembro.rol ?? "-";
          }

          const friendlyDocId = await obtenerNombreDoc(d.coleccion, d.docId);

          return {
            id: docSnap.id,
            miembroNombre,
            rol,
            accion: d.accion ?? "-",
            coleccion: d.coleccion ?? "-",
            docId: friendlyDocId,
            timestamp: d.fecha ?? null,
            datosAnteriores: d.datosAnteriores ?? null,
            datosNuevos: d.datosNuevos ?? null,
          } as LogAuditoria;
        })
      );

      setLogs(data);
    } catch (error) {
      console.error(error);
      setToast("Error cargando registros");
      setTimeout(() => setToast(null), 2000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, []);

  const parseFecha = (str: string) => {
    if (!str) return null;
    try {
      return parse(str, "dd-MM-yyyy", new Date());
    } catch {
      return null;
    }
  };

  const logsFiltrados = logs.filter((log) => {
    const fecha = log.timestamp?.toDate ? log.timestamp.toDate() : null;
    const desde = parseFecha(fechaDesde);
    const hasta = parseFecha(fechaHasta);
    if (hasta) hasta.setHours(23, 59, 59, 999);

    return (desde ? fecha && fecha >= desde : true) &&
           (hasta ? fecha && fecha <= hasta : true);
  });

  const handleVer = (log: LogAuditoria) => setLogSeleccionado(log);
  const cerrarModal = () => setLogSeleccionado(null);

  const eliminarFiltrados = async () => {
    try {
      await Promise.all(logsFiltrados.map(l => deleteDoc(doc(db, "auditoria", l.id))));
      setLogs(prev => prev.filter(l => !logsFiltrados.includes(l)));
      setToast(`${logsFiltrados.length} registros eliminados correctamente`);
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error(error);
      setToast("Error al eliminar registros");
      setTimeout(() => setToast(null), 2000);
    }
  };

  const eliminarUno = async (id: string) => {
    try {
      await deleteDoc(doc(db, "auditoria", id));
      setLogs(prev => prev.filter(l => l.id !== id));
      setToast("Registro eliminado correctamente");
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error(error);
      setToast("Error al eliminar registro");
      setTimeout(() => setToast(null), 2000);
    }
  };

  const formatearFechaInput = (valor: string) => {
    let v = valor.replace(/\D/g, "");
    if (v.length > 2) v = v.slice(0,2) + "-" + v.slice(2);
    if (v.length > 5) v = v.slice(0,5) + "-" + v.slice(5,9);
    if (v.length > 10) v = v.slice(0,10);
    return v;
  };

  return (
    <div className="auditoria-container">
      <Header title="Panel de Auditoría" onBack={() => window.history.back()} />

      <div className="auditoria-filtros">
        <label>
          Desde: 
          <input
            type="text"
            placeholder="DD-MM-AAAA"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(formatearFechaInput(e.target.value))}
          />
        </label>
        <label>
          Hasta: 
          <input
            type="text"
            placeholder="DD-MM-AAAA"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(formatearFechaInput(e.target.value))}
          />
        </label>
        <button className="auditoria-btn-eliminar" onClick={eliminarFiltrados} disabled={logsFiltrados.length === 0}>
          <FaTrash /> Eliminar filtrados
        </button>
      </div>

      {toast && <div className="auditoria-toast">{toast}</div>}

      {loading ? (
        <div className="auditoria-spinner-wrapper">
          <div className="auditoria-spinner"></div>
        </div>
      ) : (
        <div className="auditoria-tabla-wrapper">
          <table className="auditoria-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Miembro</th>
                <th>Rol</th>
                <th>Acción</th>
                <th>Colección</th>
                <th>Documento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logsFiltrados.map((log) => (
                <tr key={log.id}>
                  <td>{log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd/MM/yyyy HH:mm") : "-"}</td>
                  <td>{log.miembroNombre}</td>
                  <td>{log.rol}</td>
                  <td className={`auditoria-accion ${log.accion.toLowerCase()}`}>{log.accion}</td>
                  <td>{log.coleccion}</td>
                  <td>{log.docId}</td>
                  <td className="accion-botones">
                    <button className="auditoria-btn-ver" onClick={() => handleVer(log)}>
                      <FaEye size={22} />
                    </button>
                    <button className="auditoria-btn-eliminar-fila" onClick={() => eliminarUno(log.id)}>
                      <FaTrash size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logsFiltrados.length === 0 && <p className="auditoria-noresultados">No se encontraron registros</p>}
        </div>
      )}

      {logSeleccionado && (
        <div className="auditoria-modal-overlay" onClick={cerrarModal}>
          <div className="auditoria-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="auditoria-btn-cerrar" onClick={cerrarModal}>×</button>
            <h3>Detalle de Auditoría</h3>
            <p><strong>Acción:</strong> {logSeleccionado.accion}</p>
            <p><strong>Colección:</strong> {logSeleccionado.coleccion}</p>
            <p><strong>Documento:</strong> {logSeleccionado.docId}</p>

            <div className="auditoria-datos-panel">
              <div className="auditoria-datos-anteriores">
                <h4>Datos Anteriores</h4>
                {logSeleccionado.datosAnteriores
                  ? Object.entries(logSeleccionado.datosAnteriores).map(([key, value]) => (
                      <p key={key}><strong>{key}:</strong> {JSON.stringify(value)}</p>
                    ))
                  : <p>No hay datos anteriores</p>
                }
              </div>

              <div className="auditoria-datos-nuevos">
                <h4>Datos Nuevos</h4>
                {logSeleccionado.datosNuevos
                  ? Object.entries(logSeleccionado.datosNuevos).map(([key, value]) => (
                      <p key={key}><strong>{key}:</strong> {JSON.stringify(value)}</p>
                    ))
                  : <p>No hay datos nuevos</p>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaLista;
