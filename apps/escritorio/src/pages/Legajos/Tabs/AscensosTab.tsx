// src/pages/Legajos/tabs/AscensosTab.tsx
import React, { useEffect, useState, useRef } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../../app/firebase-config";
import { FaEdit, FaTrash, FaPlus, FaCheckCircle, FaFilePdf, FaUpload } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css";
import { useUser } from "../../../context/UserContext";
import { registrarAuditoria } from "../../../utils/auditoria";

interface Ascenso {
  id: string;
  fecha: string; // ISO yyyy-mm-dd
  grado: string;
  resolucion: string;
  observaciones?: string;
  pdfUrl?: string;
}

const AscensosTab: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ascensos, setAscensos] = useState<Ascenso[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoAscenso, setEditandoAscenso] = useState<Ascenso | null>(null);
  const [ascensoSeleccionado, setAscensoSeleccionado] = useState<Ascenso | null>(null);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const { user, miembroActivo } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    const fetchAscensos = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "legajos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAscensos((data?.ascensos as Ascenso[]) || []);
        }
      } catch (error) {
        console.error("Error al obtener ascensos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAscensos();
  }, [id]);

  const guardarEnFirebase = async (ascensosActualizados: Ascenso[]) => {
    if (!id) return;
    try {
      const docRef = doc(db, "legajos", id);
      await updateDoc(docRef, { ascensos: ascensosActualizados });
      setAscensos(ascensosActualizados);
    } catch (error) {
      console.error("Error al guardar ascensos:", error);
      alert("Error al guardar en Firebase.");
    }
  };

  const abrirFormulario = (ascenso?: Ascenso) => {
    setEditandoAscenso(ascenso || null);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditandoAscenso(null);
  };

  const guardarAscenso = async (ascenso: Ascenso) => {
    const esEdicion = !!editandoAscenso;
    const nuevosAscensos = esEdicion
      ? ascensos.map((a) => (a.id === ascenso.id ? ascenso : a))
      : [...ascensos, { ...ascenso, id: Date.now().toString() }];

    await guardarEnFirebase(nuevosAscensos);

    // 🔥 Registrar en auditoría (unificado)
    if (miembroActivo) {
      try {
        await registrarAuditoria({
          coleccion: "legajos",
          accion: esEdicion ? "editar" : "crear",
          tipoCambio: "ascenso",
          docId: id!,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosNuevos: ascenso,
          datosAnteriores: esEdicion ? ascensos.find((a) => a.id === ascenso.id) || null : null,
        });
      } catch (err) {
        console.error("Error al registrar auditoría (ascenso):", err);
        // No interrumpimos al usuario por un fallo de auditoría
      }
    }

    cerrarFormulario();
  };

  const eliminarArchivoPdf = async (ascenso: Ascenso) => {
    if (!id || !ascenso.pdfUrl) return;
    try {
      const storagePath = `legajos/${id}/ascensos/${ascenso.id}.pdf`;
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error al eliminar archivo PDF:", error);
      alert("Error al eliminar archivo PDF.");
    }
  };

  const eliminarAscenso = async (idAscenso: string) => {
    if (!window.confirm("¿Eliminar ascenso?")) return;
    const ascensoAEliminar = ascensos.find((a) => a.id === idAscenso);
    if (ascensoAEliminar?.pdfUrl) {
      await eliminarArchivoPdf(ascensoAEliminar);
    }
    const nuevos = ascensos.filter((a) => a.id !== idAscenso);
    await guardarEnFirebase(nuevos);

    // 🔥 Registrar en auditoría (unificado)
    if (miembroActivo && ascensoAEliminar) {
      try {
        await registrarAuditoria({
          coleccion: "legajos",
          accion: "eliminar",
          tipoCambio: "ascenso",
          docId: id!,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosAnteriores: ascensoAEliminar,
        });
      } catch (err) {
        console.error("Error al registrar auditoría (eliminar ascenso):", err);
      }
    }

    if (ascensoSeleccionado?.id === idAscenso) setAscensoSeleccionado(null);
  };

  const seleccionarAscenso = (ascenso: Ascenso) => {
    setAscensoSeleccionado(ascenso);
  };

  const manejarClickSubirArchivo = () => {
    if (!ascensoSeleccionado) {
      alert("Selecciona un ascenso para subir archivo.");
      return;
    }
    inputFileRef.current?.click();
  };

  const formatearFecha = (fechaISO: string): string => {
    if (!fechaISO) return "—";
    const [a, m, d] = fechaISO.split("-");
    return `${d}-${m}-${a}`;
  };

  const manejarArchivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !id || !ascensoSeleccionado) return;
    const archivo = e.target.files[0];
    if (archivo.type !== "application/pdf") {
      alert("Solo se permiten archivos PDF.");
      return;
    }
    try {
      const storageRef = ref(storage, `legajos/${id}/ascensos/${ascensoSeleccionado.id}.pdf`);
      await uploadBytes(storageRef, archivo);
      const url = await getDownloadURL(storageRef);

      const ascensosActualizados = ascensos.map((a) =>
        a.id === ascensoSeleccionado.id ? { ...a, pdfUrl: url } : a
      );
      await guardarEnFirebase(ascensosActualizados);

      // opción: registrar en auditoría que se subió un PDF (tipoCambio distinto o mismo)
      if (user) {
        try {
          await registrarAuditoria({
            coleccion: "legajos",
            accion: "editar",
            tipoCambio: "ascenso_pdf",
            docId: id!,
            miembro: { uid: user.uid, rol: user.rol },
            datosNuevos: { ascensoId: ascensoSeleccionado.id, pdfUrl: url },
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

  if (loading) return <p>Cargando ascensos...</p>;

  return (
    <div className="tab-container">
      <table className="tabla-general">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Grado</th>
            <th>Resolución N°</th>
            <th>Observaciones</th>
            <th>Archivo</th>
          </tr>
        </thead>
        <tbody>
          {ascensos.length ? (
            [...ascensos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((a) => (
              <tr
                key={a.id}
                className={ascensoSeleccionado?.id === a.id ? "fila-seleccionada" : ""}
                onClick={() => seleccionarAscenso(a)}
                title="Click para seleccionar"
                style={{ cursor: "pointer" }}
              >
                <td>{formatearFecha(a.fecha)}</td>
                <td>{a.grado}</td>
                <td>{a.resolucion}</td>
                <td>{a.observaciones || "—"}</td>
                <td>
                  {a.pdfUrl ? (
                    <a href={a.pdfUrl} target="_blank" rel="noopener noreferrer" title="Ver PDF">
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
                No hay ascensos cargados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {puedeEditar && (
        <div className="btn-acciones">
          <button className="btn-accion" onClick={() => abrirFormulario()} title="Agregar ascenso" aria-label="Agregar ascenso">
            <FaPlus />
          </button>

          <button
            className="btn-accion"
            onClick={() => {
              if (!ascensoSeleccionado) return alert("Seleccioná un ascenso para editar.");
              abrirFormulario(ascensoSeleccionado);
            }}
            disabled={!ascensoSeleccionado}
            title="Editar ascenso seleccionado"
            aria-label="Editar ascenso seleccionado"
          >
            <FaEdit />
          </button>

          <button
            className="btn-accion btn-eliminar"
            onClick={() => {
              if (!ascensoSeleccionado) return alert("Seleccioná un ascenso para eliminar.");
              eliminarAscenso(ascensoSeleccionado.id);
            }}
            disabled={!ascensoSeleccionado}
            title="Eliminar ascenso seleccionado"
            aria-label="Eliminar ascenso seleccionado"
          >
            <FaTrash />
          </button>

          <button className="btn-accion" onClick={manejarClickSubirArchivo} disabled={!ascensoSeleccionado} title="Subir archivo PDF" aria-label="Subir archivo PDF">
            <FaUpload />
          </button>

          <input type="file" accept="application/pdf" style={{ display: "none" }} ref={inputFileRef} onChange={manejarArchivoChange} />
        </div>
      )}

      {mostrarForm && <AscensoForm ascenso={editandoAscenso} onClose={cerrarFormulario} onGuardar={guardarAscenso} />}
    </div>
  );
};

interface AscensoFormProps {
  ascenso: Ascenso | null;
  onClose: () => void;
  onGuardar: (ascenso: Ascenso) => void;
}

const AscensoForm: React.FC<AscensoFormProps> = ({ ascenso, onClose, onGuardar }) => {
  const [fecha, setFecha] = useState(ascenso?.fecha || "");
  const [grado, setGrado] = useState(ascenso?.grado || "");
  const [resolucion, setResolucion] = useState(ascenso?.resolucion || "");
  const [observaciones, setObservaciones] = useState(ascenso?.observaciones || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !grado || !resolucion) {
      alert("Fecha, grado y resolución son obligatorios");
      return;
    }

    onGuardar({
      id: ascenso?.id || Date.now().toString(),
      fecha,
      grado,
      resolucion,
      observaciones,
      pdfUrl: ascenso?.pdfUrl || "",
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{ascenso ? "Editar ascenso" : "Agregar ascenso"}</h3>
        <form onSubmit={handleSubmit} className="form-general">
          <label>
            Fecha:
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label>
            Grado:
            <input type="text" value={grado} onChange={(e) => setGrado(e.target.value)} required />
          </label>
          <label>
            Resolución N°:
            <input type="text" value={resolucion} onChange={(e) => setResolucion(e.target.value)} required />
          </label>
          <label>
            Observaciones:
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
          <div className="modal-buttons">
            <button type="submit">{ascenso ? "Guardar" : "Agregar"}</button>
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AscensosTab;
