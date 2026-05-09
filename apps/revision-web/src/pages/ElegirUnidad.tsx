import { useEffect, useState } from "react";
import { getUnidades } from "../firebase/firestore";
import { Unidad } from "../../../shared/types/Unidad";
import { useNavigate, Link } from "react-router-dom";
import LayoutContainer from "../components/LayoutContainer";
import "../styles/ElegirUnidad.css";

function ElegirUnidad() {
    const [unidades, setUnidades] = useState<Unidad[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        getUnidades().then((unidades) => {
            // Ordena por número si los nombres son del tipo "Unidad 1", "Unidad 2", ...
            const ordenadas = [...unidades].sort((a, b) => {
                const numA = parseInt(a.nombre.match(/\d+/)?.[0] || "0");
                const numB = parseInt(b.nombre.match(/\d+/)?.[0] || "0");
                return numA - numB;
            });
            setUnidades(ordenadas);
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
                <Link to="/" style={{ display: 'flex', justifyContent: 'center' }}>
                    <img src="/logo-bomberos.png" alt="Logo" className="elegir-logo" />
                </Link>
                <h1 className="titulo-principal">Control de Unidades</h1>
                <h2 className="subtitulo">Elegir Unidad</h2>

                <div className="unidad-lista">
                    {unidades.map((unidad) => (
                        <button
                            key={unidad.id}
                            className="unidad-card"
                            onClick={() => irARevision(unidad)}
                        >
                            {unidad.nombre}
                        </button>
                    ))}
                </div>
            </div>
        </LayoutContainer>
    );

}

export default ElegirUnidad;
