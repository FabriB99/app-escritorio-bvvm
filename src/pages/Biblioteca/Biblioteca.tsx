import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import './Biblioteca.css';
import logo from '/logo-bomberos.png';
import { db } from '../../app/firebase-config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

type Grupo = {
  id: string;
  nombre: string;
  orden?: number;
};

type Seccion = {
  id: string;          // <--- agregamos id aquí
  nombre: string;
  descripcion?: string;
  ruta: string;
  grupo: string;
};

const Biblioteca = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);

  useEffect(() => {
    const unsubGrupos = onSnapshot(
      query(collection(db, 'grupos_biblioteca'), orderBy('orden')),
      (snapshot) => {
        const lista = snapshot.docs.map(doc => {
          const grupo = { id: doc.id, ...doc.data() } as Grupo;
          return grupo;
        });
        setGrupos(lista);
      }
    );

    const unsubSecciones = onSnapshot(
      query(collection(db, 'secciones'), orderBy('orden')),
      (snapshot) => {
        const lista = snapshot.docs.map(doc => ({
          id: doc.id,            // <--- traemos el id desde firestore
          ...doc.data()
        } as Seccion));
        setSecciones(lista);
      }
    );

    return () => {
      unsubGrupos();
      unsubSecciones();
    };
  }, []);

  useEffect(() => {
    if (busquedaAbierta && inputRef.current) {
      inputRef.current.focus();
    }
  }, [busquedaAbierta]);

  const filtrarPorGrupo = (grupo: string) =>
    secciones
      .filter(s => s.grupo === grupo)
      .filter(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const handleClick = (ruta: string) => {
    navigate(`/biblioteca/seccion/${ruta}`);
  };

  const toggleBusqueda = () => {
    setBusquedaAbierta(open => !open);
    if (busquedaAbierta) setBusqueda('');
  };

  return (
    <div className="biblioteca-page">
      <header className="biblioteca-header">
        <div className="biblioteca-header-left">
          <img
            src={logo}
            alt="Logo"
            className="biblioteca-logo"
            onClick={() => navigate('/')}
            title="Volver al inicio"
          />
          <div className="biblioteca-titulo-container">
            <h1 className="biblioteca-titulo">Biblioteca Virtual</h1>
            <p className="biblioteca-subtitulo">Cuerpo de Bomberos Voluntarios Villa María</p>
          </div>
        </div>

        <div className="biblioteca-busqueda">
          <FaSearch
            className="biblioteca-icono-busqueda"
            onClick={toggleBusqueda}
            title="Buscar"
            style={{ cursor: 'pointer' }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className={`biblioteca-busqueda-input ${busquedaAbierta ? 'abierto' : ''}`}
            onBlur={() => setBusquedaAbierta(false)}
          />
        </div>
      </header>

      <section className="biblioteca-seccion">
        {grupos.map((grupo) => {
          const seccionesFiltradas = filtrarPorGrupo(grupo.nombre);

          return (
            <div key={grupo.id}>
              <div className="biblioteca-seccion-header">
                <h2 className="biblioteca-seccion-titulo">{grupo.nombre}</h2>
                <div className="biblioteca-seccion-linea" />
              </div>
              <div className="biblioteca-cards-container">
                {seccionesFiltradas.length === 0 ? (
                  <p className="biblioteca-carpeta-vacio">Sin secciones aún.</p>
                ) : (
                  seccionesFiltradas.map((item) => (
                    <div
                      key={item.id}  // mejor usar id como key
                      className="biblioteca-carpeta biblioteca-carpeta-azul"
                      onClick={() => handleClick(item.ruta)} 
                    >
                      <h3 className="biblioteca-carpeta-titulo">{item.nombre}</h3>
                      {item.descripcion && (
                        <p className="biblioteca-carpeta-desc">{item.descripcion}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default Biblioteca;
