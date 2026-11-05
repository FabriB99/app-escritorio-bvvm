import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import {
  RefreshCw,
  Fuel,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  LayoutGrid,
  List,
} from 'lucide-react';
import Header from '../../components/Header';
import PageLoader from '../../components/PageLoader/PageLoader';
import './CombustibleLista.css';

interface Unidad {
  id: string;
  nombre: string;
  tipo?: string;
  combustible: string;
  fechaControl?: string | null;
}

type CriterioOrden = 'unidad' | 'combustible';
type ModoVista = 'cuadricula' | 'lista';

type NivelMeta = {
  segmentos: number;
  claseColor: 'nivel-14' | 'nivel-24' | 'nivel-34' | 'nivel-44' | 'nivel-default';
  etiqueta: string;
  pesoOrden: number;
};

const obtenerMetaCombustible = (valor: string): NivelMeta => {
  const limpio = (valor || '').trim();
  switch (limpio) {
    case '1/4':
      return {
        segmentos: 1,
        claseColor: 'nivel-14',
        etiqueta: '1/4 Tanque',
        pesoOrden: 1,
      };
    case '2/4':
      return {
        segmentos: 2,
        claseColor: 'nivel-24',
        etiqueta: '2/4 Tanque',
        pesoOrden: 2,
      };
    case '3/4':
      return {
        segmentos: 3,
        claseColor: 'nivel-34',
        etiqueta: '3/4 Tanque',
        pesoOrden: 3,
      };
    case '4/4':
      return {
        segmentos: 4,
        claseColor: 'nivel-44',
        etiqueta: '4/4 Lleno',
        pesoOrden: 4,
      };
    default:
      return {
        segmentos: 0,
        claseColor: 'nivel-default',
        etiqueta: limpio || 'Sin registro',
        pesoOrden: 0,
      };
  }
};

const extraerNumeroUnidad = (nombre: string): number => {
  const match = nombre.match(/\d+/);
  return match ? parseInt(match[0], 10) : 9999;
};

const formatearFechaControl = (fechaIso?: string | null): string => {
  if (!fechaIso) return 'Sin registro reciente';
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) return 'Sin registro reciente';
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
};

const CombustibleLista: React.FC = () => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [criterioOrden, setCriterioOrden] = useState<CriterioOrden>('unidad');
  const [modoVista, setModoVista] = useState<ModoVista>(() => {
    const guardado = localStorage.getItem('vista_combustible');
    return guardado === 'lista' || guardado === 'cuadricula' ? guardado : 'cuadricula';
  });

  const cambiarModoVista = (modo: ModoVista) => {
    setModoVista(modo);
    localStorage.setItem('vista_combustible', modo);
  };

  const obtenerUnidades = async () => {
    setActualizando(true);
    try {
      const snapshot = await getDocs(collection(db, 'unidades'));

      const data = snapshot.docs.map((docSnap) => {
        const unidad = docSnap.data();
        let fechaControlFormateada: string | null = null;

        if (unidad.fechaControlCombustible) {
          if (unidad.fechaControlCombustible.seconds) {
            fechaControlFormateada = new Date(
              unidad.fechaControlCombustible.seconds * 1000
            ).toISOString();
          } else {
            fechaControlFormateada = unidad.fechaControlCombustible;
          }
        }

        return {
          id: docSnap.id,
          nombre: unidad.nombre || docSnap.id,
          tipo: unidad.tipo || '',
          combustible: unidad.combustible || 'Desconocido',
          fechaControl: fechaControlFormateada,
        } as Unidad;
      });

      setUnidades(data);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    obtenerUnidades();
  }, []);

  // KPIs de resumen
  const kpis = useMemo(() => {
    const total = unidades.length;
    const optimo = unidades.filter(
      (u) => u.combustible === '3/4' || u.combustible === '4/4'
    ).length;
    const atencion = unidades.filter(
      (u) => u.combustible === '1/4' || u.combustible === '2/4'
    ).length;
    return { total, optimo, atencion };
  }, [unidades]);

  // Ordenamiento reactivo sin reconsultar Firestore
  const unidadesOrdenadas = useMemo(() => {
    const copia = [...unidades];
    copia.sort((a, b) => {
      const numA = extraerNumeroUnidad(a.nombre);
      const numB = extraerNumeroUnidad(b.nombre);

      if (criterioOrden === 'combustible') {
        const pesoA = obtenerMetaCombustible(a.combustible).pesoOrden;
        const pesoB = obtenerMetaCombustible(b.combustible).pesoOrden;
        if (pesoA !== pesoB) {
          return pesoA - pesoB;
        }
      }

      return numA - numB;
    });
    return copia;
  }, [unidades, criterioOrden]);

  return (
    <div className="combustible-lista">
      <Header
        title="Control Combustible"
        extraButtons={[
          {
            key: 'refresh',
            icon: RefreshCw,
            ariaLabel: 'Actualizar lista',
            disabled: actualizando,
            onClick: obtenerUnidades,
          },
        ]}
      />

      {cargando ? (
        <PageLoader texto="Cargando registros de combustible..." />
      ) : (
        <div className="combustible-panel">
          {/* Barra superior: KPIs + Selector de Ordenamiento */}
          <div className="combustible-toolbar">
            <div className="combustible-kpis">
              <div className="combustible-kpi-card">
                <div className="combustible-kpi-icon combustible-kpi-icon--flota">
                  <Truck size={18} />
                </div>
                <div className="combustible-kpi-info">
                  <span className="combustible-kpi-label">Total Flota</span>
                  <strong className="combustible-kpi-value">{kpis.total}</strong>
                </div>
              </div>

              <div className="combustible-kpi-card">
                <div className="combustible-kpi-icon combustible-kpi-icon--optimo">
                  <CheckCircle2 size={18} />
                </div>
                <div className="combustible-kpi-info">
                  <span className="combustible-kpi-label">Nivel Óptimo</span>
                  <strong className="combustible-kpi-value combustible-kpi-value--optimo">
                    {kpis.optimo}
                  </strong>
                </div>
              </div>

              <div
                className={`combustible-kpi-card ${
                  kpis.atencion > 0 ? 'combustible-kpi-card--alerta' : ''
                }`}
              >
                <div
                  className={`combustible-kpi-icon ${
                    kpis.atencion > 0
                      ? 'combustible-kpi-icon--alerta'
                      : 'combustible-kpi-icon--neutral'
                  }`}
                >
                  <AlertTriangle size={18} />
                </div>
                <div className="combustible-kpi-info">
                  <span className="combustible-kpi-label">Atención / Carga</span>
                  <strong
                    className={`combustible-kpi-value ${
                      kpis.atencion > 0 ? 'combustible-kpi-value--alerta' : ''
                    }`}
                  >
                    {kpis.atencion}
                  </strong>
                </div>
              </div>
            </div>

            <div className="combustible-controls-right">
              <div className="combustible-sort-wrap">
                <span className="combustible-sort-label">
                  <ArrowUpDown size={14} />
                  Ordenar por:
                </span>
                <div className="combustible-sort-pills" role="group" aria-label="Ordenar unidades">
                  <button
                    type="button"
                    className={`combustible-sort-pill ${
                      criterioOrden === 'unidad' ? 'active' : ''
                    }`}
                    onClick={() => setCriterioOrden('unidad')}
                  >
                    N° Unidad
                  </button>
                  <button
                    type="button"
                    className={`combustible-sort-pill ${
                      criterioOrden === 'combustible' ? 'active' : ''
                    }`}
                    onClick={() => setCriterioOrden('combustible')}
                  >
                    Nivel Combustible
                  </button>
                </div>
              </div>

              <div className="combustible-view-toggle" role="group" aria-label="Modo de vista">
                <button
                  type="button"
                  className={`combustible-view-btn ${
                    modoVista === 'cuadricula' ? 'active' : ''
                  }`}
                  onClick={() => cambiarModoVista('cuadricula')}
                  title="Vista en cuadrícula"
                  aria-label="Vista en cuadrícula"
                  aria-pressed={modoVista === 'cuadricula'}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  className={`combustible-view-btn ${
                    modoVista === 'lista' ? 'active' : ''
                  }`}
                  onClick={() => cambiarModoVista('lista')}
                  title="Vista en lista"
                  aria-label="Vista en lista"
                  aria-pressed={modoVista === 'lista'}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Listado de unidades (Cuadrícula o Lista) */}
          <div className={`combustible-contenido modo-${modoVista}`}>
            {unidadesOrdenadas.map((unidad) => {
              const meta = obtenerMetaCombustible(unidad.combustible);
              const claveBorde = unidad.combustible.replace('/', '');

              return (
                <article
                  key={unidad.id}
                  className={`unidad-card-combustible borde-${claveBorde}`}
                >
                  {/* Cabecera: Nombre de unidad + Badge tipo */}
                  <div className="unidad-card-header">
                    <h3 className="unidad-nombre">{unidad.nombre}</h3>
                    {unidad.tipo && (
                      <span className="badge-tipo">{unidad.tipo}</span>
                    )}
                  </div>

                  {/* Medidor visual de tanque en 4 segmentos */}
                  <div className="unidad-tanque-section">
                    <div className="unidad-tanque-top">
                      <div className={`unidad-tanque-label ${meta.claseColor}`}>
                        <Fuel size={15} />
                        <span>{meta.etiqueta}</span>
                      </div>
                    </div>

                    <div
                      className="unidad-tanque-segmentos"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-valuenow={meta.segmentos}
                      aria-label={`Nivel de combustible de ${unidad.nombre}: ${meta.etiqueta}`}
                    >
                      {[1, 2, 3, 4].map((seg) => {
                        const activo = seg <= meta.segmentos;
                        return (
                          <span
                            key={seg}
                            className={`tanque-segmento ${
                              activo ? `activo ${meta.claseColor}` : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Pie de tarjeta: Fecha último control */}
                  <div className="unidad-card-footer">
                    <span className="fecha-control">
                      Último control: {formatearFechaControl(unidad.fechaControl)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CombustibleLista;

