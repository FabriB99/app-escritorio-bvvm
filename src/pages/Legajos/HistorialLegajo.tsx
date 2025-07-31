// src/pages/Legajos/HistorialLegajo.tsx
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  startAfter,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { useNavigate } from "react-router-dom";
import "./HistorialLegajo.css";

// Tipos
interface CambioLegajo {
  id: string;
  legajoId: string;
  accion: string;
  tipoCambio: string;
  usuarioId: string;
  usuarioRol: string;
  fecha?: any;
  datosPrevios?: any;
  datosNuevos?: any;
}

interface Legajo {
  apellido: string;
  nombre: string;
}

interface Usuario {
  nombre?: string;
  apellido?: string;
  email?: string;
  rol?: string;
}

const etiquetasCampos: Record<string, string> = {
  apellido: "Apellido",
  nombre: "Nombre",
  email: "Correo electrónico",
  rol: "Rol",
  motivo: "Motivo",
  tipo: "Tipo",
  fecha: "Fecha",
  observaciones: "Observaciones",
  resolucion: "Resolución",
  archivoUrl: "Archivo adjunto",
  fechaAscenso: "Fecha del ascenso",
  curso: "Curso",
  unidad: "Unidad",
  domicilioLaboral: "Domicilio laboral",
  domicilio: "Domicilio",
  hijos: "Hijos",
};

const BATCH_SIZE = 20;

const HistorialLegajo: React.FC = () => {
  const [cambios, setCambios] = useState<CambioLegajo[]>([]);
  const [legajosMap, setLegajosMap] = useState<Record<string, Legajo>>({});
  const [usuariosMap, setUsuariosMap] = useState<Record<string, Usuario>>({});
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    cargarCambios(true);
  }, []);

  const cargarCambios = async (reset = false) => {
    if (!hasMore && !reset) return;
    setLoading(true);

    try {
      const cambiosRef = collection(db, "historialLegajos");
      const q = reset
        ? query(cambiosRef, orderBy("fecha", "desc"), limit(BATCH_SIZE))
        : query(cambiosRef, orderBy("fecha", "desc"), startAfter(lastDoc), limit(BATCH_SIZE));

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const nuevosCambios = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CambioLegajo, "id">),
        }));

        setCambios((prev) => (reset ? nuevosCambios : [...prev, ...nuevosCambios]));
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === BATCH_SIZE);
        await cargarLegajos(nuevosCambios.map((c) => c.legajoId));
        await cargarUsuarios(nuevosCambios.map((c) => c.usuarioId));
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    }

    setLoading(false);
  };

  const cargarLegajos = async (ids: string[]) => {
    const nuevosIds = ids.filter((id) => !(id in legajosMap));
    if (nuevosIds.length === 0) return;

    const nuevosLegajos: Record<string, Legajo> = {};
    await Promise.all(
      nuevosIds.map(async (id) => {
        try {
          const docRef = doc(db, "legajos", id);
          const docSnap = await getDoc(docRef);
          nuevosLegajos[id] = docSnap.exists()
            ? docSnap.data() as Legajo
            : { apellido: "Desconocido", nombre: "" };
        } catch {
          nuevosLegajos[id] = { apellido: "Error", nombre: "" };
        }
      })
    );
    setLegajosMap((prev) => ({ ...prev, ...nuevosLegajos }));
  };

  const cargarUsuarios = async (ids: string[]) => {
    const nuevosIds = ids.filter((id) => !(id in usuariosMap));
    if (nuevosIds.length === 0) return;

    const nuevosUsuarios: Record<string, Usuario> = {};
    await Promise.all(
      nuevosIds.map(async (id) => {
        try {
          const docRef = doc(db, "usuarios", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Usuario;
            nuevosUsuarios[id] = {
              nombre: data.nombre || "",
              apellido: data.apellido || "",
              email: data.email || "",
              rol: data.rol || "",
            };
          } else {
            nuevosUsuarios[id] = { nombre: "Desconocido", rol: "" };
          }
        } catch {
          nuevosUsuarios[id] = { nombre: "Error", rol: "" };
        }
      })
    );
    setUsuariosMap((prev) => ({ ...prev, ...nuevosUsuarios }));
  };

  const formatoFecha = (fecha: any) => {
    if (!fecha) return "-";
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const rolLegible = (rol?: string) => {
    if (!rol) return "Desconocido";
    const r = rol.toLowerCase();
    if (r === "admin") return "Admin";
    if (r === "legajo") return "Legajo";
    if (r === "jefatura") return "Jefatura";
    return rol.charAt(0).toUpperCase() + rol.slice(1);
  };

  const mostrarCambios = (
    previos: any,
    nuevos: any,
    tipoCambio: string,
    accion: string
  ) => {
    if (accion === "eliminado" && tipoCambio === "legajo completo") {
      return (
        <em>Se eliminó el legajo: {previos?.apellido}, {previos?.nombre}</em>
      );
    }

    previos = previos || {};
    nuevos = nuevos || {};

    const claves = Array.from(
      new Set([...Object.keys(previos), ...Object.keys(nuevos)])
    );

    const cambios = claves
      .map((key) => {
        const valPrevio = previos[key];
        const valNuevo = nuevos[key];
        if (JSON.stringify(valPrevio) === JSON.stringify(valNuevo)) return null;

        if (Array.isArray(valPrevio) || Array.isArray(valNuevo)) {
          const arrayPrevio = valPrevio || [];
          const arrayNuevo = valNuevo || [];

          const eliminados = arrayPrevio.filter(
            (item: any) =>
              !arrayNuevo.some((n: any) => JSON.stringify(n) === JSON.stringify(item))
          );
          const agregados = arrayNuevo.filter(
            (item: any) =>
              !arrayPrevio.some((p: any) => JSON.stringify(p) === JSON.stringify(item))
          );

          return (
            <li key={key}>
              <strong>{etiquetasCampos[key] || key}:</strong>{" "}
              {eliminados.length > 0 && (
                <span className="valor-previo">
                  Eliminado: {JSON.stringify(eliminados, null, 2)}
                </span>
              )}
              {agregados.length > 0 && (
                <span className="valor-nuevo">
                  Agregado: {JSON.stringify(agregados, null, 2)}
                </span>
              )}
            </li>
          );
        }

        return (
          <li key={key}>
            <strong>{etiquetasCampos[key] || key}:</strong>{" "}
            <span className="valor-previo">{String(valPrevio ?? "—")}</span> →{" "}
            <span className="valor-nuevo">{String(valNuevo ?? "—")}</span>
          </li>
        );
      })
      .filter(Boolean);

    return <ul className="lista-cambios">{cambios}</ul>;
  };

  return (
    <div className="historial-container">
      <header className="historial-header">
        <h2>Historial de Cambios de Legajos</h2>
        <button onClick={() => navigate("/legajos")} className="btn-volver">
          Volver
        </button>
      </header>

      <div className="historial-lista">
        {cambios.length === 0 && !loading && (
          <p className="sin-datos">No hay cambios registrados.</p>
        )}

        {cambios.map((cambio) => (
          <div key={cambio.id} className="cambio-card">
            <div className="cambio-header">
              <strong>Acción:</strong> {cambio.accion} |{" "}
              <strong>Tipo:</strong> {cambio.tipoCambio}
            </div>
            <div className="cambio-detalle">
              <p>
                <strong>Legajo:</strong>{" "}
                {legajosMap[cambio.legajoId]
                  ? `${legajosMap[cambio.legajoId].apellido}, ${legajosMap[cambio.legajoId].nombre}`
                  : cambio.legajoId}
              </p>
              <p>
                <strong>Usuario:</strong>{" "}
                {rolLegible(usuariosMap[cambio.usuarioId]?.rol)}
              </p>
              <p>
                <strong>Fecha:</strong> {formatoFecha(cambio.fecha)}
              </p>
              <div className="detalle-cambios">
                {mostrarCambios(
                  cambio.datosPrevios,
                  cambio.datosNuevos,
                  cambio.tipoCambio,
                  cambio.accion
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && <p className="loading-text">Cargando más cambios...</p>}

        {!loading && hasMore && (
          <button className="btn-cargar-mas" onClick={() => cargarCambios()}>
            Cargar más
          </button>
        )}
      </div>
    </div>
  );
};

export default HistorialLegajo;
