import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { mostrarToast } from "../../utils/toast"; 
import '../Toast/toastStyles.css'; 
import { db, storage } from "../../app/firebase-config";
import { doc, getDoc, collection, getDocs, updateDoc, setDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import './EditarUnidad.css'; 
import "react-toastify/dist/ReactToastify.css";

// Definir los tipos de los datos
interface Elemento {
    id: string;
    nombre: string;
    cantidad: number | "-";
    estado?: string; // por si a veces viene undefined
}

interface Ubicacion {
    id: string;
    nombre: string;
    elementos: Elemento[];
}

interface UnidadFormData {
    nombre: string;
    tipo: string;
    modelo: string;
    patente: string;
    kilometraje: string;
    combustible: string;
    estado: string;
    imagen: string;
    ubicaciones: Ubicacion[];
}

const EditarUnidad: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<UnidadFormData>({
        nombre: "",
        tipo: "",
        modelo: "",
        patente: "",
        kilometraje: "",
        combustible: "",
        estado: "",
        imagen: "",
        ubicaciones: [],
    });

    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [cargando, setCargando] = useState(true);

    const fetchUnidad = async () => {
        if (!id) return;

        setCargando(true);

        try {
            const unidadDoc = await getDoc(doc(db, 'unidades', id));
            if (!unidadDoc.exists()) {
                setFormData({ ...formData, nombre: "", tipo: "", modelo: "", patente: "", kilometraje: "", combustible: "", estado: "", ubicaciones: [], imagen: "" });
                setCargando(false);
                return;
            }

            const datosUnidad = unidadDoc.data();
            const ubicacionesQuery = query(
                collection(db, 'ubicaciones'),
                where('unidad_id', '==', id),
                orderBy('orden') // Aseguramos que las ubicaciones se carguen ordenadas
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

            setFormData({
                nombre: datosUnidad.nombre || "",
                tipo: datosUnidad.tipo || "",
                modelo: datosUnidad.modelo || "",
                patente: datosUnidad.patente || "",
                kilometraje: datosUnidad.kilometraje || "",
                combustible: datosUnidad.combustible || "",
                estado: datosUnidad.estado || "",
                imagen: datosUnidad.imagen || "",
                ubicaciones: ubicacionesData,
            });
        } catch (error) {
            console.error('Error al obtener los datos:', error);
        }

        setCargando(false);
    };

    useEffect(() => {
        fetchUnidad();
    }, [id]);

    // ✅ Siempre después de hooks
    if (cargando) {
        return <p>Cargando datos...</p>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        const storageRef = ref(storage, `unidades/${id}/imagen`);
        const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("❌ Error subiendo la imagen:", error);
                    mostrarToast("❌ Error al subir la imagen");
                    setUploadProgress(null);
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setFormData((prev) => ({ ...prev, imagen: url }));
                    mostrarToast("📷 Imagen subida correctamente");
                    setUploadProgress(null);
                }
            );
        };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id) return;

        try {
            // Actualizar unidad principal
            await updateDoc(doc(db, "unidades", id), {
                nombre: formData.nombre,
                tipo: formData.tipo,
                modelo: formData.modelo,
                patente: formData.patente,
                kilometraje: formData.kilometraje,
                combustible: formData.combustible,
                estado: formData.estado,
                imagen: formData.imagen,
            });

            // Obtener ubicaciones actuales en DB
            const ubicSnap = await getDocs(query(collection(db, "ubicaciones"), where("unidad_id", "==", id)));
            const ubicEnDB = ubicSnap.docs.map(doc => doc.id);

            const ubicacionesGuardadas: string[] = [];

            // Guardar ubicaciones con el nuevo orden
            for (let indexUbicacion = 0; indexUbicacion < formData.ubicaciones.length; indexUbicacion++) {
                const ubicacion = formData.ubicaciones[indexUbicacion];
                const ubicacionRef = ubicacion.id
                    ? doc(db, "ubicaciones", ubicacion.id)
                    : doc(collection(db, "ubicaciones"));

                // Asignamos el orden en función de su índice
                await setDoc(ubicacionRef, {
                    nombre: ubicacion.nombre,
                    unidad_id: id,
                    orden: indexUbicacion,  // Este es el nuevo orden
                });

                const ubicId = ubicacionRef.id;
                ubicacionesGuardadas.push(ubicId);

                // Obtener elementos actuales de esa ubicación
                const elemSnap = await getDocs(query(collection(db, "elementos"), where("ubicacion_id", "==", ubicId)));
                const elemEnDB = elemSnap.docs.map(doc => doc.id);

                const elementosGuardados: string[] = [];

                // Guardar los elementos con el nuevo orden
                for (let indexElemento = 0; indexElemento < ubicacion.elementos.length; indexElemento++) {
                    const elemento = ubicacion.elementos[indexElemento];
                    const elRef = elemento.id
                        ? doc(db, "elementos", elemento.id)
                        : doc(collection(db, "elementos"));

                    // Guardamos el elemento con el campo 'orden'
                    let estado = elemento.estado ?? "Desconocido";

                    if (elemento.id) {
                        const elementoDoc = await getDoc(elRef);
                        if (elementoDoc.exists() && !elemento.estado) {
                            const datosExistentes = elementoDoc.data();
                            estado = datosExistentes.estado ?? "Desconocido";
                        }
                    }

                    await setDoc(elRef, {
                        nombre: elemento.nombre,
                        cantidad: elemento.cantidad === "-" ? "-" : Number(elemento.cantidad),
                        unidad_id: id,
                        ubicacion_id: ubicId,
                        orden: indexElemento,
                        estado: estado,
                    });
                    elementosGuardados.push(elRef.id);
                }

                // Borrar elementos eliminados
                for (const elId of elemEnDB) {
                    if (!elementosGuardados.includes(elId)) {
                        await deleteDoc(doc(db, "elementos", elId));
                    }
                }
            }

            // Borrar ubicaciones eliminadas
            for (const ubicId of ubicEnDB) {
                if (!ubicacionesGuardadas.includes(ubicId)) {
                    await deleteDoc(doc(db, "ubicaciones", ubicId));
                }
            }

            toast.success("Cambios guardados con éxito", {
            position: "top-center",
            autoClose: 1500,
            onClose: () => navigate(`/unidad/${id}`),
            });
        } catch (error) {
            console.error("❌ Error al guardar:", error);
            toast.error("Error al guardar cambios", {
            position: "top-center",
            autoClose: 3000,
            });
        }
        };


    const moverUbicacion = async (index: number, direccion: "arriba" | "abajo") => {
        const nuevasUbicaciones = [...formData.ubicaciones];
        const nuevaPosicion = direccion === "arriba" ? index - 1 : index + 1;

        if (nuevaPosicion < 0 || nuevaPosicion >= nuevasUbicaciones.length) return;

        // Intercambiar posiciones
        const temp = nuevasUbicaciones[nuevaPosicion];
        nuevasUbicaciones[nuevaPosicion] = nuevasUbicaciones[index];
        nuevasUbicaciones[index] = temp;

        // Actualizar estado local
        setFormData({ ...formData, ubicaciones: nuevasUbicaciones });

        // Guardar en Firestore el nuevo orden
        for (let i = 0; i < nuevasUbicaciones.length; i++) {
            const ubicacion = nuevasUbicaciones[i];
            await updateDoc(doc(db, 'ubicaciones', ubicacion.id), {
                orden: i
            });
        }
    };

    const moverElemento = async (
        indexUbicacion: number, 
        indexElemento: number, 
        direccion: "arriba" | "abajo"
     ) => {
        const nuevaUbicacion = [...formData.ubicaciones];
        const elementos = [...nuevaUbicacion[indexUbicacion].elementos];
    
        const nuevoIndice = direccion === "arriba" ? indexElemento - 1 : indexElemento + 1;

        // Verifica si la nueva posición es válida
        if (nuevoIndice < 0 || nuevoIndice >= elementos.length) return;

        // Intercambiar elementos
        const temp = elementos[nuevoIndice];
        elementos[nuevoIndice] = elementos[indexElemento];
        elementos[indexElemento] = temp;

        // Actualizar el estado local
        nuevaUbicacion[indexUbicacion].elementos = elementos;
        setFormData({ ...formData, ubicaciones: nuevaUbicacion });

        // Guardar el nuevo orden de los elementos en Firebase
        for (let i = 0; i < elementos.length; i++) {
            const elemento = elementos[i];
            await updateDoc(doc(db, "elementos", elemento.id), {
            orden: i,  // Actualizar el orden en Firebase
            });
        }
    };


    return (
        <div className="editar-unidad__contenedor-principal">
            <div className="editar-unidad__encabezado">
                <button className="editar-unidad__btn-volver" onClick={() => navigate(`/unidad/${id}`)}>
                    ↩ Regresar
                </button>
                <h2 className="editar-unidad__titulo">Editar Unidad</h2>
            </div>

            <form onSubmit={handleSubmit} className="editar-unidad__formulario">
                {/* Información de la unidad */}
                <section className="editar-unidad__tarjeta">
                    <h3 className="editar-unidad__seccion-titulo">Información de la Unidad</h3>
                    <div className="editar-unidad__grid">
                        {/* Inputs para la información de la unidad */}
                        <div className="editar-unidad__campo">
                            <label>Nombre</label>
                            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
                        </div>

                        <div className="editar-unidad__campo">
                            <label>Tipo</label>
                            <select name="tipo" value={formData.tipo} onChange={handleChange} required>
                                <option value="">Seleccionar tipo</option>
                                <option value="Ambulancia">Ambulancia</option>
                                <option value="Unidad de Incendio Estructural">Unidad de Incendio Estructural</option>
                                <option value="Unidad de Incendio Forestal">Unidad de Incendio Forestal</option>
                                <option value="Unidad de Abastecimiento">Unidad de Abastecimiento</option>
                                <option value="Unidad de Rescate Urbano">Unidad de Rescate Urbano</option>
                                <option value="Unidad de Transporte de Personal">Unidad de Transporte de Personal</option>
                                <option value="Unidad de Logística">Unidad de Logística</option>
                                <option value="Escalera Mecánica">Escalera Mecánica</option>
                                <option value="Unidad de Rescate Vehicular">Unidad de Rescate Vehicular</option>
                                <option value="Unidad de Rescate Acuatico">Unidad de Rescate Acuático</option>
                            </select>
                        </div>
                        <div className="editar-unidad__campo">
                            <label>Modelo</label>
                            <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} required />
                        </div>
                        <div className="editar-unidad__campo">
                            <label>Patente</label>
                            <input type="text" name="patente" value={formData.patente} onChange={handleChange} required />
                        </div>
                        <div className="editar-unidad__campo">
                            <label>Kilometraje</label>
                            <input type="number" name="kilometraje" value={formData.kilometraje} onChange={handleChange} required />
                        </div>
                        <div className="editar-unidad__campo">
                            <label>Combustible</label>
                            <select name="combustible" value={formData.combustible} onChange={handleChange} required>
                                <option value="">Seleccionar nivel</option>
                                <option value="1/4">1/4</option>
                                <option value="2/4">2/4</option>
                                <option value="3/4">3/4</option>
                                <option value="4/4">4/4</option>
                            </select>
                        </div>
                        <div className="editar-unidad__campo">
                            <label>Estado</label>
                            <select name="estado" value={formData.estado} onChange={handleChange} required>
                                <option value="Operativa">Operativa</option>
                                <option value="En Reparación">En Reparación</option>
                                <option value="Fuera de Servicio">Fuera de Servicio</option>
                            </select>
                        </div>
                        <div className="editar-unidad__campo">
                            <label>Imagen</label>
                            <input type="file" accept="image/*" onChange={handleImageChange} />
                            {uploadProgress !== null && (
                                <div className="editaru-progress-container">
                                    <div className="editaru-progress-bar">
                                        <div
                                            className="editaru-progress-fill"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="editaru-progress-text">
                                        Subiendo imagen... {uploadProgress.toFixed(0)}%
                                    </p>
                                </div>
                            )}
                            {formData.imagen && (
                        <div className="editar-unidad__preview-container">
                            <img src={formData.imagen} alt="Imagen de la unidad" className="editar-unidad__preview-img" />
                            <button
                                type="button"
                                className="editar-unidad__remove-btn"
                                onClick={() => setFormData(prev => ({ ...prev, imagen: "" }))}
                            >
                                ✖
                            </button>
                        </div>
                    )}
                        </div>
                    </div>
                </section>

                {/* Ubicaciones y elementos */}
                <section className="editar-unidad__tarjeta">
                    <h3 className="editar-unidad__seccion-titulo">Ubicaciones y Elementos</h3>

                    {formData.ubicaciones.map((ubicacion, indexUbicacion) => (
                        <div key={indexUbicacion} className="editar-unidad__bloque-ubicacion">
                            <div className="editar-unidad__fila-ubicacion">
                                <input
                                    type="text"
                                    value={ubicacion.nombre}
                                    onChange={(e) => {
                                        const nuevasUbicaciones = [...formData.ubicaciones];
                                        nuevasUbicaciones[indexUbicacion].nombre = e.target.value;
                                        setFormData({ ...formData, ubicaciones: nuevasUbicaciones });
                                    }}
                                    placeholder="Nombre de la ubicación"
                                    className="editar-unidad__input-ubicacion"
                                />
                                <div className="editar-unidad__mover-ubicacion">
                                    <button type="button" onClick={() => moverUbicacion(indexUbicacion, "arriba")}>↑</button>
                                    <button type="button" onClick={() => moverUbicacion(indexUbicacion, "abajo")}>↓</button>
                                </div>
                                <button type="button" className="editar-unidad__btn-icono" onClick={() => {
                                    const nuevasUbicaciones = formData.ubicaciones.filter((_, i) => i !== indexUbicacion);
                                    setFormData({ ...formData, ubicaciones: nuevasUbicaciones });
                                }}>
                                    X
                                </button>
                            </div>

                            {ubicacion.elementos.map((elemento, indexElemento) => (
                                <div key={indexElemento} className="editar-unidad__fila-elemento">
                                    <input
                                        type="text"
                                        value={elemento.nombre}
                                        onChange={(e) => {
                                            const nuevasUbicaciones = [...formData.ubicaciones];
                                            nuevasUbicaciones[indexUbicacion].elementos[indexElemento].nombre = e.target.value;
                                            setFormData({ ...formData, ubicaciones: nuevasUbicaciones });
                                        }}
                                        placeholder="Nombre del elemento"
                                        className="editar-unidad__input-elemento"
                                    />
                                            <input
                                            type="text"
                                            value={elemento.cantidad === "-" ? "-" : elemento.cantidad ?? ""}
                                            onChange={(e) => {
                                                const valor = e.target.value;
                                                const nuevasUbicaciones = [...formData.ubicaciones];

                                                if (/^\d*$/.test(valor) || valor === "-") {
                                                nuevasUbicaciones[indexUbicacion].elementos[indexElemento].cantidad =
                                                    valor === "-" ? "-" : parseInt(valor);
                                                setFormData({ ...formData, ubicaciones: nuevasUbicaciones });
                                                }
                                            }}
                                            placeholder="Cantidad"
                                            className="editar-unidad__input-cantidad"
                                            />

                                    <div className="editar-unidad__mover-elemento">
                                        <button type="button" onClick={() => moverElemento(indexUbicacion, indexElemento, "arriba")} disabled={indexElemento === 0}>↑</button>
                                        <button type="button" onClick={() => moverElemento(indexUbicacion, indexElemento, "abajo")} disabled={indexElemento === ubicacion.elementos.length - 1}>↓</button>
                                    </div>
                                    <button type="button" className="editar-unidad__btn-icono" onClick={() => {
                                        const nuevasUbicaciones = [...formData.ubicaciones];
                                        nuevasUbicaciones[indexUbicacion].elementos = nuevasUbicaciones[indexUbicacion].elementos.filter((_, i) => i !== indexElemento);
                                        setFormData({ ...formData, ubicaciones: nuevasUbicaciones });
                                    }}>
                                        X
                                    </button>
                                </div>
                            ))}

                            <div className="editar-unidad__agregar-elemento-wrapper">
                                <button
                                    type="button"
                                    className="editar-unidad__btn-secundario"
                                    onClick={() => {
                                        const nuevasUbicaciones = [...formData.ubicaciones];
                                        nuevasUbicaciones[indexUbicacion].elementos.push({ id: "", nombre: "", cantidad: 1 });
                                        setFormData({ ...formData, ubicaciones: nuevasUbicaciones });
                                    }}
                                >
                                    + Agregar Elemento
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="editar-unidad__agregar-ubicacion-wrapper">
                        <button
                            type="button"
                            className="editar-unidad__btn-principal"
                            onClick={() => {
                                const nuevaUbicacion: Ubicacion = { id: "", nombre: "", elementos: [] };
                                setFormData((prev) => ({
                                    ...prev,
                                    ubicaciones: [...prev.ubicaciones, nuevaUbicacion],
                                }));
                            }}
                        >
                            + Agregar nueva ubicación
                        </button>
                    </div>
                </section>


                <div className="editar-unidad__footer">
                    <button type="submit" className="editar-unidad__btn-guardar">Guardar Cambios</button>
                </div>
            </form>
            <ToastContainer />
        </div>
    );
};

export default EditarUnidad;
