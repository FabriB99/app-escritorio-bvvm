import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { useUser } from '../../context/UserContext';
import './IdentificarMiembro.css';

const IdentificarMiembro: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { miembroActivo, setMiembroActivo, user } = useUser();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!miembroActivo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [miembroActivo]);

  const handleIdentificar = async () => {
    if (!pin) return;
    setCargando(true);
    setError('');

    try {
      const q = query(collection(db, 'miembros'), where('pin', '==', pin));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('DNI no válido');
        return;
      }

      const docData = snapshot.docs[0].data();
      const miembroRoles = docData.roles?.map((r: string) => r.toLowerCase()) || [];

      const esAdminMaster = docData.roles?.includes('admin') && docData.pin === pin;
      if (user && !esAdminMaster && !miembroRoles.includes(user.rol.toLowerCase())) {
        setError(`Este DNI no corresponde al rol ${user.rol}`);
        return;
      }

      const miembro = {
        id: snapshot.docs[0].id,
        nombre: docData.nombre,
        apellido: docData.apellido,
        categoria: docData.categoria,
        roles: docData.roles || [],
        pin: docData.pin,
        rol: docData.rol
      };

      setMiembroActivo(miembro);
      localStorage.setItem("miembroActivo", JSON.stringify(miembro));

    } catch (err) {
      console.error(err);
      setError('Error al identificar miembro');
    } finally {
      setCargando(false);
      if (error) setPin('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  if (miembroActivo) return null;

  return (
    <div className="identificar-overlay">
      <div className="identificar-modal">
        <h3>Identificarse</h3>
        <input
          ref={inputRef}
          type="password"
          placeholder="Ingresar DNI"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          disabled={cargando}
          onKeyDown={(e) => e.key === 'Enter' && handleIdentificar()}
        />
        <button onClick={handleIdentificar} disabled={cargando}>
          {cargando ? 'Validando...' : 'Identificar'}
        </button>
        {error && <p className="identificar-error">{error}</p>}
        <p className="identificar-hint">Presioná Enter para confirmar</p>
      </div>
    </div>
  );
};

export default IdentificarMiembro;