// src/pages/AreasProtegidas/AgregarEditarArea.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { FaPlus, FaTimes } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./AgregarEditarArea.css";

interface Area {
  nombre: string;
  direcciones: string[];
  responsable?: string;
  telefono?: string;
}

const AgregarEditarArea: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [area, setArea] = useState<Area>({
    nombre: "",
    direcciones: [""],
    responsable: "",
    telefono: "",
  });

  const [loading, setLoading] = useState(false);

  // Cargar datos si es edición
  useEffect(() => {
    if (!id) return;

    const cargarArea = async () => {
      setLoading(true);
      const docRef = doc(db, "areas_protegidas", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setArea({
          nombre: data.nombre || "",
          direcciones: Array.isArray(data.direcciones)
            ? data.direcciones
            : [data.direcciones || ""],
          responsable: data.responsable || "",
          telefono: data.telefono || "",
        });
      } else {
        toast.error("No se encontró el área a editar.");
        navigate("/areas-protegidas");
      }
      setLoading(false);
    };

    cargarArea();
  }, [id, navigate]);

  // Manejar cambios en direcciones
  const handleDireccionChange = (value: string, index: number) => {
    const nuevas = [...area.direcciones];
    nuevas[index] = value;
    setArea({ ...area, direcciones: nuevas });
  };

  const addDireccion = () =>
    setArea({ ...area, direcciones: [...area.direcciones, ""] });

  const removeDireccion = (index: number) => {
    if (area.direcciones.length === 1) {
      toast.warn("Debe existir al menos una dirección.");
      return;
    }
    setArea({
      ...area,
      direcciones: area.direcciones.filter((_, i) => i !== index),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArea({ ...area, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !area.nombre.trim() ||
      area.direcciones.length === 0 ||
      area.direcciones.some((d) => !d.trim())
    ) {
      toast.error("El nombre y al menos una dirección válida son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      if (id) {
        const docRef = doc(db, "areas_protegidas", id);
        await updateDoc(docRef, { ...area });
        toast.success("Área actualizada correctamente");
      } else {
        const colRef = collection(db, "areas_protegidas");
        await addDoc(colRef, { ...area });
        toast.success("Área agregada correctamente");
      }

      setTimeout(() => navigate("/areas-protegidas"), 2000); // deja ver el toast
    } catch (error) {
      console.error("Error guardando área:", error);
      toast.error("Ocurrió un error al guardar el área.");
    }
    setLoading(false);
  };

  return (
    <div className="aae-container">
      <h2 className="aae-title">
        {id ? "Editar Área Protegida" : "Agregar Área Protegida"}
      </h2>
      <form className="aae-form" onSubmit={handleSubmit}>
        <label className="aae-label">
          Nombre*
          <input
            type="text"
            name="nombre"
            value={area.nombre}
            onChange={handleChange}
            className="aae-input"
          />
        </label>

        {/* Direcciones */}
        <div className="aae-direcciones-container">
          <label className="aae-label">Direcciones*</label>
          {area.direcciones.map((dir, index) => (
            <div key={index} className="aae-direccion-group">
              <input
                type="text"
                value={dir}
                onChange={(e) => handleDireccionChange(e.target.value, index)}
                placeholder={`Dirección ${index + 1}`}
                className="aae-input"
              />
              {area.direcciones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDireccion(index)}
                  className="aae-btn-remove"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addDireccion} className="aae-btn-add">
            <FaPlus /> Agregar otra dirección
          </button>
        </div>

        <label className="aae-label">
          Responsable
          <input
            type="text"
            name="responsable"
            value={area.responsable}
            onChange={handleChange}
            className="aae-input"
          />
        </label>

        <label className="aae-label">
          Teléfono
          <input
            type="text"
            name="telefono"
            value={area.telefono}
            onChange={handleChange}
            className="aae-input"
          />
        </label>

        <div className="aae-form-buttons">
          <button type="submit" disabled={loading} className="aae-btn-submit">
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/areas-protegidas")}
            className="aae-btn-cancel"
          >
            Cancelar
          </button>
        </div>
      </form>

      {/* 🔥 Toasts solo para esta pantalla */}
      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
};

export default AgregarEditarArea;
