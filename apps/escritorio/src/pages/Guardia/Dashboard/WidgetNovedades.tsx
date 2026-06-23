// src/pages/Guardia/Dashboard/WidgetNovedades.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../app/firebase-config';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { mostrarToast } from '../../../utils/toast';
import { CheckCircle, ClipboardList, Plus } from 'lucide-react';
import type { NovedadGuardia } from './types';

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

  const handleCrearNovedad = async () => {
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
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">
          <ClipboardList size={20} />
          Novedades de Guardia
        </h3>
        <button 
          onClick={() => setMostrarForm(!mostrarForm)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-sidebar)', padding: '4px' }}
          title="Agregar novedad"
        >
          <Plus size={20} />
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'var(--color-bg-content)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <input 
            type="text" 
            placeholder="¿Qué hay pendiente?" 
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as any)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as any)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', flex: 1 }}>
              <option value="vehiculos">Vehículos</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="administrativo">Administrativo</option>
              <option value="otro">Otro</option>
            </select>
            <button onClick={handleCrearNovedad} style={{ padding: '6px 12px', backgroundColor: 'var(--color-sidebar)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Agregar
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="widget-loading">Cargando...</p>
      ) : novedades.length === 0 ? (
        <p style={{ color: '#506680', fontSize: '14px' }}>Sin novedades pendientes por ahora.</p>
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
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                    • {nov.categoria.toUpperCase()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleResolver(nov)} 
                title="Marcar como resuelto"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2e8b57', padding: '4px' }}
              >
                <CheckCircle size={22} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WidgetNovedades;