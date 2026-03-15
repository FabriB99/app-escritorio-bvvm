import React from "react";
import { useNavigate } from "react-router-dom";
import { FaIdCard, FaChartBar } from "react-icons/fa";
import Header from "../../components/Header";
import { useUser } from "../../context/UserContext";
import "./InicioBombero.css";

const InicioBombero: React.FC = () => {
  const navigate = useNavigate();
  const { miembroActivo } = useUser();

  return (
    <div className="inicio-bombero__contenedor-principal">
      <Header title="Panel del Bombero" />

      <main className="inicio-bombero__grid">
        {/* Tarjeta Mi Legajo */}
        <div
          className={`inicio-bombero__card ${
            !miembroActivo ? "inicio-bombero__card--disabled" : ""
          }`}
          onClick={() => miembroActivo && navigate(`/legajo/${miembroActivo.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" && miembroActivo)
              navigate(`/legajo/${miembroActivo.id}`);
          }}
        >
          <FaIdCard className="inicio-bombero__icono" />
          <h3>Mi Legajo</h3>
          <p>
            Consulta tus datos personales, historial y toda tu información
            institucional.
          </p>
          {!miembroActivo && (
            <p className="inicio-bombero__aviso">
              ⚠️ Necesitas identificarte con tu PIN
            </p>
          )}
        </div>

        {/* Tarjeta Mis Estadísticas */}
        <div
          className={`inicio-bombero__card ${
            !miembroActivo ? "inicio-bombero__card--disabled" : ""
          }`}
          onClick={() => miembroActivo && navigate("/estadisticas")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" && miembroActivo) navigate("/estadisticas");
          }}
        >
          <FaChartBar className="inicio-bombero__icono" />
          <h3>Mis Estadísticas</h3>
          <p>
            Visualiza tus participaciones, asistencias y métricas de desempeño.
          </p>
          {!miembroActivo && (
            <p className="inicio-bombero__aviso">
              ⚠️ Necesitas identificarte con tu PIN
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default InicioBombero;
