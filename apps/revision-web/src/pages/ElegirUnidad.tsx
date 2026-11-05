import { useEffect, useState } from "react";
import { getUnidades } from "../firebase/firestore";
import { Unidad } from "../../../shared/types/Unidad";
import { useNavigate, Link } from "react-router-dom";
import LayoutContainer from "../components/LayoutContainer";
import { ArrowLeft, ChevronRight, Truck } from "lucide-react";
import "../styles/ElegirUnidad.css";

interface UnidadConRevision extends Unidad {
    ultima_revision?: any;
}

function formatearUltimaRevision(ultimaRevision: any): { texto: string; estado: "hoy" | "reciente" | "antigua" | "sin-fecha" } {
    if (!ultimaRevision) {
        return { texto: "Sin fecha", estado: "sin-fecha" };
    }

    let date: Date;
    if (typeof ultimaRevision.toDate === "function") {
        date = ultimaRevision.toDate();
    } else if (ultimaRevision.seconds) {
        date = new Date(ultimaRevision.seconds * 1000);
    } else if (ultimaRevision instanceof Date) {
        date = ultimaRevision;
    } else {
        date = new Date(ultimaRevision);
    }

    if (isNaN(date.getTime())) {
        return { texto: "Sin fecha", estado: "sin-fecha" };
    }

    const hoy = new Date();
    const esHoy =
        date.getDate() === hoy.getDate() &&
        date.getMonth() === hoy.getMonth() &&
        date.getFullYear() === hoy.getFullYear();

    if (esHoy) {
        return { texto: "Revisada hoy", estado: "hoy" };
    }

    const difMilis = hoy.getTime() - date.getTime();
    const difDias = Math.floor(difMilis / (1000 * 60 * 60 * 24));

    if (difDias <= 0) {
        return { texto: "Revisada hoy", estado: "hoy" };
    } else if (difDias === 1) {
        return { texto: "Hace 1 día", estado: "reciente" };
    } else if (difDias < 7) {
        return { texto: `Hace ${difDias} días`, estado: "reciente" };
    } else {
        return { texto: `Hace ${difDias} días`, estado: "antigua" };
    }
}

function ElegirUnidad() {
    const [unidades, setUnidades] = useState<UnidadConRevision[]>([]);
    const [cargando, setCargando] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        getUnidades()
            .then((unidades) => {
                const ordenadas = [...unidades].sort((a, b) => {
                    const numA = parseInt(a.nombre.match(/\d+/)?.[0] || "0", 10);
                    const numB = parseInt(b.nombre.match(/\d+/)?.[0] || "0", 10);
                    return numA - numB;
                });
                setUnidades(ordenadas as UnidadConRevision[]);
                setCargando(false);
            })
            .catch((err) => {
                console.error("Error al cargar unidades:", err);
                setCargando(false);
            });
    }, []);

    const irARevision = (unidad: Unidad) => {
        navigate(`/revision/${unidad.id}`, {
            state: {
                nombre: unidad.nombre,
            },
        });
    };

    return (
        <LayoutContainer>
            <div className="elegir-unidad-container">
                <div className="elegir-top-bar">
                    <Link to="/" className="btn-volver">
                        <ArrowLeft size={18} />
                        <span>Volver</span>
                    </Link>
                    <div className="brand-header-compact">
                        <img src="/logo-bomberos.png" alt="Escudo" className="brand-logo-compact" />
                        <span className="brand-text-compact">Bomberos Villa María</span>
                    </div>
                </div>

                <div className="elegir-header">
                    <h1 className="titulo-principal">Control de Unidades</h1>
                    <p className="subtitulo">Seleccioná una unidad para iniciar su revisión</p>
                </div>

                {cargando ? (
                    <div className="elegir-loading">
                        <p>Cargando unidades...</p>
                    </div>
                ) : (
                    <div className="unidad-grilla">
                        {unidades.map((unidad) => {
                            const rev = formatearUltimaRevision(unidad.ultima_revision);
                            return (
                                <button
                                    key={unidad.id}
                                    type="button"
                                    className="unidad-card"
                                    onClick={() => irARevision(unidad)}
                                >
                                    <div className="unidad-card-left">
                                        <div className="unidad-icon-wrapper">
                                            <Truck size={22} />
                                        </div>
                                        <div className="unidad-info">
                                            <span className="unidad-nombre">{unidad.nombre}</span>
                                            <div className="unidad-badges-row">
                                                {unidad.tipo && (
                                                    <span className="badge-tipo-unidad">{unidad.tipo}</span>
                                                )}
                                                <span className={`badge-revision badge-${rev.estado}`}>
                                                    {rev.texto}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="unidad-card-arrow" size={20} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </LayoutContainer>
    );
}

export default ElegirUnidad;
