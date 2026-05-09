import "../styles/ControlCombustible.css";
import { useState, useEffect } from "react";
import { getUnidades, updateCombustibleUnidad } from "../firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Unidad } from "../../../shared/types/Unidad";

export default function ControlCombustible() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [nivelesCombustible, setNivelesCombustible] = useState<{ [unidadId: string]: string }>({});
  const [revisados, setRevisados] = useState<{ [unidadId: string]: boolean }>({});
  const [guardando, setGuardando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getUnidades().then((data: Unidad[]) => {
      const unidadesOrdenadas = data.sort((a, b) => {
        const numA = parseInt(a.nombre.split(" ")[1], 10);
        const numB = parseInt(b.nombre.split(" ")[1], 10);
        return numA - numB;
      });

      setUnidades(unidadesOrdenadas);

      const inicial: { [unidadId: string]: string } = {};
      unidadesOrdenadas.forEach((unidad) => {
        inicial[unidad.id] = unidad.combustible || "";
      });

      setNivelesCombustible(inicial);
    });
  }, []);

  const handleSeleccionarNivel = (unidadId: string, nivel: string) => {
    setNivelesCombustible((prev) => ({
      ...prev,
      [unidadId]: nivel,
    }));

    setRevisados((prev) => ({
      ...prev,
      [unidadId]: true,
    }));
  };

  const handleGuardar = async () => {
    setGuardando(true);

    for (const unidadId in revisados) {
      if (revisados[unidadId]) {
        const nuevo = nivelesCombustible[unidadId];
        await updateCombustibleUnidad(unidadId, nuevo);
      }
    }

    setGuardando(false);
    toast.success("✅ Control guardado con éxito", {
      autoClose: 1000,
      onClose: () => navigate("/"),
    });
  };

  const getBordeColor = (nivel: string) => {
    switch (nivel) {
      case "1/4": return "borde-1/4";
      case "2/4": return "borde-2/4";
      case "3/4": return "borde-3/4";
      case "4/4": return "borde-4/4";
      default: return "";
    }
  };

  return (
    <div className="combustible-control-container">
      <Link to="/" style={{ display: "flex", justifyContent: "center" }}>
        <img src="/logo-bomberos.png" alt="Logo" className="controlcombustible-logo" />
      </Link>
      <h1 className="combustible-control-title">Control de Combustible</h1>

      <div className="combustible-unidades-container">
        {unidades.map((unidad) => {
          const nivel = nivelesCombustible[unidad.id] || "";
          return (
            <div key={unidad.id} className={`combustible-unidad-card ${getBordeColor(nivel)}`}>
              <div className="combustible-unidad-header">
                <span className="combustible-unidad-nombre">{unidad.nombre}</span>
              </div>

              <div className="combustible-opciones">
                <div className="combustible-niveles">
                  {["1/4", "2/4", "3/4", "4/4"].map((nivelOption) => {
                    const esActivo = nivel === nivelOption;
                    return (
                      <button
                        key={nivelOption}
                        className={`combustible-btn btn-${nivelOption.replace("/", "-")}${esActivo ? " activo" : ""}`}
                        onClick={() => handleSeleccionarNivel(unidad.id, nivelOption)}
                        type="button"
                        disabled={guardando}
                      >
                        {nivelOption}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="combustible-guardar-btn"
        onClick={handleGuardar}
        disabled={guardando}
      >
        {guardando ? "Guardando..." : "Guardar Control"}
      </button>

      <ToastContainer position="top-center" />
    </div>
  );
}
