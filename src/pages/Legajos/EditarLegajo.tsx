// src/pages/Legajos/EditarLegajo.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // <-- Cambiado aquí
import { db, storage } from "../../app/firebase-config";
import { FaPlus, FaTrash } from "react-icons/fa";
import "./EditarLegajo.css";
import { registrarCambioLegajo } from "../../utils/registrarCambioLegajo";
import { useUser } from "../../context/UserContext";
import imageCompression from "browser-image-compression";
import { deleteObject } from "firebase/storage";

interface Hijo {
  nombre: string;
  fechaNacimiento: string;
  dni: string;
  localidad: string;
}

interface Legajo {
  apellido: string;
  nombre: string;
  numeroLegajo: number;
  numeroLegajoFederacion?: number;
  numeroLegajoRUBA?: number;
  dni?: string;
  fechaNacimiento?: string;
  grupoSanguineo?: string;
  domicilio?: string;
  domicilioLaboral?: string;
  lugar?: string;
  altura?: number;
  peso?: number;
  estadoCivil?: string;
  conyuge?: string;
  dniConyuge?: string;
  hijos?: Hijo[];
  fechaIngreso?: string;
  grado?: string;
  cargo?: string;
  cargoRegional?: string;
  cargoProvincial?: string;
  cargoNacional?: string;
  fechaUltimoAscenso?: string;
  reingreso?: string;
  fotoUrl?: string;
  obraSocial?: string;
  carnetConducir?: string;
  estado?: string;
}

const EditarLegajo: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [datos, setDatos] = useState<Legajo>({
    apellido: "",
    nombre: "",
    numeroLegajo: 0,
  });
  const [loading, setLoading] = useState(true);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // <-- estado progreso
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const datosOriginales = useRef<Legajo | null>(null); // 🟢

  useEffect(() => {
    const fetchLegajo = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "legajos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Legajo;
          setDatos(data);
          datosOriginales.current = data; // 🟢 Guarda original
          setFotoPreview(data.fotoUrl || null);
        }
      } catch (error) {
        console.error("Error al obtener legajo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLegajo();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDatos((prev) => ({
      ...prev,
      [name]: ["numeroLegajo", "numeroLegajoFederacion", "numeroLegajoRUBA", "altura", "peso"].includes(name)
        ? Number(value)
        : value,
    }));
  };

  // === CAMBIO EN SUBIDA DE FOTO ===
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.[0]) return;

    const file = e.target.files[0];

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);

      const storageRef = ref(storage, `legajos/${id}/imagen`);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      setUploadProgress(0);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("❌ Error subiendo la imagen:", error);
          setUploadProgress(null);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setFotoPreview(url);
          setDatos((prev) => ({ ...prev, fotoUrl: url }));
          setUploadProgress(null);
        }
      );
    } catch (error) {
      console.error("❌ Error al comprimir la imagen:", error);
    }
  };

  const handleBorrarFoto = async () => {
    if (!id || !datos.fotoUrl) return;

    try {
      const storageRef = ref(storage, `legajos/${id}/imagen`);
      await deleteObject(storageRef);

      const docRef = doc(db, "legajos", id);
      await setDoc(docRef, { fotoUrl: "" }, { merge: true });

      setFotoPreview(null);
      setDatos((prev) => ({ ...prev, fotoUrl: "" }));
    } catch (error) {
      console.error("❌ Error al borrar la foto:", error);
    }
  };

  const handleHijoChange = (index: number, field: keyof Hijo, value: string) => {
    const nuevosHijos = [...(datos.hijos || [])];
    nuevosHijos[index] = { ...nuevosHijos[index], [field]: value };
    setDatos((prev) => ({ ...prev, hijos: nuevosHijos }));
  };

  const agregarHijo = () => {
    const nuevosHijos = [...(datos.hijos || []), { nombre: "", fechaNacimiento: "", dni: "", localidad: "" }];
    setDatos((prev) => ({ ...prev, hijos: nuevosHijos }));
  };

  const toggleSeleccionado = (index: number) => {
    setSeleccionados((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const eliminarSeleccionados = () => {
    const nuevosHijos = (datos.hijos || []).filter((_, i) => !seleccionados.includes(i));
    setDatos((prev) => ({ ...prev, hijos: nuevosHijos }));
    setSeleccionados([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const docRef = doc(db, "legajos", id);
      await setDoc(docRef, datos, { merge: true });

      if (user && datosOriginales.current) {
        await registrarCambioLegajo({
          legajoId: id,
          accion: "modificado",
          tipoCambio: "datos personales",
          usuarioId: user.uid || "desconocido",
          usuarioRol: user.rol || "desconocido",
          datosPrevios: datosOriginales.current,
          datosNuevos: datos,
        });
      }

      navigate(`/legajo/${id}`);
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="editar-legajo-container">
      <h2>Editar Legajo</h2>
      <form onSubmit={handleSubmit} className="form-legajo">
        {/* FOTO */}
        <fieldset className="form-seccion">
          <legend>Foto carnet</legend>
          <div className="foto-carnet">
            {fotoPreview ? (
              <div className="foto-con-boton">
                <img src={fotoPreview} alt="Foto carnet" />
                <button
                  type="button"
                  className="btn-borrar-foto"
                  onClick={handleBorrarFoto}
                  title="Eliminar foto"
                >
                  ❌
                </button>
              </div>
            ) : (
              <div className="foto-placeholder">Sin foto</div>
            )}
            <input type="file" accept="image/*" onChange={handleFotoChange} />
            {uploadProgress !== null && <p>Subiendo foto... {uploadProgress.toFixed(0)}%</p>}
          </div>
        </fieldset>
        {/* LEGAJO */}
        <fieldset className="form-seccion">
          <legend>Legajo</legend>
          <div className="form-grupo">
            <label>N° Legajo:</label>
            <input
              type="number"
              name="numeroLegajo"
              value={datos.numeroLegajo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-grupo">
            <label>Legajo Federación:</label>
            <input
              type="number"
              name="numeroLegajoFederacion"
              value={datos.numeroLegajoFederacion || ""}
              onChange={handleChange}
            />
          </div>
          <div className="form-grupo">
            <label>Legajo RUBA:</label>
            <input
              type="number"
              name="numeroLegajoRUBA"
              value={datos.numeroLegajoRUBA || ""}
              onChange={handleChange}
            />
          </div>
        </fieldset>

        {/* DATOS PERSONALES */}
        <fieldset className="form-seccion">
          <legend>Datos personales</legend>
          <div className="form-grupo">
            <label>Apellido:</label>
            <input type="text" name="apellido" value={datos.apellido} onChange={handleChange} required />
          </div>
          <div className="form-grupo">
            <label>Nombre:</label>
            <input type="text" name="nombre" value={datos.nombre} onChange={handleChange} required />
          </div>
          <div className="form-grupo">
            <label>DNI:</label>
            <input type="text" name="dni" value={datos.dni || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Fecha de nacimiento:</label>
            <input type="date" name="fechaNacimiento" value={datos.fechaNacimiento || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Grupo sanguíneo:</label>
            <input type="text" name="grupoSanguineo" value={datos.grupoSanguineo || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Obra social:</label>
            <input type="text" name="obraSocial" value={datos.obraSocial || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Carnet de conducir:</label>
            <input type="text" name="carnetConducir" value={datos.carnetConducir || ""} onChange={handleChange} />
          </div>
          <div className="grupo-domicilio-completo">
            <div className="form-grupo">
              <label htmlFor="domicilio">Domicilio</label>
              <input type="text" id="domicilio" name="domicilio" value={datos.domicilio || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label htmlFor="lugar">Lugar</label>
              <input type="text" id="lugar" name="lugar" value={datos.lugar || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label htmlFor="domicilioLaboral">Domicilio laboral</label>
              <input type="text" id="domicilioLaboral" name="domicilioLaboral" value={datos.domicilioLaboral || ""} onChange={handleChange} />
            </div>
          </div>
          <div className="form-grupo">
            <label>Altura (cm):</label>
            <input type="number" name="altura" value={datos.altura || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Peso (kg):</label>
            <input type="number" name="peso" value={datos.peso || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Estado civil:</label>
            <input type="text" name="estadoCivil" value={datos.estadoCivil || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Casado/a con:</label>
            <input type="text" name="conyuge" value={datos.conyuge || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>DNI cónyuge:</label>
            <input type="text" name="dniConyuge" value={datos.dniConyuge || ""} onChange={handleChange} />
          </div>
        </fieldset>

        {/* HIJOS */}
        <fieldset className="form-seccion">
          <legend>Hijos</legend>
          {(datos.hijos || []).map((hijo, index) => (
            <div key={index} className="grupo-hijo">
              <input
                type="checkbox"
                checked={seleccionados.includes(index)}
                onChange={() => toggleSeleccionado(index)}
                aria-label={`Seleccionar hijo ${hijo.nombre}`}
                className="checkbox-seleccion"
              />
              <div className="form-grupo">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={hijo.nombre}
                  onChange={(e) => handleHijoChange(index, "nombre", e.target.value)}
                />
              </div>
              <div className="form-grupo">
                <label>Fecha de nacimiento:</label>
                <input
                  type="date"
                  value={hijo.fechaNacimiento}
                  onChange={(e) => handleHijoChange(index, "fechaNacimiento", e.target.value)}
                />
              </div>
              <div className="form-grupo">
                <label>DNI:</label>
                <input
                  type="text"
                  value={hijo.dni}
                  onChange={(e) => handleHijoChange(index, "dni", e.target.value)}
                />
              </div>
              <div className="form-grupo">
                <label>Localidad:</label>
                <input
                  type="text"
                  value={hijo.localidad}
                  onChange={(e) => handleHijoChange(index, "localidad", e.target.value)}
                />
              </div>
            </div>
          ))}

            <div className="botones-hijos-container">
              <button
                type="button"
                onClick={agregarHijo}
                className="btn btn-agregar-hijo"
                title="Agregar hijo"
                aria-label="Agregar hijo"
              >
                <FaPlus />
              </button>
              <button
                type="button"
                onClick={eliminarSeleccionados}
                className="btn btn-eliminar-hijo"
                disabled={seleccionados.length === 0}
                title={seleccionados.length === 0 ? "Seleccioná al menos un hijo para eliminar" : "Eliminar hijos seleccionados"}
                aria-label="Eliminar hijos seleccionados"
              >
                <FaTrash />
              </button>
            </div>  
        </fieldset>

        {/* DATOS INSTITUCIONALES */}
        <fieldset className="form-seccion">
          <legend>Datos institucionales</legend>
          <div className="form-grupo">
            <label>Fecha de ingreso:</label>
            <input type="date" name="fechaIngreso" value={datos.fechaIngreso || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Grado:</label>
            <input type="text" name="grado" value={datos.grado || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Cargo institucional:</label>
            <input type="text" name="cargo" value={datos.cargo || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Cargo regional:</label>
            <input type="text" name="cargoRegional" value={datos.cargoRegional || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Cargo provincial:</label>
            <input type="text" name="cargoProvincial" value={datos.cargoProvincial || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Cargo nacional:</label>
            <input type="text" name="cargoNacional" value={datos.cargoNacional || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Fecha último ascenso:</label>
            <input type="date" name="fechaUltimoAscenso" value={datos.fechaUltimoAscenso || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Estado:</label>
            <input type="text" name="estado" value={datos.estado || ""} onChange={handleChange} />
          </div>
          <div className="form-grupo">
            <label>Reingreso:</label>
            <input type="text" name="reingreso" value={datos.reingreso || ""} onChange={handleChange} />
          </div>
        </fieldset>

        {/* BOTONES */}
        <div className="botones-acciones">
          <button type="submit" className="btn btn-guardar1">
            Guardar
          </button>
          <button type="button" className="btn btn-cancel" onClick={() => navigate(`/legajo/${id}`)}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditarLegajo;
