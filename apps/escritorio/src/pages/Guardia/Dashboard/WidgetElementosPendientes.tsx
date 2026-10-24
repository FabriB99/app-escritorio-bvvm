// src/pages/Guardia/Dashboard/WidgetElementosPendientes.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../app/firebase-config';
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { toast } from 'sonner';
import { AlertCircle, Plus, CheckCircle, Building2, Truck, Clock, X } from 'lucide-react';
import type { ElementoMedicoHospital } from '../ElementosMedicosHospital/types';
import ModalRegistrarElemento from '../ElementosMedicosHospital/ModalRegistrarElemento';

const formatearFechaHora = (ts?: Timestamp): string => {
  if (!ts) return '—';
  const d = ts.toDate();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const horas = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} · ${horas}:${mins} hs`;
};

const nombreElemento = (r: ElementoMedicoHospital) =>
  r.elemento === 'Otro' ? (r.elementoOtro ?? 'Otro') : r.elemento;

const nombreHospital = (r: ElementoMedicoHospital) =>
  r.hospital === 'Otro' ? (r.hospitalOtro ?? 'Otro') : r.hospital;

const WidgetElementosPendientes: React.FC = () => {
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();
  const [elementos, setElementos] = useState<(ElementoMedicoHospital & { id: string })[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal para registrar nuevo elemento
  const [modalNuevo, setModalNuevo] = useState(false);

  // Modal compacto de confirmación para recuperar
  const [elementoARecuperar, setElementoARecuperar] = useState<(ElementoMedicoHospital & { id: string }) | null>(null);
  const [obsRecuperacion, setObsRecuperacion] = useState('');
  const [guardandoRecupero, setGuardandoRecupero] = useState(false);

  // Estado para expandir todos los elementos en el lugar
  const [verTodos, setVerTodos] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'elementos_medicos_hospital'),
      where('estado', '==', 'pendiente')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ElementoMedicoHospital & { id: string }));
      data.sort((a, b) => b.fechaRegistro.toMillis() - a.fechaRegistro.toMillis());
      setElementos(data);
      setCargando(false);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleConfirmarRecuperacion = async () => {
    if (!user || !miembroActivo || !elementoARecuperar?.id) return;
    setGuardandoRecupero(true);
    try {
      const operador = buildOperador(miembroActivo, user.rol);
      const now = Timestamp.now();

      const updateData: Partial<ElementoMedicoHospital> & {
        fechaResolucion?: Timestamp;
      } = {
        estado: 'recuperado',
        fechaRecuperacion: now,
        fechaResolucion: now,
        resueltoPorUid: operador.uid,
        resueltoPorNombre: operador.nombre,
        ...(obsRecuperacion.trim() && {
          observacionesRecuperacion: obsRecuperacion.trim(),
        }),
      };

      await updateDoc(doc(db, 'elementos_medicos_hospital', elementoARecuperar.id), updateData);

      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'elementos_medicos_hospital',
        docId: elementoARecuperar.id,
        docResumen: `Recuperado: ${elementoARecuperar.cantidad}x ${nombreElemento(elementoARecuperar)}`,
        operador,
        detalles: {
          descripcion: `Marcó como recuperado de ${nombreHospital(elementoARecuperar)}${
            obsRecuperacion.trim() ? `. Obs: ${obsRecuperacion.trim()}` : ''
          }`,
        },
      });

      toast.success('Elemento marcado como recuperado');
      setElementoARecuperar(null);
      setObsRecuperacion('');
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar el estado');
    } finally {
      setGuardandoRecupero(false);
    }
  };

  const elementosAMostrar = verTodos ? elementos : elementos.slice(0, 5);

  return (
    <>
      <div className="widget-card widget-card-elementos">
        {/* Header Limpio con Contador y Botón de Acción Suave */}
        <div className="widget-header">
          <div className="widget-header-title-wrap">
            <h3 className="widget-title">
              <AlertCircle size={20} color="#f59e0b" />
              Elementos a Recuperar
            </h3>
            <span className="widget-counter-badge widget-counter-badge--warning" title={`${elementos.length} pendientes`}>
              {elementos.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setModalNuevo(true)}
            className="btn-widget-action"
            title="Registrar elemento dejado"
          >
            <Plus size={18} />
          </button>
        </div>

        {cargando ? (
          <p className="widget-loading">Cargando...</p>
        ) : (
          <>
            {elementos.length === 0 ? (
              <p className="widget-empty-msg">No hay elementos pendientes. ¡Todo recuperado!</p>
            ) : (
              <ul className="widget-list">
                {elementosAMostrar.map(el => (
                  <li key={el.id} className="widget-list-item elemento-pendiente-item">
                    <div className="elemento-item-content">
                      <strong className="elemento-item-title">
                        {el.cantidad}x {nombreElemento(el)}
                      </strong>
                      {el.observaciones && (
                        <span className="elemento-item-desc">
                          {el.observaciones}
                        </span>
                      )}
                      <div className="widget-meta-row">
                        <span className="widget-meta-tag">
                          <Building2 size={12} className="widget-meta-tag-icon" />
                          {nombreHospital(el)}
                        </span>
                        <span className="widget-meta-tag">
                          <Truck size={12} className="widget-meta-tag-icon" />
                          {el.unidadNombre}
                        </span>
                        <span className="widget-meta-time">
                          <Clock size={12} className="widget-meta-tag-icon" />
                          {formatearFechaHora(el.fechaRegistro)}
                        </span>
                        <span className="widget-meta-author">
                          · {el.registradoPorNombre}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setElementoARecuperar(el);
                        setObsRecuperacion('');
                      }}
                      title="Marcar como recuperado"
                      className="btn-action-round"
                    >
                      <CheckCircle size={22} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Pie del Widget siempre visible con enlace al listado completo */}
            <div className={`widget-card-footer ${elementos.length > 5 ? 'widget-card-footer--split' : ''}`}>
              {elementos.length > 5 && (
                <button
                  type="button"
                  onClick={() => setVerTodos(!verTodos)}
                  className="widget-link-btn widget-link-btn--subtle"
                >
                  {verTodos ? 'Mostrar menos' : `Expandir lista (${elementos.length - 5} más)`}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/elementos-medicos')}
                className="widget-link-btn"
                title="Ir al listado completo de elementos médicos"
              >
                Ver historial completo →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal Registrar Nuevo Elemento Dejado */}
      {modalNuevo && (
        <ModalRegistrarElemento
          onClose={() => setModalNuevo(false)}
          onGuardado={() => setModalNuevo(false)}
        />
      )}

      {/* Modal Compacto de Confirmación de Recuperación */}
      {elementoARecuperar && (
        <div className="modal-overlay">
          <div className="modal-solido-container modal-compacto-recuperar">
            <div className="modal-solido-header">
              <h3 className="modal-solido-title">Confirmar Recuperación</h3>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => {
                  setElementoARecuperar(null);
                  setObsRecuperacion('');
                }}
                disabled={guardandoRecupero}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-solido-body">
              <div className="modal-info-box">
                <p className="modal-info-row">
                  <strong>Elemento:</strong> {elementoARecuperar.cantidad}x {nombreElemento(elementoARecuperar)}
                </p>
                <p className="modal-info-row">
                  <strong>Hospital:</strong> {nombreHospital(elementoARecuperar)}
                </p>
                <p className="modal-info-row">
                  <strong>Unidad:</strong> {elementoARecuperar.unidadNombre}
                </p>
                <p className="modal-info-row">
                  <strong>Depositado:</strong> {formatearFechaHora(elementoARecuperar.fechaRegistro)}
                </p>
                {elementoARecuperar.observaciones && (
                  <p className="modal-info-row">
                    <strong>Observación:</strong> {elementoARecuperar.observaciones}
                  </p>
                )}
              </div>

              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>OBSERVACIONES DE RECUPERACIÓN (OPCIONAL)</label>
                </div>
                <textarea
                  placeholder="Ej: Recuperado completo en guardia del hospital..."
                  value={obsRecuperacion}
                  onChange={(e) => setObsRecuperacion(e.target.value)}
                  className="input-solido"
                  rows={3}
                />
              </div>

              <div className="modal-solido-actions modal-solido-actions--row">
                <button
                  type="button"
                  className="btn-solido-secondary"
                  onClick={() => {
                    setElementoARecuperar(null);
                    setObsRecuperacion('');
                  }}
                  disabled={guardandoRecupero}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-solido-primary btn-solido-primary--success"
                  onClick={handleConfirmarRecuperacion}
                  disabled={guardandoRecupero}
                >
                  <CheckCircle size={18} />
                  {guardandoRecupero ? 'Guardando...' : 'Confirmar recuperación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WidgetElementosPendientes;