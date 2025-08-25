import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../../app/firebase-config";
import { FiRefreshCw } from "react-icons/fi";
import Header from "../../components/Header";
import './CombustibleLista.css';

interface Unidad {
    id: string;
    nombre: string;
    tipo?: string;
    combustible: string;
    fechaControl?: string | null;
}

const CombustibleLista: React.FC = () => {
    const [unidades, setUnidades] = useState<Unidad[]>([]);
    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState(false);

    const obtenerUnidades = async () => {
        setActualizando(true);
        const snapshot = await getDocs(collection(db, 'unidades'));

        const data = snapshot.docs.map(doc => {
            const unidad = doc.data();
            let fechaControlFormateada: string | null = null;

            if (unidad.fechaControlCombustible) {
                if (unidad.fechaControlCombustible.seconds) {
                    fechaControlFormateada = new Date(unidad.fechaControlCombustible.seconds * 1000).toISOString();
                } else {
                    fechaControlFormateada = unidad.fechaControlCombustible;
                }
            }

            return {
                id: doc.id,
                nombre: unidad.nombre || doc.id,
                tipo: unidad.tipo || '',
                combustible: unidad.combustible || 'Desconocido',
                fechaControl: fechaControlFormateada,
            } as Unidad;
        });

        data.sort((a, b) => {
            const numA = parseInt(a.nombre.match(/\d+/)?.[0] || '0', 10);
            const numB = parseInt(b.nombre.match(/\d+/)?.[0] || '0', 10);
            return numA - numB;
        });

        setUnidades(data);
        setCargando(false);
        setActualizando(false);
    };

    useEffect(() => {
        obtenerUnidades();
    }, []);

    return (
        <div className="combustible-lista">

            {/* Header nuevo 👇 */}
            <Header
                title="Control Combustible"
                extraButtons={[
                    {
                        key: "refresh",
                        icon: FiRefreshCw,
                        ariaLabel: "Actualizar lista",
                        className: actualizando ? "btn-disabled" : "",
                        onClick: obtenerUnidades
                    }
                ]}
            />

            <div className="combustible-contenido">
                {cargando ? (
                    <p className="cargando">Cargando unidades...</p>
                ) : (
                    unidades.map(unidad => (
                        <div
                            key={unidad.id}
                            className={`unidad-card-combustible borde-${unidad.combustible.replace("/", "")}`}
                        >
                            <div className="unidad-info">
                                <p className="unidad-nombre">
                                    {unidad.nombre} <span className="unidad-tipo">| {unidad.tipo}</span>
                                </p>

                                <div className="nivel-fecha-container">
                                    {unidad.fechaControl && (
                                        <span className="fecha-control">
                                            Último control: {new Date(unidad.fechaControl).toLocaleDateString()}
                                        </span>
                                    )}

                                    <p className={`nivel-combustible nivel-${unidad.combustible.replace("/", "")}`}>
                                        Nivel: {unidad.combustible}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CombustibleLista;
