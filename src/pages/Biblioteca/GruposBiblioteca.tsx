import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { useUser } from '../../context/UserContext';
import { FaArrowUp, FaArrowDown, FaTrash, FaEdit, FaSave, FaTimes, FaPlus } from 'react-icons/fa';
import './GruposBiblioteca.css';
import Header from "../../components/Header";

type Grupo = {
  id: string;
  nombre: string;
  orden: number;
};

const GruposBiblioteca = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const puedeEditar = user?.rol === 'admin' || user?.rol === 'jefatura';

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [nuevoGrupo, setNuevoGrupo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'grupos_biblioteca'), orderBy('orden'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as { nombre: string; orden: number }),
      }));
      setGrupos(data);
    });
    return unsub;
  }, []);

  const agregarGrupo = async () => {
    if (!puedeEditar) return alert('No tenés permisos para agregar grupos.');
    if (nuevoGrupo.trim()) {
      try {
        const maxOrden = grupos.reduce(
          (max, g) => (g.orden > max ? g.orden : max),
          0
        );
        await addDoc(collection(db, 'grupos_biblioteca'), {
          nombre: nuevoGrupo.trim(),
          orden: maxOrden + 1,
        });
        setNuevoGrupo('');
      } catch (error) {
        console.error('Error agregando grupo:', error);
        alert('Error al agregar grupo.');
      }
    }
  };

  const eliminarGrupo = async (id: string) => {
    if (!puedeEditar) return alert('No tenés permisos para eliminar grupos.');
    const grupo = grupos.find((g) => g.id === id);
    if (!grupo) return;

    if (
      confirm(
        `¿Eliminar el grupo "${grupo.nombre}" y todas sus secciones asociadas? Esta acción no se puede deshacer.`
      )
    ) {
      try {
        const seccionesSnap = await getDocs(collection(db, 'secciones'));
        const seccionesDelGrupo = seccionesSnap.docs.filter((doc): boolean => {
          const data = doc.data() as { grupo: string };
          return data.grupo === grupo.nombre;
        });
        await Promise.all(
          seccionesDelGrupo.map((docSnap) =>
            deleteDoc(doc(db, 'secciones', docSnap.id))
          )
        );
        await deleteDoc(doc(db, 'grupos_biblioteca', id));
      } catch (error) {
        console.error('Error al eliminar grupo:', error);
        alert('No se pudo eliminar el grupo o sus secciones.');
      }
    }
  };

  const guardarEdicion = async (id: string) => {
    if (!puedeEditar) return alert('No tenés permisos para editar grupos.');
    if (nombreEditado.trim()) {
      try {
        await updateDoc(doc(db, 'grupos_biblioteca', id), {
          nombre: nombreEditado.trim(),
        });
        setEditandoId(null);
        setNombreEditado('');
      } catch (error) {
        console.error('Error editando grupo:', error);
        alert('Error al editar grupo.');
      }
    }
  };

  const moverGrupo = async (id: string, direccion: 'up' | 'down') => {
    if (!puedeEditar) return alert('No tenés permisos para modificar el orden.');
    const index = grupos.findIndex((g) => g.id === id);
    if (index === -1) return;

    const nuevoIndex = direccion === 'up' ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= grupos.length) return;

    const grupoActual = grupos[index];
    const grupoSwap = grupos[nuevoIndex];
    try {
      await Promise.all([
        updateDoc(doc(db, 'grupos_biblioteca', grupoActual.id), {
          orden: grupoSwap.orden,
        }),
        updateDoc(doc(db, 'grupos_biblioteca', grupoSwap.id), {
          orden: grupoActual.orden,
        }),
      ]);
    } catch (error) {
      console.error('Error cambiando orden de grupos:', error);
      alert('Error al cambiar el orden.');
    }
  };

  return (
    <div className="grupos-biblioteca__contenedor">
      <Header
        title="Administrar grupos"
        onBack={() => navigate('/editar-biblioteca/secciones')}
      />

      {puedeEditar && (
        <div className="grupos-biblioteca__input-nuevo">
          <input
            type="text"
            placeholder="Nuevo grupo..."
            value={nuevoGrupo}
            onChange={(e) => setNuevoGrupo(e.target.value)}
          />
          <button
            className="grupos-biblioteca__btn-agregar"
            onClick={agregarGrupo}
          >
            <FaPlus />
          </button>
        </div>
      )}

    <div className="grupos-biblioteca__contenedor-lista">
      <ul className="grupos-biblioteca__lista">
        {grupos.map((grupo, idx) => (
          <li key={grupo.id} className="grupos-biblioteca__grupo">
            {editandoId === grupo.id ? (
              <>
                <input
                  type="text"
                  value={nombreEditado}
                  onChange={(e) => setNombreEditado(e.target.value)}
                />
                <div className="grupos-biblioteca__grupo-acciones">
                  <button
                    className="grupos-biblioteca__btn-editar"
                    onClick={() => guardarEdicion(grupo.id)}
                    title="Guardar cambios"
                  >
                    <FaSave />
                  </button>
                  <button
                    className="grupos-biblioteca__btn-eliminar"
                    onClick={() => setEditandoId(null)}
                    title="Cancelar"
                  >
                    <FaTimes />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="grupos-biblioteca__grupo-nombre">
                  {grupo.nombre}
                </span>
                {puedeEditar && (
                  <div className="grupos-biblioteca__grupo-acciones">
                    <button
                      className="grupos-biblioteca__btn-subir"
                      onClick={() => moverGrupo(grupo.id, 'up')}
                      disabled={idx === 0}
                      title="Subir"
                      aria-label="Subir grupo"
                    >
                      <FaArrowUp />
                    </button>
                    <button
                      className="grupos-biblioteca__btn-bajar"
                      onClick={() => moverGrupo(grupo.id, 'down')}
                      disabled={idx === grupos.length - 1}
                      title="Bajar"
                      aria-label="Bajar grupo"
                    >
                      <FaArrowDown />
                    </button>
                    <button
                      className="grupos-biblioteca__btn-editar"
                      onClick={() => {
                        setEditandoId(grupo.id);
                        setNombreEditado(grupo.nombre);
                      }}
                      title="Editar nombre"
                      aria-label="Editar grupo"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="grupos-biblioteca__btn-eliminar"
                      onClick={() => eliminarGrupo(grupo.id)}
                      title="Eliminar grupo"
                      aria-label="Eliminar grupo"
                    >
                      <FaTrash />
                    </button>
                  </div>

                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
};

export default GruposBiblioteca;
