// src/pages/Legajos/tabs/ObservacionesTab.tsx
import React, { useEffect, useState } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../app/firebase-config";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css";
import { useUser } from "../../../context/UserContext";
import { registrarAuditoria } from '../../../utils/auditoria';

interface Observacion {
  id: string;
  fecha: string;
  motivo: string;
  observacion: string;
}

const ObservacionesTab: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoObservacion, setEditandoObservacion] = useState<Observacion | null>(null);
  const [observacionSeleccionada, setObservacionSeleccionada] = useState<Observacion | null>(null);
  const { user, miembroActivo } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    const fetchObservaciones = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "legajos", id));
        if (snap.exists()) {
          setObservaciones((snap.data()?.observaciones as Observacion[]) || []);
        }
      } catch (err) {
        console.error("Error al obtener observaciones:", err);
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
    setEditandoObservacion(obs || null);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditandoObservacion(null);
  };

  const guardarObservacion = async (obs: Observacion) => {
    const esEdicion = !!editandoObservacion;
    const actualizadas = esEdicion
      ? observaciones.map((o) => (o.id === obs.id ? obs : o))
      : [...observaciones, { ...obs, id: Date.now().toString() }];

    await guardarEnFirebase(actualizadas);

    if (miembroActivo) {
      try {
        await registrarAuditoria({
          coleccion: "legajos",
          accion: esEdicion ? "editar" : "crear",
          tipoCambio: "observacion",
          docId: id!,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosNuevos: obs,
          datosAnteriores: esEdicion
            ? observaciones.find((o) => o.id === obs.id) || null
            : null,
        });
      } catch (err) {
        console.error("Error al registrar auditoría (observación):", err);
      }
    }

    cerrarFormulario();
  };

  const eliminarObservacion = async (idObs: string) => {
    if (!window.confirm("¿Eliminar observación?")) return;

    const obsAEliminar = observaciones.find((o) => o.id === idObs);
    const nuevas = observaciones.filter((o) => o.id !== idObs);

    await guardarEnFirebase(nuevas);

    if (miembroActivo && obsAEliminar) {
      try {
        await registrarAuditoria({
          coleccion: "legajos",
          accion: "eliminar",
          tipoCambio: "observacion",
          docId: id!,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosAnteriores: obsAEliminar,
        });
      } catch (err) {
        console.error("Error al registrar auditoría (eliminar observación):", err);
      }
    }

    if (observacionSeleccionada?.id === idObs) setObservacionSeleccionada(null);
  };

  const formatearFecha = (fechaISO: string): string => {
    if (!fechaISO) return "—";
    const [a, m, d] = fechaISO.split("-");
    return `${d}-${m}-${a}`;
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
            [...observaciones]
              .sort((a, b) => a.fecha.localeCompare(b.fecha))
              .map((o) => (
                <tr
                  key={o.id}
                  className={observacionSeleccionada?.id === o.id ? "fila-seleccionada" : ""}
                  onClick={() => setObservacionSeleccionada(o)}
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
              if (!observacionSeleccionada) return alert("Seleccioná una observación para editar.");
              abrirFormulario(observacionSeleccionada);
            }}
            disabled={!observacionSeleccionada}
            title="Editar observación seleccionada"
            aria-label="Editar observación"
          >
            <FaEdit />
          </button>

          <button
            className="btn-accion btn-eliminar"
            onClick={() => {
              if (!observacionSeleccionada) return alert("Seleccioná una observación para eliminar.");
              eliminarObservacion(observacionSeleccionada.id);
            }}
            disabled={!observacionSeleccionada}
            title="Eliminar observación seleccionada"
            aria-label="Eliminar observación"
          >
            <FaTrash />
          </button>
        </div>
      )}

      {mostrarForm && (
        <ObservacionForm
          observacion={editandoObservacion}
          onClose={cerrarFormulario}
          onGuardar={guardarObservacion}
        />
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
