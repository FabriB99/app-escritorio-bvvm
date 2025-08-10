import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import './VistaChoferes.css';

import { FaShoppingCart, FaAmbulance, FaTruckPickup, FaSearch } from 'react-icons/fa';
import { MdFireTruck } from 'react-icons/md';
import { BsLadder } from "react-icons/bs";

type Chofer = {
  id: string;
  nombre: string;
  unidadesChofer: string[];
  esChofer?: boolean;
};

const unidades = ['Todos', 'Maestranza', 'Ambulancias', 'Livianas', 'Pesadas', 'Escalera'];

const unidadIconos: Record<string, JSX.Element> = {
  maestranza: <FaShoppingCart />,
  ambulancias: <FaAmbulance />,
  livianas: <FaTruckPickup />,
  pesadas: <MdFireTruck />,
  escalera: <BsLadder />,
};

const VistaChoferes: React.FC = () => {
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [filtro, setFiltro] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sliderStyle, setSliderStyle] = useState({});
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'vencimientos'), snapshot => {
      const data: Chofer[] = snapshot.docs
        .map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            nombre: d.nombre || 'Sin nombre',
            unidadesChofer: d.unidadesChofer || [],
            esChofer: d.esChofer || false,
          };
        })
        .filter(d => d.esChofer);

      setChoferes(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const index = unidades.indexOf(filtro);
    const el = tabsRef.current[index];
    if (el) {
      setSliderStyle({
        width: el.offsetWidth + 'px',
        transform: `translateX(${el.offsetLeft}px)`,
      });
    }
  }, [filtro]);

  const filtrados = choferes
    .filter(c => filtro === 'Todos' || c.unidadesChofer.includes(filtro))
    .filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="vista-choferes">
      <div className="vista-choferes-header">
        <h1>Choferes Habilitados</h1>
      </div>

      <div className="buscador-top">
        <div className="buscador-container">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <FaSearch className="icono-lupa" />
        </div>
      </div>

      <div className="vista-choferes-tabs">
        <div className="tabs-buttons">
          {unidades.map((tipo, i) => (
            <button
              key={tipo}
              ref={el => tabsRef.current[i] = el}
              className={filtro === tipo ? 'activo' : ''}
              onClick={() => setFiltro(tipo)}
            >
              {tipo}
            </button>
          ))}
        </div>
        <div className="vista-tab-slider" style={sliderStyle}></div>
      </div>

      {loading ? (
        <p className="vista-choferes-loading">Cargando choferes...</p>
      ) : (
        <table className="vista-choferes-tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Unidades Habilitadas</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(chofer => (
              <tr key={chofer.id}>
                <td className="nombre-chofer">{chofer.nombre}</td>
                <td className="unidades-iconos">
                  {['maestranza', 'ambulancias', 'livianas', 'pesadas', 'escalera'].map(unidad => (
                    chofer.unidadesChofer.includes(unidad.charAt(0).toUpperCase() + unidad.slice(1)) && (
                      <span key={unidad} className={`unidad-icon unidad-${unidad}`}>
                        {unidadIconos[unidad]}
                      </span>
                    )
                  ))}
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
                  No hay choferes para esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default VistaChoferes;
