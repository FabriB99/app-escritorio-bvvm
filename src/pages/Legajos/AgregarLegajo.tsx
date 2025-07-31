// src/pages/AgregarLegajo/AgregarLegajo.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import './AgregarLegajo.css';

const AgregarLegajo: React.FC = () => {
  const navigate = useNavigate();

  const [apellido, setApellido] = useState('');
  const [nombre, setNombre] = useState('');
  const [numeroLegajo, setNumeroLegajo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim() || !apellido.trim() || !numeroLegajo.trim()) {
      setError('Por favor completá todos los campos.');
      return;
    }

    try {
      setLoading(true);
      const nuevoDoc = await addDoc(collection(db, 'legajos'), {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        numeroLegajo: Number(numeroLegajo),
        creadoEn: serverTimestamp(),
      });

      navigate(`/legajo/${nuevoDoc.id}`);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al guardar el legajo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agregar-legajo-container">
      <h2 className="titulo-pagina">Agregar Legajo</h2>

      <form onSubmit={handleSubmit} className="form-legajo">
        <label>
          Apellido
          <input
            type="text"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            required
          />
        </label>

        <label>
          Nombre
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </label>

        <label>
          N° de Legajo
          <input
            type="number"
            value={numeroLegajo}
            onChange={(e) => setNumeroLegajo(e.target.value)}
            required
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-guardar" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Legajo'}
        </button>
      </form>
    </div>
  );
};

export default AgregarLegajo;
