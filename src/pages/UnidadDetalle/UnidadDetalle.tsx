// src/pages/UnidadDetalle/UnidadDetalle.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from "../../app/firebase-config";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import './UnidadDetalle.css';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaQuestionCircle } from "react-icons/fa";
import { FiEdit } from "react-icons/fi";
import Header from "../../components/Header";

interface Elemento {
    id: string;
    nombre: string;
    cantidad: string;
    estado: string;
}

interface Ubicacion {
    id: string;
    nombre: string;
    elementos: Elemento[];
}

const getEstadoIcono = (estado: string) => {
    const estadoLower = estado?.toLowerCase();

    switch (estadoLower) {
        case 'operativo':
            return (
                <span className="estado-completo">
                    <FaCheckCircle className="icon-estado icon-operativo" /> Operativo
                </span>
            );
        case 'con falla':
            return (
                <span className="estado-completo">
                    <FaTimesCircle className="icon-estado icon-falla" /> Con falla
                </span>
            );
        case 'faltante':
            return (
                <span className="estado-completo">
                    <FaExclamationTriangle className="icon-estado icon-faltante" /> Faltante
                </span>
            );
        default:
            return (
                <span className="estado-completo">
                    <FaQuestionCircle className="icon-estado icon-desconocido" /> Desconocido
                </span>
            );
    }
};

const UnidadDetalle: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const [unidad, setUnidad] = useState<any>(null);
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [cargando, setCargando] = useState(true);

    const fetchUnidad = async () => {
        if (!id) return;

        setCargando(true);

        try {
            const unidadDoc = await getDoc(doc(db, 'unidades', id));
            if (!unidadDoc.exists()) {
                setUnidad(null);
                setCargando(false);
                return;
            }

            setUnidad({ id: unidadDoc.id, ...unidadDoc.data() });

            const ubicacionesQuery = query(
                collection(db, 'ubicaciones'),
                where('unidad_id', '==', id),
                orderBy('orden') // 👈 esta es la única línea que vamos a agregar
                );
            const ubicacionesSnapshot = await getDocs(ubicacionesQuery);
            const ubicacionesData: Ubicacion[] = [];

            for (const ubicacionDoc of ubicacionesSnapshot.docs) {
                const ubicacionId = ubicacionDoc.id;
                const ubicacionNombre = ubicacionDoc.data().nombre;

                const elementosQuery = query(
                collection(db, 'elementos'),
                where('ubicacion_id', '==', ubicacionId),
                orderBy('orden')  // Asegúrate de ordenar los elementos por el campo 'orden'
                );
                const elementosSnapshot = await getDocs(elementosQuery);

                const elementosData = elementosSnapshot.docs.map(el => ({
                    id: el.id,
                    nombre: el.data().nombre,
                    cantidad: el.data().cantidad,
                    estado: el.data().estado ?? "Desconocido",
                }));

                ubicacionesData.push({ id: ubicacionId, nombre: ubicacionNombre, elementos: elementosData });
            }

            setUbicaciones(ubicacionesData);
        } catch (error) {
            console.error('Error al obtener los datos:', error);
        }

        setCargando(false);
    };

    useEffect(() => {
        fetchUnidad();

        const handleFocus = () => {
            fetchUnidad();
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [id]);

    if (cargando) {
        return (
            <div className="contenido-principal">
                <div className="cargando">
                    <p>Cargando unidad...</p>
                </div>
            </div>
        );
    }

    if (!unidad) {
        return (
            <div className="contenido-principal">
                <div className="error">
                    <p>No se encontró la unidad.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="detalle-container">
            <Header
            title={`Detalle - ${unidad.nombre}`}
            onBack={() => navigate('/unidades')}
            extraButtons={[
                ...(user?.rol === 'admin' || user?.rol === 'jefatura'
                ? [
                    {
                        icon: FiEdit,
                        onClick: () => navigate(`/editar-unidad/${id}`),
                        ariaLabel: 'Editar unidad',
                        className: 'header-btn-edit', // opcional para estilos extra
                    },
                    ]
                : []),
            ]}
            />

            <div className="detalle-contenido">
                <div className="detalle-header-contenido">
                    <img
                        className="detalle-imagen"
                        src={unidad.imagen || '/camion-de-bomberos.ico'}
                        alt={unidad.nombre}
                    />

                    <div className="detalle-info">
                        <div className="detalle-info-nombre-tipo">
                            <h2 className="detalle-nombre">
                                {unidad.nombre}
                            </h2>
                            <span className="detalle-tipo">{unidad.tipo}</span>
                        </div>

                        <div className="detalle-info-datos">
                            <p>
                                <strong>Modelo:</strong> {unidad.modelo} | <strong>Patente:</strong> {unidad.patente}
                            </p>
                            <p>
                                <strong>Kilómetros:</strong> {unidad.kilometraje || 'No disponible'} | <strong>Combustible:</strong> {unidad.combustible || 'No disponible'}
                            </p>
                            <p>
                                <strong>Última revisión:</strong>{' '}
                                {unidad.ultima_revision?.seconds
                                    ? new Date(unidad.ultima_revision.seconds * 1000).toLocaleDateString()
                                    : 'Sin fecha'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="detalle-ubicaciones">
                    {ubicaciones.map((ubicacion) => (
                        <div key={ubicacion.id} className="detalle-ubicacion-card">
                            <div className="detalle-ubicacion-header">
                                <span className="detalle-ubicacion-nombre">{ubicacion.nombre}</span>
                                <span className="detalle-header-cantidad">Cantidad</span>
                                <span className="detalle-header-estado">Estado</span>
                            </div>
                            <div className="detalle-elementos">
                                {ubicacion.elementos.length > 0 ? (
                                    ubicacion.elementos.map((elemento) => (
                                        <div key={elemento.id} className="detalle-elemento-item">
                                            <span className="detalle-elemento-nombre">{elemento.nombre}</span>
                                            <span className="detalle-elemento-cantidad">{elemento.cantidad}</span>
                                            <span className="detalle-elemento-estado">{getEstadoIcono(elemento.estado)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="detalle-sin-elementos">Sin elementos</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UnidadDetalle;
