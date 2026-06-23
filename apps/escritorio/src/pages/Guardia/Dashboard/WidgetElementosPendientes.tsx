// src/pages/Guardia/Dashboard/WidgetElementosPendientes.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../app/firebase-config';
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { registrarAuditoria, buildOperador } from '../../../utils/auditoria';
import { mostrarToast } from '../../../utils/toast';
import { AlertCircle, Plus, CheckCircle, Building2, Truck } from 'lucide-react';
import type { ElementoMedicoHospital } from '../ElementosMedicosHospital/types';

// Importamos el nuevo modal lindo
import ModalRegistrarElemento from '../ElementosMedicosHospital/ModalRegistrarElemento';

const WidgetElementosPendientes: React.FC = () => {
  const { user } = useUser();
  const [elementos, setElementos] = useState<(ElementoMedicoHospital & { id: string })[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Volvemos a usar el estado del modal
  const [modalNuevo, setModalNuevo] = useState(false);

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

  const handleRecuperar = async (elemento: ElementoMedicoHospital & { id: string }) => {
    if (!user || !elemento.id) return;
    try {
      const operador = await buildOperador(user.uid);
      await updateDoc(doc(db, 'elementos_medicos_hospital', elemento.id), {
        estado: 'recuperado',
        fechaResolucion: Timestamp.now(),
        resueltoPorUid: user.uid,
        resueltoPorNombre: operador.nombre,
      });

      await registrarAuditoria({
        accion: 'editar',
        coleccion: 'elementos_medicos_hospital',
        docId: elemento.id,
        docResumen: `Recuperado: ${elemento.cantidad}x ${elemento.elemento}`,
        operador,
        detalles: { descripcion: `Marcó el elemento como recuperado.` }
      });

      mostrarToast('Elemento marcado como recuperado');
    } catch (err) {
      mostrarToast('Error al actualizar el estado');
    }
  };

  return (
    <>
      <div className="widget-card" style={{ borderTopColor: '#f59e0b' }}>
        <div className="widget-header">
          <h3 className="widget-title">
            <AlertCircle size={20} color="#f59e0b" />
            Elementos a Recuperar ({elementos.length})
          </h3>
          
          <button 
            onClick={() => setModalNuevo(true)} // Abrimos el modal
            className="btn-icon-modal"
            title="Registrar elemento dejado"
          >
            <Plus size={20} />
          </button>
        </div>
        
        {cargando ? (
          <p className="widget-loading">Cargando...</p>
        ) : elementos.length === 0 ? (
          <p style={{ color: '#506680', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>No hay elementos pendientes. ¡Todo recuperado!</p>
        ) : (
          <>
            <ul className="widget-list">
              {elementos.slice(0, 5).map(el => (
                <li key={el.id} className="widget-list-item" style={{ borderLeftColor: '#f59e0b', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ fontSize: '14px' }}>
                      {el.cantidad}x {el.elemento === 'Otro' ? el.elementoOtro : el.elemento}
                    </strong>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                        <Building2 size={12} color="#94a3b8" />
                        {el.hospital === 'Otro' ? el.hospitalOtro : el.hospital}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                        <Truck size={12} color="#94a3b8" />
                        {el.unidadNombre}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRecuperar(el)} 
                    title="Marcar como recuperado"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '6px', transition: 'transform 0.2s', display: 'flex' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <CheckCircle size={22} />
                  </button>
                </li>
              ))}
            </ul>
            {elementos.length > 5 && (
              <p style={{ fontSize: '13px', color: '#3b82f6', cursor: 'pointer', marginTop: '12px', textAlign: 'center', fontWeight: '800' }}>
                Ver {elementos.length - 5} más...
              </p>
            )}
          </>
        )}
      </div>

      {/* Renderizamos el Modal Lindo si el estado es true */}
      {modalNuevo && (
        <ModalRegistrarElemento 
          onClose={() => setModalNuevo(false)} 
          onGuardado={() => setModalNuevo(false)} 
        />
      )}
    </>
  );
};

export default WidgetElementosPendientes;