import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { FaEdit } from "react-icons/fa";
import { PiFilePdfFill } from "react-icons/pi";
import "./LegajoDetalle.css";
import { useUser } from "../../context/UserContext";

import AscensosTab from "./Tabs/AscensosTab";
import CondecoracionesTab from "./Tabs/CondecoracionesTab";
import SancionesTab from "./Tabs/SancionesTab";
import CursosTab from "./Tabs/CursosTab";
import ObservacionesTab from "./Tabs/ObservacionesTab";
import ElementosEntregadosTab from "./Tabs/ElementosEntregadosTab";

import { generarLegajoPDF } from "../../utils/generarLegajoPDF";

interface Hijo {
  nombre: string;
  fechaNacimiento: string;
  dni: string;
  localidad: string;
}

interface Legajo {
  apellido: string;
  nombre: string;
  numeroLegajo: number;
  numeroLegajoFederacion?: number;
  numeroLegajoRUBA?: number;
  dni?: string;
  fechaNacimiento?: string;
  grupoSanguineo?: string;
  domicilio?: string;
  domicilioLaboral?: string;
  lugar?: string;
  altura?: number;
  peso?: number;
  estadoCivil?: string;
  conyuge?: string;
  dniConyuge?: string;
  hijos?: Hijo[];
  fotoUrl?: string;
  fechaIngreso?: string;
  grado?: string;
  cargo?: string;
  cargoRegional?: string;
  cargoProvincial?: string;
  cargoNacional?: string;
  fechaUltimoAscenso?: string;
  reingreso?: string;
  obraSocial?: string;
  carnetConducir?: string;
  estado?: string;
}

const tabs = [
  { id: "ascensos", label: "Historial de ascensos" },
  { id: "condecoraciones", label: "Condecoraciones" },
  { id: "sanciones", label: "Sanciones / Llamados de atención" },
  { id: "cursos", label: "Cursos" },
  { id: "observaciones", label: "Observaciones" },
  { id: "elementos", label: "Elementos entregados" },
];

const LegajoDetalle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "jefatura" || user?.rol === "legajo";

  const [legajo, setLegajo] = useState<Legajo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState<string>("ascensos");

  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return "—";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}-${mes}-${anio}`;
  };

  useEffect(() => {
    const fetchLegajo = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "legajos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Legajo;
          const legajoConFechasFormateadas: Legajo = {
            ...data,
            fechaNacimiento: formatearFecha(data.fechaNacimiento),
            fechaIngreso: formatearFecha(data.fechaIngreso),
            fechaUltimoAscenso: formatearFecha(data.fechaUltimoAscenso),
            hijos: data.hijos?.map((hijo) => ({
              ...hijo,
              fechaNacimiento: formatearFecha(hijo.fechaNacimiento),
            })),
          };
          setLegajo(legajoConFechasFormateadas);
        }
      } catch (error) {
        console.error("Error al obtener legajo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLegajo();
  }, [id]);

  const handleGenerarPDF = async () => {
    if (!legajo) return;

    const legajoCompleto = {
      datosPersonales: {
        apellido: legajo.apellido,
        nombre: legajo.nombre,
        dni: legajo.dni,
        fechaNacimiento: legajo.fechaNacimiento,
        grupoSanguineo: legajo.grupoSanguineo,
        domicilio: legajo.domicilio,
        lugar: legajo.lugar,
        domicilioLaboral: legajo.domicilioLaboral,
        obraSocial: legajo.obraSocial,
        carnetConducir: legajo.carnetConducir,
        altura: legajo.altura,
        peso: legajo.peso,
        estadoCivil: legajo.estadoCivil,
        conyuge: legajo.conyuge,
        dniConyuge: legajo.dniConyuge,
        hijos: legajo.hijos,
      },
      datosInstitucionales: {
        fechaIngreso: legajo.fechaIngreso,
        grado: legajo.grado,
        cargo: legajo.cargo,
        cargoRegional: legajo.cargoRegional,
        cargoProvincial: legajo.cargoProvincial,
        cargoNacional: legajo.cargoNacional,
        fechaUltimoAscenso: legajo.fechaUltimoAscenso,
        reingreso: legajo.reingreso,
      },
      ascensos: [], // Si tenés datos, agregalos acá
      condecoraciones: [],
      sanciones: [],
      cursos: [],
      observaciones: "",
      elementos: "",
    };

    const tabsParaCapturar = [
      "ascensos",
      "condecoraciones",
      "sanciones",
      "cursos",
      "observaciones",
      "elementos",
    ];

    try {
      // Guardamos display original de tabs para restaurar después
      const tabsOriginalDisplay: Record<string, string> = {};
      tabsParaCapturar.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          tabsOriginalDisplay[id] = el.style.display;
          el.style.display = "block";
        }
      });

      // Ocultar TODOS los botones y modales antes de capturar
      const botones = document.querySelectorAll(
        ".btn-editar, .btn-generar-pdf, .tab-btn, button.agregar-btn, button.editar-btn, button.eliminar-btn, .btn-accion, .modal-overlay"
      );
      const botonesOriginalDisplay: Map<Element, string> = new Map();
      botones.forEach((btn) => {
        botonesOriginalDisplay.set(btn, (btn as HTMLElement).style.display);
        (btn as HTMLElement).style.display = "none";
      });

      // Generar PDF
      await generarLegajoPDF(legajoCompleto, tabsParaCapturar);

      // Restaurar display original de tabs
      tabsParaCapturar.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.style.display = tabsOriginalDisplay[id] || "none";
        }
      });

      // Restaurar display original de botones
      botones.forEach((btn) => {
        const original = botonesOriginalDisplay.get(btn) || "";
        (btn as HTMLElement).style.display = original;
      });
    } catch (error) {
      console.error("Error generando PDF:", error);
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (!legajo) return <p>No se encontró el legajo</p>;

  return (
    <div className="legajo-detalle-container">
      {/* ENCABEZADO */}
      <div className="legajo-header">
        <div className="legajo-info-principal">
          <h2>{legajo.apellido}, {legajo.nombre}</h2>
          <p className="legajo-subinfo">
            Legajo N°: {legajo.numeroLegajo} |{" "}
            Legajo Fed. N°: {legajo.numeroLegajoFederacion || "—"} |{" "}
            Legajo RUBA N°: {legajo.numeroLegajoRUBA || "—"}
          </p>
        </div>
          <div className="foto-legajo">
            {legajo && legajo.fotoUrl ? (
              <img
                src={legajo.fotoUrl}
                alt="Foto carnet"
                style={{ maxHeight: "150px", objectFit: "cover", borderRadius: "4px" }}
              />
            ) : (
              <div className="foto-placeholder">Sin foto</div>
            )}
          </div>
        {puedeEditar && (
          <>
            <button
              className="btn-editar ocultar-en-pdf"
              onClick={() => navigate(`/editar-legajo/${id}`)}
              title="Editar legajo"
            >
              <FaEdit />
            </button>
            <button
              className="btn-generar-pdf ocultar-en-pdf"
              onClick={handleGenerarPDF}
              title="Generar PDF"
            >
              <PiFilePdfFill />
            </button>
          </>
        )}
      </div>

      {/* DATOS PERSONALES E INSTITUCIONALES */}
      <div className="datos-grid">
        <div className="datos-seccion">
          <h3>Datos personales</h3>
          <p><strong>DNI:</strong> {legajo.dni || "—"}</p>
          <p><strong>Fecha nacimiento:</strong> {legajo.fechaNacimiento || "—"}</p>
          <p><strong>Grupo sanguíneo:</strong> {legajo.grupoSanguineo || "—"}</p>
          <p><strong>Domicilio:</strong> {legajo.domicilio || "—"} <span className="lugar-info"><strong>Lugar:</strong> {legajo.lugar || "—"}</span></p>
          <p><strong>Domicilio laboral:</strong> {legajo.domicilioLaboral || "—"}</p>
          <p><strong>Obra social:</strong> {legajo.obraSocial || "—"}</p>
          <p><strong>Carnet de conducir:</strong> {legajo.carnetConducir || "—"}</p>
          <p><strong>Altura:</strong> {legajo.altura || "—"} cm <span className="lugar-info"><strong>Peso:</strong> {legajo.peso || "—"} kg</span></p>
          <p><strong>Estado civil:</strong> {legajo.estadoCivil || "—"}</p>
          <p><strong>Casado/a con:</strong> {legajo.conyuge || "—"} (DNI: {legajo.dniConyuge || "—"})</p>
          <h4>Hijos</h4>
          {legajo.hijos?.length ? (
            <div className="hijos-lista">
              {legajo.hijos.map((h) => (
                <div className="hijo-item" key={h.dni}>
                  <div className="campo campo-fijo">
                    <strong>Nombre:</strong> {h.nombre}
                    <span className="separador-datos" />
                    <strong>DNI:</strong> {h.dni}
                  </div>
                  <div className="campo campo-editable">
                    <strong>Fecha Nac.:</strong> {h.fechaNacimiento}
                    <span className="separador-datos" />
                    <strong>Localidad:</strong> {h.localidad}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>—</p>
          )}
        </div>
        <div className="datos-seccion">
          <h3>Datos institucionales</h3>
          <p><strong>Fecha de ingreso:</strong> {legajo.fechaIngreso || "—"}</p>
          <p><strong>Grado:</strong> {legajo.grado || "—"}</p>
          <p><strong>Cargo Institucional:</strong> {legajo.cargo || "—"}</p>
          <p><strong>Cargo Regional:</strong> {legajo.cargoRegional || "—"}</p>
          <p><strong>Cargo Provincial:</strong> {legajo.cargoProvincial || "—"}</p>
          <p><strong>Cargo Nacional:</strong> {legajo.cargoNacional || "—"}</p>
          <p><strong>Fecha último ascenso:</strong> {legajo.fechaUltimoAscenso || "—"}</p>
          <p><strong>Estado:</strong> {legajo.estado || "—"}</p>
          <p><strong>Reingreso:</strong> {legajo.reingreso || "—"}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs-container ocultar-en-pdf">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${tabActiva === tab.id ? "active" : ""}`}
            onClick={() => setTabActiva(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO DEL TAB ACTIVO */}
      <div
        id="ascensos"
        style={{ display: tabActiva === "ascensos" ? "block" : "none" }}
      >
        <AscensosTab />
      </div>
      <div
        id="condecoraciones"
        style={{ display: tabActiva === "condecoraciones" ? "block" : "none" }}
      >
        <CondecoracionesTab />
      </div>
      <div
        id="sanciones"
        style={{ display: tabActiva === "sanciones" ? "block" : "none" }}
      >
        <SancionesTab />
      </div>
      <div
        id="cursos"
        style={{ display: tabActiva === "cursos" ? "block" : "none" }}
      >
        <CursosTab />
      </div>
      <div
        id="observaciones"
        style={{ display: tabActiva === "observaciones" ? "block" : "none" }}
      >
        <ObservacionesTab />
      </div>
      <div
        id="elementos"
        style={{ display: tabActiva === "elementos" ? "block" : "none" }}
      >
        <ElementosEntregadosTab />
      </div>
    </div>
  );
};

export default LegajoDetalle;
