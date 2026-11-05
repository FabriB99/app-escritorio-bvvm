import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getUbicacionesConElementos,
  getUnidades,
  getMiembros,
  formatearEtiquetaMiembro,
  MiembroRevision,
} from "../firebase/firestore";
import { Ubicacion } from "../../../shared/types/Ubicacion";
import { doc, collection, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase-config";
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from "react-icons/fa";
import "../styles/RevisionUnidad.css";
import toast from "react-hot-toast";
import { ArrowLeft, X } from "lucide-react";

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
  const [miembros, setMiembros] = useState<MiembroRevision[]>([]);
  const [bomberosSeleccionados, setBomberosSeleccionados] = useState<string[]>([]);
  const [busquedaBombero, setBusquedaBombero] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  const sugerenciasRef = useRef<HTMLDivElement>(null);
  const inputBusquedaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!unidadId) return;

    getUnidades().then((unidades) => {
      const unidad = unidades.find((u) => u.id === unidadId);
      if (unidad) setUnidadNombre(unidad.nombre);
    });

    getUbicacionesConElementos(unidadId).then((ubicaciones) => {
      setUbicaciones(ubicaciones);
    });

    getMiembros()
      .then((lista) => {
        setMiembros(lista);
      })
      .catch((err) => {
        console.error("❌ Error al cargar miembros:", err);
      });
  }, [unidadId]);

  // Cerrar desplegable al tocar fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        sugerenciasRef.current &&
        !sugerenciasRef.current.contains(event.target as Node) &&
        inputBusquedaRef.current &&
        !inputBusquedaRef.current.contains(event.target as Node)
      ) {
        setMostrarSugerencias(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const normalizarTexto = (texto: string) =>
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const textoBusquedaNorm = normalizarTexto(busquedaBombero);

  const sugerenciasFiltradas = busquedaBombero.trim()
    ? miembros
        .filter((m) => {
          const etiqueta = formatearEtiquetaMiembro(m);
          if (bomberosSeleccionados.includes(etiqueta)) return false;

          const ordenStr =
            m.ordenOperativo !== undefined && m.ordenOperativo !== null
              ? String(m.ordenOperativo).trim()
              : "";
          const nombreNorm = normalizarTexto(m.nombre || "");
          const apellidoNorm = normalizarTexto(m.apellido || "");
          const etiquetaNorm = normalizarTexto(etiqueta);

          return (
            etiquetaNorm.includes(textoBusquedaNorm) ||
            nombreNorm.includes(textoBusquedaNorm) ||
            apellidoNorm.includes(textoBusquedaNorm) ||
            (ordenStr && ordenStr.includes(busquedaBombero.trim()))
          );
        })
        .slice(0, 6)
    : [];

  const coincidenciaExacta = miembros.some(
    (m) =>
      formatearEtiquetaMiembro(m).toLowerCase() === busquedaBombero.trim().toLowerCase()
  );
  const yaSeleccionadoManualmente = bomberosSeleccionados.some(
    (b) => b.toLowerCase() === busquedaBombero.trim().toLowerCase()
  );

  const mostrarBotonManual =
    busquedaBombero.trim().length > 0 &&
    !coincidenciaExacta &&
    !yaSeleccionadoManualmente;

  const handleAgregarBombero = (etiqueta: string) => {
    const limpia = etiqueta.trim();
    if (!limpia) return;
    if (!bomberosSeleccionados.includes(limpia)) {
      setBomberosSeleccionados((prev) => [...prev, limpia]);
    }
    setBusquedaBombero("");
    setMostrarSugerencias(false);
    inputBusquedaRef.current?.focus();
  };

  const handleQuitarBombero = (etiqueta: string) => {
    setBomberosSeleccionados((prev) => prev.filter((b) => b !== etiqueta));
  };

  const handleKeyDownBusqueda = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (sugerenciasFiltradas.length > 0) {
        handleAgregarBombero(formatearEtiquetaMiembro(sugerenciasFiltradas[0]));
      } else if (busquedaBombero.trim()) {
        handleAgregarBombero(busquedaBombero.trim());
      }
    }
  };

  const handleChangeEstado = (elementoId: string, estado: EstadoElemento) => {
    setEstadoElementos((prev) => ({
      ...prev,
      [elementoId]: estado,
    }));
  };

  const handleMarcarSeccionOperativa = (ubicacion: Ubicacion) => {
    setEstadoElementos((prev) => {
      const actualizados = { ...prev };
      ubicacion.elementos.forEach((el) => {
        actualizados[el.id] = "Operativo";
      });
      return actualizados;
    });
    toast.success(`Sección "${ubicacion.nombre}" marcada como Operativa`, { duration: 1200 });
  };

  const handleGuardarRevision = async () => {
    if (!unidadId) {
      toast.error("Unidad no válida");
      return;
    }

    let bomberosFinales = [...bomberosSeleccionados];

    // Si no hay seleccionados pero dejó texto en el buscador, tomarlo automáticamente
    if (bomberosFinales.length === 0 && busquedaBombero.trim()) {
      bomberosFinales = [busquedaBombero.trim()];
      setBomberosSeleccionados(bomberosFinales);
      setBusquedaBombero("");
    }

    if (bomberosFinales.length === 0) {
      toast.error("Seleccioná al menos un bombero responsable");
      return;
    }

    // Validar que todos los elementos tengan estado asignado
    const totalElementos = ubicaciones.flatMap((u) => u.elementos).length;
    const totalEstados = Object.keys(estadoElementos).length;

    if (totalEstados !== totalElementos) {
      toast("⚠️ Todos los elementos deben tener un estado asignado");
      return;
    }

    // Verificamos si hay al menos un elemento marcado como Faltante o Con falla
    const hayFallasOFaltantes = Object.values(estadoElementos).some(
      (estado) => estado === "Faltante" || estado === "Con falla"
    );

    if (hayFallasOFaltantes && !observaciones.trim()) {
      toast("⚠️ Hay faltantes o fallas. Especificá el detalle en observaciones.");
      return;
    }

    const observacionesFinal = observaciones.trim() || "Sin novedades";

    setGuardando(true);

    try {
      const batch = writeBatch(db);

      // 1. Guardar la revisión atómicamente con bombero (string) y bomberos (array)
      const revisionRef = doc(collection(db, "revisiones"));
      batch.set(revisionRef, {
        unidadId,
        bombero: bomberosFinales.join(", "),
        bomberos: bomberosFinales,
        observaciones: observacionesFinal,
        fecha: serverTimestamp(),
        elementos: estadoElementos,
      });

      // 2. Actualizar estado de cada elemento en el lote
      Object.entries(estadoElementos).forEach(([elementoId, estado]) => {
        const elementoRef = doc(db, "elementos", elementoId);
        batch.update(elementoRef, { estado });
      });

      // 3. Actualizar la última revisión en la unidad en el mismo lote
      const unidadRef = doc(db, "unidades", unidadId);
      batch.update(unidadRef, {
        ultima_revision: serverTimestamp(),
      });

      // Ejecutar commit atómico (optimizado y compatible con offline)
      await batch.commit();

      toast.success("Revisión guardada con éxito");

      // Esperar un momento para mostrar el toast antes de navegar
      setTimeout(() => {
        navigate("/control-unidades");
      }, 2000);
    } catch (error) {
      console.error("❌ Error al guardar la revisión:", error);
      toast.error("Ocurrió un error al guardar");
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
      <div className="revision-top-bar">
        <Link to="/control-unidades" className="btn-volver-revision">
          <ArrowLeft size={18} />
          <span>Volver</span>
        </Link>
        <div className="brand-header-compact">
          <img src="/logo-bomberos.png" alt="Escudo" className="brand-logo-compact" />
          <span className="brand-text-compact">Bomberos Villa María</span>
        </div>
      </div>

      <div className="revision-header-titles">
        <h1 className="revision-title">Revisión de {unidadNombre}</h1>
      </div>

      <div className="form-group selector-bomberos-group">
        <label htmlFor="input-busqueda-bombero">Bomberos Responsables</label>

        {/* Chips de bomberos seleccionados */}
        {bomberosSeleccionados.length > 0 && (
          <div className="bomberos-chips-container" aria-label="Bomberos seleccionados">
            {bomberosSeleccionados.map((nombreBombero) => (
              <span key={nombreBombero} className="bombero-chip">
                <span>{nombreBombero}</span>
                <button
                  type="button"
                  className="bombero-chip-quitar"
                  onClick={() => handleQuitarBombero(nombreBombero)}
                  title={`Quitar a ${nombreBombero}`}
                  aria-label={`Quitar a ${nombreBombero}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Buscador táctil con autocompletado */}
        <div className="buscador-bomberos-wrapper">
          <input
            id="input-busqueda-bombero"
            ref={inputBusquedaRef}
            type="text"
            value={busquedaBombero}
            onChange={(e) => {
              setBusquedaBombero(e.target.value);
              setMostrarSugerencias(true);
            }}
            onFocus={() => {
              if (busquedaBombero.trim()) {
                setMostrarSugerencias(true);
              }
            }}
            onKeyDown={handleKeyDownBusqueda}
            placeholder={
              bomberosSeleccionados.length === 0
                ? "Buscar por orden, apellido o nombre..."
                : "+ Agregar otro bombero..."
            }
            autoComplete="off"
          />

          {mostrarSugerencias && (sugerenciasFiltradas.length > 0 || mostrarBotonManual) && (
            <div ref={sugerenciasRef} className="sugerencias-bomberos" role="listbox">
              {sugerenciasFiltradas.map((miembro) => {
                const etiqueta = formatearEtiquetaMiembro(miembro);
                return (
                  <button
                    key={miembro.id}
                    type="button"
                    className="sugerencia-item"
                    onClick={() => handleAgregarBombero(etiqueta)}
                  >
                    <span className="sugerencia-texto">{etiqueta}</span>
                    <span className="sugerencia-accion">+ Agregar</span>
                  </button>
                );
              })}

              {mostrarBotonManual && (
                <button
                  type="button"
                  className="sugerencia-item sugerencia-manual"
                  onClick={() => handleAgregarBombero(busquedaBombero)}
                >
                  <span className="sugerencia-manual-texto">
                    + Agregar "<strong>{busquedaBombero.trim()}</strong>" manualmente
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
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
          <div className="ubicacion-header">
            <span className="ubicacion-nombre">{ubicacion.nombre}</span>
            <button
              type="button"
              className="btn-seccion-ok"
              onClick={() => handleMarcarSeccionOperativa(ubicacion)}
              disabled={guardando}
            >
              ✓ Toda la sección OK
            </button>
          </div>

          <div className="ubicacion-encabezado">
            <span className="espacio-vacio">Elemento</span>
            <span className="cantidad-label">Cant.</span>
            <span className="estado-labels">Estado</span>
          </div>

          {ubicacion.elementos.map((elemento) => (
            <div key={elemento.id} className="elemento-row">
              <span className="elemento-nombre">{elemento.nombre}</span>
              <span className="elemento-cantidad">{elemento.cantidad}</span>
              <div
                className="estado-chips"
                role="group"
                aria-label={`Estado de ${elemento.nombre}`}
              >
                <button
                  type="button"
                  className={`chip-btn chip-operativo ${
                    estadoElementos[elemento.id] === "Operativo" ? "activo" : ""
                  }`}
                  onClick={() => handleChangeEstado(elemento.id, "Operativo")}
                  disabled={guardando}
                  aria-pressed={estadoElementos[elemento.id] === "Operativo"}
                  title="Operativo"
                >
                  <FaCheckCircle className="chip-icon" />
                </button>
                <button
                  type="button"
                  className={`chip-btn chip-faltante ${
                    estadoElementos[elemento.id] === "Faltante" ? "activo" : ""
                  }`}
                  onClick={() => handleChangeEstado(elemento.id, "Faltante")}
                  disabled={guardando}
                  aria-pressed={estadoElementos[elemento.id] === "Faltante"}
                  title="Faltante"
                >
                  <FaExclamationTriangle className="chip-icon" />
                </button>
                <button
                  type="button"
                  className={`chip-btn chip-con-falla ${
                    estadoElementos[elemento.id] === "Con falla" ? "activo" : ""
                  }`}
                  onClick={() => handleChangeEstado(elemento.id, "Con falla")}
                  disabled={guardando}
                  aria-pressed={estadoElementos[elemento.id] === "Con falla"}
                  title="Con falla"
                >
                  <FaTimesCircle className="chip-icon" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="form-group" style={{ marginTop: "20px" }}>
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
    </div>
  );
}
