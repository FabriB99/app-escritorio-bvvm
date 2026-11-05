import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../../app/firebase-config";
import { useNavigate } from 'react-router-dom';
import { Truck, ChevronRight } from 'lucide-react';
import './SeleccionarUnidadRevision.css';
import Header from "../../components/Header";
import PageLoader from "../../components/PageLoader/PageLoader";

interface Unidad {
    id: string;
    nombre: string;
    tipo: string;
}

const SeleccionarUnidadSeleccion: React.FC = () => {
    const [unidades, setUnidades] = useState<Unidad[]>([]);
    const [cargando, setCargando] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUnidades = async () => {
            setCargando(true);
            try {
                const snapshot = await getDocs(collection(db, 'unidades'));
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    nombre: doc.data().nombre || doc.id,
                    tipo: doc.data().tipo || '',
                }));

                const dataOrdenada = data.sort((a, b) => {
                    const numA = parseInt(a.nombre.replace(/\D/g, ''), 10) || 0;
                    const numB = parseInt(b.nombre.replace(/\D/g, ''), 10) || 0;
                    return numA - numB;
                });

                setUnidades(dataOrdenada);
            } catch (error) {
                console.error('Error al obtener las unidades:', error);
            } finally {
                setCargando(false);
            }
        };

        fetchUnidades();
    }, []);

    return (
        <div className="elegir-unidad-container">
            <Header
                title="Historial de Revisiones"
            />

            <div className="elegir-unidad-contenido">
                {cargando ? (
                    <PageLoader texto="Cargando unidades..." />
                ) : (
                    <div className="unidad-lista">
                        {unidades.map(unidad => (
                            <div
                                key={unidad.id}
                                className="unidad-card-seleccion"
                                onClick={() => navigate(`/historial-revisiones/${unidad.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        navigate(`/historial-revisiones/${unidad.id}`);
                                    }
                                }}
                            >
                                <div className="unidad-card-icono-wrapper">
                                    <Truck size={24} className="unidad-card-icono" />
                                </div>
                                <div className="unidad-card-info">
                                    <span className="unidad-nombre-seleccion">{unidad.nombre}</span>
                                    {unidad.tipo ? (
                                        <span className="unidad-tipo-seleccion">{unidad.tipo}</span>
                                    ) : (
                                        <span className="unidad-tipo-seleccion tipo-vacio">Unidad Operativa</span>
                                    )}
                                </div>
                                <div className="unidad-card-arrow-wrapper">
                                    <ChevronRight size={20} className="unidad-card-arrow" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeleccionarUnidadSeleccion;

