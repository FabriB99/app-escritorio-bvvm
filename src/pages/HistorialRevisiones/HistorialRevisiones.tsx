import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from "../../app/firebase-config";
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaQuestionCircle } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { mostrarToast } from '../../utils/toast'; 
import { useUser } from '../../context/UserContext'; // ✅
import './HistorialRevisiones.css';
import Header from "../../components/Header";

interface Revision {
    id: string;
    bombero: string;
    fecha: Date;
    observaciones: string;
    elementos: Record<string, string>;
}

interface Elemento {
    id: string;
    nombre: string;
    ubicacion: string;
}

interface ElementoRaw {
    id: string;
    nombre: string;
    ubicacion_id?: string;
}

export default function HistorialRevisiones() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser(); // Asegúrate de obtener el usuario correctamente
    const [nombreUnidad, setNombreUnidad] = useState('');
    const [revisiones, setRevisiones] = useState<Revision[]>([]);
    const [elementosMapa, setElementosMapa] = useState<Record<string, Elemento>>({});
    const [expandido, setExpandido] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [revisionAEliminar, setRevisionAEliminar] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            setCargando(true);
            try {
                if (!id) return;

                // 1. Traer el nombre de la unidad
                const unidadDoc = await getDoc(doc(db, 'unidades', id));
                if (unidadDoc.exists()) {
                    setNombreUnidad(unidadDoc.data().nombre || id);
                }

                // 2. Traer todos los elementos
                const elementosSnap = await getDocs(collection(db, 'elementos'));
                const elementosRaw: ElementoRaw[] = elementosSnap.docs.map(doc => ({
                    id: doc.id,
                    ...(doc.data() as Omit<ElementoRaw, 'id'>),
                }));

                // 3. Traer todas las ubicaciones de una sola vez
                const ubicacionesSnap = await getDocs(collection(db, 'ubicaciones'));
                const ubicacionesMap: Record<string, string> = {};
                ubicacionesSnap.forEach(doc => {
                    ubicacionesMap[doc.id] = doc.data().nombre;
                });

                // 4. Mapear elementos con sus ubicaciones
                const mapa: Record<string, Elemento> = {};
                for (const el of elementosRaw) {
                    const nombreUbicacion = el.ubicacion_id && ubicacionesMap[el.ubicacion_id]
                        ? ubicacionesMap[el.ubicacion_id]
                        : 'Sin ubicación';

                    mapa[el.id] = {
                        id: el.id,
                        nombre: el.nombre,
                        ubicacion: nombreUbicacion,
                    };
                }
                setElementosMapa(mapa);

                // 5. Traer todas las revisiones de esta unidad
                const q = query(collection(db, 'revisiones'), where('unidadId', '==', id));
                const snapshot = await getDocs(q);
                const data: Revision[] = snapshot.docs.map(doc => {
                    const rev = doc.data();
                    return {
                        id: doc.id,
                        bombero: rev.bombero,
                        fecha: new Date(rev.fecha.seconds * 1000),
                        observaciones: rev.observaciones,
                        elementos: rev.elementos,
                    };
                }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

                setRevisiones(data);
            } catch (error) {
                console.error('Error cargando datos del historial:', error);
            }
            setCargando(false);
        };

        cargarDatos();
    }, [id]);


    const formatearFecha = (fecha: Date) => {
        return fecha.toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const toggleExpandido = (revId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setExpandido(prev => (prev === revId ? null : revId));
    };

    const abrirModalRevision = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRevisionAEliminar(id);
        setIsModalOpen(true);
    };

    const cerrarModal = () => {
        setIsModalOpen(false);
        setRevisionAEliminar(null);
    };

    const eliminarRevision = async () => {
        if (!revisionAEliminar) return;
        try {
            await deleteDoc(doc(db, 'revisiones', revisionAEliminar));
            setRevisiones(prev => prev.filter(rev => rev.id !== revisionAEliminar));
            mostrarToast('Revisión eliminada correctamente');
            cerrarModal();
        } catch (error) {
            console.error('Error al eliminar revisión:', error);
            mostrarToast('Hubo un error al eliminar la revisión');
        }
    };

    return (

            <div className="historial-revisiones__contenedor-principal">
                <Header
                title={`Historial de ${nombreUnidad}`}
                onBack={() => navigate('/seleccionar-unidad-historial')}
                />


            {cargando ? (
                <div className="cargando">
                    <p>Cargando historial...</p>
                </div>
            ) : (
                <>
                    {revisiones.map((rev) => {
                        const elementosConProblemas = Object.entries(rev.elementos).filter(([, estado]) =>
                            estado.toLowerCase() === 'faltante' || estado.toLowerCase() === 'con falla'
                        );

                        return (
                            <div
                                key={rev.id}
                                className={`revision-card ${expandido === rev.id ? 'expandido' : ''}`}
                                onClick={(e) => toggleExpandido(rev.id, e)}
                            >
                                {/* Solo mostrar el botón de eliminación si el rol es 'admin' */}
                                {user?.rol === 'admin' && (
                                    <button
                                        className="boton-eliminar-revision"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            abrirModalRevision(rev.id, e);
                                        }}
                                    >
                                        <MdClose size={20} />
                                    </button>
                                )}
                                <div className="revision-info">
                                    <p><strong>Fecha:</strong> {formatearFecha(rev.fecha)}</p>
                                    {expandido === rev.id && (
                                        <>
                                            <p><strong>Bombero/s:</strong> {rev.bombero}</p>
                                            <p className="revision-observaciones"><strong>Observaciones:</strong> {rev.observaciones || 'Sin observaciones'}</p>

                                            <div className="revision-elementos">
                                                <h4>Detalles:</h4>
                                                <div className="lista-elementos">
                                                    {(() => {
                                                        const elementosPorUbicacion: Record<string, { nombre: string; estado: string }[]> = {};

                                                        elementosConProblemas.forEach(([elementoId, estado]) => {
                                                            const elemento = elementosMapa[elementoId];
                                                            if (!elemento) return;

                                                            const ubicacion = elemento.ubicacion || 'Sin ubicación';
                                                            if (!elementosPorUbicacion[ubicacion]) {
                                                                elementosPorUbicacion[ubicacion] = [];
                                                            }

                                                            elementosPorUbicacion[ubicacion].push({
                                                                nombre: elemento.nombre,
                                                                estado,
                                                            });
                                                        });

                                                        return Object.entries(elementosPorUbicacion).map(([ubicacion, elementos]) => (
                                                            <div key={ubicacion} className="detalle-elemento">
                                                                <div className="elemento-ubicacion"><strong>{ubicacion}</strong></div>
                                                                <div className="lista-elementos">
                                                                    {elementos.map((el, idx) => (
                                                                        <div key={idx} className="item-elemento">
                                                                            <span className="estado-icono">{getEstadoIcono(el.estado)}</span>
                                                                            <span className="elemento-nombre">{el.nombre}</span>
                                                                            <span className="elemento-estado"> — {el.estado}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {revisiones.length === 0 && !cargando && (
                        <p>No hay revisiones registradas para esta unidad.</p>
                    )}
                </>
            )}

            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>¿Estás seguro de que quieres eliminar esta revisión?</h3>
                        <div className="modal-buttons">
                            <button className="btn-eliminar-modal" onClick={eliminarRevision}>Eliminar</button>
                            <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getEstadoIcono(estado: string) {
    switch (estado.toLowerCase()) {
        case 'faltante':
            return <FaTimesCircle className="icon-faltante" />;
        case 'con falla':
            return <FaExclamationTriangle className="icon-falla" />;
        case 'bueno':
            return <FaCheckCircle className="icon-operativo" />;
        default:
            return <FaQuestionCircle className="icon-desconocido" />;
    }
}
