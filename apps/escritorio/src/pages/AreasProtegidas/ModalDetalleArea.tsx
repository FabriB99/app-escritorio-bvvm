// src/pages/AreasProtegidas/ModalDetalleArea.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  MapPin,
  Phone,
  User,
  Info,
} from "lucide-react";
import "./ModalDetalleArea.css";

interface AreaDetalle {
  id: string;
  nombre: string;
  direcciones: string[];
  responsable?: string;
  telefono?: string;
}

interface Props {
  area: AreaDetalle;
  onClose: () => void;
}

const ModalDetalleArea: React.FC<Props> = ({ area, onClose }) => {
  const navigate = useNavigate();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<string | null>(null);

  return (
    <div className="apla-detalle-overlay" role="presentation" onClick={onClose}>
      <div
        className={`apla-glass-container ${direccionSeleccionada ? "apla-glass-container--split" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apla-detalle-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apla-detalle-head">
          <div className="apla-detalle-head-icon">
            <Info size={18} aria-hidden />
          </div>
          <h2 id="apla-detalle-title" className="apla-detalle-title">
            Área protegida
          </h2>
          <p className="apla-detalle-subtitle">
            Datos operativos y ubicación
          </p>
        </div>

        <div className="apla-detalle-body">
          <div className="apla-detalle-col">
            <div className="apla-detalle-item">
              <span className="apla-detalle-item-icon" aria-hidden>
                <Building2 size={16} />
              </span>
              <div className="apla-detalle-item-text">
                <span className="apla-detalle-label">Nombre</span>
                <span className="apla-detalle-value">{area.nombre}</span>
              </div>
            </div>

            <div className="apla-detalle-item apla-detalle-item--stack">
              <span className="apla-detalle-item-icon" aria-hidden>
                <MapPin size={16} />
              </span>
              <div className="apla-detalle-item-text apla-detalle-item-text--grow">
                <span className="apla-detalle-label">Ubicación</span>
                <div className="apla-detalle-direcciones">
                  {(area.direcciones || []).length === 0 && (
                    <span className="apla-detalle-value apla-detalle-value--muted">
                      Sin direcciones registradas
                    </span>
                  )}
                  {(area.direcciones || []).map((dir, idx) => (
                    <div key={idx} className="apla-detalle-direccion-row">
                      <span className="apla-detalle-value">{dir}</span>
                      <button
                        type="button"
                        className="apla-detalle-btn-mapa"
                        title={`Ver mapa: ${dir}`}
                        onClick={() =>
                          setDireccionSeleccionada(
                            direccionSeleccionada === dir ? null : dir
                          )
                        }
                        aria-label={`Ver mapa de ${dir}`}
                      >
                        <MapPin size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="apla-detalle-item">
              <span className="apla-detalle-item-icon" aria-hidden>
                <User size={16} />
              </span>
              <div className="apla-detalle-item-text">
                <span className="apla-detalle-label">Responsable</span>
                <span className="apla-detalle-value">
                  {area.responsable || "No asignado"}
                </span>
              </div>
            </div>

            <div className="apla-detalle-item">
              <span className="apla-detalle-item-icon" aria-hidden>
                <Phone size={16} />
              </span>
              <div className="apla-detalle-item-text">
                <span className="apla-detalle-label">Contacto</span>
                <span className="apla-detalle-value">
                  {area.telefono || "No registrado"}
                </span>
              </div>
            </div>

            {direccionSeleccionada && (
              <div className="apla-detalle-logo">
                <img src="/logo-bvvm.webp" alt="Logo Cuartel" />
              </div>
            )}

            <div className="apla-detalle-actions modal-buttons">
              <button
                type="button"
                className="btn-eliminar-modal"
                onClick={() => {
                  onClose();
                  navigate(`/editar-area/${area.id}`);
                }}
              >
                Editar
              </button>
              <button type="button" className="btn-cancelar" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>

          {direccionSeleccionada && apiKey && (
            <div className="apla-detalle-mapa">
              <iframe
                className="apla-detalle-iframe"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(
                  direccionSeleccionada
                )}`}
                title={`Mapa de ${direccionSeleccionada}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleArea;
