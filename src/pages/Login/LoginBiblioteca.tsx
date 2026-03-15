import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import './LoginBiblioteca.css';
import { FaIdCard, FaHome } from 'react-icons/fa';

import { useUsuarioBiblioteca } from '../../context/UsuarioBibliotecaContext';

const LoginBiblioteca: React.FC = () => {
  const navigate = useNavigate();
  const { setUsuario } = useUsuarioBiblioteca();

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
      // Buscamos al miembro por DNI
      const q = query(collection(db, 'miembros'), where('dni', '==', dni));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('DNI no registrado como miembro.');
        setCargando(false);
        return;
      }

      const miembroDoc = querySnapshot.docs[0];
      const miembroData = miembroDoc.data();

      // Guardamos en el contexto lo básico del miembro
      setUsuario({
        dni: miembroData.dni,
        nombre: miembroData.nombre,
        apellido: miembroData.apellido || '',
        roles: miembroData.roles || [],
        categoria: miembroData.categoria || '',
      });

      // Registrar acceso en colección accesosBiblioteca cumpliendo las reglas
      await addDoc(collection(db, 'accesosBiblioteca'), {
        dni: miembroData.dni,
        nombre: miembroData.nombre,
        apellido: miembroData.apellido || '',
        roles: miembroData.roles || [],
        categoria: miembroData.categoria || '',
        timestamp: Timestamp.now(),
      });

      setMensaje('Ingreso exitoso.');
      setTimeout(() => {
        navigate('/biblioteca');
      }, 1000);
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
          {/* Icono para volver a inicio */}
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
