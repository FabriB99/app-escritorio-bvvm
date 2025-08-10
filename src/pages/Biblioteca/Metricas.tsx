// src/components/Metricas/Metricas.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  FaChartLine,
  FaFileAlt,
  FaFolderOpen,
  FaUsers,
  FaCalendarAlt,
  FaFilter,
} from 'react-icons/fa';
import './Metricas.css';
import { useNavigate } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type LogDescarga = {
  archivoNombre: string;
  seccion: string;
  usuario: string;
  dni: string;
  timestamp: any;
};

const Metricas: React.FC = () => {
  const [logs, setLogs] = useState<LogDescarga[]>([]);
  const [total, setTotal] = useState(0);
  const [porArchivo, setPorArchivo] = useState<{ [key: string]: number }>({});
  const [porSeccion, setPorSeccion] = useState<{ [key: string]: number }>({});
  const [porUsuario, setPorUsuario] = useState<{ [key: string]: number }>({});
  const navigate = useNavigate();

  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [seccionFiltro, setSeccionFiltro] = useState('Todas');
  const [seccionesDisponibles, setSeccionesDisponibles] = useState<string[]>([]);

  useEffect(() => {
    const fetchSecciones = async () => {
      const snapshot = await getDocs(collection(db, 'logs_descargas'));
      const seccionesSet = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data() as LogDescarga;
        if (data.seccion) seccionesSet.add(data.seccion);
      });
      setSeccionesDisponibles(Array.from(seccionesSet));
    };
    fetchSecciones();
  }, []);

  useEffect(() => {
    const fetchDatos = async () => {
      const snapshot = await getDocs(collection(db, 'logs_descargas'));
      let logsRaw = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as unknown as LogDescarga)
      }));

      if (seccionFiltro !== 'Todas') {
        logsRaw = logsRaw.filter(log => log.seccion === seccionFiltro);
      }

      const desdeTS = new Date(fechaDesde).getTime();
      const hastaTS = new Date(fechaHasta).getTime() + 86399999;
      logsRaw = logsRaw.filter(log => {
        const t = log.timestamp?.toDate?.()?.getTime?.() || new Date(log.timestamp).getTime();
        return t >= desdeTS && t <= hastaTS;
      });

      setLogs(logsRaw);
      setTotal(logsRaw.length);

      const archivos: { [key: string]: number } = {};
      const secciones: { [key: string]: number } = {};
      const usuarios: { [key: string]: number } = {};

      logsRaw.forEach(log => {
        archivos[log.archivoNombre] = (archivos[log.archivoNombre] || 0) + 1;
        secciones[log.seccion] = (secciones[log.seccion] || 0) + 1;
        const nombreCompleto = `${log.usuario} (${log.dni})`;
        usuarios[nombreCompleto] = (usuarios[nombreCompleto] || 0) + 1;
      });

      setPorArchivo(archivos);
      setPorSeccion(secciones);
      setPorUsuario(usuarios);
    };

    fetchDatos();
  }, [fechaDesde, fechaHasta, seccionFiltro]);

  const top = (obj: { [key: string]: number }) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const agrupadoPorDia: { [fecha: string]: number } = {};
  logs.forEach(log => {
    const fecha = log.timestamp?.toDate?.()?.toISOString().slice(0, 10) || new Date(log.timestamp).toISOString().slice(0, 10);
    agrupadoPorDia[fecha] = (agrupadoPorDia[fecha] || 0) + 1;
  });

  const fechasOrdenadas = Object.keys(agrupadoPorDia).sort();

  const dataGrafico = {
    labels: fechasOrdenadas,
    datasets: [
      {
        label: 'Descargas por día',
        data: fechasOrdenadas.map(fecha => agrupadoPorDia[fecha]),
        fill: false,
        borderColor: '#2c3e50',
        backgroundColor: '#2c3e50',
      },
    ],
  };

  const opcionesGrafico = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Descargas diarias' },
    },
  };

  return (
    <div className="metricas__contenedor">
      <div className="metricas__header">
        <button
          className="metricas__btn-volver"
          onClick={() => navigate('/editar-biblioteca')}
          aria-label="Volver"
        >
          ↩ Regresar
        </button>
        <FaChartLine className="metricas__icono-titulo" />
        <h2>Métricas de Biblioteca</h2>
      </div>

      <div className="metricas__filtros">
        <label>
          <FaCalendarAlt /> Desde:
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} max={fechaHasta} />
        </label>
        <label>
          <FaCalendarAlt /> Hasta:
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} min={fechaDesde} max={new Date().toISOString().split('T')[0]} />
        </label>
        <label>
          <FaFilter /> Sección:
          <select value={seccionFiltro} onChange={e => setSeccionFiltro(e.target.value)}>
            <option value="Todas">Todas</option>
            {seccionesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="metricas__item">
        <strong>Total de descargas:</strong> {total}
      </div>

      <div className="metricas__bloques">
        <div className="metricas__bloque">
          <h3><FaFileAlt /> Archivos más descargados</h3>
          <ul>
            {top(porArchivo).map(([archivo, cantidad]) => (
              <li key={archivo}>{archivo}: {cantidad}</li>
            ))}
          </ul>
        </div>

        <div className="metricas__bloque">
          <h3><FaFolderOpen /> Secciones más activas</h3>
          <ul>
            {top(porSeccion).map(([seccion, cantidad]) => (
              <li key={seccion}>{seccion}: {cantidad}</li>
            ))}
          </ul>
        </div>

        <div className="metricas__bloque">
          <h3><FaUsers /> Usuarios más activos</h3>
          <ul>
            {top(porUsuario).map(([usuario, cantidad]) => (
              <li key={usuario}>{usuario}: {cantidad}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="metricas__grafico">
        <Line data={dataGrafico} options={opcionesGrafico} />
      </div>
    </div>
  );
};

export default Metricas;
