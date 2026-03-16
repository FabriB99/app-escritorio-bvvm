import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { IdCard, Home } from 'lucide-react';
import { useUsuarioBiblioteca } from '../../context/UsuarioBibliotecaContext';
import '../Login/Login.css';

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
      const q = query(collection(db, 'miembros'), where('dni', '==', dni));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('DNI no registrado como miembro.');
        setCargando(false);
        return;
      }

      const miembroDoc = querySnapshot.docs[0];
      const miembroData = miembroDoc.data();

      setUsuario({
        dni: miembroData.dni,
        nombre: miembroData.nombre,
        apellido: miembroData.apellido || '',
        roles: miembroData.roles || [],
        categoria: miembroData.categoria || '',
      });

      await addDoc(collection(db, 'accesosBiblioteca'), {
        dni: miembroData.dni,
        nombre: miembroData.nombre,
        apellido: miembroData.apellido || '',
        roles: miembroData.roles || [],
        categoria: miembroData.categoria || '',
        timestamp: Timestamp.now(),
      });

      setMensaje('Ingreso exitoso.');
      setTimeout(() => navigate('/biblioteca'), 1000);

    } catch (err) {
      console.error('Error al validar DNI:', err);
      setError('Error en la conexión, intente nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-glass-page">
      <div className="login-glass-container">
        <div className="login-glass-card">

          <div className="login-glass-home-icon" onClick={() => navigate('/')} title="Volver a Inicio">
            <Home size={20} />
          </div>

          <img src="/logo-bomberos.png" alt="Logo Bomberos" className="login-glass-logo" />
          <h2 className="login-glass-title">Biblioteca Virtual</h2>

          <form onSubmit={handleLoginBiblioteca}>
            <div className="login-glass-input-wrapper">
              <IdCard size={16} className="login-glass-icon" />
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

            <button type="submit" className="login-glass-button" disabled={cargando}>
              {cargando ? 'Validando...' : 'Ingresar'}
            </button>

            {error && <p className="login-glass-error">{error}</p>}
            {mensaje && <p className="login-glass-error" style={{ color: '#a8f0c6' }}>{mensaje}</p>}
          </form>

        </div>
      </div>
    </div>
  );
};

export default LoginBiblioteca;