// src/pages/Admin/AuditoriaLista.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  collection, query, orderBy, getDocs,
  doc, deleteDoc, Timestamp
} from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Trash2, ArrowRight, X, ShieldAlert, ChevronDown } from "lucide-react";
import Header from "../../components/Header";
import "./AuditoriaLista.css";

// ─── Tipos ────────────────────────────────────────────────────────────────────
// Refleja exactamente lo que registrarAuditoria() escribe en Firestore.

interface CampoModificado {
  campo: string;
  anterior: any;
  nuevo: any;
}

interface LogAuditoria {
  id: string;
  fecha: Timestamp | null;
  accion: string;
  coleccion: string;
  docId: string;
  docResumen: string;
  operador: {
    uid: string;
    nombre: string;
    rol: string;
  };
  detalles: {
    descripcion?: string;
    cambios?: CampoModificado[];
    snapshot?: Record<string, any>;
  } | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACCION_CONFIG: Record<string, { label: string; clase: string }> = {
  crear:     { label: "Crear",     clase: "accion--crear"     },
  editar:    { label: "Editar",    clase: "accion--editar"    },
  eliminar:  { label: "Eliminar",  clase: "accion--eliminar"  },
  autorizar: { label: "Autorizar", clase: "accion--autorizar" },
};

const ROL_CONFIG: Record<string, string> = {
  admin:     "rol--admin",
  jefatura:  "rol--jefatura",
  graduados: "rol--graduados",
  guardia:   "rol--guardia",
  bombero:   "rol--bombero",
};

// ─── Helper: render de valor desconocido ──────────────────────────────────────

const RenderValor: React.FC<{ val: any }> = ({ val }) => {
  if (val === null || val === undefined)
    return <span className="val-null">—</span>;
  if (typeof val === "boolean")
    return <span className="val-bool">{val ? "Sí" : "No"}</span>;
  if (typeof val === "object") {
    try {
      return <span className="val-obj">{JSON.stringify(val, null, 0)}</span>;
    } catch {
      return <span className="val-obj">[objeto]</span>;
    }
  }
  return <>{String(val)}</>;
};

// ─── Modal de detalle ─────────────────────────────────────────────────────────

interface ModalDetalleProps {
  log: LogAuditoria;
  onCerrar: () => void;
}

const ModalDetalle: React.FC<ModalDetalleProps> = ({ log, onCerrar }) => {
  const accion = ACCION_CONFIG[log.accion] ?? { label: log.accion, clase: "" };
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(
    log.detalles?.cambios ? "cambios"
    : log.detalles?.snapshot ? "snapshot"
    : null
  );

  const toggle = (s: string) =>
    setSeccionAbierta(prev => (prev === s ? null : s));

  return (
    <div className="au-modal-overlay" onClick={onCerrar}>
      <div className="au-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="au-modal__header">
          <div className="au-modal__title">
            <span className={`au-accion-badge ${accion.clase}`}>{accion.label}</span>
            <span className="au-modal__coleccion">{log.coleccion}</span>
          </div>
          <button className="au-modal__close" onClick={onCerrar}>
            <X size={18} />
          </button>
        </div>

        {/* Meta */}
        <div className="au-modal__meta">
          <div className="au-meta-item">
            <span className="au-meta-label">Documento</span>
            <span className="au-meta-value au-meta-value--doc">
              {log.docResumen || log.docId}
            </span>
          </div>
          <div className="au-meta-item">
            <span className="au-meta-label">Operador</span>
            <span className="au-meta-value">
              {log.operador.nombre}
              <span className={`au-rol-badge ${ROL_CONFIG[log.operador.rol] ?? ""}`}>
                {log.operador.rol}
              </span>
            </span>
          </div>
          <div className="au-meta-item">
            <span className="au-meta-label">Fecha</span>
            <span className="au-meta-value">
              {log.fecha?.toDate
                ? format(log.fecha.toDate(), "dd/MM/yyyy HH:mm:ss", { locale: es })
                : "—"}
            </span>
          </div>
          {log.detalles?.descripcion && (
            <div className="au-meta-item au-meta-item--full">
              <span className="au-meta-label">Observaciones</span>
              <span className="au-meta-value">{log.detalles.descripcion}</span>
            </div>
          )}
        </div>

        {/* Cuerpo: cambios */}
        {log.detalles?.cambios && log.detalles.cambios.length > 0 && (
          <div className="au-seccion">
            <button
              className="au-seccion__toggle"
              onClick={() => toggle("cambios")}
            >
              <span>
                Campos modificados
                <span className="au-count">{log.detalles.cambios.length}</span>
              </span>
              <ChevronDown
                size={16}
                className={seccionAbierta === "cambios" ? "au-chevron--open" : ""}
              />
            </button>
            {seccionAbierta === "cambios" && (
              <div className="au-diff-tabla">
                <div className="au-diff-row au-diff-row--header">
                  <span>Campo</span>
                  <span>Anterior</span>
                  <span></span>
                  <span>Nuevo</span>
                </div>
                {log.detalles.cambios.map(c => (
                  <div key={c.campo} className="au-diff-row">
                    <span className="au-diff-campo">{c.campo}</span>
                    <span className="au-diff-val au-diff-val--anterior">
                      <RenderValor val={c.anterior} />
                    </span>
                    <span className="au-diff-arrow">
                      <ArrowRight size={13} />
                    </span>
                    <span className="au-diff-val au-diff-val--nuevo">
                      <RenderValor val={c.nuevo} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cuerpo: snapshot de eliminación */}
        {log.detalles?.snapshot && (
          <div className="au-seccion">
            <button
              className="au-seccion__toggle"
              onClick={() => toggle("snapshot")}
            >
              <span>
                Snapshot del documento eliminado
                <span className="au-count">
                  {Object.keys(log.detalles.snapshot).length} campos
                </span>
              </span>
              <ChevronDown
                size={16}
                className={seccionAbierta === "snapshot" ? "au-chevron--open" : ""}
              />
            </button>
            {seccionAbierta === "snapshot" && (
              <div className="au-snapshot-grid">
                {Object.entries(log.detalles.snapshot).map(([k, v]) => (
                  <div key={k} className="au-snapshot-item">
                    <span className="au-snapshot-key">{k}</span>
                    <span className="au-snapshot-val"><RenderValor val={v} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sin detalles */}
        {!log.detalles && (
          <p className="au-sin-detalles">Sin detalles adicionales registrados.</p>
        )}

      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const AuditoriaLista: React.FC = () => {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [logSeleccionado, setLogSeleccionado] = useState<LogAuditoria | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filtros
  const [filtroAccion, setFiltroAccion] = useState<string>("");
  const [filtroColeccion, setFiltroColeccion] = useState<string>("");
  const [filtroOperador, setFiltroOperador] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // ── Carga ─────────────────────────────────────────────────────────────────

  const cargar = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "auditoria"), orderBy("fecha", "desc"))
      );

      const data: LogAuditoria[] = snap.docs.map(d => {
        const raw = d.data() as Record<string, any>;
        return {
          id:         d.id,
          fecha:      raw.fecha ?? null,
          accion:     (raw.accion ?? "").toLowerCase(),
          coleccion:  raw.coleccion ?? raw.entidad ?? "—",
          docId:      raw.docId ?? raw.entidadId ?? "—",
          docResumen: raw.docResumen ?? raw.docId ?? raw.entidadId ?? "—",
          operador: {
            uid:    raw.operador?.uid    ?? raw.realizadoPor  ?? "—",
            nombre: raw.operador?.nombre ?? raw.realizadoPorNombre ?? "Desconocido",
            rol:    raw.operador?.rol    ?? "—",
          },
          detalles: raw.detalles ?? null,
        };
      });

      setLogs(data);
    } catch (err) {
      console.error("Error al cargar auditoría:", err);
      mostrarToast("Error al cargar registros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────

  const parseFechaFiltro = (str: string): Date | null => {
    if (!str || str.length < 8) return null;
    // Acepta DD/MM/YYYY o YYYY-MM-DD
    const partes = str.includes("/") ? str.split("/") : str.split("-").reverse();
    const [d, m, y] = partes.map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  };

  const logsFiltrados = useMemo(() => {
    const desde = parseFechaFiltro(fechaDesde);
    const hasta = parseFechaFiltro(fechaHasta);
    if (hasta) hasta.setHours(23, 59, 59, 999);

    return logs.filter(log => {
      const fecha = log.fecha?.toDate?.() ?? null;

      if (filtroAccion    && log.accion !== filtroAccion)              return false;
      if (filtroColeccion && log.coleccion !== filtroColeccion)         return false;
      if (filtroOperador  &&
          !log.operador.nombre.toLowerCase().includes(filtroOperador.toLowerCase()))
        return false;
      if (desde && fecha && fecha < desde) return false;
      if (hasta && fecha && fecha > hasta) return false;

      return true;
    });
  }, [logs, filtroAccion, filtroColeccion, filtroOperador, fechaDesde, fechaHasta]);

  // Opciones únicas para los selects de filtro
  const accionesUnicas = useMemo(
    () => Array.from(new Set(logs.map(l => l.accion))).sort(),
    [logs]
  );
  const coleccionesUnicas = useMemo(
    () => Array.from(new Set(logs.map(l => l.coleccion))).sort(),
    [logs]
  );

  const limpiarFiltros = () => {
    setFiltroAccion("");
    setFiltroColeccion("");
    setFiltroOperador("");
    setFechaDesde("");
    setFechaHasta("");
  };

  const hayFiltros = filtroAccion || filtroColeccion || filtroOperador || fechaDesde || fechaHasta;

  // ── Eliminar ──────────────────────────────────────────────────────────────

  const eliminarLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, "auditoria", id));
      setLogs(prev => prev.filter(l => l.id !== id));
      if (logSeleccionado?.id === id) setLogSeleccionado(null);
      mostrarToast("Registro eliminado.");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al eliminar.");
    }
  };

  const eliminarFiltrados = async () => {
    if (logsFiltrados.length === 0) return;
    try {
      await Promise.all(logsFiltrados.map(l => deleteDoc(doc(db, "auditoria", l.id))));
      const idsEliminar = new Set(logsFiltrados.map(l => l.id));
      setLogs(prev => prev.filter(l => !idsEliminar.has(l.id)));
      mostrarToast(`${logsFiltrados.length} registros eliminados.`);
    } catch (err) {
      console.error(err);
      mostrarToast("Error al eliminar.");
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:     logs.length,
    crear:     logs.filter(l => l.accion === "crear").length,
    editar:    logs.filter(l => l.accion === "editar").length,
    eliminar:  logs.filter(l => l.accion === "eliminar").length,
    autorizar: logs.filter(l => l.accion === "autorizar").length,
  }), [logs]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="auditoria-page">
        <Header title="Panel de Auditoría" onBack={() => window.history.back()} />

        {/* Stats */}
        <div className="au-stats">
          <div className="au-stat">
            <span className="au-stat__num">{stats.total}</span>
            <span className="au-stat__label">Total</span>
          </div>
          <div className="au-stat au-stat--crear">
            <span className="au-stat__num">{stats.crear}</span>
            <span className="au-stat__label">Creaciones</span>
          </div>
          <div className="au-stat au-stat--editar">
            <span className="au-stat__num">{stats.editar}</span>
            <span className="au-stat__label">Ediciones</span>
          </div>
          <div className="au-stat au-stat--eliminar">
            <span className="au-stat__num">{stats.eliminar}</span>
            <span className="au-stat__label">Eliminaciones</span>
          </div>
          <div className="au-stat au-stat--autorizar">
            <span className="au-stat__num">{stats.autorizar}</span>
            <span className="au-stat__label">Autorizaciones</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="au-filtros">
          <div className="au-filtros__group">
            <label className="au-filtros__label">Acción</label>
            <select
              value={filtroAccion}
              onChange={e => setFiltroAccion(e.target.value)}
            >
              <option value="">Todas</option>
              {accionesUnicas.map(a => (
                <option key={a} value={a}>
                  {ACCION_CONFIG[a]?.label ?? a}
                </option>
              ))}
            </select>
          </div>

          <div className="au-filtros__group">
            <label className="au-filtros__label">Colección</label>
            <select
              value={filtroColeccion}
              onChange={e => setFiltroColeccion(e.target.value)}
            >
              <option value="">Todas</option>
              {coleccionesUnicas.map(c => (
                <option key={c} value={c} style={{ textTransform: "capitalize" }}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="au-filtros__group">
            <label className="au-filtros__label">Operador</label>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={filtroOperador}
              onChange={e => setFiltroOperador(e.target.value)}
            />
          </div>

          <div className="au-filtros__group">
            <label className="au-filtros__label">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
            />
          </div>

          <div className="au-filtros__group">
            <label className="au-filtros__label">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
            />
          </div>

          <div className="au-filtros__actions">
            {hayFiltros && (
              <button className="au-btn-limpiar" onClick={limpiarFiltros}>
                <X size={14} /> Limpiar
              </button>
            )}
            <button
              className="au-btn-eliminar-filtrados"
              onClick={eliminarFiltrados}
              disabled={logsFiltrados.length === 0}
              title={`Eliminar ${logsFiltrados.length} registro${logsFiltrados.length !== 1 ? "s" : ""} filtrados`}
            >
              <Trash2 size={14} />
              Eliminar filtrados ({logsFiltrados.length})
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && <div className="au-toast">{toast}</div>}

        {/* Tabla */}
        {loading ? (
          <div className="au-loading">
            <div className="au-spinner" />
            <span>Cargando registros...</span>
          </div>
        ) : logsFiltrados.length === 0 ? (
          <div className="au-empty">
            <ShieldAlert size={36} />
            <p>No hay registros{hayFiltros ? " para los filtros seleccionados" : ""}.</p>
          </div>
        ) : (
          <div className="au-tabla-wrap">
            <table className="au-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Operador</th>
                  <th>Rol</th>
                  <th>Acción</th>
                  <th>Colección</th>
                  <th>Documento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logsFiltrados.map(log => {
                  const accion = ACCION_CONFIG[log.accion] ?? { label: log.accion, clase: "" };
                  return (
                    <tr key={log.id} className="au-tabla__row">
                      <td className="au-tabla__fecha">
                        {log.fecha?.toDate
                          ? format(log.fecha.toDate(), "dd/MM/yy HH:mm")
                          : "—"}
                      </td>
                      <td className="au-tabla__operador">
                        {log.operador.nombre}
                      </td>
                      <td>
                        <span className={`au-rol-badge ${ROL_CONFIG[log.operador.rol] ?? ""}`}>
                          {log.operador.rol}
                        </span>
                      </td>
                      <td>
                        <span className={`au-accion-badge ${accion.clase}`}>
                          {accion.label}
                        </span>
                      </td>
                      <td className="au-tabla__coleccion">{log.coleccion}</td>
                      <td className="au-tabla__doc" title={log.docId}>
                        {log.docResumen !== "—" && log.docResumen !== log.docId
                          ? log.docResumen
                          : log.docId}
                      </td>
                      <td className="au-tabla__acciones">
                        <button
                          className="au-btn-icon au-btn-icon--ver"
                          onClick={() => setLogSeleccionado(log)}
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="au-btn-icon au-btn-icon--eliminar"
                          onClick={() => eliminarLog(log.id)}
                          title="Eliminar registro"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="au-tabla__contador">
              {logsFiltrados.length} registro{logsFiltrados.length !== 1 ? "s" : ""}
              {hayFiltros && ` de ${logs.length} totales`}
            </p>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {logSeleccionado && (
        <ModalDetalle
          log={logSeleccionado}
          onCerrar={() => setLogSeleccionado(null)}
        />
      )}
    </>
  );
};

export default AuditoriaLista;