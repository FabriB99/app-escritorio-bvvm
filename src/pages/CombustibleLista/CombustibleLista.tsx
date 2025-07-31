import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../../app/firebase-config";
import { FiRefreshCw } from "react-icons/fi";
import './CombustibleLista.css';

interface Unidad {
    id: string;
    nombre: string;
    tipo?: string;
    combustible: string;
    fechaControl?: string | null; // fecha como string ISO o null
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
                    // Es un timestamp de Firebase
                    fechaControlFormateada = new Date(unidad.fechaControlCombustible.seconds * 1000).toISOString();
                } else {
                    // Ya es string
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

        // Ordenar por número en el nombre
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
            <div className="header-container">
                <div className="header-title-container">
                    <h2 className="header-title">Niveles de Combustible</h2>
                </div>

                <div className="actualizar-container">
                    <button
                        className="actualizar-icon"
                        onClick={obtenerUnidades}
                        disabled={actualizando}
                        title={actualizando ? 'Actualizando...' : 'Actualizar'}
                    >
                        <FiRefreshCw />
                    </button>
                </div>
            </div>

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
