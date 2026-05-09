import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { Pencil, FileText } from "lucide-react";
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
  nombre: string; fechaNacimiento: string; dni: string; localidad: string;
}

interface Legajo {
  apellido: string; nombre: string; numeroLegajo: number;
  numeroLegajoFederacion?: number; numeroLegajoRUBA?: number;
  dni?: string; fechaNacimiento?: string; grupoSanguineo?: string;
  domicilio?: string; domicilioLaboral?: string; lugar?: string;
  altura?: number; peso?: number; estadoCivil?: string;
  conyuge?: string; dniConyuge?: string; hijos?: Hijo[];
  fotoUrl?: string; fechaIngreso?: string; grado?: string;
  cargo?: string; cargoRegional?: string; cargoProvincial?: string;
  cargoNacional?: string; fechaUltimoAscenso?: string; reingreso?: string;
  obraSocial?: string; carnetConducir?: string; estado?: string;
}

const tabs = [
  { id: "ascensos",       label: "Ascensos" },
  { id: "condecoraciones", label: "Condecoraciones" },
  { id: "sanciones",      label: "Sanciones" },
  { id: "cursos",         label: "Cursos" },
  { id: "observaciones",  label: "Observaciones" },
  { id: "elementos",      label: "Elementos" },
];

const LegajoDetalle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "jefatura" || user?.rol === "legajo";

  const [legajo, setLegajo] = useState<Legajo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState("ascensos");

  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return "—";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}-${mes}-${anio}`;
  };

  useEffect(() => {
    const fetchLegajo = async () => {
      try {
        let legajoDocId: string | undefined = id;

        if (user?.rol === "bombero" && miembroActivo?.id) {
          const q = query(collection(db, "legajos"), where("miembroId", "==", miembroActivo.id));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            legajoDocId = querySnap.docs[0].id;
          } else {
            setLoading(false);
            return;
          }
        }

        if (!legajoDocId) return;

        const docSnap = await getDoc(doc(db, "legajos", legajoDocId));
        if (docSnap.exists()) {
          const data = docSnap.data() as Legajo;
          setLegajo({
            ...data,
            fechaNacimiento: formatearFecha(data.fechaNacimiento),
            fechaIngreso: formatearFecha(data.fechaIngreso),
            fechaUltimoAscenso: formatearFecha(data.fechaUltimoAscenso),
            hijos: data.hijos?.map(h => ({ ...h, fechaNacimiento: formatearFecha(h.fechaNacimiento) })),
          });
        }
      } catch (error) {
        console.error("Error al obtener legajo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLegajo();
  }, [id, user, miembroActivo]);

  const handleGenerarPDF = async () => {
    if (!legajo) return;
    const legajoCompleto = {
      datosPersonales: {
        apellido: legajo.apellido, nombre: legajo.nombre, dni: legajo.dni,
        fechaNacimiento: legajo.fechaNacimiento, grupoSanguineo: legajo.grupoSanguineo,
        domicilio: legajo.domicilio, lugar: legajo.lugar,
        domicilioLaboral: legajo.domicilioLaboral, obraSocial: legajo.obraSocial,
        carnetConducir: legajo.carnetConducir, altura: legajo.altura, peso: legajo.peso,
        estadoCivil: legajo.estadoCivil, conyuge: legajo.conyuge,
        dniConyuge: legajo.dniConyuge, hijos: legajo.hijos,
      },
      datosInstitucionales: {
        fechaIngreso: legajo.fechaIngreso, grado: legajo.grado, cargo: legajo.cargo,
        cargoRegional: legajo.cargoRegional, cargoProvincial: legajo.cargoProvincial,
        cargoNacional: legajo.cargoNacional, fechaUltimoAscenso: legajo.fechaUltimoAscenso,
        reingreso: legajo.reingreso,
      },
      ascensos: [], condecoraciones: [], sanciones: [], cursos: [],
      observaciones: "", elementos: "",
    };

    const tabsParaCapturar = ["ascensos","condecoraciones","sanciones","cursos","observaciones","elementos"];
    try {
      const tabsOriginalDisplay: Record<string, string> = {};
      tabsParaCapturar.forEach(tabId => {
        const el = document.getElementById(tabId);
        if (el) { tabsOriginalDisplay[tabId] = el.style.display; el.style.display = "block"; }
      });

      const botones = document.querySelectorAll(".btn-editar, .btn-generar-pdf, .tab-btn, button.agregar-btn, button.editar-btn, button.eliminar-btn, .btn-accion, .modal-overlay");
      const botonesOriginalDisplay: Map<Element, string> = new Map();
      botones.forEach(btn => {
        botonesOriginalDisplay.set(btn, (btn as HTMLElement).style.display);
        (btn as HTMLElement).style.display = "none";
      });

      await generarLegajoPDF(legajoCompleto, tabsParaCapturar);

      tabsParaCapturar.forEach(tabId => {
        const el = document.getElementById(tabId);
        if (el) el.style.display = tabsOriginalDisplay[tabId] || "none";
      });

      botones.forEach(btn => {
        (btn as HTMLElement).style.display = botonesOriginalDisplay.get(btn) || "";
      });
    } catch (error) {
      console.error("Error generando PDF:", error);
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (!legajo) return <p>No se encontró el legajo</p>;

  return (
    <div className="legajo-detalle-container">

      {/* Header oscuro */}
      <div className="legajo-header">
        <div className="foto-legajo">
          {legajo.fotoUrl
            ? <img src={legajo.fotoUrl} alt="Foto carnet" />
            : <div className="foto-placeholder">Sin foto</div>
          }
        </div>
        <div className="legajo-info-principal">
          <h2>{legajo.apellido}, {legajo.nombre}</h2>
          <p className="legajo-subinfo">
            Legajo N°: {legajo.numeroLegajo} &nbsp;·&nbsp;
            Fed. N°: {legajo.numeroLegajoFederacion || "—"} &nbsp;·&nbsp;
            RUBA N°: {legajo.numeroLegajoRUBA || "—"}
          </p>
        </div>
        {puedeEditar && (
          <div className="legajo-header-btns ocultar-en-pdf">
            <button className="btn-editar" onClick={() => navigate(`/editar-legajo/${id}`)}>
              <Pencil size={14} /> Editar
            </button>
            <button className="btn-generar-pdf" onClick={handleGenerarPDF}>
              <FileText size={14} /> PDF
            </button>
          </div>
        )}
      </div>

      {/* Datos grid */}
      <div className="datos-grid">
        <div className="datos-seccion">
          <h3>Datos personales</h3>
          <p><strong>DNI</strong> {legajo.dni || "—"}</p>
          <p><strong>Fecha nacimiento</strong> {legajo.fechaNacimiento || "—"}</p>
          <p><strong>Grupo sanguíneo</strong> {legajo.grupoSanguineo || "—"}</p>
          <p><strong>Domicilio</strong> {legajo.domicilio || "—"} <span className="lugar-info"><strong>Lugar</strong> {legajo.lugar || "—"}</span></p>
          <p><strong>Domicilio laboral</strong> {legajo.domicilioLaboral || "—"}</p>
          <p><strong>Obra social</strong> {legajo.obraSocial || "—"}</p>
          <p><strong>Carnet conducir</strong> {legajo.carnetConducir || "—"}</p>
          <p><strong>Altura / Peso</strong> {legajo.altura || "—"} cm / {legajo.peso || "—"} kg</p>
          <p><strong>Estado civil</strong> {legajo.estadoCivil || "—"}</p>
          <p><strong>Cónyuge</strong> {legajo.conyuge || "—"} {legajo.dniConyuge ? `(DNI: ${legajo.dniConyuge})` : ""}</p>

          {legajo.hijos && legajo.hijos.length > 0 && (
            <>
              <h4>Hijos</h4>
              <div className="hijos-lista">
                {legajo.hijos.map(h => (
                  <div className="hijo-item" key={h.dni}>
                    <div className="campo-fijo">
                      <strong>Nombre</strong> {h.nombre}
                      <span className="separador-datos" />
                      <strong>DNI</strong> {h.dni}
                    </div>
                    <div className="campo-editable">
                      <strong>Fecha Nac.</strong> {h.fechaNacimiento}
                      <span className="separador-datos" />
                      <strong>Localidad</strong> {h.localidad}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="datos-seccion">
          <h3>Datos institucionales</h3>
          <p><strong>Fecha ingreso</strong> {legajo.fechaIngreso || "—"}</p>
          <p><strong>Grado</strong> {legajo.grado || "—"}</p>
          <p><strong>Cargo institucional</strong> {legajo.cargo || "—"}</p>
          <p><strong>Cargo regional</strong> {legajo.cargoRegional || "—"}</p>
          <p><strong>Cargo provincial</strong> {legajo.cargoProvincial || "—"}</p>
          <p><strong>Cargo nacional</strong> {legajo.cargoNacional || "—"}</p>
          <p><strong>Último ascenso</strong> {legajo.fechaUltimoAscenso || "—"}</p>
          <p><strong>Estado</strong> {legajo.estado || "—"}</p>
          <p><strong>Reingreso</strong> {legajo.reingreso || "—"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container ocultar-en-pdf">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${tabActiva === tab.id ? "active" : ""}`}
            onClick={() => setTabActiva(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido tabs */}
      <div id="ascensos" style={{ display: tabActiva === "ascensos" ? "block" : "none" }}>
        <AscensosTab />
      </div>
      <div id="condecoraciones" style={{ display: tabActiva === "condecoraciones" ? "block" : "none" }}>
        <CondecoracionesTab />
      </div>
      <div id="sanciones" style={{ display: tabActiva === "sanciones" ? "block" : "none" }}>
        <SancionesTab />
      </div>
      <div id="cursos" style={{ display: tabActiva === "cursos" ? "block" : "none" }}>
        <CursosTab />
      </div>
      <div id="observaciones" style={{ display: tabActiva === "observaciones" ? "block" : "none" }}>
        <ObservacionesTab />
      </div>
      <div id="elementos" style={{ display: tabActiva === "elementos" ? "block" : "none" }}>
        <ElementosEntregadosTab />
      </div>
    </div>
  );
};

export default LegajoDetalle;