import React, { useEffect, useState, useRef } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../app/firebase-config";
import { FaEdit, FaTrash, FaPlus, FaCheckCircle, FaFilePdf, FaUpload } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css"; // CSS general para todos los tabs
import { useUser } from "../../../context/UserContext";
import { registrarCambioLegajo } from "../../../utils/registrarCambioLegajo";

interface Sancion {
  id: string;
  fecha: string;
  tipo: string;
  motivo: string;
  observaciones?: string;
  pdfUrl?: string;
}

const SancionesTab: React.FC = () => {
  const { id } = useParams();
  const [sanciones, setSanciones] = useState<Sancion[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoSancion, setEditandoSancion] = useState<Sancion | null>(null);
  const [sancionSeleccionada, setSancionSeleccionada] = useState<Sancion | null>(null);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const { user } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    const fetchSanciones = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "legajos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSanciones(data.sanciones || []);
        }
      } catch (error) {
        console.error("Error al obtener sanciones:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSanciones();
  }, [id]);

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

  const abrirFormulario = (sancion?: Sancion) => {
    setEditandoSancion(sancion || null);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditandoSancion(null);
  };

  const guardarSancion = async (sancion: Sancion) => {
    const esEdicion = !!editandoSancion;
    const nuevos = esEdicion
      ? sanciones.map((s) => (s.id === sancion.id ? sancion : s))
      : [...sanciones, { ...sancion, id: Date.now().toString() }];

    await guardarEnFirebase(nuevos);

    if (user) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: esEdicion ? "modificado" : "agregado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "sancion",
        datosPrevios: esEdicion ? sanciones.find((s) => s.id === sancion.id) : null,
        datosNuevos: sancion,
      });
    }

    cerrarFormulario();
  };


  const eliminarSancion = async (idSancion: string) => {
    if (!window.confirm("¿Eliminar sanción?")) return;

    const sancionAEliminar = sanciones.find((s) => s.id === idSancion);
    const nuevos = sanciones.filter((s) => s.id !== idSancion);

    await guardarEnFirebase(nuevos);

    if (user && sancionAEliminar) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: "eliminado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "sancion",
        datosPrevios: sancionAEliminar,
      });
    }

    if (sancionSeleccionada?.id === idSancion) setSancionSeleccionada(null);
  };


  const seleccionarSancion = (sancion: Sancion) => {
    setSancionSeleccionada(sancion);
  };

  const formatearFecha = (fechaISO: string): string => {
    if (!fechaISO) return "—";
    const [a, m, d] = fechaISO.split("-");
    return `${d}-${m}-${a}`;
  };

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

      const actualizados = sanciones.map((s) =>
        s.id === sancionSeleccionada.id ? { ...s, pdfUrl: url } : s
      );
      await guardarEnFirebase(actualizados);

      if (user) {
        await registrarCambioLegajo({
          legajoId: id!,
          accion: "modificado",
          usuarioId: user.uid,
          usuarioRol: user.rol,
          tipoCambio: "sancion",
          datosPrevios: sancionSeleccionada,
          datosNuevos: { ...sancionSeleccionada, pdfUrl: url },
        });
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
        <button
          className="btn-accion"
          onClick={() => abrirFormulario()}
          title="Agregar sanción"
          aria-label="Agregar sanción"
        >
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
          aria-label="Editar sanción seleccionada"
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
          aria-label="Eliminar sanción seleccionada"
        >
          <FaTrash />
        </button>

        <button
          className="btn-accion"
          onClick={manejarClickSubirArchivo}
          disabled={!sancionSeleccionada}
          title="Subir archivo PDF para sanción seleccionada"
          aria-label="Subir archivo PDF"
        >
          <FaUpload />
        </button>

        <input
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          ref={inputFileRef}
          onChange={manejarArchivoChange}
        />
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
