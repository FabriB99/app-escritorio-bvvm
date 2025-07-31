// src/pages/Login/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth, db } from '../../app/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import './Login.css';
import { FaUser, FaLock, FaHome } from 'react-icons/fa';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');
  const [mantenerSesion, setMantenerSesion] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // limpiar error previo

    try {
      // 1. Persistencia según checkbox
      await setPersistence(auth, mantenerSesion ? browserLocalPersistence : browserSessionPersistence);

      // 2. Iniciar sesión
      const userCredential = await signInWithEmailAndPassword(auth, email, contraseña);
      const uid = userCredential.user.uid;

      // 3. Traer el rol desde Firestore
      const userDoc = await getDoc(doc(db, 'usuarios', uid));

      if (!userDoc.exists()) {
        setError('No se encontró el rol del usuario.');
        console.warn(`⚠️ El documento /usuarios/${uid} no existe`);
        return;
      }

      const rol = userDoc.data().rol;
      const userData = { uid, rol };

      // 4. Guardar en contexto y localStorage
      setUser(userData);
      localStorage.setItem('usuario', JSON.stringify(userData));

      // 5. Redireccionar según rol
      const redireccion = rol === 'legajo' ? '/legajos' : '/unidades';
      navigate(redireccion);

    } catch (err) {
      console.error('❌ Error en login:', err);
      setError('Correo o contraseña incorrectos.');
    }
  };

  return (
    <div className="login-glass-page">
      <div className="login-glass-container">
        <div className="login-glass-card">
          <div className="login-glass-home-icon" onClick={() => navigate('/')} title='Volver a Inicio'>
            <FaHome />
          </div>
          <img src="/logo-bomberos.png" alt="Logo Bomberos" className="login-glass-logo" />
          <h2 className="login-glass-title">Iniciar sesión</h2>
          <form onSubmit={handleLogin}>
            <div className="login-glass-input-wrapper">
              <FaUser className="login-glass-icon" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="login-glass-input-wrapper">
              <FaLock className="login-glass-icon" />
              <input
                type="password"
                placeholder="Contraseña"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                required
              />
            </div>
            <div className="login-glass-checkbox">
              <input
                type="checkbox"
                id="mantenerSesion"
                checked={mantenerSesion}
                onChange={(e) => setMantenerSesion(e.target.checked)}
              />
              <label htmlFor="mantenerSesion">Mantener sesión iniciada</label>
            </div>
            <button type="submit" className="login-glass-button">Ingresar</button>
            {error && <p className="login-glass-error">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
