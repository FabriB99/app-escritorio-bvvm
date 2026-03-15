// src/pages/AreasProtegidas/ModalDetalleArea.tsx
import React, { useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
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
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<string | null>(null);

  return (
    <div className="apla-modal-overlay">
      <div className={`apla-modal-container ${direccionSeleccionada ? "apla-modal-flex" : ""}`}>
        {/* Botón cerrar arriba a la derecha */}
        <button className="apla-btn-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        {/* Columna izquierda: datos */}
        <div className="apla-modal-content">
          {/* Título fijo arriba de los datos */}
          <h2 className="apla-modal-title">Área Protegida</h2>

          {/* Nombre */}
          <div className="apla-modal-item">
            <span className="apla-modal-item-label">Nombre:</span>
            <span className="apla-modal-item-value">{area.nombre}</span>
          </div>

          {/* Direcciones */}
          <div className="apla-modal-item">
            <span className="apla-modal-item-label">Direcciones:</span>
            <div className="apla-modal-direcciones">
              {(area.direcciones || []).map((dir, idx) => (
                <div key={idx} className="apla-direccion-item">
                  <span>{dir}</span>
                  <button
                    className="apla-btn-mapa"
                    title={`Ver mapa: ${dir}`}
                    onClick={() =>
                      setDireccionSeleccionada(
                        direccionSeleccionada === dir ? null : dir
                      )
                    }
                  >
                    <FaMapMarkerAlt />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Responsable */}
          <div className="apla-modal-item">
            <span className="apla-modal-item-label">Responsable:</span>
            <span className="apla-modal-item-value">
              {area.responsable || "No asignado"}
            </span>
          </div>

          {/* Teléfono */}
          <div className="apla-modal-item">
            <span className="apla-modal-item-label">Teléfono:</span>
            <span className="apla-modal-item-value">
              {area.telefono || "No registrado"}
            </span>
          </div>

          {/* Logo del cuartel, solo si hay mapa */}
          {direccionSeleccionada && (
            <div className="apla-modal-logo">
              <img src="/logo-bvvm.webp" alt="Logo Cuartel" />
            </div>
          )}
        </div>

        {/* Columna derecha: mapa */}
        {direccionSeleccionada && apiKey && (
          <div className="apla-mapa-lateral">
            <iframe
              className="apla-iframe-mapa"
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
  );
};

export default ModalDetalleArea;
