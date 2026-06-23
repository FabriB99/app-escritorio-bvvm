// src/pages/Guardia/Dashboard/WidgetNovedades.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../app/firebase-config';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { mostrarToast } from '../../../utils/toast';
import { CheckCircle, ClipboardList, Plus, X, Save } from 'lucide-react';
import type { NovedadGuardia } from './types';

// Importación limpia local
import './WidgetNovedades.css';

const WidgetNovedades: React.FC = () => {
  const { user } = useUser();
  const [novedades, setNovedades] = useState<NovedadGuardia[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [prioridad, setPrioridad] = useState<'alta' | 'media' | 'baja'>('media');
  const [categoria, setCategoria] = useState<NovedadGuardia['categoria']>('vehiculos');

  useEffect(() => {
    const q = query(collection(db, 'novedades_guardia'), where('estado', '==', 'pendiente'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as NovedadGuardia));
      data.sort((a, b) => b.fechaRegistro.toMillis() - a.fechaRegistro.toMillis());
      setNovedades(data);
      setCargando(false);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleCrearNovedad = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !titulo.trim()) return;
    try {
      const operador = await buildOperador(user.uid);
      const nuevaNovedad: Omit<NovedadGuardia, 'id'> = {
        titulo: titulo.trim(),
        descripcion: '',
        prioridad,
        categoria,
        estado: 'pendiente',
        fechaRegistro: Timestamp.now(),
        registradoPorUid: user.uid,
        registradoPorNombre: operador.nombre,
      };

      const ref = await addDoc(collection(db, 'novedades_guardia'), nuevaNovedad);

      await registrarAuditoria({
        accion: 'crear',
        coleccion: 'novedades_guardia',
        docId: ref.id,
        docResumen: `Novedad: ${nuevaNovedad.titulo}`,
        operador,
        detalles: { descripcion: `Prioridad: ${prioridad} - Categoría: ${categoria}` }
      });

      mostrarToast('Novedad registrada');
      setTitulo('');
      setMostrarForm(false);
    } catch (err) {
      console.error(err);
      mostrarToast('Error al registrar la novedad');
    }
  };

  const handleResolver = async (novedad: NovedadGuardia) => {
    if (!user || !novedad.id) return;
    try {
      const operador = await buildOperador(user.uid);
      await updateDoc(doc(db, 'novedades_guardia', novedad.id), {
        estado: 'resuelta',
        fechaResolucion: Timestamp.now(),
        resueltoPorUid: user.uid,
        resueltoPorNombre: operador.nombre,
      });

      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'novedades_guardia',
        docId: novedad.id,
        docResumen: `Resolución: ${novedad.titulo}`,
        operador,
        detalles: { descripcion: `Marcó la novedad como resuelta.` }
      });

      mostrarToast('Novedad resuelta');
    } catch (err) {
      console.error(err);
      mostrarToast('Error al actualizar');
    }
  };

  return (
    <>
      <div className="widget-card" style={{ borderTopColor: '#475569' }}>
        <div className="widget-header">
          <h3 className="widget-title">
            <ClipboardList size={20} color="#475569" />
            Novedades de Guardia
          </h3>
          <button 
            onClick={() => setMostrarForm(true)}
            className="btn-icon-modal"
            title="Agregar novedad"
          >
            <Plus size={20} />
          </button>
        </div>

        {cargando ? (
          <p className="widget-loading">Cargando...</p>
        ) : novedades.length === 0 ? (
          <p style={{ color: '#506680', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>Sin novedades pendientes por ahora.</p>
        ) : (
          <ul className="widget-list">
            {novedades.map(nov => (
              <li key={nov.id} className={`widget-list-item prioridad-${nov.prioridad}`}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <strong>{nov.titulo}</strong>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                    <span className={`badge-prioridad badge-${nov.prioridad}`}>
                      {nov.prioridad}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.5px' }}>
                      • {nov.categoria.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleResolver(nov)} 
                  title="Marcar como resuelto"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <CheckCircle size={22} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mostrarForm && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-solido-container" style={{ maxWidth: '500px' }}>
            
            <div className="modal-solido-header">
              <h3 className="modal-solido-title">Registrar Nueva Novedad</h3>
              <button type="button" className="btn-icon-close" onClick={() => setMostrarForm(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCrearNovedad} className="modal-solido-body">
              
              <div className="form-col-solido">
                <div className="label-wrap-solido">
                  <label>NOVEDAD / PENDIENTE</label>
                </div>
                <input 
                  type="text" 
                  placeholder="Escribir acá..." 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="input-solido"
                  required
                />
              </div>

              <div className="form-row-solido">
                <div className="form-col-solido">
                  <div className="label-wrap-solido">
                    <label>PRIORIDAD</label>
                  </div>
                  <select 
                    value={prioridad} 
                    onChange={(e) => setPrioridad(e.target.value as any)} 
                    className="input-solido"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div className="form-col-solido">
                  <div className="label-wrap-solido">
                    <label>CATEGORÍA</label>
                  </div>
                  <select 
                    value={categoria} 
                    onChange={(e) => setCategoria(e.target.value as any)} 
                    className="input-solido"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="vehiculos">Vehículos</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="modal-solido-actions">
                <button type="submit" className="btn-solido-primary">
                  <Save size={18} /> Guardar Novedad
                </button>
                <button type="button" className="btn-solido-secondary" onClick={() => setMostrarForm(false)}>
                  Cancelar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default WidgetNovedades;