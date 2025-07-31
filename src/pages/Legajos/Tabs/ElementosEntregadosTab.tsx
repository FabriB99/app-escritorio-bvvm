import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../app/firebase-config";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css";
import { useUser } from "../../../context/UserContext";
import { registrarCambioLegajo } from "../../../utils/registrarCambioLegajo";

interface ElementoEntregado {
  id: string;
  fecha: string;
  elemento: string;
  observaciones?: string;
}

const ElementosEntregadosTab: React.FC = () => {
  const { id } = useParams();
  const [elementos, setElementos] = useState<ElementoEntregado[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<ElementoEntregado | null>(null);
  const [seleccionado, setSeleccionado] = useState<ElementoEntregado | null>(null);
  const { user } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      const docRef = doc(db, "legajos", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setElementos(data.elementosEntregados || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const guardarEnFirebase = async (nuevos: ElementoEntregado[]) => {
    if (!id) return;
    await updateDoc(doc(db, "legajos", id), { elementosEntregados: nuevos });
    setElementos(nuevos);
  };

  const abrirFormulario = (elemento?: ElementoEntregado) => {
    setEditando(elemento || null);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setEditando(null);
    setMostrarForm(false);
  };

  const guardarElemento = async (elemento: ElementoEntregado) => {
    const esEdicion = !!editando;
    const nuevos = esEdicion
      ? elementos.map((e) => (e.id === elemento.id ? elemento : e))
      : [...elementos, { ...elemento, id: Date.now().toString() }];

    await guardarEnFirebase(nuevos);

    if (user) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: esEdicion ? "modificado" : "agregado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "elemento_entregado",
        datosPrevios: esEdicion ? elementos.find((e) => e.id === elemento.id) : null,
        datosNuevos: elemento,
      });
    }

    cerrarFormulario();
  };

  const eliminarElemento = async (idElemento: string) => {
    if (!window.confirm("¿Eliminar elemento entregado?")) return;
    const aEliminar = elementos.find((e) => e.id === idElemento);
    const nuevos = elementos.filter((e) => e.id !== idElemento);
    await guardarEnFirebase(nuevos);

    if (user && aEliminar) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: "eliminado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "elemento_entregado",
        datosPrevios: aEliminar,
      });
    }

    if (seleccionado?.id === idElemento) setSeleccionado(null);
  };

  const formatearFecha = (f: string) => {
    const [a, m, d] = f.split("-");
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
                className={seleccionado?.id === e.id ? "fila-seleccionada" : ""}
                onClick={() => setSeleccionado(e)}
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
          <button className="btn-accion" onClick={() => seleccionado && abrirFormulario(seleccionado)} disabled={!seleccionado}><FaEdit /></button>
          <button className="btn-accion btn-eliminar" onClick={() => seleccionado && eliminarElemento(seleccionado.id)} disabled={!seleccionado}><FaTrash /></button>
        </div>
      )}

      {mostrarForm && (
        <ElementoForm elemento={editando} onClose={cerrarFormulario} onGuardar={guardarElemento} />
      )}
    </div>
  );
};

interface FormProps {
  elemento: ElementoEntregado | null;
  onClose: () => void;
  onGuardar: (e: ElementoEntregado) => void;
}

const ElementoForm: React.FC<FormProps> = ({ elemento, onClose, onGuardar }) => {
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
