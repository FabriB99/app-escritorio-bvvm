// src/pages/Guardia/Dashboard/WidgetClima.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../app/firebase-config';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  Cloud, Droplets, Sun, CloudRain, 
  CloudLightning, CloudFog, AlertTriangle, Gauge, TrendingUp, TrendingDown, Navigation
} from 'lucide-react';

interface DatosClima {
  temperatura: number;
  tendenciaTemp: number;
  sensacion: number;
  humedad: number;
  tendenciaHum: number;
  viento: number;
  rafagas: number;
  direccion: number;
  lluvia: number;
  presion: number;
  tendenciaPresion: number;
  iconoNum: number;
}

const getDireccionVientoCardinales = (grados: number): string => {
  const sectores = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const indice = Math.round((grados % 360) / 45);
  return sectores[indice === 8 ? 0 : indice];
};

const getEstadoClima = (iconoNum: number) => {
  const lluvia = [8, 12, 14, 20, 21, 22, 23, 24];
  const tormenta = [17, 29, 30, 31, 32];
  const nublado = [2, 3, 4, 13, 18, 19];
  const niebla = [6, 7, 10, 11];
  
  if (lluvia.includes(iconoNum)) return { texto: 'Lluvia', icono: <CloudRain size={50} color="#3b82f6" strokeWidth={2} /> };
  if (tormenta.includes(iconoNum)) return { texto: 'Tormenta', icono: <CloudLightning size={50} color="#8b5cf6" strokeWidth={2} /> };
  if (nublado.includes(iconoNum)) return { texto: 'Nublado', icono: <Cloud size={50} color="#94a3b8" strokeWidth={2} /> };
  if (niebla.includes(iconoNum)) return { texto: 'Niebla', icono: <CloudFog size={50} color="#cbd5e1" strokeWidth={2} /> };
  
  return { texto: 'Despejado', icono: <Sun size={50} color="#eab308" strokeWidth={2} /> };
};

const IndicadorTendencia = ({ valor }: { valor: number }) => {
  if (!valor || valor === 0) return null;
  return valor > 0 
    ? <TrendingUp size={25} color="#ef4444" style={{ marginLeft: '4px' }} /> 
    : <TrendingDown size={25} color="#3b82f6" style={{ marginLeft: '4px' }} />;
};

const WidgetClima: React.FC = () => {
  const [clima, setClima] = useState<DatosClima | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config_guardia', 'clima_estacion'), (snapshot) => {
      if (snapshot.exists()) {
        setClima(snapshot.data() as DatosClima);
      }
      setCargando(false);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  if (cargando) return <div className="widget-card"><p className="widget-loading">Cargando meteorología...</p></div>;
  if (!clima) return <div className="widget-card"><p className="widget-error">A la espera de datos...</p></div>;

  const estado = getEstadoClima(clima.iconoNum);

  return (
    /* Agregamos la clase widget-clima-compacto para controlar el contenedor */
    <div className="widget-card widget-clima-compacto">
      
      <div className="widget-header">
        <h3 className="widget-title"><Cloud size={16} /> Meteorología</h3>
        <span className="badge-prioridad" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', margin: 0, padding: '2px 8px' }}>Villa María</span>
      </div>

      <div className="clima-card-body">
        
        {/* ROW SUPERIOR */}
        <div className="clima-row-top">
          <div className="clima-bloque-temp">
            {estado.icono}
            <div className="clima-textos-temp">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="clima-temp-grande">{clima.temperatura.toFixed(1)}°</span>
                <IndicadorTendencia valor={clima.tendenciaTemp} />
              </div>
              <span className="clima-st-chica">ST {clima.sensacion.toFixed(1)}°</span>
            </div>
          </div>

          <div className="clima-bloque-brujula">
            <div style={{ width: '55px', height: '55px', position: 'relative' }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e8ecf0" strokeWidth="3" />
                <text x="50" y="18" fill="#94a3b8" fontSize="16" fontWeight="900" textAnchor="middle">N</text>
                <text x="50" y="90" fill="#94a3b8" fontSize="16" fontWeight="900" textAnchor="middle">S</text>
                <g transform={`rotate(${clima.direccion} 50 50)`}>
                  <polygon points="50,25 45,50 55,50" fill="#ef4444" />
                  <polygon points="50,75 45,50 55,50" fill="#cbd5e1" />
                  <circle cx="50" cy="50" r="5" fill="#1e293b" />
                </g>
              </svg>
            </div>
            <div className="clima-textos-viento">
              <span className="viento-card-rumbo">
                <Navigation size={15} style={{ transform: `rotate(${clima.direccion}deg)`, color: '#10b981' }} />
                {getDireccionVientoCardinales(clima.direccion)}
              </span>
              <span className="viento-card-kmh">{clima.viento.toFixed(1)} <small>km/h</small></span>
            </div>
          </div>
        </div>

        <div className="clima-linea-separadora"></div>

        {/* ROW INFERIOR */}
        <div className="clima-row-grid">
          <div className="clima-item-grid">
            <Droplets size={25} color="#3b82f6" />
            <div className="clima-item-textos">
              <span>Humedad</span>
              <strong>{clima.humedad}%</strong>
            </div>
          </div>

          <div className="clima-item-grid">
            <Gauge size={25} color="#64748b" />
            <div className="clima-item-textos">
              <span>Presión</span>
              <strong>{clima.presion.toFixed(0)} <small>hPa</small></strong>
            </div>
          </div>

          <div className="clima-item-grid">
            <CloudRain size={25} color="#0ea5e9" />
            <div className="clima-item-textos">
              <span>Lluvia</span>
              <strong>{clima.lluvia.toFixed(1)} <small>mm</small></strong>
            </div>
          </div>

          <div className="clima-item-grid">
            <AlertTriangle size={25} color="#d97706" />
            <div className="clima-item-textos">
              <span style={{ color: '#d97706' }}>Ráfagas</span>
              <strong style={{ color: '#b45309' }}>{clima.rafagas.toFixed(1)} <small>km/h</small></strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WidgetClima;