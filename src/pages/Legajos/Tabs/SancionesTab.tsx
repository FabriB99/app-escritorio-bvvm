// src/pages/Legajos/tabs/SancionesTab.tsx
import React, { useEffect, useState, useRef } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../../app/firebase-config";
import { FaEdit, FaTrash, FaPlus, FaCheckCircle, FaFilePdf, FaUpload } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css";
import { useUser } from "../../../context/UserContext";
import { registrarAuditoria } from "../../../utils/auditoria";

interface Sancion {
  id: string;
  fecha: string; // ISO yyyy-mm-dd
  tipo: string;
  motivo: string;
  observaciones?: string;
  pdfUrl?: string;
}

const SancionesTab: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [sanciones, setSanciones] = useState<Sancion[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoSancion, setEditandoSancion] = useState<Sancion | null>(null);
  const [sancionSeleccionada, setSancionSeleccionada] = useState<Sancion | null>(null);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const { user, miembroActivo } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  // Cargar sanciones desde Firebase
  useEffect(() => {
    const fetchSanciones = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "legajos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSanciones((data?.sanciones as Sancion[]) || []);
        }
      } catch (error) {
        console.error("Error al obtener sanciones:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSanciones();
  }, [id]);

  // Guardar sanciones en Firebase
  const guardarEnFirebase = async (sancionesActualizadas: Sancion[]) => {
    if (!id) return;
    try {
      const docRef = doc(db, "legajos", id);
      await updateDoc(docRef, { sanciones: sancionesActualizadas });
      setSanciones(sancionesActualizadas);
    } catch (error) {
      console.error("Error al guardar sanciones:", error);
      alert("Error al guardar en Firebase.");
    }
  };

  // Abrir/cerrar formulario
  const abrirFormulario = (sancion?: Sancion) => {
    setEditandoSancion(sancion || null);
    setMostrarForm(true);
  };
  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditandoSancion(null);
  };

  // Guardar sanción (crear o editar)
  const guardarSancion = async (sancion: Sancion) => {
    const esEdicion = !!editandoSancion;
    const sancionesActualizadas = esEdicion
      ? sanciones.map((s) => (s.id === sancion.id ? sancion : s))
      : [...sanciones, { ...sancion, id: Date.now().toString() }];

    await guardarEnFirebase(sancionesActualizadas);

    // 🔥 Registrar en auditoría
    if (miembroActivo) {
      try {
        await registrarAuditoria({
          coleccion: "legajos",
          accion: esEdicion ? "editar" : "crear",
          tipoCambio: "sancion",
          docId: id!,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosNuevos: sancion,
          datosAnteriores: esEdicion ? sanciones.find((s) => s.id === sancion.id) || null : null,
        });
      } catch (err) {
        console.error("Error al registrar auditoría (sanción):", err);
      }
    }

    cerrarFormulario();
  };

  // Eliminar archivo PDF
  const eliminarArchivoPdf = async (sancion: Sancion) => {
    if (!id || !sancion.pdfUrl) return;
    try {
      const fileRef = ref(storage, `legajos/${id}/sanciones/${sancion.id}.pdf`);
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error al eliminar PDF:", error);
      alert("Error al eliminar archivo PDF.");
    }
  };

  // Eliminar sanción
  const eliminarSancion = async (idSancion: string) => {
    if (!window.confirm("¿Eliminar sanción?")) return;

    const sancionAEliminar = sanciones.find((s) => s.id === idSancion);
    if (sancionAEliminar?.pdfUrl) {
      await eliminarArchivoPdf(sancionAEliminar);
    }

    const sancionesActualizadas = sanciones.filter((s) => s.id !== idSancion);
    await guardarEnFirebase(sancionesActualizadas);

    // 🔥 Registrar en auditoría
    if (miembroActivo && sancionAEliminar) {
      try {
        await registrarAuditoria({
          coleccion: "legajos",
          accion: "eliminar",
          tipoCambio: "sancion",
          docId: id!,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosAnteriores: sancionAEliminar,
        });
      } catch (err) {
        console.error("Error al registrar auditoría (eliminar sanción):", err);
      }
    }

    if (sancionSeleccionada?.id === idSancion) setSancionSeleccionada(null);
  };

  // Selección de sanción
  const seleccionarSancion = (sancion: Sancion) => {
    setSancionSeleccionada(sancion);
  };

  // Formatear fecha
  const formatearFecha = (fechaISO: string) => {
    if (!fechaISO) return "—";
    const [a, m, d] = fechaISO.split("-");
    return `${d}-${m}-${a}`;
  };

  // Subida de archivo
  const manejarClickSubirArchivo = () => {
    if (!sancionSeleccionada) {
      alert("Selecciona una sanción para subir archivo.");
      return;
    }
    inputFileRef.current?.click();
  };

  const manejarArchivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !id || !sancionSeleccionada) return;
    const archivo = e.target.files[0];
    if (archivo.type !== "application/pdf") {
      alert("Solo se permiten archivos PDF.");
      return;
    }

    try {
      const storageRef = ref(storage, `legajos/${id}/sanciones/${sancionSeleccionada.id}.pdf`);
      await uploadBytes(storageRef, archivo);
      const url = await getDownloadURL(storageRef);

      const sancionesActualizadas = sanciones.map((s) =>
        s.id === sancionSeleccionada.id ? { ...s, pdfUrl: url } : s
      );
      await guardarEnFirebase(sancionesActualizadas);

      // 🔥 Auditoría PDF
      if (user) {
        try {
          await registrarAuditoria({
            coleccion: "legajos",
            accion: "editar",
            tipoCambio: "sancion_pdf",
            docId: id!,
            miembro: { uid: user.uid, rol: user.rol },
            datosNuevos: { sancionId: sancionSeleccionada.id, pdfUrl: url },
            datosAnteriores: null,
          });
        } catch (err) {
          console.error("Error al registrar auditoría (subida pdf):", err);
        }
      }

      alert("Archivo subido correctamente.");
    } catch (error) {
      console.error("Error al subir archivo:", error);
      alert("Error al subir archivo.");
    } finally {
      if (inputFileRef.current) inputFileRef.current.value = "";
    }
  };

  if (loading) return <p>Cargando sanciones...</p>;

  return (
    <div className="tab-container">
      <table className="tabla-general">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Motivo</th>
            <th>Observaciones</th>
            <th>Archivo</th>
          </tr>
        </thead>
        <tbody>
          {sanciones.length ? (
            [...sanciones].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((s) => (
              <tr
                key={s.id}
                className={sancionSeleccionada?.id === s.id ? "fila-seleccionada" : ""}
                onClick={() => seleccionarSancion(s)}
                style={{ cursor: "pointer" }}
                title="Click para seleccionar"
              >
                <td>{formatearFecha(s.fecha)}</td>
                <td>{s.tipo}</td>
                <td>{s.motivo}</td>
                <td>{s.observaciones || "—"}</td>
                <td>
                  {s.pdfUrl ? (
                    <a href={s.pdfUrl} target="_blank" rel="noopener noreferrer" title="Ver PDF">
                      <FaCheckCircle className="icono-verde" /> <FaFilePdf className="icono-pdf" />
                    </a>
                  ) : (
                    <span className="sin-archivo">Sin archivo</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ textAlign: "center" }}>
                No hay sanciones cargadas.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {puedeEditar && (
        <div className="btn-acciones">
          <button className="btn-accion" onClick={() => abrirFormulario()} title="Agregar sanción">
            <FaPlus />
          </button>

          <button
            className="btn-accion"
            onClick={() => {
              if (!sancionSeleccionada) return alert("Seleccioná una sanción para editar.");
              abrirFormulario(sancionSeleccionada);
            }}
            disabled={!sancionSeleccionada}
            title="Editar sanción seleccionada"
          >
            <FaEdit />
          </button>

          <button
            className="btn-accion btn-eliminar"
            onClick={() => {
              if (!sancionSeleccionada) return alert("Seleccioná una sanción para eliminar.");
              eliminarSancion(sancionSeleccionada.id);
            }}
            disabled={!sancionSeleccionada}
            title="Eliminar sanción seleccionada"
          >
            <FaTrash />
          </button>

          <button
            className="btn-accion"
            onClick={manejarClickSubirArchivo}
            disabled={!sancionSeleccionada}
            title="Subir archivo PDF"
          >
            <FaUpload />
          </button>

          <input type="file" accept="application/pdf" style={{ display: "none" }} ref={inputFileRef} onChange={manejarArchivoChange} />
        </div>
      )}

      {mostrarForm && (
        <SancionForm sancion={editandoSancion} onClose={cerrarFormulario} onGuardar={guardarSancion} />
      )}
    </div>
  );
};

interface SancionFormProps {
  sancion: Sancion | null;
  onClose: () => void;
  onGuardar: (sancion: Sancion) => void;
}

const SancionForm: React.FC<SancionFormProps> = ({ sancion, onClose, onGuardar }) => {
  const [fecha, setFecha] = useState(sancion?.fecha || "");
  const [tipo, setTipo] = useState(sancion?.tipo || "");
  const [motivo, setMotivo] = useState(sancion?.motivo || "");
  const [observaciones, setObservaciones] = useState(sancion?.observaciones || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !tipo || !motivo) {
      alert("Fecha, tipo y motivo son obligatorios");
      return;
    }

    onGuardar({
      id: sancion?.id || Date.now().toString(),
      fecha,
      tipo,
      motivo,
      observaciones,
      pdfUrl: sancion?.pdfUrl || "",
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{sancion ? "Editar sanción" : "Agregar sanción"}</h3>
        <form onSubmit={handleSubmit} className="form-general">
          <label>
            Fecha:
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label>
            Tipo:
            <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} required autoFocus />
          </label>
          <label>
            Motivo:
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </label>
          <label>
            Observaciones:
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
          <div className="modal-buttons">
            <button type="submit">{sancion ? "Guardar" : "Agregar"}</button>
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SancionesTab;
