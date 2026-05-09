// src/pages/RevisionUnidad.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getUbicacionesConElementos, addRevision, getUnidades } from "../firebase/firestore";
import { Ubicacion } from "../../../shared/types/Ubicacion";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase-config";
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from "react-icons/fa";
import "../styles/RevisionUnidad.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type EstadoElemento = "Operativo" | "Con falla" | "Faltante";

type EstadoPorElemento = {
  [elementoId: string]: EstadoElemento;
};

export default function RevisionUnidad() {
  const { unidadId } = useParams<{ unidadId: string }>();
  const navigate = useNavigate();
  const [unidadNombre, setUnidadNombre] = useState("");
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [estadoElementos, setEstadoElementos] = useState<EstadoPorElemento>({});
  const [bombero, setBombero] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!unidadId) return;

    getUnidades().then((unidades) => {
      const unidad = unidades.find((u) => u.id === unidadId);
      if (unidad) setUnidadNombre(unidad.nombre);
    });

    getUbicacionesConElementos(unidadId).then((ubicaciones) => {
      setUbicaciones(ubicaciones);
    });
  }, [unidadId]);

  const handleChangeEstado = (elementoId: string, estado: EstadoElemento) => {
    setEstadoElementos((prev) => ({
      ...prev,
      [elementoId]: estado,
    }));
  };

  const handleGuardarRevision = async () => {
    if (!unidadId || !bombero.trim()) {
      toast.warn("🧑‍🚒 Completá el nombre del bombero", { autoClose: 2000 });
      return;
    }

    // Validar que todos los elementos tengan estado
    const totalElementos = ubicaciones.flatMap((u) => u.elementos).length;
    const totalEstados = Object.keys(estadoElementos).length;

    if (totalEstados !== totalElementos) {
      toast.warn("⚠️ Todos los elementos deben tener un estado asignado", { autoClose: 2000 });
      return;
    }

    // Validar observaciones
    if (!observaciones.trim()) {
      toast.warn("✏️ Agregá una observación", { autoClose: 2000 });
      return;
    }

    setGuardando(true);

    try {
      await addRevision({
        unidadId,
        bombero,
        observaciones,
        elementos: estadoElementos,
      });

      const updates = Object.entries(estadoElementos).map(async ([elementoId, estado]) => {
        const elementoRef = doc(db, "elementos", elementoId);
        await updateDoc(elementoRef, { estado });
      });
      await Promise.all(updates);

      await updateDoc(doc(db, "unidades", unidadId), {
        ultima_revision: new Date(),
      });

      toast.success("✅ Revisión guardada con éxito", { autoClose: 2000 });

      // Espero un poco para que el toast se muestre antes de navegar
      setTimeout(() => {
        navigate("/control-unidades");
      }, 2000);
    } catch (error) {
      console.error("❌ Error al guardar la revisión:", error);
      toast.error("❌ Ocurrió un error al guardar", { autoClose: 3000 });
    } finally {
      setGuardando(false);
    }
  };

  const autoResizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  return (
    <div className="revision-container">
      <Link to="/" style={{ display: "flex", justifyContent: "center" }}>
        <img src="/logo-bomberos.png" alt="Logo" className="revision-logo" />
      </Link>
      <h1 className="revision-title">Revisión de Unidad</h1>
      <h2 className="revision-subtitle">{unidadNombre}</h2>

      <div className="form-group">
        <label>Nombre del Bombero</label>
        <input
          type="text"
          value={bombero}
          onChange={(e) => setBombero(e.target.value)}
          placeholder="Nombre..."
        />
      </div>

      <div className="estado-leyenda">
        <div className="estado-item">
          <FaCheckCircle className="icon green" />
          <span>Operativo</span>
        </div>
        <div className="estado-item">
          <FaExclamationTriangle className="icon yellow" />
          <span>Faltante</span>
        </div>
        <div className="estado-item">
          <FaTimesCircle className="icon red" />
          <span>Con falla</span>
        </div>
      </div>

      {ubicaciones.map((ubicacion) => (
        <div key={ubicacion.id} className="ubicacion-section">
          <div className="ubicacion-nombre">{ubicacion.nombre}</div>

          <div className="ubicacion-encabezado">
            <span className="espacio-vacio"></span>
            <span className="cantidad-label">Cantidad</span>
            <span className="estado-labels">Estado</span>
          </div>

          {ubicacion.elementos.map((elemento) => (
            <div key={elemento.id} className="elemento-row">
              <span className="elemento-nombre">{elemento.nombre}</span>
              <span className="elemento-cantidad">{elemento.cantidad}</span>
              <div className="estado-radios">
                <label
                  className={estadoElementos[elemento.id] === "Operativo" ? "radio operativo" : ""}
                >
                  <input
                    type="radio"
                    name={`estado-${elemento.id}`}
                    value="Operativo"
                    checked={estadoElementos[elemento.id] === "Operativo"}
                    onChange={() => handleChangeEstado(elemento.id, "Operativo")}
                  />
                </label>
                <label
                  className={estadoElementos[elemento.id] === "Faltante" ? "radio faltante" : ""}
                >
                  <input
                    type="radio"
                    name={`estado-${elemento.id}`}
                    value="Faltante"
                    checked={estadoElementos[elemento.id] === "Faltante"}
                    onChange={() => handleChangeEstado(elemento.id, "Faltante")}
                  />
                </label>
                <label
                  className={estadoElementos[elemento.id] === "Con falla" ? "radio con-falla" : ""}
                >
                  <input
                    type="radio"
                    name={`estado-${elemento.id}`}
                    value="Con falla"
                    checked={estadoElementos[elemento.id] === "Con falla"}
                    onChange={() => handleChangeEstado(elemento.id, "Con falla")}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="form-group">
        <label>Observaciones</label>
        <textarea
          className="observaciones-textarea"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          onInput={(e) => autoResizeTextarea(e.currentTarget)}
          rows={3}
          style={{ maxHeight: "384px", overflowY: "auto" }}
          placeholder="Escribir alguna observación si es necesario..."
        />
      </div>

      <button className="finalizar-button" onClick={handleGuardarRevision} disabled={guardando}>
        {guardando ? "Guardando..." : "Finalizar Revisión"}
      </button>

      <ToastContainer position="top-center" />
    </div>
  );
}
