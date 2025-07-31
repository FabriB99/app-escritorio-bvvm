import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import './AltaDNI.css';

const AltaDNI: React.FC = () => {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (mensaje || error) {
      const timeout = setTimeout(() => {
        setMensaje('');
        setError('');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [mensaje, error]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    const nombreTrim = nombre.trim();
    const apellidoTrim = apellido.trim();
    const dniTrim = dni.trim();

    if (!nombreTrim || !apellidoTrim || !dniTrim) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (!/^\d{7,8}$/.test(dniTrim)) {
      setError('El DNI debe tener entre 7 y 8 dígitos.');
      return;
    }

    setCargando(true);
    try {
      await setDoc(doc(db, 'usuariosBiblioteca', dniTrim), {
        nombre: `${nombreTrim} ${apellidoTrim}`,
        dni: dniTrim,
      });

      setMensaje('✅ DNI registrado correctamente.');
      setNombre('');
      setApellido('');
      setDni('');
    } catch (err) {
      console.error(err);
      setError('❌ Hubo un error al registrar el DNI.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="crear-unidad__contenedor-principal">
      <div className="crear-unidad__encabezado">
        <button
          className="crear-unidad__btn-volver"
          onClick={() => navigate('/editar-biblioteca')}
        >
          ← Volver
        </button>
        <h1 className="crear-unidad__titulo">Alta de DNIs</h1>
      </div>

      <form className="crear-unidad__formulario" onSubmit={handleGuardar}>
        <div className="crear-unidad__tarjeta">
          <h2 className="crear-unidad__seccion-titulo">Nuevo acceso autorizado</h2>

          <div className="crear-unidad__grid">
            <div className="crear-unidad__campo">
              <label>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="crear-unidad__campo">
              <label>Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
            </div>

            <div className="crear-unidad__campo">
              <label>DNI</label>
              <input
                type="number"
                min={1000000}
                max={99999999}
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="crear-unidad__footer" style={{ marginTop: '30px' }}>
            <button
              type="submit"
              className="crear-unidad__btn-principal"
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : 'Registrar'}
            </button>
          </div>

          {mensaje && <p style={{ color: 'green', marginTop: 20 }}>{mensaje}</p>}
          {error && <p style={{ color: 'red', marginTop: 20 }}>{error}</p>}
        </div>
      </form>
    </div>
  );
};

export default AltaDNI;
