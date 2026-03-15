// src/pages/Admin/PanelAdmin.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaIdCard, FaClipboardList } from 'react-icons/fa';
import Header from "../../components/Header";
import './PanelAdmin.css'; // CSS nuevo basado en tu estilo de biblioteca

const PanelAdmin: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="panel-admin__contenedor-principal">
      <Header title="Panel de Admin" />

      <main className="panel-admin__grid">
        <div
          className="panel-admin__card"
          onClick={() => navigate('/admin/identidades')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/identidades'); }}
        >
          <FaIdCard className="panel-admin__icono" />
          <h3>Gestión de Usuarios</h3>
          <p>Crear, editar y asignar PINs a usuarios.</p>
        </div>

        <div
          className="panel-admin__card"
          onClick={() => navigate('/admin/auditoria')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/aauditoria'); }}
        >
          <FaClipboardList className="panel-admin__icono" />
          <h3>Auditoría</h3>
          <p>Registros de acciones.</p>
        </div>

        {/* Podés agregar más tarjetas en el futuro */}
      </main>
    </div>
  );
};

export default PanelAdmin;
