import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { ShoppingCart, Ambulance, Truck, Search } from 'lucide-react';
import { MdFireTruck } from 'react-icons/md';
import { BsLadder } from 'react-icons/bs';
import Header from "../../components/Header";
import './VistaChoferes.css';

type Chofer = {
  id: string;
  nombre: string;
  unidadesChofer: string[];
  esChofer?: boolean;
};

const unidades = ['Todos', 'Maestranza', 'Ambulancias', 'Livianas', 'Pesadas', 'Escalera'];

const unidadIconos: Record<string, JSX.Element> = {
  Maestranza: <ShoppingCart size={14} />,
  Ambulancias: <Ambulance size={14} />,
  Livianas:   <Truck size={14} />,
  Pesadas:    <MdFireTruck />,
  Escalera:   <BsLadder />,
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
    .filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

  return (
    <div className="vista-choferes">
      <Header title="Choferes Habilitados" />

      <div className="buscador-top">
        <div className="buscador-container">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={14} className="icono-lupa" />
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
            {filtrados.length > 0 ? (
              filtrados.map(chofer => (
                <tr key={chofer.id}>
                  <td className="nombre-chofer">{chofer.nombre}</td>
                  <td className="unidades-iconos">
                    {['Maestranza', 'Ambulancias', 'Livianas', 'Pesadas', 'Escalera'].map(unidad =>
                      chofer.unidadesChofer.includes(unidad) ? (
                        <span key={unidad} className={`unidad-icon unidad-${unidad.toLowerCase()}`}>
                          {unidadIconos[unidad]}
                        </span>
                      ) : null
                    )}
                  </td>
                </tr>
              ))
            ) : (
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