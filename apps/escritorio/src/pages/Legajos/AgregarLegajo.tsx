import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, serverTimestamp, doc, setDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { useUser } from '../../context/UserContext';
import { registrarAuditoria, buildOperador } from '../../utils/auditoria';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import Header from "../../components/Header";
import './AgregarLegajo.css';

const AgregarLegajo: React.FC = () => {
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();

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
    grado: string;
    carnetConducir: string;
  } | null>(null);

  const buscarMiembro = async (dniValue: string) => {
    const dniLimpio = dniValue.trim();
    if (dniLimpio.length < 7) {
      setMiembroEncontrado(null);
      return;
    }
    setBuscando(true);
    try {
      const q = query(
        collection(db, 'miembros'),
        where('dni', '==', dniLimpio),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        const grado = data.grado || data.categoria || '';
        let carnetConducir = data.carnetConducir || data.licenciaConducir || '';

        // Consultamos en la colección vencimientos si posee carnet
        try {
          const qCarnet = query(
            collection(db, 'vencimientos'),
            where('miembroId', '==', docSnap.id),
            where('tipo', '==', 'carnet')
          );
          const snapCarnet = await getDocs(qCarnet);
          if (!snapCarnet.empty) {
            const vData = snapCarnet.docs[0].data();
            if (Array.isArray(vData.tipoCarnet) && vData.tipoCarnet.length > 0) {
              carnetConducir = vData.tipoCarnet.join(', ');
            } else if (typeof vData.tipoCarnet === 'string' && vData.tipoCarnet.trim()) {
              carnetConducir = vData.tipoCarnet.trim();
            }
          }
        } catch (errCarnet) {
          console.warn('Error al consultar carnet en vencimientos:', errCarnet);
        }

        if (!carnetConducir) {
          carnetConducir = 'No posee';
        }

        setMiembroEncontrado({
          id: docSnap.id,
          nombre: data.nombre,
          apellido: data.apellido,
          categoria: data.categoria || '',
          grado,
          carnetConducir,
        });
        setError('');
        toast.success(`Miembro vinculado: ${data.apellido}, ${data.nombre}`);
      } else {
        setMiembroEncontrado(null);
        const msg = 'No existe un miembro con ese DNI.';
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = 'Error al buscar el miembro.';
      setError(msg);
      toast.error(msg);
    } finally {
      setBuscando(false);
    }
  };

  useEffect(() => {
    const valor = dni.trim();
    if (valor.length < 7) {
      setMiembroEncontrado(null);
      setError('');
      return;
    }

    const timer = setTimeout(() => {
      buscarMiembro(valor);
    }, 400);

    return () => clearTimeout(timer);
  }, [dni]);

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDni(e.target.value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dni.trim() || !numeroLegajo.trim()) {
      const msg = 'Por favor completá todos los campos.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!miembroEncontrado) {
      const msg = 'Primero ingresá un DNI válido.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!miembroActivo) {
      const msg = 'No se pudo determinar el miembro que realiza la acción.';
      setError(msg);
      toast.error(msg);
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
        grado: miembroEncontrado.grado,
        carnetConducir: miembroEncontrado.carnetConducir,
        numeroLegajo: Number(numeroLegajo),
        creadoEn: serverTimestamp(),
      });

      await registrarAuditoria({
        coleccion: "legajos",
        accion: "crear",
        docId: nuevoDocRef.id,
        docResumen: `Legajo N° ${numeroLegajo} — ${miembroEncontrado.apellido} ${miembroEncontrado.nombre}`,
        operador: buildOperador(miembroActivo, user?.rol),
        detalles: {
          descripcion: `Alta de legajo N° ${numeroLegajo} vinculado a ${miembroEncontrado.nombre} ${miembroEncontrado.apellido} (DNI ${dni.trim()})`,
        },
      });

      toast.success('Legajo guardado con éxito');
      navigate(`/legajo/${nuevoDocRef.id}`);
    } catch (err) {
      console.error(err);
      const msg = 'Ocurrió un error al guardar el legajo.';
      setError(msg);
      toast.error(msg);
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
                  {miembroEncontrado.apellido} {miembroEncontrado.nombre} — {miembroEncontrado.grado || miembroEncontrado.categoria} · Carnet: {miembroEncontrado.carnetConducir}
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