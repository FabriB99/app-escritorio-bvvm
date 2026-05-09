import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  CollectionReference,
  Query,
  DocumentData
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../app/firebase-config';
import './RegistroAccesos.css';
import Header from '../../components/Header';
import { useUser } from '../../context/UserContext'; // contexto de auth del control

type AccesoBiblioteca = {
  id: string;
  dni: string;
  nombre: string;
  apellido?: string;
  roles?: string[];
  categoria?: string;
  timestamp: Timestamp;
};

const RegistroAccesos: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [accesos, setAccesos] = useState<AccesoBiblioteca[]>([]);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [cargando, setCargando] = useState(false);

  // Inicializa fechas por defecto (último mes) y carga accesos
  useEffect(() => {
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(hoy.getMonth() - 1);

    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    const inicio = formatDate(haceUnMes);
    const fin = formatDate(hoy);

    setFechaInicio(inicio);
    setFechaFin(fin);

    cargarAccesosConFechas(inicio, fin);
  }, []);

  // Función para crear query de accesos según rango
  const crearQueryAccesos = (inicio?: Date, fin?: Date): Query<DocumentData> => {
    const accesosRef: CollectionReference<DocumentData> = collection(db, 'accesosBiblioteca');

    if (inicio && fin) {
      return query(
        accesosRef,
        where('timestamp', '>=', Timestamp.fromDate(inicio)),
        where('timestamp', '<=', Timestamp.fromDate(fin)),
        orderBy('timestamp', 'desc')
      );
    }

    return query(accesosRef, orderBy('timestamp', 'desc'));
  };

  // Cargar accesos según fechas de inputs
  const cargarAccesos = async () => {
    if (!fechaInicio || !fechaFin) return alert('Seleccione fechas para filtrar');

    await cargarAccesosConFechas(fechaInicio, fechaFin);
  };

  // Función interna para cargar accesos dado un rango de fechas en string
  const cargarAccesosConFechas = async (inicioStr: string, finStr: string) => {
    const inicio = new Date(inicioStr + 'T00:00:00');
    const fin = new Date(finStr + 'T23:59:59');

    const q = crearQueryAccesos(inicio, fin);
    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AccesoBiblioteca[];
    setAccesos(lista);
  };

  const formatoFecha = (timestamp: Timestamp) =>
    timestamp.toDate().toLocaleString('es-AR', { hour12: false });

  const eliminarAccesos = async () => {
    if (!fechaInicio || !fechaFin) return alert('Seleccione fechas para eliminar');
    if (!window.confirm('¿Eliminar los accesos en el rango seleccionado?')) return;

    setCargando(true);
    try {
      const inicio = new Date(fechaInicio + 'T00:00:00');
      const fin = new Date(fechaFin + 'T23:59:59');

      const q = crearQueryAccesos(inicio, fin);
      const snapshot = await getDocs(q);
      const deletes = snapshot.docs.map(d => deleteDoc(doc(db, 'accesosBiblioteca', d.id)));
      await Promise.all(deletes);

      alert('Accesos eliminados correctamente');
      await cargarAccesos(); // recarga la lista después de eliminar
    } catch (err) {
      console.error('Error eliminando accesos:', err);
      alert('Ocurrió un error al eliminar los accesos');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="registro-accesos-page">
      <Header
        title="Registro de Accesos"
        onBack={() => navigate(-1)}
      />

      <main className="registro-accesos-container">
        <div className="registro-accesos-filtros">
          <label>
            Desde: <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          </label>
          <label>
            Hasta: <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          </label>
          <button disabled={cargando} onClick={cargarAccesos}>
            Filtrar
          </button>

          {user?.rol === 'admin' && (
            <button disabled={cargando} onClick={eliminarAccesos}>
              {cargando ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
        </div>

        {accesos.length === 0 ? (
          <p>No hay accesos registrados en el rango seleccionado.</p>
        ) : (
          <table className="registro-accesos-table">
            <thead>
              <tr>
                <th>DNI</th>
                <th>Nombre Completo</th>
                <th>Categoría</th>
                <th>Fecha / Hora</th>
              </tr>
            </thead>
            <tbody>
              {accesos.map(acceso => (
                <tr key={acceso.id}>
                  <td>{acceso.dni}</td>
                  <td>{`${acceso.apellido || ''} ${acceso.nombre}`.trim()}</td>
                  <td>{acceso.categoria || '-'}</td>
                  <td>{formatoFecha(acceso.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
};

export default RegistroAccesos;
