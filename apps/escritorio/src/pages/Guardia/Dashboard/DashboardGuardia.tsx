// src/pages/Guardia/Dashboard/DashboardGuardia.tsx
import React from 'react';
import Header from '../../../components/Header';
import WidgetNovedades from './WidgetNovedades';
import WidgetElementosPendientes from './WidgetElementosPendientes';
import WidgetClima from './WidgetClima';
import './DashboardGuardia.css';

const DashboardGuardia: React.FC = () => {
  return (
    <div className="dashboard-page-wrapper">
      <Header title="Dashboard de Guardia" extraButtons={[]} />
      
      {/* Todo vuelve a la grilla estándar. Novedades tiene prioridad 1 */}
      <div className="dashboard-container">
        <WidgetNovedades />
        <WidgetElementosPendientes />
        <WidgetClima />
      </div>
      
    </div>
  );
};

export default DashboardGuardia;