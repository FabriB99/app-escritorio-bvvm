// src/pages/UnidadDetalle/UnidadDetalle.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from "../../app/firebase-config";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import './UnidadDetalle.css';
import { Pencil, CircleCheck, XCircle, AlertTriangle, CircleHelp } from "lucide-react";
import Header from "../../components/Header";
import { Unidad, Ubicacion, Elemento } from '../../types/unidades';

const getEstadoIcono = (estado?: string) => {
  switch (estado?.toLowerCase()) {
    case 'operativo':
      return <span className="estado-completo"><CircleCheck className="icon-estado icon-operativo" size={18} strokeWidth={2} />Operativo</span>;
    case 'con falla':
      return <span className="estado-completo"><XCircle className="icon-estado icon-falla" size={18} strokeWidth={2} />Con falla</span>;
    case 'faltante':
      return <span className="estado-completo"><AlertTriangle className="icon-estado icon-faltante" size={18} strokeWidth={2} />Faltante</span>;
    default:
      return <span className="estado-completo"><CircleHelp className="icon-estado icon-desconocido" size={18} strokeWidth={2} />Desconocido</span>;
  }
};

type UnidadConDetalle = Unidad & { imagen?: string; ultima_revision?: { seconds: number } };

const UnidadDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [unidad, setUnidad] = useState<UnidadConDetalle | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const fetchUnidad = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!id) return;
    if (!silent) setCargando(true);

    try {
      const [unidadDoc, ubicacionesSnapshot, elementosSnapshot] = await Promise.all([
        getDoc(doc(db, 'unidades', id)),
        getDocs(query(collection(db, 'ubicaciones'), where('unidad_id', '==', id), orderBy('orden'))),
        getDocs(query(collection(db, 'elementos'), where('unidad_id', '==', id), orderBy('orden'))),
      ]);

      if (!unidadDoc.exists()) {
        setUnidad(null);
        setUbicaciones([]);
        return;
      }

      const ubicacionesData: Ubicacion[] = ubicacionesSnapshot.docs.map(uDoc => ({
        id: uDoc.id,
        nombre: (uDoc.data().nombre as string) ?? '',
        elementos: [],
      }));

      const ubicacionMap = new Map(ubicacionesData.map((u, idx) => [u.id, idx]));

      elementosSnapshot.docs.forEach(el => {
        const data = el.data();
        const idx = data.ubicacion_id ? ubicacionMap.get(data.ubicacion_id) : undefined;
        if (idx === undefined) return;

        ubicacionesData[idx].elementos.push({
          id: el.id,
          nombre: (data.nombre as string) ?? '',
          cantidad: data.cantidad ?? '-',
          estado: data.estado ?? "Desconocido",
        } as Elemento);
      });

      setUnidad({ id: unidadDoc.id, ...(unidadDoc.data() as Omit<UnidadConDetalle, "id">) });
      setUbicaciones(ubicacionesData);
    } catch (error) {
      console.error('Error al obtener los datos:', error);
    } finally {
      if (!silent) setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUnidad({ silent: false });
    const handleFocus = () => fetchUnidad({ silent: true });
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchUnidad]);

  if (cargando) {
    return <div className="contenido-principal"><div className="cargando"><p>Cargando unidad...</p></div></div>;
  }

  if (!unidad) {
    return <div className="contenido-principal"><div className="error"><p>No se encontró la unidad.</p></div></div>;
  }

  const puedeEditar = user?.rol === 'admin' || user?.rol === 'jefatura' || user?.rol === 'guardia';

  return (
    <div className="detalle-container">
      <Header
        title={`Detalle - ${unidad.nombre}`}
        onBack={() => navigate('/unidades')}
        extraButtons={puedeEditar ? [{
          icon: Pencil,
          onClick: () => navigate(`/editar-unidad/${id}`),
          ariaLabel: 'Editar unidad',
          className: 'header-btn-edit',
        }] : []}
      />

      <div className="detalle-contenido">
        <div className="detalle-header-contenido">
          <img
            className="detalle-imagen"
            src={unidad.imagen || '/camion-de-bomberos.ico'}
            alt={unidad.nombre}
          />
          <div className="detalle-info">
            <div className="detalle-info-nombre-tipo">
              <h2 className="detalle-nombre">{unidad.nombre}</h2>
              <span className="detalle-tipo">{unidad.tipo}</span>
            </div>
            <div className="detalle-info-datos">
              <p><strong>Modelo:</strong> {unidad.modelo} | <strong>Patente:</strong> {unidad.patente}</p>
              <p><strong>Kilómetros:</strong> {unidad.kilometraje || 'No disponible'} | <strong>Combustible:</strong> {unidad.combustible || 'No disponible'}</p>
              <p>
                <strong>Última revisión:</strong>{' '}
                {unidad.ultima_revision?.seconds
                  ? new Date(unidad.ultima_revision.seconds * 1000).toLocaleDateString()
                  : 'Sin fecha'}
              </p>
            </div>
          </div>
        </div>

        <div className="detalle-ubicaciones">
          {ubicaciones.map(ubicacion => (
            <div key={ubicacion.id} className="detalle-ubicacion-card">
              <div className="detalle-ubicacion-header">
                <span className="detalle-ubicacion-nombre">{ubicacion.nombre}</span>
                <span className="detalle-header-cantidad">Cantidad</span>
                <span className="detalle-header-estado">Estado</span>
              </div>
              <div className="detalle-elementos">
                {ubicacion.elementos.length > 0 ? (
                  ubicacion.elementos.map(elemento => (
                    <div key={elemento.id} className="detalle-elemento-item">
                      <span className="detalle-elemento-nombre">{elemento.nombre}</span>
                      <span className="detalle-elemento-cantidad">{elemento.cantidad}</span>
                      <span className="detalle-elemento-estado">{getEstadoIcono(elemento.estado)}</span>
                    </div>
                  ))
                ) : (
                  <p className="detalle-sin-elementos">Sin elementos</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnidadDetalle;