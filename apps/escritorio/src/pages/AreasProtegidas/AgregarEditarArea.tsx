// src/pages/AreasProtegidas/AgregarEditarArea.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { Plus, X, ShieldCheck, Building2, MapPin, User, Phone } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./AgregarEditarArea.css";
import Header from "../../components/Header";

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

  useEffect(() => {
    if (!id) return;

    const cargarArea = async () => {
      setLoading(true);
      const docRef = doc(db, "areas_protegidas", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Record<string, unknown>;
        setArea({
          nombre: (data.nombre as string) || "",
          direcciones: Array.isArray(data.direcciones)
            ? (data.direcciones as string[])
            : [String(data.direcciones || "")],
          responsable: (data.responsable as string) || "",
          telefono: (data.telefono as string) || "",
        });
      } else {
        toast.error("No se encontró el área a editar.");
        navigate("/areas-protegidas");
      }
      setLoading(false);
    };

    cargarArea();
  }, [id, navigate]);

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

      setTimeout(() => navigate("/areas-protegidas"), 2000);
    } catch (error) {
      console.error("Error guardando área:", error);
      toast.error("Ocurrió un error al guardar el área.");
    }
    setLoading(false);
  };

  const titulo = id ? "Editar área protegida" : "Agregar área protegida";

  return (
    <div className="aae-page">
      <Header title={titulo} onBack={() => navigate("/areas-protegidas")} />

      <div className="aae-page-inner">
        <div className="aae-page-head">
          <ShieldCheck size={18} aria-hidden />
          <span>{titulo}</span>
        </div>

        <form className="aae-glass-panel" onSubmit={handleSubmit}>
          <div className="aae-field">
            <label className="aae-label" htmlFor="aae-nombre">
              <Building2 size={14} className="aae-label-icon" aria-hidden />
              Nombre *
            </label>
            <input
              id="aae-nombre"
              type="text"
              name="nombre"
              value={area.nombre}
              onChange={handleChange}
              className="aae-input"
              autoComplete="off"
            />
          </div>

          <div className="aae-field">
            <span className="aae-label aae-label--static">
              <MapPin size={14} className="aae-label-icon" aria-hidden />
              Direcciones *
            </span>
            <div className="aae-direcciones">
              {area.direcciones.map((dir, index) => (
                <div key={index} className="aae-direccion-row">
                  <input
                    type="text"
                    value={dir}
                    onChange={(e) => handleDireccionChange(e.target.value, index)}
                    placeholder={`Dirección ${index + 1}`}
                    className="aae-input"
                    aria-label={`Dirección ${index + 1}`}
                  />
                  {area.direcciones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDireccion(index)}
                      className="aae-btn-icon-danger"
                      title="Quitar dirección"
                      aria-label="Quitar dirección"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addDireccion} className="aae-btn-add-dir">
                <Plus size={16} aria-hidden />
                Agregar otra dirección
              </button>
            </div>
          </div>

          <div className="aae-field">
            <label className="aae-label" htmlFor="aae-responsable">
              <User size={14} className="aae-label-icon" aria-hidden />
              Responsable
            </label>
            <input
              id="aae-responsable"
              type="text"
              name="responsable"
              value={area.responsable}
              onChange={handleChange}
              className="aae-input"
              autoComplete="off"
            />
          </div>

          <div className="aae-field">
            <label className="aae-label" htmlFor="aae-telefono">
              <Phone size={14} className="aae-label-icon" aria-hidden />
              Teléfono
            </label>
            <input
              id="aae-telefono"
              type="text"
              name="telefono"
              value={area.telefono}
              onChange={handleChange}
              className="aae-input"
              autoComplete="off"
            />
          </div>

          <div className="aae-form-actions">
            <button type="submit" disabled={loading} className="aae-btn-primary">
              {loading ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/areas-protegidas")}
              className="aae-btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
};

export default AgregarEditarArea;
