import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AltaDNI.css';

const AltaDNI: React.FC = () => {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombreTrim = nombre.trim();
    const apellidoTrim = apellido.trim();
    const dniTrim = dni.trim();

    if (!apellidoTrim || !nombreTrim || !dniTrim) {
      toast.error('Todos los campos son obligatorios.');
      return;
    }

    if (!/^\d{7,8}$/.test(dniTrim)) {
      toast.error('El DNI debe tener entre 7 y 8 dígitos.');
      return;
    }

    setCargando(true);
    try {
      await setDoc(doc(db, 'usuariosBiblioteca', dniTrim), {
        nombre: `${apellidoTrim} ${nombreTrim}`,
        dni: dniTrim,
      });

      toast.success('DNI registrado correctamente.');
      setApellido('');
      setNombre('');
      setDni('');
    } catch (err) {
      console.error(err);
      toast.error('Hubo un error al registrar el DNI.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="alta-dni__contenedor">
      <ToastContainer position="top-right" autoClose={1500} hideProgressBar />
      
      <div className="alta-dni__header">
        <button
          className="alta-dni__btn-volver"
          onClick={() => navigate('/editar-biblioteca/dnis/listado')}
        >
          ↩ Regresar
        </button>
        <h1 className="alta-dni__titulo">Alta de DNIs</h1>
      </div>

      <form className="alta-dni__formulario" onSubmit={handleGuardar}>
        <div className="alta-dni__tarjeta">
          <h2 className="alta-dni__seccion-titulo">Nuevo acceso autorizado</h2>

          <div className="alta-dni__fila-doble">
            <div className="alta-dni__campo">
              <label>Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
            </div>

            <div className="alta-dni__campo">
              <label>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="alta-dni__campo">
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

          <div className="alta-dni__footer">
            <button
              type="submit"
              className="alta-dni__btn-principal"
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AltaDNI;
