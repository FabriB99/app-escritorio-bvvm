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
import { User, Lock, Home } from 'lucide-react';

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
      // 1️⃣ Persistencia según checkbox
      await setPersistence(auth, mantenerSesion ? browserLocalPersistence : browserSessionPersistence);

      // 2️⃣ Iniciar sesión
      const userCredential = await signInWithEmailAndPassword(auth, email, contraseña);
      const uid = userCredential.user.uid;

      // 3️⃣ Traer el rol desde Firestore
      const userDoc = await getDoc(doc(db, 'usuarios', uid));

      if (!userDoc.exists()) {
        setError('No se encontró el rol del usuario.');
        console.warn(`⚠️ El documento /usuarios/${uid} no existe`);
        return;
      }

      const rol = userDoc.data().rol;
      const userData = { uid, rol };

      // 4️⃣ Guardar en contexto y localStorage
      setUser(userData);
      localStorage.setItem('usuario', JSON.stringify(userData));

      // 5️⃣ Redireccionar según rol
      // ➤ Bombero va a su propio legajo
      if (rol === 'bombero') {
        navigate(`/inicio-bombero`);
      } 
      // ➤ Legajo administrativo
      else if (rol === 'legajo') {
        navigate('/legajos');
      } 
      // ➤ Otros roles van a unidades (puedes ajustar según tu lógica)
      else {
        navigate('/unidades');
      }

    } catch (err) {
      console.error('❌ Error en login:', err);
      setError('Correo o contraseña incorrectos.');
    }
  };

  return (
    <div className="login-glass-page">
      <div className="login-glass-container">
        <div className="login-glass-card">
          {/* Icono Home */}
          <div className="login-glass-home-icon" onClick={() => navigate('/')} title='Volver a Inicio'>
            <Home size={20} />
          </div>

          {/* Logo y título */}
          <img src="/logo-bomberos.png" alt="Logo Bomberos" className="login-glass-logo" />
          <h2 className="login-glass-title">Iniciar sesión</h2>

          {/* Formulario */}
          <form onSubmit={handleLogin}>
            <div className="login-glass-input-wrapper">
              <User size={16} className="login-glass-icon" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-glass-input-wrapper">
              <Lock size={16} className="login-glass-icon" />
              <input
                type="password"
                placeholder="Contraseña"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                required
              />
            </div>

            {/* Checkbox mantener sesión */}
            <div className="login-glass-checkbox">
              <input
                type="checkbox"
                id="mantenerSesion"
                checked={mantenerSesion}
                onChange={(e) => setMantenerSesion(e.target.checked)}
              />
              <label htmlFor="mantenerSesion">Mantener sesión iniciada</label>
            </div>

            {/* Botón ingresar */}
            <button type="submit" className="login-glass-button">Ingresar</button>

            {/* Mensaje de error */}
            {error && <p className="login-glass-error">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
