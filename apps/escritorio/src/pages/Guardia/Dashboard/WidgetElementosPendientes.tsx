// src/pages/Guardia/Dashboard/WidgetElementosPendientes.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../app/firebase-config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { AlertCircle, Plus, X } from 'lucide-react';
import type { ElementoMedicoHospital } from '../ElementosMedicosHospital/types';
import ParteElementoMedico from '../ElementosMedicosHospital/ParteElementoMedico';

const WidgetElementosPendientes: React.FC = () => {
  const [elementos, setElementos] = useState<(ElementoMedicoHospital & { id: string })[]>([]);
  const [cargando, setCargando] = useState(true);
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

  return (
    /* ─── Envolvemos todo en un Fragmento vacío para tener dos elementos hermanos ─── */
    <>
      <div className="widget-card">
        <div className="widget-header">
          <h3 className="widget-title">
            <AlertCircle size={20} color="#eab308" />
            Elementos a Recuperar ({elementos.length})
          </h3>
          
          <button 
            onClick={() => setModalNuevo(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-sidebar)', padding: '4px' }}
            title="Registrar elemento dejado"
          >
            <Plus size={20} />
          </button>
        </div>
        
        {cargando ? (
          <p className="widget-loading">Cargando...</p>
        ) : elementos.length === 0 ? (
          <p style={{ color: '#506680', fontSize: '14px' }}>No hay elementos pendientes. ¡Todo recuperado! 👏</p>
        ) : (
          <>
            <ul className="widget-list">
              {elementos.slice(0, 5).map(el => (
                <li key={el.id} className="widget-list-item">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong>{el.cantidad}x {el.elemento === 'Otro' ? el.elementoOtro : el.elemento}</strong>
                    <span>Dejado en {el.hospital === 'Otro' ? el.hospitalOtro : el.hospital} por {el.unidadNombre}</span>
                  </div>
                </li>
              ))}
            </ul>
            {elementos.length > 5 && (
              <p style={{ fontSize: '13px', color: 'var(--color-accent)', cursor: 'pointer', marginTop: '10px', textAlign: 'center', fontWeight: '600' }}>
                Ver {elementos.length - 5} más...
              </p>
            )}
          </>
        )}
      </div>

      {/* ─── El Modal ahora está AFUERA de la widget-card ─── */}
      {modalNuevo && (
        <div className="modal-overlay">
          <div className="modal-container modal-container--lg">
            <div className="modal-header">
              <h3 className="modal-title">Registrar elemento médico</h3>
              <button className="btn-icon-modal" onClick={() => setModalNuevo(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body modal-body--form">
              <ParteElementoMedico
                isModal
                onGuardado={() => setModalNuevo(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WidgetElementosPendientes;