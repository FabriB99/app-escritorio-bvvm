import React, { useEffect, useState, useRef } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../app/firebase-config";
import {
  FaEdit, FaTrash, FaPlus, FaCheckCircle, FaFilePdf, FaUpload
} from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css"; // Usamos el CSS general que ya tenés
import { useUser } from "../../../context/UserContext";
import { registrarCambioLegajo } from "../../../utils/registrarCambioLegajo";

interface Condecoracion {
  id: string;
  fecha: string;
  tipo: string;
  motivo: string;
  observaciones?: string;
  pdfUrl?: string;
}

const CondecoracionesTab: React.FC = () => {
  const { id } = useParams();
  const [condecoraciones, setCondecoraciones] = useState<Condecoracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Condecoracion | null>(null);
  const [seleccionado, setSeleccionado] = useState<Condecoracion | null>(null);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const { user } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "legajos", id));
        if (snap.exists()) {
          setCondecoraciones(snap.data().condecoraciones || []);
        }
      } catch (error) {
        console.error("Error al obtener condecoraciones:", error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const guardarEnFirebase = async (datos: Condecoracion[]) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "legajos", id), { condecoraciones: datos });
      setCondecoraciones(datos);
    } catch (err) {
      console.error("Error al guardar:", err);
      alert("Error al guardar en Firebase.");
    }
  };

  const abrirFormulario = (item?: Condecoracion) => {
    setEditando(item || null);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditando(null);
  };

  const guardar = async (item: Condecoracion) => {
    const esEdicion = !!editando;
    const nuevos = esEdicion
      ? condecoraciones.map((c) => (c.id === item.id ? item : c))
      : [...condecoraciones, { ...item, id: Date.now().toString() }];

    await guardarEnFirebase(nuevos);

    if (user) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: esEdicion ? "modificado" : "agregado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "condecoracion",
        datosPrevios: esEdicion ? condecoraciones.find((c) => c.id === item.id) : null,
        datosNuevos: item,
      });
    }

    cerrarFormulario();
  };


  const eliminar = async (idItem: string) => {
    if (!window.confirm("¿Eliminar condecoración?")) return;
    const condecoracionAEliminar = condecoraciones.find((c) => c.id === idItem);
    const nuevos = condecoraciones.filter((c) => c.id !== idItem);

    await guardarEnFirebase(nuevos);

    if (user && condecoracionAEliminar) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: "eliminado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "condecoracion",
        datosPrevios: condecoracionAEliminar,
      });
    }

    if (seleccionado?.id === idItem) setSeleccionado(null);
  };


  const formatearFecha = (fechaISO: string): string => {
    if (!fechaISO) return "—";
    const [a, m, d] = fechaISO.split("-");
    return `${d}-${m}-${a}`;
  };

  const subirPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !id || !seleccionado) return;
    const archivo = e.target.files[0];
    if (archivo.type !== "application/pdf") {
      alert("Solo se permiten archivos PDF.");
      return;
    }
    try {
      const pdfRef = ref(storage, `legajos/${id}/condecoraciones/${seleccionado.id}.pdf`);
      await uploadBytes(pdfRef, archivo);
      const url = await getDownloadURL(pdfRef);

      const actualizados = condecoraciones.map((c) =>
        c.id === seleccionado.id ? { ...c, pdfUrl: url } : c
      );
      await guardarEnFirebase(actualizados);

      if (user) {
        await registrarCambioLegajo({
          legajoId: id!,
          accion: "modificado",
          usuarioId: user.uid,
          usuarioRol: user.rol,
          tipoCambio: "condecoracion",
          datosPrevios: seleccionado,
          datosNuevos: { ...seleccionado, pdfUrl: url },
        });
      }

      alert("Archivo subido correctamente.");
    } catch (err) {
      console.error("Error al subir PDF:", err);
      alert("Error al subir archivo.");
    } finally {
      if (inputFileRef.current) inputFileRef.current.value = "";
    }
  };


  if (loading) return <p>Cargando condecoraciones...</p>;

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
          {condecoraciones.length ? (
            [...condecoraciones].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((c) => (

              <tr
                key={c.id}
                className={seleccionado?.id === c.id ? "fila-seleccionada" : ""}
                onClick={() => setSeleccionado(c)}
                style={{ cursor: "pointer" }}
                title="Click para seleccionar"
              >
                <td>{formatearFecha(c.fecha)}</td>
                <td>{c.tipo}</td>
                <td>{c.motivo}</td>
                <td>{c.observaciones || "—"}</td>
                <td>
                  {c.pdfUrl ? (
                    <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" title="Ver PDF">
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
                No hay condecoraciones cargadas.
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
          title="Agregar condecoración"
          aria-label="Agregar condecoración"
        >
          <FaPlus />
        </button>

        <button
          className="btn-accion"
          onClick={() => {
            if (!seleccionado) return alert("Seleccioná una condecoración para editar.");
            abrirFormulario(seleccionado);
          }}
          disabled={!seleccionado}
          title="Editar condecoración seleccionada"
          aria-label="Editar condecoración seleccionada"
        >
          <FaEdit />
        </button>

        <button
          className="btn-accion btn-eliminar"
          onClick={() => {
            if (!seleccionado) return alert("Seleccioná una condecoración para eliminar.");
            eliminar(seleccionado.id);
          }}
          disabled={!seleccionado}
          title="Eliminar condecoración seleccionada"
          aria-label="Eliminar condecoración seleccionada"
        >
          <FaTrash />
        </button>

        <button
          className="btn-accion"
          onClick={() => inputFileRef.current?.click()}
          disabled={!seleccionado}
          title="Subir archivo PDF para condecoración seleccionada"
          aria-label="Subir archivo PDF"
        >
          <FaUpload />
        </button>

        <input
          type="file"
          ref={inputFileRef}
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={subirPDF}
        />
      </div>
    )}
      {mostrarForm && (
        <CondecoracionForm
          condecoracion={editando}
          onClose={cerrarFormulario}
          onGuardar={guardar}
        />
      )}
    </div>
  );
};

interface CondecoracionFormProps {
  condecoracion: Condecoracion | null;
  onClose: () => void;
  onGuardar: (c: Condecoracion) => void;
}

const CondecoracionForm: React.FC<CondecoracionFormProps> = ({ condecoracion, onClose, onGuardar }) => {
  const [fecha, setFecha] = useState(condecoracion?.fecha || "");
  const [tipo, setTipo] = useState(condecoracion?.tipo || "");
  const [motivo, setMotivo] = useState(condecoracion?.motivo || "");
  const [observaciones, setObservaciones] = useState(condecoracion?.observaciones || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !tipo || !motivo) {
      alert("Fecha, tipo y motivo son obligatorios.");
      return;
    }
    onGuardar({
      id: condecoracion?.id || Date.now().toString(),
      fecha,
      tipo,
      motivo,
      observaciones,
      pdfUrl: condecoracion?.pdfUrl || "",
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{condecoracion ? "Editar" : "Agregar"} Condecoración</h3>
        <form onSubmit={handleSubmit} className="form-general">
          <label>
            Fecha:
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label>
            Tipo:
            <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} required />
          </label>
          <label>
            Motivo:
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </label>
          <label>
            Observaciones:
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
          <div className="modal-buttons">
            <button type="submit">Guardar</button>
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CondecoracionesTab;
