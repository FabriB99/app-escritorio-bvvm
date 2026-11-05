// src/pages/Guardia/Dashboard/DashboardGuardia.tsx
import React from 'react';
import Header from '../../../components/Header';
import WidgetSalidasActivas from './WidgetSalidasActivas';
import WidgetNovedades from './WidgetNovedades';
import WidgetElementosPendientes from './WidgetElementosPendientes';
import WidgetClima from './WidgetClima';
import './DashboardGuardia.css';

const DashboardGuardia: React.FC = () => {
  return (
    <div className="dashboard-page-wrapper">
      <Header title="Dashboard de Guardia" extraButtons={[]} />
      
      <div className="dashboard-container">
        <div className="dashboard-col-main">
          <WidgetSalidasActivas />
          <WidgetNovedades />
        </div>
        <div className="dashboard-col-side">
          <WidgetElementosPendientes />
          <WidgetClima />
        </div>
      </div>
    </div>
  );
};

export default DashboardGuardia;