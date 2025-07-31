import React, { useState } from 'react';
import { db } from "../../app/firebase-config";
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { mostrarToast } from '../../utils/toast'; 
import './CrearUnidad.css'; 
import '../Toast/toastStyles.css'; 

const CrearUnidad: React.FC = () => {
    const navigate = useNavigate();
    const [nombre, setNombre] = useState('');
    const [modelo, setModelo] = useState('');
    const [patente, setPatente] = useState('');
    const [tipo, setTipo] = useState('');
    const [estado, setEstado] = useState('Operativa');
    const [ubicaciones, setUbicaciones] = useState<{ nombre: string; elementos: { nombre: string; cantidad: string }[] }[]>([]);

    const agregarUbicacion = () => {
        setUbicaciones([...ubicaciones, { nombre: '', elementos: [] }]);
    };

    const actualizarUbicacion = (index: number, nuevoNombre: string) => {
        const nuevas = [...ubicaciones];
        nuevas[index].nombre = nuevoNombre;
        setUbicaciones(nuevas);
    };

    const agregarElemento = (ubicacionIndex: number) => {
        const nuevas = [...ubicaciones];
        nuevas[ubicacionIndex].elementos.push({ nombre: '', cantidad: '' });
        setUbicaciones(nuevas);
    };

    const actualizarElemento = (ubicacionIndex: number, elementoIndex: number, campo: 'nombre' | 'cantidad', valor: string) => {
        const nuevas = [...ubicaciones];
        nuevas[ubicacionIndex].elementos[elementoIndex][campo] = valor;
        setUbicaciones(nuevas);
    };

    const crearUnidad = async () => {
        if (!nombre || !modelo || !patente || !tipo) return;

        const unidadRef = await addDoc(collection(db, 'unidades'), {
            nombre,
            modelo,
            patente,
            tipo,
            estado,
            ultima_revision: null,
            kilometraje: '',
            combustible: ''
        });

        for (let i = 0; i < ubicaciones.length; i++) {
            const ubicacion = ubicaciones[i];

            const ubicacionRef = await addDoc(collection(db, 'ubicaciones'), {
                nombre: ubicacion.nombre,
                unidad_id: unidadRef.id,
                orden: i // 👈 este es el nuevo campo que guarda el orden
            });

            for (const elemento of ubicacion.elementos) {
                await addDoc(collection(db, 'elementos'), {
                    nombre: elemento.nombre,
                    cantidad: elemento.cantidad,
                    estado: 'Desconocido',
                    ubicacion_id: ubicacionRef.id
                });
            }
        }

        mostrarToast("Unidad creada con éxito.", () => navigate(`/`));
    };

    return (
        <div className="crear-unidad__contenedor-principal">
            {/* Encabezado */}
            <div className="crear-unidad__encabezado">
                <button className="crear-unidad__btn-volver" onClick={() => navigate('/unidades')}>
                    ↩ Regresar
                </button>
                <h2 className="crear-unidad__titulo">Crear Unidad</h2>
            </div>

            {/* Formulario */}
            <div className="crear-unidad__formulario">
                <div className="crear-unidad__tarjeta">
                    <span className="crear-unidad__seccion-titulo">Datos de la Unidad</span>

                    <div className="crear-unidad__grid">
                        <div className="crear-unidad__campo">
                            <label>Nombre</label>
                            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                        </div>
                        <div className="crear-unidad__campo">
                            <label>Modelo</label>
                            <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} />
                        </div>
                        <div className="crear-unidad__campo">
                            <label>Patente</label>
                            <input type="text" value={patente} onChange={(e) => setPatente(e.target.value)} />
                        </div>
                        <div className="crear-unidad__campo">
                            <label>Tipo de unidad</label>
                            <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
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
                                <option value="Unidad de Rescate Acuático">Unidad de Rescate Acuático</option>
                            </select>
                        </div>
                        <div className="crear-unidad__campo">
                            <label>Estado</label>
                            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                                <option value="Operativa">Operativa</option>
                                <option value="Fuera de Servicio">Fuera de Servicio</option>
                                <option value="En Reparación">En Reparación</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="crear-unidad__tarjeta">
                    <span className="crear-unidad__seccion-titulo">Ubicaciones y elementos</span>

                    {ubicaciones.map((ubicacion, i) => (
                        <div key={i} className="crear-unidad__bloque-ubicacion">
                            <div className="crear-unidad__fila-ubicacion">
                                <input
                                    type="text"
                                    className="crear-unidad__input-ubicacion"
                                    placeholder="Nombre de la ubicación"
                                    value={ubicacion.nombre}
                                    onChange={(e) => actualizarUbicacion(i, e.target.value)}
                                />
                            </div>

                            {ubicacion.elementos.map((elemento, j) => (
                                <div key={j} className="crear-unidad__fila-elemento">
                                    <input
                                        type="text"
                                        className="crear-unidad__input-elemento"
                                        placeholder="Nombre del elemento"
                                        value={elemento.nombre}
                                        onChange={(e) => actualizarElemento(i, j, 'nombre', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="crear-unidad__input-cantidad"
                                        placeholder="Cant."
                                        value={elemento.cantidad}
                                        onChange={(e) => actualizarElemento(i, j, 'cantidad', e.target.value)}
                                    />
                                </div>
                            ))}

                            <div className="crear-unidad__agregar-elemento-wrapper">
                                <button className="crear-unidad__btn-secundario" onClick={() => agregarElemento(i)}>
                                    + Agregar Elemento
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="crear-unidad__agregar-ubicacion-wrapper">
                        <button className="crear-unidad__btn-principal" onClick={agregarUbicacion}>
                            + Agregar Ubicación
                        </button>
                    </div>
                </div>

                <div className="crear-unidad__footer">
                    <button className="crear-unidad__btn-guardar" onClick={crearUnidad}>
                        Crear Unidad
                    </button>
                </div>
            </div>

            <ToastContainer />
        </div>
    );
};

export default CrearUnidad;
