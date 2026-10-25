// src/pages/Admin/PanelAdmin.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../app/firebase-config';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import {
  Users,
  Truck,
  Wrench,
  Activity,
  Award,
  ListFilter,
  PlusCircle,
  Database,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Fuel,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Header from '../../components/Header';
import ModalConfigGuardia from '../Guardia/ElementosMedicosHospital/ModalConfigGuardia';
import { toast } from 'sonner';
import './PanelAdmin.css';

interface MiembroData {
  id: string;
  nombre?: string;
  apellido?: string;
  activo?: boolean;
  grupoSemana?: number;
  roles?: string[];
}

interface UnidadData {
  id: string;
  nombre: string;
  modelo?: string;
  tipo?: string;
  estado?: string;
  combustible?: string;
  ultima_revision?: any;
}

interface AuditoriaItem {
  id: string;
  accion: string;
  coleccion: string;
  docResumen?: string;
  docId?: string;
  operadorNombre?: string;
  fecha?: Timestamp;
}

const normalizarEstado = (estado?: string): 'Operativa' | 'En Reparación' | 'Fuera de Servicio' => {
  const s = (estado || '').toLowerCase().trim();
  if (s.includes('reparac') || s.includes('mantenimiento')) return 'En Reparación';
  if (s.includes('fuera')) return 'Fuera de Servicio';
  return 'Operativa';
};

const formatFechaRelativa = (ts?: Timestamp): string => {
  if (!ts) return '—';
  const fecha = ts.toDate();
  const diffSegundos = Math.floor((Date.now() - fecha.getTime()) / 1000);

  if (diffSegundos < 60) return 'Hace un momento';
  const diffMinutos = Math.floor(diffSegundos / 60);
  if (diffMinutos < 60) return `Hace ${diffMinutos}m`;
  const diffHoras = Math.floor(diffMinutos / 60);
  if (diffHoras < 24) return `Hace ${diffHoras}h`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias}d`;

  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
};

const PanelAdmin: React.FC = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [cargando, setCargando] = useState(true);
  const [miembros, setMiembros] = useState<MiembroData[]>([]);
  const [unidades, setUnidades] = useState<UnidadData[]>([]);
  const [logsAuditoria, setLogsAuditoria] = useState<AuditoriaItem[]>([]);
  const [modalGuardiaAbierto, setModalGuardiaAbierto] = useState(false);
  const [descargandoBackup, setDescargandoBackup] = useState(false);

  // ─── Carga de métricas ────────────────────────────────────────────────────────
  const cargarMetricas = useCallback(async () => {
    setCargando(true);
    try {
      const [snapMiembros, snapUnidades, snapAuditoria] = await Promise.all([
        getDocs(collection(db, 'miembros')),
        getDocs(collection(db, 'unidades')),
        getDocs(query(collection(db, 'auditoria'), orderBy('fecha', 'desc'), limit(50))),
      ]);

      // Miembros
      const dataMiembros: MiembroData[] = snapMiembros.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setMiembros(dataMiembros);

      // Unidades
      const dataUnidades: UnidadData[] = snapUnidades.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<UnidadData, 'id'>),
      }));
      setUnidades(dataUnidades);

      // Auditoría
      const dataAuditoria: AuditoriaItem[] = snapAuditoria.docs.map(d => {
        const raw = d.data() as any;
        return {
          id: d.id,
          accion: (raw.accion || '').toLowerCase(),
          coleccion: raw.coleccion || raw.entidad || '—',
          docResumen: raw.docResumen || raw.docId || raw.entidadId || 'Documento',
          docId: raw.docId || raw.entidadId,
          operadorNombre: raw.operador?.nombre || raw.realizadoPorNombre || 'Sistema',
          fecha: raw.fecha ?? null,
        };
      });
      setLogsAuditoria(dataAuditoria);
    } catch (err) {
      console.error('Error al cargar métricas del panel admin:', err);
      toast.error('Error al cargar datos del panel.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  // ─── Cálculos de KPIs ────────────────────────────────────────────────────────
  const statsPersonal = useMemo(() => {
    const activos = miembros.filter(m => m.activo !== false);
    const inactivos = miembros.filter(m => m.activo === false);
    const g1 = activos.filter(m => m.grupoSemana === 1).length;
    const g2 = activos.filter(m => m.grupoSemana === 2).length;
    const g3 = activos.filter(m => m.grupoSemana === 3).length;
    return {
      totalActivos: activos.length,
      totalInactivos: inactivos.length,
      g1,
      g2,
      g3,
    };
  }, [miembros]);

  const statsFlota = useMemo(() => {
    let operativas = 0;
    let reparacion = 0;
    let fuera = 0;

    unidades.forEach(u => {
      const est = normalizarEstado(u.estado);
      if (est === 'Operativa') operativas++;
      else if (est === 'En Reparación') reparacion++;
      else if (est === 'Fuera de Servicio') fuera++;
    });

    return {
      total: unidades.length,
      operativas,
      reparacion,
      fuera,
    };
  }, [unidades]);

  const statsRevisiones = useMemo(() => {
    const limite14Dias = Date.now() - 14 * 24 * 60 * 60 * 1000;
    let alDia = 0;
    let sinRevision = 0;
    let combustibleBajo = 0;

    unidades.forEach(u => {
      const fechaRev = u.ultima_revision?.toMillis
        ? u.ultima_revision.toMillis()
        : u.ultima_revision?.seconds
        ? u.ultima_revision.seconds * 1000
        : 0;

      if (!fechaRev || fechaRev < limite14Dias) {
        sinRevision++;
      } else {
        alDia++;
      }

      if (u.combustible === '1/4') {
        combustibleBajo++;
      }
    });

    return {
      alDia,
      sinRevision,
      combustibleBajo,
    };
  }, [unidades]);

  const statsAuditoria = useMemo(() => {
    const inicioHoy = new Date().setHours(0, 0, 0, 0);
    const accionesHoy = logsAuditoria.filter(l => {
      const f = l.fecha?.toMillis ? l.fecha.toMillis() : l.fecha?.seconds ? l.fecha.seconds * 1000 : 0;
      return f >= inicioHoy;
    }).length;

    return {
      accionesHoy,
      ultimos6: logsAuditoria.slice(0, 6),
    };
  }, [logsAuditoria]);

  // ─── Unidades con atención requerida ─────────────────────────────────────────
  const unidadesAtencionRequerida = useMemo(() => {
    const limite14Dias = Date.now() - 14 * 24 * 60 * 60 * 1000;

    return unidades.filter(u => {
      const noOperativa = normalizarEstado(u.estado) !== 'Operativa';
      const combustible14 = u.combustible === '1/4';
      const fechaRev = u.ultima_revision?.toMillis
        ? u.ultima_revision.toMillis()
        : u.ultima_revision?.seconds
        ? u.ultima_revision.seconds * 1000
        : 0;
      const sinRevisionReciente = !fechaRev || fechaRev < limite14Dias;

      return noOperativa || combustible14 || sinRevisionReciente;
    });
  }, [unidades]);

  // ─── Generar y Descargar Backup JSON ─────────────────────────────────────────
  const handleDescargarBackup = async () => {
    setDescargandoBackup(true);
    try {
      const [snapMiembros, snapGrados, snapUnidades, snapAreas, snapConfigGuardia] = await Promise.all([
        getDocs(collection(db, 'miembros')),
        getDocs(collection(db, 'grados')),
        getDocs(collection(db, 'unidades')),
        getDocs(collection(db, 'areas_protegidas')),
        getDocs(collection(db, 'config_guardia')),
      ]);

      const backup = {
        metadata: {
          institucion: 'Bomberos Voluntarios de Villa María',
          fecha_generacion: new Date().toISOString(),
          version: '1.0',
        },
        miembros: snapMiembros.docs.map(d => ({ id: d.id, ...d.data() })),
        grados: snapGrados.docs.map(d => ({ id: d.id, ...d.data() })),
        unidades: snapUnidades.docs.map(d => ({ id: d.id, ...d.data() })),
        areas_protegidas: snapAreas.docs.map(d => ({ id: d.id, ...d.data() })),
        config_guardia: snapConfigGuardia.docs.map(d => ({ id: d.id, ...d.data() })),
      };

      const fechaStr = new Date().toISOString().split('T')[0];
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_BVVM_${fechaStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Copia de seguridad descargada exitosamente.');
    } catch (err) {
      console.error('Error al generar copia de seguridad:', err);
      toast.error('Error al generar la copia de seguridad.');
    } finally {
      setDescargandoBackup(false);
    }
  };

  return (
    <div className="panel-admin-page">
      <Header title="Panel de Administración" />

      <main className="panel-admin-container">
        {/* Cabecera ejecutiva */}
        <div className="panel-admin-intro">
          <div>
            <h1 className="panel-admin-title">Centro de Gestión y Control</h1>
            <p className="panel-admin-subtitle">
              Supervisión de personal, parque automotor y trazabilidad de operaciones del cuartel.
            </p>
          </div>
          <button
            type="button"
            className="btn-admin-refresh"
            onClick={cargarMetricas}
            disabled={cargando}
            title="Actualizar métricas"
          >
            <RefreshCw size={15} className={cargando ? 'spinning' : ''} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* 1. Fila Superior de KPIs */}
        <section className="admin-kpis-grid">
          {/* KPI 1: Personal Activo */}
          <div className="admin-kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Personal Activo</span>
              <div className="kpi-icon-box kpi-icon-box--blue">
                <Users size={20} />
              </div>
            </div>
            <div className="kpi-value">{statsPersonal.totalActivos}</div>
            <div className="kpi-submetrics">
              <span className="kpi-pill kpi-pill--g1">G1: {statsPersonal.g1}</span>
              <span className="kpi-pill kpi-pill--g2">G2: {statsPersonal.g2}</span>
              <span className="kpi-pill kpi-pill--g3">G3: {statsPersonal.g3}</span>
              {statsPersonal.totalInactivos > 0 && (
                <span className="kpi-pill kpi-pill--inactive">
                  {statsPersonal.totalInactivos} inactivos
                </span>
              )}
            </div>
          </div>

          {/* KPI 2: Estado de la Flota */}
          <div className="admin-kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Estado de la Flota</span>
              <div className="kpi-icon-box kpi-icon-box--emerald">
                <Truck size={20} />
              </div>
            </div>
            <div className="kpi-value">{statsFlota.total} <span className="kpi-unit">móviles</span></div>
            <div className="kpi-submetrics">
              <span className="kpi-pill kpi-pill--success">
                {statsFlota.operativas} Operativas
              </span>
              {statsFlota.reparacion > 0 && (
                <span className="kpi-pill kpi-pill--warning">
                  {statsFlota.reparacion} En reparación
                </span>
              )}
              {statsFlota.fuera > 0 && (
                <span className="kpi-pill kpi-pill--danger">
                  {statsFlota.fuera} Fuera de servicio
                </span>
              )}
            </div>
          </div>

          {/* KPI 3: Revisiones y Combustible */}
          <div className="admin-kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Revisiones de Móviles</span>
              <div className="kpi-icon-box kpi-icon-box--amber">
                <Wrench size={20} />
              </div>
            </div>
            <div className="kpi-value">
              {statsRevisiones.alDia} <span className="kpi-unit">al día</span>
            </div>
            <div className="kpi-submetrics">
              {statsRevisiones.sinRevision > 0 ? (
                <span className="kpi-pill kpi-pill--warning">
                  {statsRevisiones.sinRevision} sin revisión (+14d)
                </span>
              ) : (
                <span className="kpi-pill kpi-pill--success">Todas al día</span>
              )}
              {statsRevisiones.combustibleBajo > 0 && (
                <span className="kpi-pill kpi-pill--danger">
                  {statsRevisiones.combustibleBajo} con 1/4 tanque
                </span>
              )}
            </div>
          </div>

          {/* KPI 4: Auditoría Reciente */}
          <div className="admin-kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Auditoría Reciente</span>
              <div className="kpi-icon-box kpi-icon-box--purple">
                <Activity size={20} />
              </div>
            </div>
            <div className="kpi-value">
              {statsAuditoria.accionesHoy} <span className="kpi-unit">hoy</span>
            </div>
            <div className="kpi-submetrics">
              <span className="kpi-pill kpi-pill--purple">
                {logsAuditoria.length} registradas recientemente
              </span>
            </div>
          </div>
        </section>

        {/* 2. Sección Central — Accesos y Herramientas */}
        <section className="admin-tools-section">
          <h2 className="admin-section-heading">Accesos y Herramientas de Administración</h2>
          <div className="admin-tools-grid">
            {/* 1. Gestión de Personal */}
            <div
              className="admin-tool-card"
              onClick={() => navigate('/admin/identidades')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/identidades'); }}
            >
              <div className="tool-card-icon tool-card-icon--blue">
                <Users size={22} />
              </div>
              <div className="tool-card-content">
                <h3 className="tool-card-title">Gestión de Personal</h3>
                <p className="tool-card-desc">Crear, editar usuarios, PINs, grupos de semana y roles de acceso.</p>
              </div>
              <ChevronRight size={18} className="tool-card-arrow" />
            </div>

            {/* 2. Escalafón y Grados */}
            <div
              className="admin-tool-card"
              onClick={() => navigate('/admin/grados')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/grados'); }}
            >
              <div className="tool-card-icon tool-card-icon--amber">
                <Award size={22} />
              </div>
              <div className="tool-card-content">
                <h3 className="tool-card-title">Escalafón y Grados</h3>
                <p className="tool-card-desc">Configurar las jerarquías, insignias y orden de mando institucional.</p>
              </div>
              <ChevronRight size={18} className="tool-card-arrow" />
            </div>

            {/* 3. Registro de Auditoría */}
            <div
              className="admin-tool-card"
              onClick={() => navigate('/admin/auditoria')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/auditoria'); }}
            >
              <div className="tool-card-icon tool-card-icon--purple">
                <Activity size={22} />
              </div>
              <div className="tool-card-content">
                <h3 className="tool-card-title">Registro de Auditoría</h3>
                <p className="tool-card-desc">Historial detallado de acciones, creación, cambios y eliminaciones.</p>
              </div>
              <ChevronRight size={18} className="tool-card-arrow" />
            </div>

            {/* 4. Listas de Guardia */}
            <div
              className="admin-tool-card"
              onClick={() => setModalGuardiaAbierto(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setModalGuardiaAbierto(true); }}
            >
              <div className="tool-card-icon tool-card-icon--teal">
                <ListFilter size={22} />
              </div>
              <div className="tool-card-content">
                <h3 className="tool-card-title">Listas de Guardia</h3>
                <p className="tool-card-desc">Configurar opciones de Elementos Médicos y Centros Médicos / Hospitales.</p>
              </div>
              <ChevronRight size={18} className="tool-card-arrow" />
            </div>

            {/* 5. Crear Nueva Unidad */}
            <div
              className="admin-tool-card"
              onClick={() => navigate('/crear-unidad')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/crear-unidad'); }}
            >
              <div className="tool-card-icon tool-card-icon--emerald">
                <PlusCircle size={22} />
              </div>
              <div className="tool-card-content">
                <h3 className="tool-card-title">Crear Nueva Unidad</h3>
                <p className="tool-card-desc">Dar de alta un móvil en el parque automotor y configurar su inventario.</p>
              </div>
              <ChevronRight size={18} className="tool-card-arrow" />
            </div>

            {/* 6. Copia de Seguridad */}
            <div
              className="admin-tool-card"
              onClick={handleDescargarBackup}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDescargarBackup(); }}
            >
              <div className="tool-card-icon tool-card-icon--slate">
                <Database size={22} />
              </div>
              <div className="tool-card-content">
                <h3 className="tool-card-title">Copia de Seguridad</h3>
                <p className="tool-card-desc">
                  {descargandoBackup ? 'Descargando datos...' : 'Descargar archivo JSON con el respaldo completo del cuartel.'}
                </p>
              </div>
              <ChevronRight size={18} className="tool-card-arrow" />
            </div>
          </div>
        </section>

        {/* 3. Sección Inferior en 2 Columnas */}
        <section className="admin-bottom-columns">
          {/* Columna Izquierda: Estado de Unidades y Atención Requerida */}
          <div className="admin-panel-box">
            <div className="admin-panel-box__header">
              <div className="panel-box-title-group">
                <Truck size={18} className="panel-box-icon" />
                <h3 className="panel-box-title">Estado de Unidades y Atención Requerida</h3>
              </div>
              {unidadesAtencionRequerida.length > 0 && (
                <span className="badge-alerta-count">
                  {unidadesAtencionRequerida.length}
                </span>
              )}
            </div>

            <div className="admin-panel-box__body">
              {unidadesAtencionRequerida.length === 0 ? (
                <div className="estado-unidades-impecable">
                  <CheckCircle2 size={36} className="icono-impecable" />
                  <h4>Todas las unidades operativas y al día</h4>
                  <p>No hay móviles en mantenimiento, con combustible bajo o con revisiones vencidas.</p>
                </div>
              ) : (
                <div className="lista-unidades-atencion">
                  {unidadesAtencionRequerida.map(u => {
                    const est = normalizarEstado(u.estado);
                    const combustibleBajo = u.combustible === '1/4';
                    const limite14Dias = Date.now() - 14 * 24 * 60 * 60 * 1000;
                    const fechaRev = u.ultima_revision?.toMillis
                      ? u.ultima_revision.toMillis()
                      : u.ultima_revision?.seconds
                      ? u.ultima_revision.seconds * 1000
                      : 0;
                    const sinRevision = !fechaRev || fechaRev < limite14Dias;

                    return (
                      <div
                        key={u.id}
                        className="item-unidad-atencion"
                        onClick={() => navigate(`/unidad/${u.id}`)}
                      >
                        <div className="item-unidad-atencion__info">
                          <div className="item-unidad-atencion__nombre">
                            <strong>{u.nombre}</strong>
                            {u.modelo && <span className="item-unidad-modelo">{u.modelo}</span>}
                          </div>
                          <div className="item-unidad-atencion__motivos">
                            {est !== 'Operativa' && (
                              <span className={`badge-motivo badge-motivo--${est === 'En Reparación' ? 'warning' : 'danger'}`}>
                                <AlertTriangle size={12} /> {est}
                              </span>
                            )}
                            {combustibleBajo && (
                              <span className="badge-motivo badge-motivo--fuel">
                                <Fuel size={12} /> Tanque 1/4
                              </span>
                            )}
                            {sinRevision && (
                              <span className="badge-motivo badge-motivo--revision">
                                <Clock size={12} /> Sin revisión (+14d)
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="item-unidad-flecha" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Últimos Movimientos Registrados */}
          <div className="admin-panel-box">
            <div className="admin-panel-box__header">
              <div className="panel-box-title-group">
                <Activity size={18} className="panel-box-icon" />
                <h3 className="panel-box-title">Últimos Movimientos Registrados</h3>
              </div>
              <button
                type="button"
                className="btn-ver-todo"
                onClick={() => navigate('/admin/auditoria')}
              >
                <span>Ver auditoría completa</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="admin-panel-box__body">
              {statsAuditoria.ultimos6.length === 0 ? (
                <div className="admin-empty-state">
                  <Activity size={32} />
                  <p>No se encontraron registros de auditoría recientes.</p>
                </div>
              ) : (
                <div className="lista-auditoria-reciente">
                  {statsAuditoria.ultimos6.map(item => {
                    const accion = item.accion;
                    const claseBadge =
                      accion === 'crear'
                        ? 'badge-accion--crear'
                        : accion === 'eliminar'
                        ? 'badge-accion--eliminar'
                        : 'badge-accion--editar';

                    return (
                      <div key={item.id} className="item-auditoria-reciente">
                        <div className="item-auditoria__main">
                          <div className="item-auditoria__top">
                            <span className={`badge-accion ${claseBadge}`}>
                              {accion}
                            </span>
                            <span className="item-auditoria__coleccion">
                              {item.coleccion}
                            </span>
                            <span className="item-auditoria__hora">
                              {formatFechaRelativa(item.fecha)}
                            </span>
                          </div>
                          <p className="item-auditoria__resumen" title={item.docResumen}>
                            {item.docResumen}
                          </p>
                          <span className="item-auditoria__operador">
                            Por <strong>{item.operadorNombre}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Modal unificado de Listas de Guardia */}
      {modalGuardiaAbierto && (
        <ModalConfigGuardia
          isOpen={modalGuardiaAbierto}
          onClose={() => setModalGuardiaAbierto(false)}
        />
      )}
    </div>
  );
};

export default PanelAdmin;
