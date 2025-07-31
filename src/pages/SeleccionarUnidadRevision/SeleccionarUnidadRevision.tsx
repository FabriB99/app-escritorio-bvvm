import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../../app/firebase-config";
import { useNavigate } from 'react-router-dom';
import './SeleccionarUnidadRevision.css';

interface Unidad {
    id: string;
    nombre: string;
    tipo: string;
}

const SeleccionarUnidadSeleccion: React.FC = () => {
    const [unidades, setUnidades] = useState<Unidad[]>([]);
    const [cargando, setCargando] = useState(true); // 🆕
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUnidades = async () => {
            setCargando(true); // 🆕
            try {
                const snapshot = await getDocs(collection(db, 'unidades'));
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    nombre: doc.data().nombre,
                    tipo: doc.data().tipo || '', // por si alguno no tiene tipo
                }));

                const dataOrdenada = data.sort((a, b) => {
                    const numA = parseInt(a.nombre.replace(/\D/g, ''), 10);
                    const numB = parseInt(b.nombre.replace(/\D/g, ''), 10);
                    return numA - numB;
                });

                setUnidades(dataOrdenada);
            } catch (error) {
                console.error('Error al obtener las unidades:', error);
            }
            setCargando(false); // 🆕
        };

        fetchUnidades();
    }, []);

    return (
        <div className="elegir-unidad-container">
            <h1 className="titulo-principal">Historiales</h1>

            {cargando ? (
                <div className="cargando">
                    <p>Cargando unidades...</p>
                </div>
            ) : (
                <div className="unidad-lista">
                    {unidades.map(unidad => (
                        <div
                            key={unidad.id}
                            className="unidad-card-seleccion" // Cambié el nombre aquí también
                            onClick={() => navigate(`/historial-revisiones/${unidad.id}`)}
                        >
                            <div className="unidad-nombre-seleccion">{unidad.nombre}</div> {/* Cambié el nombre aquí */}
                            <div className="unidad-tipo-seleccion">{unidad.tipo}</div> {/* Cambié el nombre aquí */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SeleccionarUnidadSeleccion;
