// src/pages/Legajos/LegajoDetalle.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { Pencil, FileText } from "lucide-react";
import { toast } from "sonner";
import "./LegajoDetalle.css";
import { useUser } from "../../context/UserContext";
import Header from "../../components/Header";

import AscensosTab from "./Tabs/AscensosTab";
import CondecoracionesTab from "./Tabs/CondecoracionesTab";
import SancionesTab from "./Tabs/SancionesTab";
import CursosTab from "./Tabs/CursosTab";
import ObservacionesTab from "./Tabs/ObservacionesTab";
import ElementosEntregadosTab from "./Tabs/ElementosEntregadosTab";

import { generarLegajoPDF, HijoPDF } from "../../utils/generarLegajoPDF";

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
  ciudad?: string;
  altura?: number;
  peso?: number;
  estadoCivil?: string;
  conyuge?: string;
  dniConyuge?: string;
  hijos?: HijoPDF[];
  fotoUrl?: string;
  fechaIngreso?: string;
  grado?: string;
  cargo?: string;
  cargoRegional?: string;
  cargoProvincial?: string;
  cargoNacional?: string;
  fechaUltimoAscenso?: string;
  reingreso?: string;
  fechaReingreso?: string;
  obraSocial?: string;
  carnetConducir?: string;
  estado?: string;
  miembroId?: string;
}

const tabs = [
  { id: "ascensos", label: "Ascensos" },
  { id: "condecoraciones", label: "Condecoraciones" },
  { id: "sanciones", label: "Sanciones" },
  { id: "cursos", label: "Cursos" },
  { id: "observaciones", label: "Observaciones" },
  { id: "elementos", label: "Elementos" },
];

const formatearFecha = (fecha: string | undefined): string => {
  if (!fecha) return "—";
  if (fecha.includes("-")) {
    const partes = fecha.split("-");
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      return `${dia}-${mes}-${anio}`;
    }
  }
  return fecha;
};

const LegajoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "jefatura" || user?.rol === "legajo";

  const [legajoIdReal, setLegajoIdReal] = useState<string | undefined>(id);
  const [legajo, setLegajo] = useState<Legajo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState("ascensos");

  const fetchLegajo = useCallback(async () => {
    try {
      setLoading(true);
      let targetDocId = id;

      if (user?.rol === "bombero" && miembroActivo?.id) {
        const q = query(collection(db, "legajos"), where("miembroId", "==", miembroActivo.id));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          targetDocId = querySnap.docs[0].id;
        } else {
          setLegajo(null);
          setLoading(false);
          return;
        }
      }

      if (!targetDocId) {
        setLoading(false);
        return;
      }

      setLegajoIdReal(targetDocId);

      const docSnap = await getDoc(doc(db, "legajos", targetDocId));
      if (docSnap.exists()) {
        const data = docSnap.data() as Legajo;
        let carnetConducir = data.carnetConducir;
        let targetMiembroId = data.miembroId;

        // Si no tiene miembroId pero tiene DNI, buscamos el miembro en "miembros"
        if (!targetMiembroId && data.dni) {
          try {
            const qSnap = await getDocs(
              query(collection(db, "miembros"), where("dni", "==", String(data.dni).trim()), limit(1))
            );
            if (!qSnap.empty) {
              targetMiembroId = qSnap.docs[0].id;
            }
          } catch (err) {
            console.warn("Error al buscar miembro por DNI en detalle:", err);
          }
        }

        // Consultamos la colección vencimientos para obtener las categorías actualizadas de carnet
        if (targetMiembroId && (!carnetConducir || carnetConducir === "—" || carnetConducir === "No posee")) {
          try {
            const qCarnet = query(
              collection(db, "vencimientos"),
              where("miembroId", "==", targetMiembroId),
              where("tipo", "==", "carnet")
            );
            const snapCarnet = await getDocs(qCarnet);
            if (!snapCarnet.empty) {
              const vData = snapCarnet.docs[0].data();
              if (Array.isArray(vData.tipoCarnet) && vData.tipoCarnet.length > 0) {
                carnetConducir = vData.tipoCarnet.join(", ");
              } else if (typeof vData.tipoCarnet === "string" && vData.tipoCarnet.trim()) {
                carnetConducir = vData.tipoCarnet.trim();
              }
            }
          } catch (errCarnet) {
            console.warn("Error al consultar carnet en vencimientos (detalle):", errCarnet);
          }
        }

        setLegajo({
          ...data,
          miembroId: targetMiembroId,
          carnetConducir: carnetConducir || "No posee",
          fechaNacimiento: formatearFecha(data.fechaNacimiento),
          fechaIngreso: formatearFecha(data.fechaIngreso),
          fechaUltimoAscenso: formatearFecha(data.fechaUltimoAscenso),
          fechaReingreso: formatearFecha(data.fechaReingreso),
          hijos: data.hijos?.map((h) => ({
            ...h,
            fechaNacimiento: formatearFecha(h.fechaNacimiento),
          })),
        });
      } else {
        setLegajo(null);
      }
    } catch (error) {
      console.error("Error al obtener legajo:", error);
      toast.error("Error al cargar los datos del legajo.");
    } finally {
      setLoading(false);
    }
  }, [id, user?.rol, miembroActivo?.id]);

  useEffect(() => {
    fetchLegajo();
  }, [fetchLegajo]);

  const handleGenerarPDF = async () => {
    if (!legajo || !legajoIdReal) return;
    try {
      toast.info("Generando documento PDF...");

      // Consultamos subcolecciones históricas en paralelo para armar el PDF completo
      const [ascSnap, condSnap, sancSnap, curSnap, obsSnap] = await Promise.all([
        getDocs(query(collection(db, `legajos/${legajoIdReal}/ascensos`), orderBy("fecha", "desc"))).catch(() => null),
        getDocs(query(collection(db, `legajos/${legajoIdReal}/condecoraciones`), orderBy("fecha", "desc"))).catch(() => null),
        getDocs(query(collection(db, `legajos/${legajoIdReal}/sanciones`), orderBy("fecha", "desc"))).catch(() => null),
        getDocs(query(collection(db, `legajos/${legajoIdReal}/cursos`), orderBy("fecha", "desc"))).catch(() => null),
        getDocs(query(collection(db, `legajos/${legajoIdReal}/observaciones`), orderBy("fecha", "desc"))).catch(() => null),
      ]);

      const ascensos = ascSnap?.docs.map((d) => ({
        fecha: formatearFecha(d.data().fecha),
        grado: d.data().grado || "—",
        resolucion: d.data().resolucion || d.data().resolucionN || "—",
        observaciones: d.data().observaciones || "",
      })) || [];

      const condecoraciones = condSnap?.docs.map((d) => ({
        fecha: formatearFecha(d.data().fecha),
        tipo: d.data().tipo || "—",
        motivo: d.data().motivo || "—",
        observaciones: d.data().observaciones || "",
      })) || [];

      const sanciones = sancSnap?.docs.map((d) => ({
        fecha: formatearFecha(d.data().fecha),
        tipo: d.data().tipo || "—",
        motivo: d.data().motivo || "—",
        observaciones: d.data().observaciones || "",
      })) || [];

      const cursos = curSnap?.docs.map((d) => ({
        fecha: formatearFecha(d.data().fecha),
        tipo: d.data().tipo || "—",
        nombre: d.data().nombre || "—",
        observaciones: d.data().observaciones || "",
      })) || [];

      const observaciones = obsSnap?.docs.map((d) => ({
        fecha: formatearFecha(d.data().fecha),
        motivo: d.data().motivo || "—",
        observacion: d.data().observacion || d.data().detalle || "—",
      })) || [];

      await generarLegajoPDF({
        datosPersonales: {
          apellido: legajo.apellido,
          nombre: legajo.nombre,
          dni: legajo.dni,
          fechaNacimiento: legajo.fechaNacimiento,
          grupoSanguineo: legajo.grupoSanguineo,
          domicilio: legajo.domicilio,
          ciudad: legajo.ciudad,
          domicilioLaboral: legajo.domicilioLaboral,
          obraSocial: legajo.obraSocial,
          carnetConducir: legajo.carnetConducir,
          altura: legajo.altura,
          peso: legajo.peso,
          estadoCivil: legajo.estadoCivil,
          conyuge: legajo.conyuge,
          dniConyuge: legajo.dniConyuge,
          fotoUrl: legajo.fotoUrl,
          hijos: legajo.hijos,
        },
        datosInstitucionales: {
          numeroLegajo: legajo.numeroLegajo,
          numeroLegajoFederacion: legajo.numeroLegajoFederacion,
          numeroLegajoRUBA: legajo.numeroLegajoRUBA,
          fechaIngreso: legajo.fechaIngreso,
          grado: legajo.grado,
          cargo: legajo.cargo,
          cargoRegional: legajo.cargoRegional,
          cargoProvincial: legajo.cargoProvincial,
          cargoNacional: legajo.cargoNacional,
          fechaUltimoAscenso: legajo.fechaUltimoAscenso,
          estado: legajo.estado,
          reingreso: legajo.reingreso,
          fechaReingreso: legajo.fechaReingreso,
        },
        ascensos,
        condecoraciones,
        sanciones,
        cursos,
        observaciones,
      });

      toast.success("PDF descargado correctamente.");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Ocurrió un error al generar el PDF.");
    }
  };

  if (loading) {
    return (
      <div className="legajo-detalle-container">
        <Header title="Detalle de Legajo" onBack={() => navigate("/legajos")} />
        <p className="legajo-loading-state">Cargando legajo...</p>
      </div>
    );
  }

  if (!legajo) {
    return (
      <div className="legajo-detalle-container">
        <Header title="Detalle de Legajo" onBack={() => navigate("/legajos")} />
        <p className="legajo-error-state">No se encontró el legajo solicitado.</p>
      </div>
    );
  }

  const tituloHeader = `Legajo N° ${legajo.numeroLegajo} — ${legajo.apellido}, ${legajo.nombre}`;

  const headerButtons = [
    ...(puedeEditar && legajoIdReal
      ? [
          {
            key: "editar-legajo",
            icon: Pencil,
            onClick: () => navigate(`/editar-legajo/${legajoIdReal}`),
            ariaLabel: "Editar legajo",
          },
        ]
      : []),
    {
      key: "generar-pdf",
      icon: FileText,
      onClick: handleGenerarPDF,
      ariaLabel: "Descargar PDF",
    },
  ];

  return (
    <div className="legajo-detalle-container">
      <Header
        title={tituloHeader}
        onBack={() => navigate("/legajos")}
        extraButtons={headerButtons}
      />

      {/* Header interno informativo con foto */}
      <div className="legajo-header">
        <div className="foto-legajo">
          {legajo.fotoUrl ? (
            <img src={legajo.fotoUrl} alt="Foto carnet" />
          ) : (
            <div className="foto-placeholder">Sin foto</div>
          )}
        </div>
        <div className="legajo-info-principal">
          <h2>
            {legajo.apellido}, {legajo.nombre}
          </h2>
          <p className="legajo-subinfo">
            Legajo N°: {legajo.numeroLegajo} &nbsp;·&nbsp;
            Fed. N°: {legajo.numeroLegajoFederacion || "—"} &nbsp;·&nbsp;
            RUBA N°: {legajo.numeroLegajoRUBA || "—"}
          </p>
        </div>
      </div>

      {/* Grilla de datos personales e institucionales */}
      <div className="datos-grid">
        <div className="datos-seccion">
          <h3>Datos personales</h3>
          <p><strong>DNI</strong> {legajo.dni || "—"}</p>
          <p><strong>Fecha nacimiento</strong> {legajo.fechaNacimiento || "—"}</p>
          <p><strong>Grupo sanguíneo</strong> {legajo.grupoSanguineo || "—"}</p>
          <p>
            <strong>Domicilio</strong> {legajo.domicilio || "—"}{" "}
            <strong>Ciudad</strong> {legajo.ciudad || "—"}{" "}
          </p>
          <p><strong>Domicilio laboral</strong> {legajo.domicilioLaboral || "—"}</p>
          <p><strong>Obra social</strong> {legajo.obraSocial || "—"}</p>
          <p><strong>Carnet conducir</strong> {legajo.carnetConducir || "—"}</p>
          <p><strong>Altura / Peso</strong> {legajo.altura || "—"} cm / {legajo.peso || "—"} kg</p>
          <p><strong>Estado civil</strong> {legajo.estadoCivil || "—"}</p>
          {(legajo.estadoCivil === "Casado/a" || legajo.estadoCivil === "Concubinato / Unión Convivencial" || Boolean(legajo.conyuge)) && (
            <p>
              <strong>Cónyuge</strong> {legajo.conyuge || "—"}{" "}
              {legajo.dniConyuge ? `(DNI: ${legajo.dniConyuge})` : ""}
            </p>
          )}

          {legajo.hijos && legajo.hijos.length > 0 && (
            <>
              <h4>Hijos</h4>
              <div className="hijos-lista">
                {legajo.hijos.map((h, i) => (
                  <div className="hijo-item" key={h.dni || i}>
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
          <p>
            <strong>Reingreso</strong>{" "}
            {legajo.reingreso === "Sí" && legajo.fechaReingreso && legajo.fechaReingreso !== "—"
              ? `Sí (${legajo.fechaReingreso})`
              : legajo.reingreso || "—"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
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