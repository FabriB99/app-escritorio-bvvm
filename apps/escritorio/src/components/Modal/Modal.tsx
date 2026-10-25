import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  zIndex?: number;
  className?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen = true,
  onClose,
  title,
  maxWidth = '560px',
  zIndex = 9999,
  className,
  headerAction,
  children,
}) => {
  // Manejo de la tecla Escape para cerrar el modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal-solido-container ${className || ''}`.trim()}
        style={{ maxWidth }}
      >
        <div className="modal-solido-header">
          <h3 className="modal-solido-title">{title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {headerAction}
            <button
              type="button"
              className="btn-icon-close"
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="modal-solido-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
