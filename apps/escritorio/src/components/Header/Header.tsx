import React from "react";
import { CornerUpLeft } from "lucide-react";
import "./Header.css";

export interface HeaderButton {
  key?: string | number;
  label?: string;
  icon?: React.ElementType;
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  title?: string;
  disabled?: boolean;
}

export interface HeaderProps {
  title: string;
  onBack?: () => void;
  extraButtons?: HeaderButton[];
}

const Header: React.FC<HeaderProps> = ({ title, onBack, extraButtons = [] }) => {
  return (
    <header className="app-header">

      {/* IZQUIERDA */}
      <div className="header-left">
        {onBack && (
          <button
            type="button"
            className="header-btn-back"
            onClick={onBack}
            aria-label="Regresar"
          >
            {/* Tamaño del ícono “Regresar”: mismo valor que <Icon size={…} /> abajo */}
            <CornerUpLeft size={16} strokeWidth={2} aria-hidden />
            <span className="header-btn-back-text">Regresar</span>
          </button>
        )}
      </div>

      {/* CENTRO */}
      <div className="header-center">
        <h1 className="header-title">{title}</h1>
      </div>

      {/* DERECHA */}
      <div className="header-right">
        {extraButtons.map((btn, i) => {
          const Icon = btn.icon;
          return (
            <button
              type="button"
              key={btn.key ?? i}
              className={`header-btn ${btn.className ?? ""}`}
              onClick={btn.onClick}
              disabled={btn.disabled}
              aria-label={btn.ariaLabel || btn.label}
              title={btn.title ?? btn.ariaLabel ?? btn.label}
            >
              {Icon && <Icon size={16} className="btn-icon" />}{/* tamaño íconos acciones */}
              {btn.label && <span className="btn-label">{btn.label}</span>}
            </button>
          );
        })}
      </div>

    </header>
  );
};

export default Header;