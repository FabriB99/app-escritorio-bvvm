// Vencimientos.tsx

import React, { useState, useEffect, useRef } from 'react';
import './Vencimientos.css';
import { FaTrash, FaPlus, FaCalendar, FaRegDotCircle } from 'react-icons/fa';
import { FiRefreshCw } from 'react-icons/fi';
import { db } from '../../app/firebase-config';
import {
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, Timestamp
} from 'firebase/firestore';

type TipoVencimiento = 'vtv' | 'carnet';

type Vencimiento = {
  id: string;
  tipo: TipoVencimiento;
  fecha: string;
  nombre: string;
  tipoCarnet?: string[];         // Solo para carnets
  esChofer?: boolean;            // Solo para carnets
  unidadesChofer?: string[];     // Solo si es chofer
};

const Vencimientos: React.FC = () => {
  const [tab, setTab] = useState<TipoVencimiento>('carnet');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Vencimiento | null>(null);
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([]);
  const [fecha, setFecha] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipoCarnet, setTipoCarnet] = useState<string[]>([]);
  const [esChofer, setEsChofer] = useState(false);
  const [unidadesChofer, setUnidadesChofer] = useState<string[]>([]);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});
  const hoy = new Date();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vencimientos'), snapshot => {
      const datos: Vencimiento[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const fecha = data.fecha?.toDate().toISOString().split('T')[0];
        return {
          id: doc.id,
          tipo: data.tipo,
          nombre: data.nombre,
          fecha,
          tipoCarnet: data.tipoCarnet || [],
          esChofer: data.esChofer || false,
          unidadesChofer: data.unidadesChofer || []
        };
      });
      setVencimientos(datos);
    });
    return unsub;
  }, []);

  const ordenados = vencimientos
    .filter(v => v.tipo === tab)
    .sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      const vencidoA = fechaA < hoy;
      const vencidoB = fechaB < hoy;
      if (vencidoA && !vencidoB) return -1;
      if (!vencidoA && vencidoB) return 1;
      return fechaA.getTime() - fechaB.getTime();
    });

  const abrirModal = (venc?: Vencimiento) => {
    if (venc) {
      setSelected(venc);
      setFecha(venc.fecha);
      setNombre(venc.nombre);
      setTipoCarnet(venc.tipoCarnet || []);
      setEsChofer(venc.esChofer || false);
      setUnidadesChofer(venc.unidadesChofer || []);
    } else {
      setSelected(null);
      setFecha('');
      setNombre('');
      setTipoCarnet([]);
      setEsChofer(false);
      setUnidadesChofer([]);
    }
    setModalOpen(true);
  };

  const guardarVencimiento = async () => {
    if (!fecha || !nombre.trim()) return;
    const fechaTimestamp = Timestamp.fromDate(new Date(fecha));
    const datos: any = {
      tipo: tab,
      nombre: nombre.trim(),
      fecha: fechaTimestamp,
    };

    if (tab === 'carnet') {
      datos.tipoCarnet = tipoCarnet;
      datos.esChofer = esChofer;
      datos.unidadesChofer = esChofer ? unidadesChofer : [];
    }

    if (selected) {
      await updateDoc(doc(db, 'vencimientos', selected.id), datos);
    } else {
      await addDoc(collection(db, 'vencimientos'), datos);
    }

    setModalOpen(false);
  };

  const eliminarVencimiento = async (id: string) => {
    if (window.confirm('¿Seguro que querés eliminar este vencimiento?')) {
      await deleteDoc(doc(db, 'vencimientos', id));
    }
  };

  const formatearFecha = (fechaISO: string) => {
    const [y, m, d] = fechaISO.split('-');
    return `${d}/${m}/${y}`;
  };

  useEffect(() => {
    if (!tabsRef.current) return;
    const botones = tabsRef.current.querySelectorAll('button');
    const idx = tab === 'carnet' ? 0 : 1;
    const btn = botones[idx] as HTMLElement;
    if (btn) {
      setSliderStyle({
        width: `${btn.offsetWidth}px`,
        transform: `translateX(${btn.offsetLeft}px)`,
      });
    }
  }, [tab]);

  const toggleSeleccion = (valor: string, lista: string[], setLista: (v: string[]) => void) => {
    setLista(
      lista.includes(valor)
        ? lista.filter(v => v !== valor)
        : [...lista, valor]
    );
  };

  const renderEstado = (fechaStr: string) => {
    const fechaV = new Date(fechaStr);
    const vencido = fechaV < hoy;
    const dias = Math.ceil((fechaV.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (vencido)
      return <span className="estado estado-vencido"><FaRegDotCircle /> Vencido</span>;
    if (dias <= 30)
      return <span className="estado estado-proximo"><FaRegDotCircle /> Próximo</span>;
    return <span className="estado estado-vigente"><FaRegDotCircle /> Vigente</span>;
  };

  return (
    <div className="vencimientos">
      <div className="header-titulo">
        <h1><FaCalendar /> Vencimientos</h1>
        <button className="btn-agregar" onClick={() => abrirModal()}>
          <FaPlus />
        </button>
      </div>

      <div className="tabs" ref={tabsRef}>
        <button className={tab === 'carnet' ? 'activo' : ''} onClick={() => setTab('carnet')}>Carnets de Conducir</button>
        <button className={tab === 'vtv' ? 'activo' : ''} onClick={() => setTab('vtv')}>VTV</button>
        <div className="vista-tab-slider" style={sliderStyle}></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>{tab === 'carnet' ? 'Nombre' : 'Unidad'}</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map(v => (
            <tr key={v.id}>
              <td>{v.nombre}</td>
              <td>{renderEstado(v.fecha)}</td>
              <td>{formatearFecha(v.fecha)}</td>
              <td className="acciones">
                <button title="Editar" onClick={() => abrirModal(v)}><FiRefreshCw /></button>
                <button title="Eliminar" onClick={() => eliminarVencimiento(v.id)}><FaTrash /></button>
              </td>
            </tr>
          ))}
          {ordenados.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
                No hay vencimientos para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{selected ? 'Actualizar' : 'Agregar'} vencimiento</h2>
            <label>
              {tab === 'vtv' ? 'Unidad' : 'Apellido y Nombre'}
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={tab === 'vtv' ? 'Unidad...' : 'Apellido y Nombre...'}
              />
            </label>
            <label>
              Fecha
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>

            {tab === 'carnet' && (
              <>
                <label>
                  Tipo de carnet
                  <input
                    type="text"
                    value={tipoCarnet.join(', ')}
                    onChange={(e) =>
                      setTipoCarnet(
                        e.target.value.split(',').map(c => c.trim()).filter(c => c)
                      )
                    }
                    placeholder="Ej: A1.2, D2, D4"
                  />
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={esChofer}
                    onChange={() => setEsChofer(!esChofer)}
                  /> ¿Es chofer?
                </label>

                {esChofer && (
                  <fieldset className="fieldset-unidades">
                    <legend>Tipos de unidades</legend>
                    {['Maestranza', 'Ambulancias', 'Livianas', 'Pesadas', 'Escalera'].map(tipo => (
                      <label key={tipo} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={unidadesChofer.includes(tipo)}
                          onChange={() => toggleSeleccion(tipo, unidadesChofer, setUnidadesChofer)}
                        />
                        {tipo}
                      </label>
                    ))}
                  </fieldset>
                )}
              </>
            )}

            <div className="modal-botones">
              <button onClick={guardarVencimiento}>Guardar</button>
              <button onClick={() => setModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vencimientos;
