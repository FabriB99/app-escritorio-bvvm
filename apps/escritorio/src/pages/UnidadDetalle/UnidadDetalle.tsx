// src/pages/UnidadDetalle/UnidadDetalle.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from "../../app/firebase-config";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import './UnidadDetalle.css';
import {
  Pencil,
  CircleCheck,
  XCircle,
  AlertTriangle,
  CircleHelp,
} from "lucide-react";
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

interface Unidad {
    id: string;
    nombre: string;
    tipo: string;
    modelo: string;
    patente: string;
    kilometraje?: string;
    combustible?: string;
    imagen?: string;
    ultima_revision?: { seconds: number };
}

const getEstadoIcono = (estado: string) => {
    const estadoLower = estado?.toLowerCase();

    switch (estadoLower) {
        case 'operativo':
            return (
                <span className="estado-completo">
                    <CircleCheck className="icon-estado icon-operativo" size={18} strokeWidth={2} aria-hidden />
                    Operativo
                </span>
            );
        case 'con falla':
            return (
                <span className="estado-completo">
                    <XCircle className="icon-estado icon-falla" size={18} strokeWidth={2} aria-hidden />
                    Con falla
                </span>
            );
        case 'faltante':
            return (
                <span className="estado-completo">
                    <AlertTriangle className="icon-estado icon-faltante" size={18} strokeWidth={2} aria-hidden />
                    Faltante
                </span>
            );
        default:
            return (
                <span className="estado-completo">
                    <CircleHelp className="icon-estado icon-desconocido" size={18} strokeWidth={2} aria-hidden />
                    Desconocido
                </span>
            );
    }
};

const UnidadDetalle: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const [unidad, setUnidad] = useState<Unidad | null>(null);
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [cargando, setCargando] = useState(true);

    const fetchUnidad = async ({ silent = false }: { silent?: boolean } = {}) => {
        if (!id) return;
        console.log("🔍 Buscando en Firestore el ID:", id);
        if (!silent) {
            setCargando(true);
        }

        try {
            const unidadRef = doc(db, 'unidades', id);
            const ubicacionesQuery = query(
                collection(db, 'ubicaciones'),
                where('unidad_id', '==', id),
                orderBy('orden')
            );

            const [unidadDoc, ubicacionesSnapshot] = await Promise.all([
                getDoc(unidadRef),
                getDocs(ubicacionesQuery),
            ]);

            if (!unidadDoc.exists()) {
                setUnidad(null);
                setUbicaciones([]);
                return;
            }

            const elementosQuery = query(
                collection(db, 'elementos'),
                where('unidad_id', '==', id),
                orderBy('orden')
            );
            const elementosSnapshot = await getDocs(elementosQuery);

            const ubicacionesData: Ubicacion[] = ubicacionesSnapshot.docs.map((ubicacionDoc) => ({
                id: ubicacionDoc.id,
                nombre: (ubicacionDoc.data().nombre as string) ?? '',
                elementos: [],
            }));

            const ubicacionIndex = new Map<string, number>();
            ubicacionesData.forEach((ubicacion, index) => {
                ubicacionIndex.set(ubicacion.id, index);
            });

            elementosSnapshot.docs.forEach((el) => {
                const data = el.data();
                const ubicacionId = data.ubicacion_id as string | undefined;
                if (!ubicacionId) return;

                const idx = ubicacionIndex.get(ubicacionId);
                if (idx === undefined) return;

                const elemento: Elemento = {
                    id: el.id,
                    nombre: (data.nombre as string) ?? '',
                    cantidad: String(data.cantidad ?? '-'),
                    estado: (data.estado as string) ?? "Desconocido",
                };

                ubicacionesData[idx].elementos.push(elemento);
            });

            const nextUnidad: Unidad = {
                id: unidadDoc.id,
                ...(unidadDoc.data() as Omit<Unidad, "id">),
            };

            // Aplicamos ambos estados juntos para reducir renders visibles.
            setUnidad(nextUnidad);
            setUbicaciones(ubicacionesData);
        } catch (error) {
            console.error('Error al obtener los datos:', error);
        } finally {
            if (!silent) {
                setCargando(false);
            }
        }
    };

    useEffect(() => {
        fetchUnidad({ silent: false });

        const handleFocus = () => {
            fetchUnidad({ silent: true });
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
                ...(user?.rol === 'admin' || user?.rol === 'jefatura' || user?.rol === 'guardia'
                ? [
                    {
                        icon: Pencil,
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
