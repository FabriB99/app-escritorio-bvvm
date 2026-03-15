import React from "react";
import { CornerUpLeft } from "lucide-react";
import "./Header.css";

interface HeaderButton {
  key?: string | number;
  label?: string;
  icon?: React.ElementType;
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  title?: string;
}

interface HeaderProps {
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
          <button className="header-btn-back" onClick={onBack}>
            <CornerUpLeft size={14} />
            Regresar
          </button>
        )}
      </div>

      {/* CENTRO */}
      <div className="header-center">
        <h1 className="header-title">{title}</h1>
        <div className="header-title-underline" />
      </div>

      {/* DERECHA */}
      <div className="header-right">
        {extraButtons.map((btn, i) => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.key ?? i}
              className={`header-btn ${btn.className ?? ""}`}
              onClick={btn.onClick}
              aria-label={btn.ariaLabel || btn.label}
              title={btn.ariaLabel || btn.label}
            >
              {Icon && <Icon size={14} className="btn-icon" />}
              {btn.label && <span className="btn-label">{btn.label}</span>}
            </button>
          );
        })}
      </div>

    </header>
  );
};

export default Header;