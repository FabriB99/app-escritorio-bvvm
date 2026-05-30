// src/pages/Admin/AuditoriaLista.tsx
import React, { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { format, parse } from "date-fns";
// Cambiamos react-icons por lucide-react
import { Eye, Trash2, ArrowRight, Calendar } from "lucide-react";
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
  detalles?: {
    descripcionBreve?: string;
    cambios?: Array<{ campo: string; anterior: any; nuevo: any }>;
    valoresCreados?: any;
  };
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

  const obtenerNombreDoc = async (coleccion: string, docId: string) => {
    if (!docId || docId === "-") return "-";
    try {
      const docRef = doc(db, coleccion, docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return docId;
      const data = docSnap.data() as any;
      if (coleccion === "legajos") return `${data.apellido || ""} ${data.nombre || ""}`.trim() || docId;
      if (coleccion === "otros" || coleccion === "capacitaciones") return data.nombre || data.titulo || docId;
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
          
          // ── 1. MAPEO INTELIGENTE DEL MIEMBRO / OPERADOR ──
          let miembroNombre = "-";
          let rol = "-";
          let uidBuscable = "";

          // Identificamos dónde puede estar el UID del operador
          if (d.operador?.uid) {
            uidBuscable = d.operador.uid;
            miembroNombre = d.operador.nombre || "-";
            rol = d.operador.rol || "-";
          } else if (d.miembro?.uid) {
            uidBuscable = d.miembro.uid;
          } else if (d.realizadoPor) {
            // Caso del log viejo de tu captura de pantalla
            uidBuscable = d.realizadoPor;
            if (d.realizadoPorNombre && d.realizadoPorNombre.trim() !== "") {
              miembroNombre = d.realizadoPorNombre;
            }
          }

          // Si identificamos un UID pero no tenemos el nombre o el rol, consultamos la colección 'miembros'
          if (uidBuscable && (miembroNombre === "-" || rol === "-")) {
            try {
              const miembroDoc = await getDoc(doc(db, "miembros", uidBuscable));
              if (miembroDoc.exists()) {
                const mData = miembroDoc.data();
                if (miembroNombre === "-") {
                  miembroNombre = `${mData.nombre || ""} ${mData.apellido || ""}`.trim();
                }
                if (rol === "-") {
                  rol = mData.roles?.join(", ") ?? mData.rol ?? "-";
                }
              }
            } catch (err) {
              console.error("Error recuperando datos del miembro dinámicamente:", err);
            }
          }

          // Fallback final si el usuario ya no existe o no tiene nombre asignado
          if (!miembroNombre || miembroNombre === "-") {
            miembroNombre = d.miembroNombre || "Sistema / Desconocido";
          }
          if (rol === "-") {
            rol = d.rol || "-";
          }

          // ── 2. MAPEO DE ACCIÓN, COLECCIÓN E ID DEL DOCUMENTO ──
          let accionBase = d.accion ?? "-";
          // d.entidad es el fallback para tus logs históricos ("capacitaciones")
          let coleccionBase = d.coleccion ?? d.entidad ?? "-";
          // d.entidadId es el fallback para tus logs históricos ("GXhuGl9V1...")
          let idDocumento = d.docId ?? d.entidadId ?? "-";

          // Intérprete para normalizar nombres de acciones compuestos (ej: "eliminar_capacitacion")
          if (accionBase.includes("_")) {
            const partes = accionBase.split("_");
            accionBase = partes[0].toLowerCase(); // Deja sólo "eliminar" o "crear"
          }

          // Buscamos el nombre del afectado (Legajo o Título de capacitación)
          const friendlyDocId = await obtenerNombreDoc(coleccionBase, idDocumento);

          // ── 3. DETALLES Y SNAPSHOTS HISTÓRICOS ──
          let detallesEstructurados = d.detalles ?? null;

          // Si el log es viejo y tiene un campo 'snapshot' stringificado, lo convertimos en 'valoresCreados'
          // para que el modal lo dibuje de forma hermosa usando la grilla prolija.
          if (!detallesEstructurados && d.snapshot) {
            try {
              const snapshotParseado = typeof d.snapshot === "string" ? JSON.parse(d.snapshot) : d.snapshot;
              detallesEstructurados = {
                descripcionBreve: "Registro histórico recuperado del snapshot de eliminación.",
                valoresCreados: snapshotParseado
              };
            } catch {
              // Si no es un JSON válido, dejamos que la retrocompatibilidad base se encargue
            }
          }

          return {
            id: docSnap.id,
            miembroNombre,
            rol,
            accion: accionBase,
            coleccion: coleccionBase,
            docId: friendlyDocId,
            timestamp: d.fecha ?? null,
            detalles: detallesEstructurados,
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
      setToast(`${logsFiltrados.length} registros eliminados`);
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error(error);
      setToast("Error al eliminar registros");
    }
  };

  const eliminarUno = async (id: string) => {
    try {
      await deleteDoc(doc(db, "auditoria", id));
      setLogs(prev => prev.filter(l => l.id !== id));
      setToast("Registro eliminado");
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error(error);
      setToast("Error al eliminar registro");
    }
  };

  const formatearFechaInput = (valor: string) => {
    let v = valor.replace(/\D/g, "");
    if (v.length > 2) v = v.slice(0,2) + "-" + v.slice(2);
    if (v.length > 5) v = v.slice(0,5) + "-" + v.slice(5,9);
    if (v.length > 10) v = v.slice(0,10);
    return v;
  };

  const renderValor = (val: any) => {
    if (val === null || val === undefined) return <span className="val-vacio">vacío</span>;
    if (typeof val === "boolean") return val ? "Sí" : "No";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
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
          <Trash2 size={15} /> Eliminar filtrados
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
                  <td style={{ textTransform: 'capitalize' }}>{log.coleccion}</td>
                  <td>{log.docId}</td>
                  <td className="accion-botones">
                    <button className="auditoria-btn-ver" onClick={() => handleVer(log)}>
                      <Eye size={18} />
                    </button>
                    <button className="auditoria-btn-eliminar-fila" onClick={() => eliminarUno(log.id)}>
                      <Trash2 size={16} />
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
          <div className="auditoria-modal-content --dinamico" onClick={(e) => e.stopPropagation()}>
            <button className="auditoria-btn-cerrar" onClick={cerrarModal}>×</button>
            <h3>Detalle del Movimiento</h3>
            
            <div className="auditoria-meta-resumen">
              <p><strong>Operador:</strong> {logSeleccionado.miembroNombre} ({logSeleccionado.rol})</p>
              <p><strong>Destino:</strong> {logSeleccionado.coleccion} ➔ {logSeleccionado.docId}</p>
              {logSeleccionado.detalles?.descripcionBreve && (
                <p className="auditoria-desc-breve">💡 {logSeleccionado.detalles.descripcionBreve}</p>
              )}
            </div>

            <div className="auditoria-cambios-body">
              {logSeleccionado.detalles?.cambios && logSeleccionado.detalles.cambios.length > 0 && (
                <div className="diff-wrapper">
                  <h4>Campos Modificados ({logSeleccionado.detalles.cambios.length})</h4>
                  <div className="diff-tabla">
                    <div className="diff-fila header">
                      <span>Campo</span>
                      <span>Valor Anterior</span>
                      <span></span>
                      <span>Valor Nuevo</span>
                    </div>
                    {logSeleccionado.detalles.cambios.map((c) => (
                      <div key={c.campo} className="diff-fila">
                        <span className="diff-campo">{c.campo}</span>
                        <span className="diff-valor anterior">{renderValor(c.anterior)}</span>
                        <span className="diff-flecha"><ArrowRight size={14} /></span>
                        <span className="diff-valor nuevo">{renderValor(c.nuevo)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {logSeleccionado.detalles?.valoresCreados && (
                <div className="snapshot-wrapper">
                  <h4>Datos del Documento Creado</h4>
                  <div className="snapshot-grid">
                    {Object.entries(logSeleccionado.detalles.valoresCreados).map(([key, val]) => (
                      <div key={key} className="snapshot-item">
                        <span className="snapshot-key">{key}:</span>
                        <span className="snapshot-val">{renderValor(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!logSeleccionado.detalles && (logSeleccionado.datosAnteriores || logSeleccionado.datosNuevos) && (
                <div className="auditoria-datos-panel">
                  <div className="auditoria-datos-anteriores">
                    <h4>Datos Anteriores (Histórico)</h4>
                    {logSeleccionado.datosAnteriores ? (
                      Object.entries(logSeleccionado.datosAnteriores).map(([key, value]) => (
                        <p key={key}><strong>{key}:</strong> {renderValor(value)}</p>
                      ))
                    ) : (
                      <p className="val-vacio">No hay registros previos</p>
                    )}
                  </div>
                  <div className="auditoria-datos-nuevos">
                    <h4>Datos Nuevos (Histórico)</h4>
                    {logSeleccionado.datosNuevos ? (
                      Object.entries(logSeleccionado.datosNuevos).map(([key, value]) => (
                        <p key={key}><strong>{key}:</strong> {renderValor(value)}</p>
                      ))
                    ) : (
                      <p className="val-vacio">No hay datos nuevos</p>
                    )}
                  </div>
                </div>
              )}

              {!logSeleccionado.detalles?.cambios && !logSeleccionado.detalles?.valoresCreados && !logSeleccionado.datosAnteriores && !logSeleccionado.datosNuevos && (
                <p className="auditoria-noresultados">No hay metadatos detallados para esta acción.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaLista;