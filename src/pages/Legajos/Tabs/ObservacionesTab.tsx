import React, { useEffect, useState } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../app/firebase-config";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css";
import { useUser } from "../../../context/UserContext";
import { registrarCambioLegajo } from "../../../utils/registrarCambioLegajo";

interface Observacion {
  id: string;
  fecha: string;
  motivo: string;
  observacion: string;
}

const ObservacionesTab: React.FC = () => {
  const { id } = useParams();
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Observacion | null>(null);
  const [seleccionada, setSeleccionada] = useState<Observacion | null>(null);
  const { user } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    const fetchObservaciones = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "legajos", id));
        if (snap.exists()) {
          setObservaciones(snap.data().observaciones || []);
        }
      } catch (error) {
        console.error("Error al obtener observaciones:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchObservaciones();
  }, [id]);

  const guardarEnFirebase = async (nuevas: Observacion[]) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "legajos", id), { observaciones: nuevas });
      setObservaciones(nuevas);
    } catch (err) {
      console.error("Error al guardar observaciones:", err);
      alert("Error al guardar en Firebase.");
    }
  };

  const abrirFormulario = (obs?: Observacion) => {
    setEditando(obs || null);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditando(null);
  };

  const guardar = async (obs: Observacion) => {
    const esEdicion = !!editando;
    const actualizadas = esEdicion
      ? observaciones.map((o) => (o.id === obs.id ? obs : o))
      : [...observaciones, { ...obs, id: Date.now().toString() }];

    await guardarEnFirebase(actualizadas);

    if (user) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: esEdicion ? "modificado" : "agregado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "observacion",
        datosPrevios: esEdicion ? observaciones.find((o) => o.id === obs.id) : null,
        datosNuevos: obs,
      });
    }

    cerrarFormulario();
  };


  const formatearFecha = (fechaISO: string): string => {
    if (!fechaISO) return "—";
    const [a, m, d] = fechaISO.split("-");
    return `${d}-${m}-${a}`;
  };

  const eliminar = async (idObs: string) => {
    if (!window.confirm("¿Eliminar observación?")) return;

    const obsAEliminar = observaciones.find((o) => o.id === idObs);
    const nuevas = observaciones.filter((o) => o.id !== idObs);

    await guardarEnFirebase(nuevas);

    if (user && obsAEliminar) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: "eliminado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "observacion",
        datosPrevios: obsAEliminar,
      });
    }

    if (seleccionada?.id === idObs) setSeleccionada(null);
  };


  if (loading) return <p>Cargando observaciones...</p>;

  return (
    <div className="tab-container">
      <table className="tabla-general">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Motivo</th>
            <th>Observación</th>
          </tr>
        </thead>
        <tbody>
          {observaciones.length ? (
            [...observaciones].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((o) => (

              <tr
                key={o.id}
                className={seleccionada?.id === o.id ? "fila-seleccionada" : ""}
                onClick={() => setSeleccionada(o)}
                style={{ cursor: "pointer" }}
                title="Click para seleccionar"
              >
                <td>{formatearFecha(o.fecha)}</td>
                <td>{o.motivo}</td>
                <td>{o.observacion}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} style={{ textAlign: "center" }}>
                No hay observaciones cargadas.
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
          title="Agregar observación"
          aria-label="Agregar observación"
        >
          <FaPlus />
        </button>

        <button
          className="btn-accion"
          onClick={() => {
            if (!seleccionada) return alert("Seleccioná una observación para editar.");
            abrirFormulario(seleccionada);
          }}
          disabled={!seleccionada}
          title="Editar observación seleccionada"
          aria-label="Editar observación"
        >
          <FaEdit />
        </button>

        <button
          className="btn-accion btn-eliminar"
          onClick={() => {
            if (!seleccionada) return alert("Seleccioná una observación para eliminar.");
            eliminar(seleccionada.id);
          }}
          disabled={!seleccionada}
          title="Eliminar observación seleccionada"
          aria-label="Eliminar observación"
        >
          <FaTrash />
        </button>
      </div>
    )}
      {mostrarForm && (
        <ObservacionForm observacion={editando} onClose={cerrarFormulario} onGuardar={guardar} />
      )}
    </div>
  );
};

interface ObservacionFormProps {
  observacion: Observacion | null;
  onClose: () => void;
  onGuardar: (obs: Observacion) => void;
}

const ObservacionForm: React.FC<ObservacionFormProps> = ({ observacion, onClose, onGuardar }) => {
  const [fecha, setFecha] = useState(observacion?.fecha || "");
  const [motivo, setMotivo] = useState(observacion?.motivo || "");
  const [texto, setTexto] = useState(observacion?.observacion || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !motivo || !texto) {
      alert("Todos los campos son obligatorios.");
      return;
    }
    onGuardar({
      id: observacion?.id || Date.now().toString(),
      fecha,
      motivo,
      observacion: texto,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{observacion ? "Editar observación" : "Agregar observación"}</h3>
        <form onSubmit={handleSubmit} className="form-general">
          <label>
            Fecha:
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label>
            Motivo:
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} required autoFocus />
          </label>
          <label>
            Observación:
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} required />
          </label>
          <div className="modal-buttons">
            <button type="submit">{observacion ? "Guardar" : "Agregar"}</button>
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ObservacionesTab;
