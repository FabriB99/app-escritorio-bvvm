import React from 'react';
import './PageLoader.css';

export interface PageLoaderProps {
  texto?: string;
  text?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({ texto, text }) => {
  const displayMessage = texto ?? text ?? 'Cargando...';

  return (
    <div className="page-loader-container" role="status" aria-live="polite">
      <div className="page-loader-spinner" aria-hidden="true" />
      {displayMessage && <span className="page-loader-text">{displayMessage}</span>}
    </div>
  );
};

export default PageLoader;

