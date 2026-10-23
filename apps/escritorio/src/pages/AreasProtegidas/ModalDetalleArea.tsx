// src/pages/AreasProtegidas/ModalDetalleArea.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  MapPin,
  Phone,
  User,
  Pencil,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
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
  puedeEditar?: boolean;
}

/** Completa la dirección con la localidad para que Google Maps geolocalice con precisión. */
const armarQueryMapa = (direccion: string): string =>
  /villa mar[ií]a/i.test(direccion)
    ? direccion
    : `${direccion}, Villa María, Córdoba, Argentina`;

const ModalDetalleArea: React.FC<Props> = ({ area, onClose, puedeEditar = false }) => {
  const navigate = useNavigate();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const direcciones = Array.isArray(area.direcciones) ? area.direcciones.filter(Boolean) : [];

  // Mapa activo por defecto con la primera dirección
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<string | null>(
    direcciones[0] || null
  );

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const copiarTelefono = async () => {
    if (!area.telefono) return;
    try {
      await navigator.clipboard.writeText(area.telefono);
      toast.success("Teléfono copiado");
    } catch {
      toast.error("No se pudo copiar el teléfono");
    }
  };

  const abrirEnNavegador = (dir: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      armarQueryMapa(dir)
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const queryCompleta = direccionSeleccionada ? armarQueryMapa(direccionSeleccionada) : "";
  const mapaSrc = direccionSeleccionada
    ? apiKey
      ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(queryCompleta)}`
      : `https://maps.google.com/maps?q=${encodeURIComponent(queryCompleta)}&t=&z=16&ie=UTF8&iwloc=&output=embed`
    : "";

  return (
    <div className="mda-overlay" role="presentation" onClick={onClose}>
      <div
        className="mda-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mda-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <header className="mda-header">
          <div className="mda-header-info">
            <span className="mda-header-icon">
              <Building2 size={20} />
            </span>
            <div className="mda-header-text">
              <h2 id="mda-title" className="mda-title">
                {area.nombre}
              </h2>
              <p className="mda-subtitle">
                Ficha de Área Protegida · Datos operativos y geolocalización
              </p>
            </div>
          </div>
          <button
            type="button"
            className="mda-close-btn"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </header>

        {/* Cuerpo en 2 columnas */}
        <div className={`mda-body ${!direccionSeleccionada ? "mda-body--single" : ""}`}>
          {/* Columna Izquierda: Datos */}
          <div className="mda-col-datos">
            {/* Grilla superior de contacto */}
            <div className="mda-contacto-grid">
              <div className="mda-contacto-card">
                <span className="mda-card-icon">
                  <User size={16} />
                </span>
                <div className="mda-card-text">
                  <span className="mda-card-label">Responsable</span>
                  <span className={`mda-card-value ${!area.responsable ? "mda-card-value--muted" : ""}`}>
                    {area.responsable || "No asignado"}
                  </span>
                </div>
              </div>

              <div className="mda-contacto-card">
                <span className="mda-card-icon">
                  <Phone size={16} />
                </span>
                <div className="mda-card-text">
                  <span className="mda-card-label">Teléfono</span>
                  <span className={`mda-card-value ${!area.telefono ? "mda-card-value--muted" : ""}`}>
                    {area.telefono || "No registrado"}
                  </span>
                </div>
                {area.telefono && (
                  <button
                    type="button"
                    className="mda-action-icon-btn"
                    onClick={copiarTelefono}
                    title="Copiar teléfono"
                    aria-label="Copiar teléfono"
                  >
                    <Copy size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Sección de Sedes / Direcciones */}
            <section className="mda-direcciones-seccion">
              <div className="mda-seccion-head">
                <MapPin size={14} className="mda-seccion-icon" />
                <span className="mda-seccion-titulo">UBICACIONES REGISTRADAS</span>
                <span className="mda-count-badge">{direcciones.length}</span>
              </div>

              {direcciones.length === 0 ? (
                <p className="mda-empty-text">Sin direcciones registradas</p>
              ) : (
                <div className="mda-direcciones-lista">
                  {direcciones.map((dir, idx) => {
                    const activa = direccionSeleccionada === dir;
                    return (
                      <div
                        key={`${dir}-${idx}`}
                        className={`mda-direccion-row ${activa ? "activa" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDireccionSeleccionada(dir)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDireccionSeleccionada(dir);
                          }
                        }}
                      >
                        <span className="mda-dir-index">{idx + 1}</span>
                        <span className="mda-dir-text">{dir}</span>

                        {activa && (
                          <span className="mda-dir-badge-activo">En mapa</span>
                        )}

                        <button
                          type="button"
                          className="mda-action-icon-btn"
                          title="Abrir en Google Maps"
                          aria-label={`Abrir ${dir} en Google Maps`}
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirEnNavegador(dir);
                          }}
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Columna Derecha: Mapa */}
          {direccionSeleccionada && (
            <div className="mda-col-mapa">
              <div className="mda-mapa-bar">
                <MapPin size={13} className="mda-mapa-bar-icon" />
                <span className="mda-mapa-bar-text" title={direccionSeleccionada}>
                  {direccionSeleccionada}
                </span>
              </div>
              <iframe
                key={queryCompleta}
                className="mda-mapa-iframe"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapaSrc}
                title={`Mapa de ${direccionSeleccionada}`}
              />
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <footer className="mda-footer">
          <button type="button" className="mda-btn mda-btn--secondary" onClick={onClose}>
            Cerrar
          </button>
          {puedeEditar && (
            <button
              type="button"
              className="mda-btn mda-btn--primary"
              onClick={() => {
                onClose();
                navigate(`/editar-area/${area.id}`);
              }}
            >
              <Pencil size={14} />
              Editar datos
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ModalDetalleArea;
