// src/pages/AgregarLegajo/AgregarLegajo.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, serverTimestamp, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import './AgregarLegajo.css';
import Header from "../../components/Header";
import { useUser } from '../../context/UserContext';
import { registrarAuditoria } from '../../utils/auditoria';

const AgregarLegajo: React.FC = () => {
  const navigate = useNavigate();
  const { miembroActivo } = useUser();

  const [apellido, setApellido] = useState('');
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [numeroLegajo, setNumeroLegajo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim() || !apellido.trim() || !numeroLegajo.trim() || !dni.trim()) {
      setError('Por favor completá todos los campos.');
      return;
    }

    if (!miembroActivo) {
      setError('No se pudo determinar el miembro que realiza la acción.');
      return;
    }

    try {
      setLoading(true);

      // ---- Buscar miembro por DNI ----
      const miembrosSnapshot = await getDocs(collection(db, 'miembros'));
      const miembroEncontrado = miembrosSnapshot.docs.find(docSnap => docSnap.data().dni === dni.trim());

      if (!miembroEncontrado) {
        setError('No existe un miembro con ese DNI. Primero debe registrarse el miembro.');
        setLoading(false);
        return;
      }

      const miembroId = miembroEncontrado.id; // UID del miembro al que pertenece el legajo

      // ---- Crear legajo vinculado al miembro correcto ----
      const nuevoDocRef = doc(collection(db, 'legajos'));
      await setDoc(nuevoDocRef, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        numeroLegajo: Number(numeroLegajo),
        dni: dni.trim(),
        miembroId, // 🔑 vinculación correcta
        creadoEn: serverTimestamp(),
      });

      // ---- Registrar auditoría con el creador ----
      await registrarAuditoria({
        coleccion: "legajos",
        accion: "crear",
        docId: nuevoDocRef.id,
        miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
        datosNuevos: {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          numeroLegajo: Number(numeroLegajo),
          dni: dni.trim(),
        },
      });

      navigate(`/legajo/${nuevoDocRef.id}`);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al guardar el legajo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agregar-legajo-container">
      <Header title="Agregar Legajo" onBack={() => navigate("/legajos")} />

      <form onSubmit={handleSubmit} className="form-legajo">
        <label>
          DNI
          <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} required />
        </label>

        <label>
          Apellido
          <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
        </label>

        <label>
          Nombre
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>

        <label>
          N° de Legajo
          <input type="number" value={numeroLegajo} onChange={(e) => setNumeroLegajo(e.target.value)} required />
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
