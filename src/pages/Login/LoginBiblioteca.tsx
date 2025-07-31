// src/pages/Login/LoginBiblioteca.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import './LoginBiblioteca.css';
import { FaIdCard, FaHome } from 'react-icons/fa';

const LoginBiblioteca: React.FC = () => {
  const navigate = useNavigate();

  const [dni, setDni] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLoginBiblioteca = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);

    try {
      // Buscar usuario por DNI en usuariosBiblioteca
      const userRef = doc(db, 'usuariosBiblioteca', dni);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError('DNI no registrado en Biblioteca Virtual.');
        setCargando(false);
        return;
      }

      const userData = userSnap.data();
      const nombre = userData?.nombre || 'Bombero';

      // Registrar acceso con timestamp en colección separada accesosBiblioteca
      await addDoc(collection(db, 'accesosBiblioteca'), {
        dni,
        nombre,
        timestamp: Timestamp.now(),
      });

      setMensaje(`Bienvenido/a, ${nombre}!`);

      // Redirigir a la biblioteca después de 1.5 segundos para que vea el mensaje
      setTimeout(() => {
        navigate('/biblioteca');
      }, 1500);
    } catch (err) {
      console.error('Error al validar DNI:', err);
      setError('Error en la conexión, intente nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-libro-page">
      <div className="login-libro-container">
        <div className="login-libro-card">
          <div className="login-libro-home-icon" onClick={() => navigate('/')} title="Volver a Inicio">
            <FaHome />
          </div>
          <img src="/logo-bomberos.png" alt="Logo Bomberos" className="login-libro-logo" />
          <h2 className="login-libro-title">Acceso Biblioteca Virtual</h2>
          <form onSubmit={handleLoginBiblioteca}>
            <div className="login-libro-input-wrapper">
              <FaIdCard className="login-libro-icon-input" />
              <input
                type="number"
                placeholder="Ingrese su DNI"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
                min={1000000}
                max={99999999}
                disabled={cargando}
              />
            </div>
            <button type="submit" className="login-libro-button" disabled={cargando}>
              {cargando ? 'Validando...' : 'Ingresar'}
            </button>
            {error && <p className="login-libro-error">{error}</p>}
            {mensaje && <p className="login-libro-mensaje">{mensaje}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginBiblioteca;
