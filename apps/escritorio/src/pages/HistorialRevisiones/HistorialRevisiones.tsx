import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from "../../app/firebase-config";
import {
    Calendar,
    User,
    FileText,
    Trash2,
    ChevronDown,
    Truck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../../context/UserContext';
import Header from "../../components/Header";
import PageLoader from "../../components/PageLoader/PageLoader";
import './HistorialRevisiones.css';

interface Revision {
    id: string;
    bombero: string;
    bomberos?: string[];
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
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, miembroActivo } = useUser();
    const esAdmin =
        user?.rol === 'admin' ||
        (Array.isArray((user as any)?.roles) && (user as any).roles.includes('admin')) ||
        (Array.isArray(miembroActivo?.roles) && miembroActivo?.roles.includes('admin'));

    const [nombreUnidad, setNombreUnidad] = useState('');
    const [tipoUnidad, setTipoUnidad] = useState('');
    const [revisiones, setRevisiones] = useState<Revision[]>([]);
    const [elementosMapa, setElementosMapa] = useState<Record<string, Elemento>>({});
    const [expandido, setExpandido] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [revisionAEliminar, setRevisionAEliminar] = useState<string | null>(null);
    const [eliminando, setEliminando] = useState(false);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            setCargando(true);
            try {
                if (!id) return;

                // 1. Traer el nombre y tipo de la unidad
                const unidadDoc = await getDoc(doc(db, 'unidades', id));
                if (unidadDoc.exists()) {
                    const dataUnidad = unidadDoc.data();
                    setNombreUnidad(dataUnidad.nombre || id);
                    setTipoUnidad(dataUnidad.tipo || '');
                }

                // 2. Traer todos los elementos
                const elementosSnap = await getDocs(collection(db, 'elementos'));
                const elementosRaw: ElementoRaw[] = elementosSnap.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<ElementoRaw, 'id'>),
                }));

                // 3. Traer todas las ubicaciones de una sola vez
                const ubicacionesSnap = await getDocs(collection(db, 'ubicaciones'));
                const ubicacionesMap: Record<string, string> = {};
                ubicacionesSnap.forEach(docSnap => {
                    ubicacionesMap[docSnap.id] = docSnap.data().nombre;
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
                const data: Revision[] = snapshot.docs.map(docSnap => {
                    const rev = docSnap.data();

                    let fechaObj: Date;
                    if (rev.fecha?.seconds) {
                        fechaObj = new Date(rev.fecha.seconds * 1000);
                    } else if (rev.fecha?.toDate) {
                        fechaObj = rev.fecha.toDate();
                    } else if (rev.fecha) {
                        fechaObj = new Date(rev.fecha);
                    } else {
                        fechaObj = new Date();
                    }

                    return {
                        id: docSnap.id,
                        bombero: rev.bombero || (Array.isArray(rev.bomberos) ? rev.bomberos.join(', ') : 'Sin especificar'),
                        bomberos: rev.bomberos,
                        fecha: fechaObj,
                        observaciones: rev.observaciones || '',
                        elementos: rev.elementos || {},
                    };
                }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

                setRevisiones(data);
            } catch (error) {
                console.error('Error cargando datos del historial:', error);
                toast.error('Error al cargar historial de revisiones');
            } finally {
                setCargando(false);
            }
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

    const formatearHora = (fecha: Date) => {
        return fecha.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const toggleExpandido = (revId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setExpandido(prev => (prev === revId ? null : revId));
    };

    const abrirModalRevision = (revisionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!esAdmin) {
            toast.error('Solo los administradores pueden eliminar revisiones');
            return;
        }
        setRevisionAEliminar(revisionId);
        setIsModalOpen(true);
    };

    const cerrarModal = () => {
        setIsModalOpen(false);
        setRevisionAEliminar(null);
        setEliminando(false);
    };

    const eliminarRevision = async () => {
        if (!revisionAEliminar) return;

        if (!esAdmin) {
            toast.error('No tienes permisos de administrador para eliminar revisiones');
            cerrarModal();
            return;
        }

        const idABorrar = revisionAEliminar;
        setEliminando(true);

        try {
            await deleteDoc(doc(db, 'revisiones', idABorrar));
            setRevisiones(prev => prev.filter(rev => rev.id !== idABorrar));
            toast.success('Revisión eliminada correctamente');
            cerrarModal();
        } catch (error) {
            console.error('Error al eliminar la revisión en Firestore:', error);
            toast.error('Hubo un error al eliminar la revisión');
            setEliminando(false);
        }
    };

    const getEstadoIcono = (estado: string) => {
        const est = estado.toLowerCase().trim();
        switch (est) {
            case 'faltante':
                return <AlertTriangle size={16} className="icono-estado-faltante" />;
            case 'con falla':
                return <XCircle size={16} className="icono-estado-falla" />;
            case 'operativo':
            case 'bueno':
                return <CheckCircle2 size={16} className="icono-estado-operativo" />;
            default:
                return <HelpCircle size={16} className="icono-estado-desconocido" />;
        }
    };

    return (
        <div className="historial-revisiones__contenedor-principal">
            <Header
                title={`Historial de ${nombreUnidad || 'Unidad'}`}
                onBack={() => navigate('/seleccionar-unidad-historial')}
                
            />

            <div className="historial-contenido historial-contenido-wrapper">
                {/* Cabecera de contexto de la unidad */}
                <div className="unidad-resumen-header">
                    <div className="unidad-resumen-info">
                        <div className="unidad-resumen-icono">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h2 className="unidad-resumen-nombre">{nombreUnidad || 'Cargando unidad...'}</h2>
                            {tipoUnidad && <span className="unidad-resumen-tipo">{tipoUnidad}</span>}
                        </div>
                    </div>
                    <div className="unidad-resumen-contador">
                        <span className="contador-numero">{revisiones.length}</span>
                        <span className="contador-label">
                            {revisiones.length === 1 ? 'Revisión registrada' : 'Revisiones registradas'}
                        </span>
                    </div>
                </div>

                {cargando ? (
                    <PageLoader texto="Cargando registros históricos..." />
                ) : revisiones.length === 0 ? (
                    <div className="historial-vacio">
                        <FileText size={48} className="icono-vacio" />
                        <h3>Sin revisiones registradas</h3>
                        <p>Esta unidad no registra inspecciones o controles previos en el sistema.</p>
                    </div>
                ) : (
                    <div className="historial-lista">
                        {revisiones.map((rev) => {
                            const elementosConProblemas = Object.entries(rev.elementos || {}).filter(([, estado]) => {
                                const est = String(estado).toLowerCase().trim();
                                return est === 'faltante' || est === 'con falla';
                            });

                            const estaExpandido = expandido === rev.id;
                            const esOperativo = elementosConProblemas.length === 0;

                            return (
                                <article
                                    key={rev.id}
                                    className={`revision-card ${estaExpandido ? 'expandido' : ''} ${
                                        esOperativo ? 'estado-card-ok' : 'estado-card-alerta'
                                    }`}
                                    onClick={(e) => toggleExpandido(rev.id, e)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            toggleExpandido(rev.id, e as any);
                                        }
                                    }}
                                >
                                    <div className="revision-card-header revision-header-row">
                                        <div className="revision-meta-principal">
                                            <div className="revision-fecha-row">
                                                <Calendar size={17} className="icono-meta" />
                                                <span className="revision-fecha-texto">
                                                    {formatearFecha(rev.fecha)}
                                                </span>
                                                <span className="revision-hora-texto">
                                                    <Clock size={13} /> {formatearHora(rev.fecha)} hs
                                                </span>
                                            </div>

                                            <div className="revision-bombero-row">
                                                <User size={16} className="icono-meta" />
                                                <span className="revision-bombero-texto">
                                                    {rev.bombero}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="revision-card-acciones">
                                            {esOperativo ? (
                                                <span className="badge-revision badge-ok">
                                                    <CheckCircle2 size={14} />
                                                    <span>100% Operativo</span>
                                                </span>
                                            ) : (
                                                <span className="badge-revision badge-alerta">
                                                    <AlertTriangle size={14} />
                                                    <span>
                                                        {elementosConProblemas.length}{' '}
                                                        {elementosConProblemas.length === 1 ? 'novedad' : 'novedades'}
                                                    </span>
                                                </span>
                                            )}

                                            {/* Botón eliminar exclusivo para administradores */}
                                            {esAdmin && (
                                                <button
                                                    type="button"
                                                    className="boton-eliminar-revision"
                                                    title="Eliminar registro de revisión"
                                                    onClick={(e) => abrirModalRevision(rev.id, e)}
                                                    aria-label="Eliminar revisión"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}

                                            <div className="chevron-expandir-wrapper">
                                                <ChevronDown
                                                    size={20}
                                                    className={`chevron-expandir ${estaExpandido ? 'rotado' : ''}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sección desplegable con detalles y observaciones */}
                                    {estaExpandido && (
                                        <div className="revision-card-cuerpo" onClick={(e) => e.stopPropagation()}>
                                            {rev.observaciones && (
                                                <div className="revision-observaciones-box">
                                                    <div className="observaciones-header">
                                                        <FileText size={16} className="icono-observaciones" />
                                                        <strong>Observaciones registradas</strong>
                                                    </div>
                                                    <p className="observaciones-texto">{rev.observaciones}</p>
                                                </div>
                                            )}

                                            <div className="revision-detalles-contenedor">
                                                {esOperativo ? (
                                                    <div className="revision-sin-novedades">
                                                        <CheckCircle2 size={18} className="icono-check-verde" />
                                                        <span>
                                                            Todos los elementos y equipamiento inspeccionados se encontraban en estado <strong>Operativo</strong>.
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="revision-elementos-alerta">
                                                        <h4 className="revision-elementos-titulo">
                                                            <AlertTriangle size={16} /> Detalle de elementos con observaciones:
                                                        </h4>

                                                        {(() => {
                                                            const elementosPorUbicacion: Record<
                                                                string,
                                                                { nombre: string; estado: string }[]
                                                            > = {};

                                                            elementosConProblemas.forEach(([elementoId, estado]) => {
                                                                const elemento = elementosMapa[elementoId];
                                                                const ubicacion = elemento?.ubicacion || 'Sin ubicación especificada';

                                                                if (!elementosPorUbicacion[ubicacion]) {
                                                                    elementosPorUbicacion[ubicacion] = [];
                                                                }

                                                                elementosPorUbicacion[ubicacion].push({
                                                                    nombre: elemento?.nombre || `Elemento (${elementoId})`,
                                                                    estado: String(estado),
                                                                });
                                                            });

                                                            return Object.entries(elementosPorUbicacion).map(
                                                                ([ubicacion, items]) => (
                                                                    <div key={ubicacion} className="grupo-ubicacion-card">
                                                                        <div className="grupo-ubicacion-titulo">
                                                                            <span>{ubicacion}</span>
                                                                        </div>
                                                                        <div className="lista-elementos-novedad">
                                                                            {items.map((el, idx) => (
                                                                                <div key={idx} className="item-elemento-novedad">
                                                                                    <div className="item-elemento-izq">
                                                                                        <span className="estado-icono-wrapper">
                                                                                            {getEstadoIcono(el.estado)}
                                                                                        </span>
                                                                                        <span className="elemento-nombre-texto">
                                                                                            {el.nombre}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span
                                                                                        className={`badge-estado-pill ${
                                                                                            el.estado.toLowerCase().includes('falla')
                                                                                                ? 'pill-falla'
                                                                                                : 'pill-faltante'
                                                                                        }`}
                                                                                    >
                                                                                        {el.estado}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de confirmación para eliminar revisión */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-alerta">
                            <div className="modal-icono-peligro">
                                <Trash2 size={24} />
                            </div>
                            <h3>¿Eliminar esta revisión?</h3>
                        </div>
                        <p className="modal-descripcion">
                            Esta acción eliminará de forma permanente el registro de revisión seleccionado de la base de datos de <strong>{nombreUnidad}</strong>.
                        </p>
                        <div className="modal-acciones">
                            <button
                                type="button"
                                className="btn-cancelar-modal"
                                onClick={cerrarModal}
                                disabled={eliminando}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="btn-eliminar-modal"
                                onClick={eliminarRevision}
                                disabled={eliminando}
                            >
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
