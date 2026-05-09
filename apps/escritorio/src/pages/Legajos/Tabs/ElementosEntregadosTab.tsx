import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../app/firebase-config";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css";
import { useUser } from "../../../context/UserContext";
import { registrarAuditoria } from '../../../utils/auditoria';

interface ElementoEntregado {
  id: string;
  fecha: string;
  elemento: string;
  observaciones?: string;
}

const ElementosEntregadosTab: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [elementos, setElementos] = useState<ElementoEntregado[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoElemento, setEditandoElemento] = useState<ElementoEntregado | null>(null);
  const [elementoSeleccionado, setElementoSeleccionado] = useState<ElementoEntregado | null>(null);
  const { user, miembroActivo } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "legajos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setElementos((data?.elementosEntregados as ElementoEntregado[]) || []);
        }
      } catch (error) {
        console.error("Error al obtener elementos entregados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const guardarEnFirebase = async (nuevos: ElementoEntregado[]) => {
    if (!id) return;
    try {
      const docRef = doc(db, "legajos", id);
      await updateDoc(docRef, { elementosEntregados: nuevos });
      setElementos(nuevos);
    } catch (error) {
      console.error("Error al guardar elementos entregados:", error);
      alert("Error al guardar en Firebase.");
    }
  };

  const abrirFormulario = (elemento?: ElementoEntregado) => {
    setEditandoElemento(elemento || null);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setEditandoElemento(null);
    setMostrarForm(false);
  };

  const guardarElemento = async (elemento: ElementoEntregado) => {
    const esEdicion = !!editandoElemento;
    const nuevosElementos = esEdicion
      ? elementos.map((e) => (e.id === elemento.id ? elemento : e))
      : [...elementos, { ...elemento, id: Date.now().toString() }];

    await guardarEnFirebase(nuevosElementos);

    if (miembroActivo) {
      try {
        await registrarAuditoria({
          coleccion: "legajos",
          accion: esEdicion ? "editar" : "crear",
          tipoCambio: "elemento_entregado",
          docId: id!,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosNuevos: elemento,
          datosAnteriores: esEdicion ? elementos.find((e) => e.id === elemento.id) || null : null,
        });
      } catch (err) {
        console.error("Error al registrar auditoría (elemento entregado):", err);
      }
    }

    cerrarFormulario();
  };

  const eliminarElemento = async (idElemento: string) => {
    if (!window.confirm("¿Eliminar elemento entregado?")) return;
    const elementoAEliminar = elementos.find((e) => e.id === idElemento);
    const nuevos = elementos.filter((e) => e.id !== idElemento);
    await guardarEnFirebase(nuevos);

    if (miembroActivo && elementoAEliminar) {
      try {
        await registrarAuditoria({
          coleccion: "legajos",
          accion: "eliminar",
          tipoCambio: "elemento_entregado",
          docId: id!,
          miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
          datosAnteriores: elementoAEliminar,
        });
      } catch (err) {
        console.error("Error al registrar auditoría (eliminar elemento):", err);
      }
    }

    if (elementoSeleccionado?.id === idElemento) setElementoSeleccionado(null);
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return "—";
    const [a, m, d] = fecha.split("-");
    return `${d}-${m}-${a}`;
  };

  if (loading) return <p>Cargando elementos entregados...</p>;

  return (
    <div className="tab-container">
      <table className="tabla-general">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Elemento</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {elementos.length ? (
            [...elementos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((e) => (
              <tr
                key={e.id}
                className={elementoSeleccionado?.id === e.id ? "fila-seleccionada" : ""}
                onClick={() => setElementoSeleccionado(e)}
                style={{ cursor: "pointer" }}
              >
                <td>{formatearFecha(e.fecha)}</td>
                <td>{e.elemento}</td>
                <td>{e.observaciones || "—"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} style={{ textAlign: "center" }}>No hay elementos cargados.</td>
            </tr>
          )}
        </tbody>
      </table>

      {puedeEditar && (
        <div className="btn-acciones">
          <button className="btn-accion" onClick={() => abrirFormulario()}><FaPlus /></button>
          <button className="btn-accion" onClick={() => elementoSeleccionado && abrirFormulario(elementoSeleccionado)} disabled={!elementoSeleccionado}><FaEdit /></button>
          <button className="btn-accion btn-eliminar" onClick={() => elementoSeleccionado && eliminarElemento(elementoSeleccionado.id)} disabled={!elementoSeleccionado}><FaTrash /></button>
        </div>
      )}

      {mostrarForm && (
        <ElementoForm elemento={editandoElemento} onClose={cerrarFormulario} onGuardar={guardarElemento} />
      )}
    </div>
  );
};

interface ElementoFormProps {
  elemento: ElementoEntregado | null;
  onClose: () => void;
  onGuardar: (e: ElementoEntregado) => void;
}

const ElementoForm: React.FC<ElementoFormProps> = ({ elemento, onClose, onGuardar }) => {
  const [fecha, setFecha] = useState(elemento?.fecha || "");
  const [el, setEl] = useState(elemento?.elemento || "");
  const [obs, setObs] = useState(elemento?.observaciones || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !el) return alert("Fecha y elemento son obligatorios");

    onGuardar({
      id: elemento?.id || Date.now().toString(),
      fecha,
      elemento: el,
      observaciones: obs,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{elemento ? "Editar elemento" : "Agregar elemento"}</h3>
        <form onSubmit={handleSubmit} className="form-general">
          <label>
            Fecha:
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label>
            Elemento:
            <input type="text" value={el} onChange={(e) => setEl(e.target.value)} required />
          </label>
          <label>
            Observaciones:
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} />
          </label>
          <div className="modal-buttons">
            <button type="submit">{elemento ? "Guardar" : "Agregar"}</button>
            <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ElementosEntregadosTab;
