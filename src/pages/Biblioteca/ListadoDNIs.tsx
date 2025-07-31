import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import './ListadoDNIs.css';

type UsuarioBiblioteca = {
  dni: string;
  nombre: string;
};

const ListadoDNIs: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioBiblioteca[]>([]);
  const [filtro, setFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'usuariosBiblioteca'), orderBy('nombre'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          dni: doc.id,
          nombre: doc.data().nombre,
        })) as UsuarioBiblioteca[];
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

  const handleEliminar = async (dni: string) => {
    if (!window.confirm(`¿Eliminar el acceso para DNI ${dni}?`)) return;
    try {
      await deleteDoc(doc(db, 'usuariosBiblioteca', dni));
      setMensaje(`DNI ${dni} eliminado correctamente.`);
      setTimeout(() => setMensaje(''), 4000);
    } catch {
      setError('Error al eliminar el DNI.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      u.dni.includes(filtro)
  );

  return (
    <div className="listado-dnis__contenedor">
      <h2 className="listado-dnis__titulo">DNIs autorizados</h2>

      <input
        type="text"
        placeholder="Buscar por nombre o DNI..."
        className="listado-dnis__buscador"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />

      {cargando ? (
        <p>Cargando DNIs...</p>
      ) : error ? (
        <p className="listado-dnis__error">{error}</p>
      ) : (
        <>
          {mensaje && <p className="listado-dnis__mensaje">{mensaje}</p>}

          <table className="listado-dnis__tabla">
            <thead>
              <tr>
                <th>Nombre Completo</th>
                <th>DNI</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center' }}>
                    No se encontraron resultados
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map(({ dni, nombre }) => (
                  <tr key={dni}>
                    <td>{nombre}</td>
                    <td>{dni}</td>
                    <td>
                      <button
                        className="listado-dnis__btn-eliminar"
                        onClick={() => handleEliminar(dni)}
                        title="Eliminar DNI"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default ListadoDNIs;
