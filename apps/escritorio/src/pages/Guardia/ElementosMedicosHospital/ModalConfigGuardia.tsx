import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../app/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { invalidarCacheCatalogos, actualizarCacheCatalogos } from '../../../utils/cacheCatalogos';
import Modal from '../../../components/Modal';
import type { ConfigLista } from './types';
import './ModalConfigGuardia.css';

interface ModalConfigGuardiaProps {
  isOpen?: boolean;
  tabInicial?: 'elementos' | 'hospitales';
  onClose: () => void;
  onActualizado?: () => void;
}

export const ModalConfigGuardia: React.FC<ModalConfigGuardiaProps> = ({
  isOpen = true,
  tabInicial = 'elementos',
  onClose,
  onActualizado,
}) => {
  const { user, miembroActivo } = useUser();
  const [tab, setTab] = useState<'elementos' | 'hospitales'>(tabInicial);

  const [elementos, setElementos] = useState<string[]>([]);
  const [hospitales, setHospitales] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  const [nuevoTexto, setNuevoTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estado para confirmación visual in-line de eliminación (sin window.confirm)
  const [itemEnConfirmacion, setItemEnConfirmacion] = useState<string | null>(null);

  // Actualizar tab si cambia la prop tabInicial
  useEffect(() => {
    if (tabInicial) {
      setTab(tabInicial);
    }
  }, [tabInicial]);

  // Cargar listas desde Firestore
  const cargarListas = useCallback(async () => {
    setCargando(true);
    try {
      const [docEl, docHosp] = await Promise.all([
        getDoc(doc(db, 'config_guardia', 'elementos_medicos')),
        getDoc(doc(db, 'config_guardia', 'hospitales')),
      ]);
      setElementos(docEl.exists() ? (docEl.data() as ConfigLista).items ?? [] : []);
      setHospitales(docHosp.exists() ? (docHosp.data() as ConfigLista).items ?? [] : []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la configuración de listas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      cargarListas();
      setItemEnConfirmacion(null);
      setNuevoTexto('');
    }
  }, [isOpen, cargarListas]);

  const listaActual = tab === 'elementos' ? elementos : hospitales;
  const colDoc = tab === 'elementos' ? 'elementos_medicos' : 'hospitales';
  const nombreColeccionLegible = tab === 'elementos' ? 'elementos médicos' : 'centros médicos / hospitales';

  // Guardar en Firestore y registrar en auditoría
  const persistirLista = async (nuevaLista: string[], accionDescripcion: string) => {
    if (!user || !miembroActivo) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, 'config_guardia', colDoc), { items: nuevaLista }, { merge: true });

      if (tab === 'elementos') {
        setElementos(nuevaLista);
        actualizarCacheCatalogos('elementos', nuevaLista);
      } else {
        setHospitales(nuevaLista);
        actualizarCacheCatalogos('hospitales', nuevaLista);
      }

      invalidarCacheCatalogos(tab === 'elementos' ? 'elementos' : 'hospitales');

      const operador = buildOperador(miembroActivo, user.rol);
      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'config_guardia',
        docId: colDoc,
        docResumen: `Configuración: ${nombreColeccionLegible}`,
        operador,
        detalles: { descripcion: accionDescripcion },
      });

      if (onActualizado) {
        onActualizado();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar en base de datos.');
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  // Agregar nuevo ítem
  const handleAgregar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const valor = nuevoTexto.trim();
    if (!valor) return;

    if (listaActual.some(i => i.toLowerCase() === valor.toLowerCase())) {
      toast.warning(`"${valor}" ya existe en la lista.`);
      return;
    }

    try {
      const nuevaLista = [...listaActual, valor].sort((a, b) => a.localeCompare(b, 'es'));
      await persistirLista(nuevaLista, `Añadió "${valor}" a la lista de ${nombreColeccionLegible}`);
      setNuevoTexto('');
      toast.success(`"${valor}" añadido correctamente.`);
    } catch {
      // Error manejado en persistirLista
    }
  };

  // Confirmar eliminación in-line
  const handleConfirmarEliminar = async (item: string) => {
    try {
      const nuevaLista = listaActual.filter(i => i !== item);
      await persistirLista(nuevaLista, `Eliminó "${item}" de la lista de ${nombreColeccionLegible}`);
      setItemEnConfirmacion(null);
      toast.success(`"${item}" eliminado.`);
    } catch {
      // Error manejado en persistirLista
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración de Listas de Guardia"
      maxWidth="500px"
      zIndex={10000}
    >
      <div className="modal-config-guardia">
        {/* Pestañas de selección */}
        <div className="config-tabs-nav">
          <button
            type="button"
            className={`config-tab-btn ${tab === 'elementos' ? 'config-tab-btn--active' : ''}`}
            onClick={() => {
              setTab('elementos');
              setItemEnConfirmacion(null);
            }}
          >
            Elementos Médicos ({elementos.length})
          </button>
          <button
            type="button"
            className={`config-tab-btn ${tab === 'hospitales' ? 'config-tab-btn--active' : ''}`}
            onClick={() => {
              setTab('hospitales');
              setItemEnConfirmacion(null);
            }}
          >
            Centros Médicos ({hospitales.length})
          </button>
        </div>

        {/* Formulario de agregar nuevo ítem */}
        <form onSubmit={handleAgregar} className="config-add-form">
          <input
            type="text"
            className="input-solido"
            placeholder={tab === 'elementos' ? 'Nuevo elemento (ej: Férula inflable)...' : 'Nuevo centro médico (ej: Hospital Pasteur)...'}
            value={nuevoTexto}
            onChange={e => setNuevoTexto(e.target.value)}
            disabled={guardando || cargando}
          />
          <button
            type="submit"
            className="btn-solido-primary btn-solido-primary--dark"
            disabled={!nuevoTexto.trim() || guardando || cargando}
            style={{ width: 'auto', minWidth: '105px' }}
          >
            <Plus size={16} /> Agregar
          </button>
        </form>

        {/* Listado con scroll e interacción in-line */}
        <div className="config-items-container">
          {cargando ? (
            <p className="config-lista-mensaje">Cargando opciones...</p>
          ) : listaActual.length === 0 ? (
            <p className="config-lista-mensaje">No hay elementos cargados todavía.</p>
          ) : (
            <ul className="config-items-list">
              {listaActual.map((item, idx) => {
                const enConfirmacion = itemEnConfirmacion === item;
                return (
                  <li key={idx} className={`config-item-row ${enConfirmacion ? 'config-item-row--danger' : ''}`}>
                    {enConfirmacion ? (
                      <div className="config-inline-confirm">
                        <div className="config-inline-text">
                          <AlertCircle size={15} color="#ef4444" />
                          <span>¿Eliminar <strong>"{item}"</strong>?</span>
                        </div>
                        <div className="config-inline-actions">
                          <button
                            type="button"
                            className="btn-inline-cancelar"
                            onClick={() => setItemEnConfirmacion(null)}
                            disabled={guardando}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="btn-inline-eliminar"
                            onClick={() => handleConfirmarEliminar(item)}
                            disabled={guardando}
                          >
                            <Trash2 size={13} /> Sí, eliminar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="config-item-nombre">{item}</span>
                        <button
                          type="button"
                          className="btn-solido-danger"
                          title={`Eliminar ${item}`}
                          onClick={() => setItemEnConfirmacion(item)}
                          disabled={guardando}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pie del modal */}
        <div className="modal-solido-actions modal-solido-actions--row" style={{ marginTop: '14px' }}>
          <button
            type="button"
            className="btn-solido-secondary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalConfigGuardia;
