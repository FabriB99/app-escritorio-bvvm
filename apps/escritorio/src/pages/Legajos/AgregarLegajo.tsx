import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, serverTimestamp, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { useUser } from '../../context/UserContext';
import { registrarAuditoria } from '../../utils/auditoria';
import { FileText } from 'lucide-react';
import Header from "../../components/Header";
import './AgregarLegajo.css';

const AgregarLegajo: React.FC = () => {
  const navigate = useNavigate();
  const { miembroActivo } = useUser();

  const [dni, setDni] = useState('');
  const [numeroLegajo, setNumeroLegajo] = useState('');
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  // Datos autocompletados desde miembros
  const [miembroEncontrado, setMiembroEncontrado] = useState<{
    id: string;
    nombre: string;
    apellido: string;
    categoria: string;
  } | null>(null);

  const buscarMiembro = async (dniValue: string) => {
    if (dniValue.trim().length < 7) {
      setMiembroEncontrado(null);
      return;
    }
    setBuscando(true);
    try {
      const snapshot = await getDocs(collection(db, 'miembros'));
      const encontrado = snapshot.docs.find(d => d.data().dni === dniValue.trim());
      if (encontrado) {
        const data = encontrado.data();
        setMiembroEncontrado({
          id: encontrado.id,
          nombre: data.nombre,
          apellido: data.apellido,
          categoria: data.categoria || '',
        });
        setError('');
      } else {
        setMiembroEncontrado(null);
        setError('No existe un miembro con ese DNI.');
      }
    } catch {
      setError('Error al buscar el miembro.');
    } finally {
      setBuscando(false);
    }
  };

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDni(value);
    setError('');
    buscarMiembro(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dni.trim() || !numeroLegajo.trim()) {
      setError('Por favor completá todos los campos.');
      return;
    }

    if (!miembroEncontrado) {
      setError('Primero ingresá un DNI válido.');
      return;
    }

    if (!miembroActivo) {
      setError('No se pudo determinar el miembro que realiza la acción.');
      return;
    }

    try {
      setLoading(true);
      const nuevoDocRef = doc(collection(db, 'legajos'));
      await setDoc(nuevoDocRef, {
        nombre: miembroEncontrado.nombre,
        apellido: miembroEncontrado.apellido,
        dni: dni.trim(),
        miembroId: miembroEncontrado.id,
        categoria: miembroEncontrado.categoria,
        numeroLegajo: Number(numeroLegajo),
        creadoEn: serverTimestamp(),
      });

      await registrarAuditoria({
        coleccion: "legajos",
        accion: "crear",
        docId: nuevoDocRef.id,
        miembro: { uid: miembroActivo.id, rol: miembroActivo.categoria },
        datosNuevos: {
          nombre: miembroEncontrado.nombre,
          apellido: miembroEncontrado.apellido,
          dni: dni.trim(),
          numeroLegajo: Number(numeroLegajo),
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

      <div className="form-legajo-card">
        {/* Header card */}
        <div className="form-legajo-card-header">
          <div className="form-legajo-card-icon">
            <FileText size={22} />
          </div>
          <div>
            <div className="form-legajo-card-title">Nuevo Legajo</div>
            <div className="form-legajo-card-subtitle">Completá los datos del bombero</div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="form-legajo">

          {/* Fila 1: DNI + N° Legajo */}
          <div className="form-legajo-row">
            <div className="form-legajo-field">
              <label>DNI</label>
              <div className="form-legajo-input-wrapper">
                <input
                  type="text"
                  value={dni}
                  onChange={handleDniChange}
                  placeholder="Ej: 31403586"
                  required
                  className={miembroEncontrado ? 'input-vinculado' : error ? 'input-error' : ''}
                />
                {buscando && <span className="form-legajo-badge buscando">Buscando...</span>}
                {miembroEncontrado && !buscando && (
                  <span className="form-legajo-badge vinculado">✓ Vinculado</span>
                )}
              </div>
              {miembroEncontrado && (
                <span className="form-legajo-miembro-info">
                  {miembroEncontrado.apellido} {miembroEncontrado.nombre} — {miembroEncontrado.categoria}
                </span>
              )}
            </div>

            <div className="form-legajo-field">
              <label>N° de Legajo</label>
              <input
                type="number"
                value={numeroLegajo}
                onChange={(e) => setNumeroLegajo(e.target.value)}
                placeholder="Ej: 001"
                required
              />
            </div>
          </div>

          {/* Fila 2: Nombre + Apellido autocompletados */}
          <div className="form-legajo-row">
            <div className="form-legajo-field">
              <label className="label-auto">Apellido <span>(desde miembro)</span></label>
              <input
                type="text"
                value={miembroEncontrado?.apellido || ''}
                disabled
                placeholder="Se completa automáticamente"
                className="input-disabled"
              />
            </div>
            <div className="form-legajo-field">
              <label className="label-auto">Nombre <span>(desde miembro)</span></label>
              <input
                type="text"
                value={miembroEncontrado?.nombre || ''}
                disabled
                placeholder="Se completa automáticamente"
                className="input-disabled"
              />
            </div>
          </div>

          {error && <p className="form-legajo-error">{error}</p>}

          <div className="form-legajo-divider" />

          <div className="form-legajo-botones">
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => navigate("/legajos")}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-guardar"
              disabled={loading || !miembroEncontrado}
            >
              {loading ? 'Guardando...' : 'Guardar Legajo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgregarLegajo;