import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GiFlame } from 'react-icons/gi';
import { FaBookReader } from 'react-icons/fa';
import './Inicio.css';

const Inicio: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="inicio-glass-page">
      <div className="inicio-glass-container">
        <img src="/logo-bomberos.png" alt="Logo BVVM" className="inicio-logo-grande" />
        <h1 className="inicio-nombre-cuartel">Bomberos Voluntarios Villa María</h1>
        <div className="inicio-tarjetas-container">
          <div className="inicio-tarjeta biblioteca" onClick={() => navigate('/biblioteca-login')}>
            <FaBookReader />
            <h2>Biblioteca Virtual</h2>
          </div>
          <div className="inicio-tarjeta control" onClick={() => navigate('/login')}>
            <GiFlame />
            <h2>Control BVVM</h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inicio;
