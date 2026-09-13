import React, { useState } from 'react';
import { db } from "../../app/firebase-config";
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './CrearUnidad.css';
import Header from "../../components/Header";
import {
  TIPOS_UNIDAD,
  CATEGORIAS_CHOFER,
  CATEGORIA_SUGERIDA_POR_TIPO,
  TipoUnidad,
  TipoUnidadChofer,
} from '../../types/unidades';

const CrearUnidad: React.FC = () => {
    const navigate = useNavigate();
    const [nombre, setNombre] = useState('');
    const [modelo, setModelo] = useState('');
    const [patente, setPatente] = useState('');
    const [tipo, setTipo] = useState<TipoUnidad | ''>('');
    const [categoria, setCategoria] = useState<TipoUnidadChofer | ''>('');
    const [categoriaTocada, setCategoriaTocada] = useState(false);
    const [estado, setEstado] = useState('Operativa');
    const [ubicaciones, setUbicaciones] = useState<{ nombre: string; elementos: { nombre: string; cantidad: string }[] }[]>([]);

    // Al elegir el tipo detallado, sugerimos una categoría de chofer si el
    // usuario todavía no la tocó a mano. Si ya la eligió manualmente, no la
    // pisamos.
    const handleCambiarTipo = (nuevoTipo: string) => {
        setTipo(nuevoTipo as TipoUnidad | '');

        if (!categoriaTocada && nuevoTipo) {
            const sugerencia = CATEGORIA_SUGERIDA_POR_TIPO[nuevoTipo as TipoUnidad];
            if (sugerencia) setCategoria(sugerencia);
        }
    };

    const handleCambiarCategoria = (nuevaCategoria: string) => {
        setCategoriaTocada(true);
        setCategoria(nuevaCategoria as TipoUnidadChofer | '');
    };

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
        if (!nombre || !modelo || !patente || !tipo) {
            toast.warning("Completá todos los campos obligatorios.");
            return;
        }

        if (!categoria) {
            toast.warning("Seleccioná la categoría de chofer de la unidad.");
            return;
        }

        try {
            const unidadRef = await addDoc(collection(db, 'unidades'), {
                nombre, modelo, patente, tipo, categoria, estado,
                ultima_revision: null,
                kilometraje: '',
                combustible: ''
            });

            for (let i = 0; i < ubicaciones.length; i++) {
                const ubicacion = ubicaciones[i];
                const ubicacionRef = await addDoc(collection(db, 'ubicaciones'), {
                    nombre: ubicacion.nombre,
                    unidad_id: unidadRef.id,
                    orden: i
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

            toast.success("Unidad creada con éxito.");
            navigate('/unidades');
        } catch (error) {
            console.error("Error creando unidad:", error);
            toast.error("Error al crear la unidad. Revisá la consola.");
        }
    };

    return (
        <div className="crear-unidad__contenedor-principal">
            <Header
                title="Crear Unidad"
                onBack={() => navigate('/unidades')}
            />

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
                            <select value={tipo} onChange={(e) => handleCambiarTipo(e.target.value)} required>
                                <option value="">Seleccionar tipo</option>
                                {TIPOS_UNIDAD.map((opcion) => (
                                    <option key={opcion} value={opcion}>{opcion}</option>
                                ))}
                            </select>
                        </div>
                        <div className="crear-unidad__campo">
                            <label>Categoría (chofer)</label>
                            <select value={categoria} onChange={(e) => handleCambiarCategoria(e.target.value)} required>
                                <option value="">Seleccionar categoría</option>
                                {CATEGORIAS_CHOFER.map((opcion) => (
                                    <option key={opcion} value={opcion}>{opcion}</option>
                                ))}
                            </select>
                            <small className="crear-unidad__ayuda-campo">
                                Define qué habilitación de chofer necesita esta unidad y se usa para vincular la VTV.
                            </small>
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
        </div>
    );
};

export default CrearUnidad;