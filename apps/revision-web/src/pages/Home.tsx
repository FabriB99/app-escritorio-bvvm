import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LayoutContainer from "../components/LayoutContainer";
import {
  ClipboardCheck,
  Fuel,
  ChevronRight,
  Navigation,
  MapPin,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { suscribirSalidasActivas, marcarArriboUnidad } from "../firebase/firestore";
import { SalidaUnidad } from "../../../shared/types/SalidaUnidad";
import toast from "react-hot-toast";
import "../styles/Home.css";

interface IncidenteAgrupado {
  incidenteId: string;
  direccion: string;
  barrio?: string;
  tipoSiniestro: string;
  notaGuardia?: string;
  coordenadas?: { lat: number; lng: number } | null;
  salidas: SalidaUnidad[];
}

function obtenerUrlGoogleMaps(incidente: IncidenteAgrupado): string {
  if (
    incidente.coordenadas &&
    typeof incidente.coordenadas.lat === "number" &&
    typeof incidente.coordenadas.lng === "number" &&
    !isNaN(incidente.coordenadas.lat) &&
    !isNaN(incidente.coordenadas.lng)
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${incidente.coordenadas.lat},${incidente.coordenadas.lng}&travelmode=driving`;
  }

  const queryDireccion = encodeURIComponent(
    `${incidente.direccion || ""}, Villa María, Córdoba, Argentina`
  );
  return `https://www.google.com/maps/dir/?api=1&destination=${queryDireccion}&travelmode=driving`;
}

function Home() {
  const navigate = useNavigate();
  const [salidasActivas, setSalidasActivas] = useState<SalidaUnidad[]>([]);
  const [confirmandoSalidaId, setConfirmandoSalidaId] = useState<string | null>(null);
  const [guardandoArriboId, setGuardandoArriboId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = suscribirSalidasActivas((salidas) => {
      setSalidasActivas(salidas);
    });
    return () => unsubscribe();
  }, []);

  const incidentes: IncidenteAgrupado[] = Object.values(
    salidasActivas.reduce<Record<string, IncidenteAgrupado>>((acc, salida) => {
      const key = salida.incidenteId || "sin-incidente";
      if (!acc[key]) {
        acc[key] = {
          incidenteId: key,
          direccion: salida.direccion,
          barrio: salida.barrio,
          tipoSiniestro: salida.tipoSiniestro,
          notaGuardia: salida.notaGuardia,
          coordenadas: salida.coordenadas,
          salidas: [],
        };
      }
      acc[key].salidas.push(salida);
      return acc;
    }, {})
  );

  const handleConfirmarArribo = async (salida: SalidaUnidad) => {
    if (!salida.id) return;
    setGuardandoArriboId(salida.id);
    try {
      const ahora = new Date();
      const horas = String(ahora.getHours()).padStart(2, "0");
      const minutos = String(ahora.getMinutes()).padStart(2, "0");
      const horaActual = `${horas}:${minutos}`;

      await marcarArriboUnidad(salida.id, horaActual);
      toast.success(`Arribo registrado: ${salida.unidadNombre} (${horaActual} hs)`);
      setConfirmandoSalidaId(null);
    } catch (error) {
      console.error("Error al marcar arribo:", error);
      toast.error("Error al registrar arribo de la unidad");
    } finally {
      setGuardandoArriboId(null);
    }
  };

  return (
    <LayoutContainer>
      <div className="home-container">
        <header className="home-header">
          <img
            src="/logo-bomberos.png"
            alt="Escudo Bomberos Villa María"
            className="home-logo"
          />
          <h1 className="home-title">Bomberos Voluntarios</h1>
          <p className="home-subtitle">· Villa María ·</p>
        </header>

        {/* Panel de Salidas Activas si hay emergencias en curso */}
        {incidentes.length > 0 && (
          <section className="salidas-activas-seccion" aria-label="Emergencias en curso">
            {incidentes.map((incidente) => {
              const mapsUrl = obtenerUrlGoogleMaps(incidente);
              return (
                <article key={incidente.incidenteId} className="tarjeta-incidente-activo">
                  <div className="incidente-cabecera">
                    <div className="incidente-alerta-tag">
                      <span className="pulse-indicator" aria-hidden="true"></span>
                      <span>Intervención en curso</span>
                    </div>
                    {incidente.tipoSiniestro && (
                      <span className="incidente-tipo-badge">
                        {incidente.tipoSiniestro}
                      </span>
                    )}
                  </div>

                  <div className="incidente-cuerpo">
                    <div className="incidente-direccion-row">
                      <MapPin size={20} className="incidente-map-icon" />
                      <h2 className="incidente-direccion">{incidente.direccion}</h2>
                    </div>
                    {incidente.barrio && (
                      <span className="incidente-barrio">B° {incidente.barrio}</span>
                    )}
                    {incidente.notaGuardia && (
                      <div className="incidente-nota">
                        <strong>Nota:</strong> {incidente.notaGuardia}
                      </div>
                    )}
                  </div>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gps-maps"
                  >
                    <Navigation size={18} />
                    <span>Abrir ubicación en Google Maps</span>
                  </a>

                  <div className="incidente-unidades-lista">
                    <span className="incidente-unidades-titulo">Unidades asignadas</span>
                    {incidente.salidas.map((salida) => {
                      const estaEnLugar =
                        salida.estado === "en_lugar" || Boolean(salida.horaLlegada);
                      const enConfirmacion = confirmandoSalidaId === salida.id;
                      const procesando = guardandoArriboId === salida.id;

                      return (
                        <div
                          key={salida.id || salida.unidadId}
                          className="unidad-salida-row"
                        >
                          <div className="unidad-salida-info">
                            <Truck size={18} className="unidad-salida-icon" />
                            <span className="unidad-salida-nombre">
                              {salida.unidadNombre}
                            </span>
                          </div>

                          <div className="unidad-salida-accion">
                            {estaEnLugar ? (
                              <span className="badge-en-lugar">
                                <CheckCircle2 size={16} />
                                <span>
                                  En el lugar · {salida.horaLlegada || "--:--"} hs
                                </span>
                              </span>
                            ) : enConfirmacion ? (
                              <div className="confirmacion-arribo-box">
                                <span className="confirmacion-texto">
                                  ¿Confirmar llegada de <strong>{salida.unidadNombre}</strong>?
                                </span>
                                <div className="confirmacion-botones">
                                  <button
                                    type="button"
                                    className="btn-cancelar-arribo"
                                    onClick={() => setConfirmandoSalidaId(null)}
                                    disabled={procesando}
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-confirmar-arribo"
                                    onClick={() => handleConfirmarArribo(salida)}
                                    disabled={procesando}
                                  >
                                    {procesando ? "Guardando..." : "Sí, llegó"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn-marcar-arribo"
                                onClick={() => setConfirmandoSalidaId(salida.id || null)}
                              >
                                Marcar Arribo
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <div className="home-cards">
          <button
            type="button"
            className="home-card"
            onClick={() => navigate("/control-unidades")}
          >
            <div className="home-card-icon-wrapper icon-blue">
              <ClipboardCheck className="home-card-icon" size={26} />
            </div>
            <div className="home-card-content">
              <h2 className="home-card-title">Control de Unidades</h2>
              <p className="home-card-subtitle">Inspección de equipamiento y cajoneras</p>
            </div>
            <ChevronRight className="home-card-arrow" size={22} />
          </button>

          <button
            type="button"
            className="home-card"
            onClick={() => navigate("/control-combustible")}
          >
            <div className="home-card-icon-wrapper icon-amber">
              <Fuel className="home-card-icon" size={26} />
            </div>
            <div className="home-card-content">
              <h2 className="home-card-title">Control de Combustible</h2>
              <p className="home-card-subtitle">Niveles de tanque de las unidades</p>
            </div>
            <ChevronRight className="home-card-arrow" size={22} />
          </button>
        </div>
      </div>
    </LayoutContainer>
  );
}

export default Home;
