// src/pages/AreasProtegidas/AgregarEditarArea.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import { Plus, Trash2, Building2, MapPin, User, Phone } from "lucide-react";
import { toast } from "sonner";
import "./AgregarEditarArea.css";
import Header from "../../components/Header";
import { useUser } from "../../context/UserContext";
import { registrarAuditoria, buildOperador, calcularDiff } from "../../utils/auditoria";

interface Area {
  nombre: string;
  direcciones: string[];
  responsable?: string;
  telefono?: string;
}

const AgregarEditarArea: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();

  const [area, setArea] = useState<Area>({
    nombre: "",
    direcciones: [""],
    responsable: "",
    telefono: "",
  });

  // Copia de los datos originales para calcular el diff de auditoría al editar
  const [areaOriginal, setAreaOriginal] = useState<Area | null>(null);

  const [cargandoDatos, setCargandoDatos] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) return;

    const cargarArea = async () => {
      setCargandoDatos(true);
      try {
        const docRef = doc(db, "areas_protegidas", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Record<string, unknown>;
          const cargada: Area = {
            nombre: (data.nombre as string) || "",
            direcciones: Array.isArray(data.direcciones)
              ? (data.direcciones as string[])
              : [String(data.direcciones || "")],
            responsable: (data.responsable as string) || "",
            telefono: (data.telefono as string) || "",
          };
          setArea(cargada);
          setAreaOriginal(cargada);
        } else {
          toast.error("No se encontró el área a editar.");
          navigate("/areas-protegidas");
        }
      } catch (error) {
        console.error("Error al cargar área:", error);
        toast.error("Ocurrió un error al cargar los datos del área.");
        navigate("/areas-protegidas");
      } finally {
        setCargandoDatos(false);
      }
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
      toast.warning("Debe existir al menos una dirección.");
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

    setGuardando(true);
    const operador = buildOperador(miembroActivo, user?.rol);
    const datos: Area = {
      ...area,
      nombre: area.nombre.trim(),
      direcciones: area.direcciones.map((d) => d.trim()),
    };

    try {
      if (id) {
        await updateDoc(doc(db, "areas_protegidas", id), { ...datos });

        await registrarAuditoria({
          accion: "editar",
          coleccion: "areas_protegidas",
          docId: id,
          docResumen: `Área protegida: ${datos.nombre}`,
          operador,
          detalles: {
            descripcion: `Se editó el área protegida "${datos.nombre}"`,
            cambios: areaOriginal ? calcularDiff(areaOriginal, datos) : [],
          },
        });

        toast.success("Área actualizada correctamente");
      } else {
        const nuevoRef = await addDoc(collection(db, "areas_protegidas"), { ...datos });

        await registrarAuditoria({
          accion: "crear",
          coleccion: "areas_protegidas",
          docId: nuevoRef.id,
          docResumen: `Área protegida: ${datos.nombre}`,
          operador,
          detalles: {
            descripcion: `Se creó el área protegida "${datos.nombre}"`,
            snapshot: { ...datos },
          },
        });

        toast.success("Área agregada correctamente");
      }

      navigate("/areas-protegidas");
    } catch (error) {
      console.error("Error guardando área:", error);
      toast.error("Ocurrió un error al guardar el área.");
      setGuardando(false);
    }
  };

  const titulo = id ? "Editar Área Protegida" : "Agregar Área Protegida";

  return (
    <div className="aae-page">
      <Header title={titulo} onBack={() => navigate("/areas-protegidas")} />

      <div className="aae-page-inner">
        {cargandoDatos ? (
          <div className="aae-card aae-loading-card">
            <p className="aae-loading-text">Cargando datos del área...</p>
          </div>
        ) : (
          <form className="aae-card" onSubmit={handleSubmit}>
            {/* 1. Datos Principales */}
            <div className="aae-field">
              <label className="aae-label" htmlFor="aae-nombre">
                <Building2 size={15} className="aae-label-icon" aria-hidden />
                Nombre de la institución / comercio *
              </label>
              <input
                id="aae-nombre"
                type="text"
                name="nombre"
                placeholder="Ej: Clínica Marañón, Supermercado..."
                value={area.nombre}
                onChange={handleChange}
                className="aae-input"
                autoComplete="off"
                required
              />
            </div>

            {/* 2. Grilla de 2 columnas: Responsable y Teléfono */}
            <div className="aae-grid-2">
              <div className="aae-field">
                <label className="aae-label" htmlFor="aae-responsable">
                  <User size={15} className="aae-label-icon" aria-hidden />
                  Responsable a cargo
                </label>
                <input
                  id="aae-responsable"
                  type="text"
                  name="responsable"
                  placeholder="Ej: Juan Pérez"
                  value={area.responsable}
                  onChange={handleChange}
                  className="aae-input"
                  autoComplete="off"
                />
              </div>

              <div className="aae-field">
                <label className="aae-label" htmlFor="aae-telefono">
                  <Phone size={15} className="aae-label-icon" aria-hidden />
                  Teléfono de contacto
                </label>
                <input
                  id="aae-telefono"
                  type="text"
                  name="telefono"
                  placeholder="Ej: 353 4123456"
                  value={area.telefono}
                  onChange={handleChange}
                  className="aae-input"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* 3. Sección de Direcciones / Sedes */}
            <div className="aae-direcciones-section">
              <div className="aae-direcciones-head">
                <div className="aae-direcciones-title">
                  <MapPin size={15} className="aae-label-icon" aria-hidden />
                  <span>Direcciones / Sedes operativas *</span>
                </div>
                <button
                  type="button"
                  onClick={addDireccion}
                  className="aae-btn-add-dir"
                >
                  <Plus size={14} aria-hidden />
                  Agregar sede
                </button>
              </div>

              <div className="aae-direcciones-lista">
                {area.direcciones.map((dir, index) => (
                  <div key={index} className="aae-direccion-row">
                    <span className="aae-dir-badge">#{index + 1}</span>
                    <input
                      type="text"
                      value={dir}
                      onChange={(e) => handleDireccionChange(e.target.value, index)}
                      placeholder={`Dirección de sede ${index + 1}`}
                      className="aae-input"
                      aria-label={`Dirección sede ${index + 1}`}
                      required
                    />
                    {area.direcciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDireccion(index)}
                        className="aae-btn-icon-danger"
                        title="Quitar sede"
                        aria-label="Quitar sede"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones del formulario */}
            <div className="aae-form-actions">
              <button
                type="button"
                onClick={() => navigate("/areas-protegidas")}
                className="aae-btn-secondary"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="aae-btn-primary"
              >
                {guardando
                  ? "Guardando…"
                  : id
                  ? "Guardar cambios"
                  : "Guardar área"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AgregarEditarArea;
