import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import './Biblioteca.css';
import logo from '/logo-bomberos.png';

type General = {
  nombre: string;
  descripcion: string;
  ruta: string;
};

type Departamento = {
  nombre: string;
  ruta: string;
};

const generales: General[] = [
  { nombre: 'Procedimientos Operativos', descripcion: 'Manuales y protocolos internos', ruta: 'procedimientos' },
  { nombre: 'Protocolos de Actuación', descripcion: 'Accionar ante diferentes situaciones', ruta: 'protocolos' },
  { nombre: 'Reglamentos, Normas y Leyes', descripcion: 'Marco legal y reglamentario', ruta: 'reglamentos' }
];

const departamentos: Departamento[] = [
  { nombre: 'Departamento Incendio Estructural', ruta: 'incendio-estructural' },
  { nombre: 'Departamento Socorrismo', ruta: 'socorrismo' },
  { nombre: 'Departamento Rescate Vehicular', ruta: 'rescate-vehicular' },
  { nombre: 'Departamento Rescate con Cuerdas', ruta: 'rescate-cuerdas' },
  { nombre: 'Departamento Rescate Acuático', ruta: 'rescate-acuatico' },
  { nombre: 'Departamento Drones/VANT', ruta: 'drones' },
  { nombre: 'Departamento Materiales Peligrosos', ruta: 'matpeligrosos' },
  { nombre: 'Departamento Incendio Forestal', ruta: 'incendio-forestal' },
  { nombre: 'Departamento Psicología', ruta: 'psicologia' }
];

const Biblioteca = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (busquedaAbierta && inputRef.current) {
      inputRef.current.focus();
    }
  }, [busquedaAbierta]);

  const filtrarGenerales = (lista: General[]) =>
    lista.filter(d => d.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const filtrarDepartamentos = (lista: Departamento[]) =>
    lista.filter(d => d.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const handleClick = (ruta: string) => {
    navigate(`/biblioteca/seccion/${ruta}`);
  };

  const toggleBusqueda = () => {
    setBusquedaAbierta(open => !open);
    if (busquedaAbierta) setBusqueda(''); // si cerrás el input, limpia texto
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
        <div className="biblioteca-seccion-header">
          <h2 className="biblioteca-seccion-titulo">Generales</h2>
          <div className="biblioteca-seccion-linea" />
        </div>
        <div className="biblioteca-cards-container">
          {filtrarGenerales(generales).map((item, idx) => (
            <div
              key={idx}
              className="biblioteca-carpeta biblioteca-carpeta-azul"
              onClick={() => handleClick(item.ruta)}
            >
              <h3 className="biblioteca-carpeta-titulo">{item.nombre}</h3>
              <p className="biblioteca-carpeta-desc">{item.descripcion}</p>
            </div>
          ))}
        </div>

        <div className="biblioteca-seccion-header">
          <h2 className="biblioteca-seccion-titulo">Departamentos</h2>
          <div className="biblioteca-seccion-linea" />
        </div>
        <div className="biblioteca-cards-container">
          {filtrarDepartamentos(departamentos).map((item, idx) => (
            <div
              key={idx}
              className="biblioteca-carpeta biblioteca-carpeta-azul"
              onClick={() => handleClick(item.ruta)}
            >
              <h3 className="biblioteca-carpeta-titulo">{item.nombre}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Biblioteca;
