import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { FaTrash, FaPlus, FaSearch, FaIdCard } from 'react-icons/fa';
import './ListadoDNIs.css';
import Header from "../../components/Header";

type UsuarioBiblioteca = {
  dni: string;
  nombre: string;
};

const ListadoDNIs: React.FC = () => {
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState<UsuarioBiblioteca[]>([]);
  const [filtro, setFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [dniAEliminar, setDniAEliminar] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'usuariosBiblioteca'), orderBy('nombre'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          dni: doc.id,
          nombre: doc.data().nombre,
        }));
        setUsuarios(docs);
        setCargando(false);
      },
      () => {
        setError('Error al cargar los datos.');
        setCargando(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const confirmarEliminacion = async () => {
    if (!dniAEliminar) return;
    try {
      await deleteDoc(doc(db, 'usuariosBiblioteca', dniAEliminar));
      setToast(`DNI ${dniAEliminar} eliminado correctamente.`);
      setDniAEliminar(null);
      setTimeout(() => setToast(''), 2500);
    } catch {
      setError('Error al eliminar el DNI.');
      setTimeout(() => setError(''), 2500);
    }
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      u.dni.includes(filtro)
  );

  return (
    <div className="listado-dnis__contenedor">
        <Header
          title="DNIs Autorizados"
          onBack={() => navigate('/editar-biblioteca/')}
        />

      <div className="listado-dnis__buscador-contenedor">
        <div className="listado-dnis__input-wrapper">
          <FaSearch className="listado-dnis__icono-buscar" />
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            className="listado-dnis__buscador"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>

        <button className="listado-dnis__btn-agregar" onClick={() => navigate('/editar-biblioteca/dnis')}>
          <FaPlus /> Agregar DNI
        </button>
      </div>

      {cargando ? (
        <p>Cargando DNIs...</p>
      ) : error ? (
        <p className="listado-dnis__error">{error}</p>
      ) : usuariosFiltrados.length === 0 ? (
        <p className="listado-dnis__sin-resultados">No se encontraron resultados.</p>
      ) : (
        <div className="listado-dnis__tarjetas">
          {usuariosFiltrados.map(({ dni, nombre }) => (
            <div key={dni} className="listado-dnis__tarjeta">
            <div className="listado-dnis__info">
              <div className="listado-dnis__info-inner">
                <p className="listado-dnis__nombre">{nombre}</p>
                <div className="listado-dnis__separador"></div>
                <p className="listado-dnis__dni"><FaIdCard /> - {dni}</p>
              </div>
            </div>
              <button
                className="listado-dnis__btn-eliminar"
                onClick={() => setDniAEliminar(dni)}
                title="Eliminar DNI"
                aria-label={`Eliminar acceso DNI ${dni}`}
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación */}
      {dniAEliminar && (
        <div className="listado-dnis__modal">
          <div className="listado-dnis__modal-contenido">
            <p>¿Seguro que querés eliminar el acceso para el DNI <strong>{dniAEliminar}</strong>?</p>
            <div className="listado-dnis__modal-botones">
              <button onClick={() => setDniAEliminar(null)} className="cancelar">Cancelar</button>
              <button onClick={confirmarEliminacion} className="confirmar">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="listado-dnis__toast">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ListadoDNIs;
