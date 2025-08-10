// src/pages/Biblioteca/ListadoSecciones.tsx
import React, { useEffect, useState } from 'react';
import { db } from '../../app/firebase-config';
import {
  collection, onSnapshot, query, orderBy, deleteDoc, doc, getDocs, updateDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaArrowUp, FaArrowDown, FaPlus, FaBookOpen } from 'react-icons/fa';
import './ListadoSecciones.css';

type Grupo = {
  id: string;
  nombre: string;
  orden: number;
};

type Tab = {
  id: string;
  nombre: string;
  archivos?: { nombre: string; url: string; fecha: number }[];
};

type Seccion = {
  id: string;
  nombre: string;
  ruta: string;
  descripcion?: string;
  grupo: string;
  orden: number;
  tabs: Tab[];
};

const ListadoSecciones: React.FC = () => {
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGrupos = async () => {
      const snapshot = await getDocs(query(collection(db, 'grupos_biblioteca'), orderBy('orden')));
      const gruposData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Grupo, 'id'>),
      }));
      setGrupos(gruposData);
    };

    const unsub = onSnapshot(query(collection(db, 'secciones'), orderBy('orden')), snapshot => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Seccion, 'id'>),
      }));
      setSecciones(lista);
    });

    fetchGrupos();
    return unsub;
  }, []);

  const borrar = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Borrar sección "${nombre}"? Esta acción no se puede deshacer.`)) return;
    await deleteDoc(doc(db, 'secciones', id));
  };

  const recargarSecciones = async () => {
    const snapshot = await getDocs(query(collection(db, 'secciones'), orderBy('orden')));
    const lista = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Seccion, 'id'>),
    }));
    setSecciones(lista);
  };

  const intercambiarOrden = async (idActual: string, idOtro: string) => {
    const seccionActual = secciones.find(s => s.id === idActual);
    const seccionOtro = secciones.find(s => s.id === idOtro);
    if (!seccionActual || !seccionOtro) return;

    await Promise.all([
      updateDoc(doc(db, 'secciones', idActual), { orden: seccionOtro.orden }),
      updateDoc(doc(db, 'secciones', idOtro), { orden: seccionActual.orden }),
    ]);
    await recargarSecciones();
  };

  return (
    <div className="listado-secciones__contenedor">
      <header className="listado-secciones__header">
        <button
          className="listado-secciones__btn-volver"
          onClick={() => navigate('/editar-biblioteca')}
          aria-label="Volver"
        >
          ↩ Regresar
        </button>

        <div className="listado-secciones__titulo-contenedor">
          <h1 className="listado-secciones__titulo">
            <FaBookOpen className="listado-secciones__icono" />
            Secciones de la Biblioteca
          </h1>
        </div>
      </header>

      {/* Botonera justo debajo del header */}
      <div className="listado-secciones__botonera">
        <button
          className="listado-secciones__boton"
          onClick={() => navigate('/editar-biblioteca/grupos')}
        >
          <FaEdit /> Administrar grupos
        </button>
        <button
          className="listado-secciones__boton"
          onClick={() => navigate('/editar-biblioteca/secciones/nueva')}
        >
          <FaPlus /> Nueva sección
        </button>
      </div>

      {grupos.map(grupo => {
        const seccionesGrupo = secciones
          .filter(s => s.grupo === grupo.nombre)
          .sort((a, b) => a.orden - b.orden);

        return (
          <section key={grupo.id} className="listado-secciones__grupo">
            <h2 className="listado-secciones__grupo-titulo">{grupo.nombre}</h2>
            <ul className="listado-secciones__lista">
              {seccionesGrupo.map((s, idx) => {
                const cantidadTabs = s.tabs?.length || 0;
                const cantidadArchivos = s.tabs?.reduce((acc, t) => acc + (t.archivos?.length || 0), 0) || 0;

                return (
                  <li key={s.id} className="listado-secciones__item">
                    <div className="listado-secciones__info">
                      <strong className="listado-secciones__info-nombre">{s.nombre}</strong>
                      <small className="listado-secciones__info-detalle">
                        Tabs: {cantidadTabs} | Archivos: {cantidadArchivos}
                      </small>
                    </div>

                    <div className="listado-secciones__acciones">
                      {idx > 0 && (
                        <button
                          className="listado-secciones__accion-btn"
                          onClick={() => intercambiarOrden(s.id, seccionesGrupo[idx - 1].id)}
                          title="Subir"
                          aria-label="Subir sección"
                        >
                          <FaArrowUp />
                        </button>
                      )}
                      {idx < seccionesGrupo.length - 1 && (
                        <button
                          className="listado-secciones__accion-btn"
                          onClick={() => intercambiarOrden(s.id, seccionesGrupo[idx + 1].id)}
                          title="Bajar"
                          aria-label="Bajar sección"
                        >
                          <FaArrowDown />
                        </button>
                      )}
                      <button
                        className="listado-secciones__accion-btn"
                        onClick={() => navigate(`/editar-seccion/${s.id}`)}
                        title="Editar"
                        aria-label="Editar sección"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="listado-secciones__accion-btn"
                        onClick={() => borrar(s.id, s.nombre)}
                        title="Eliminar"
                        aria-label="Eliminar sección"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default ListadoSecciones;
