// src/components/ExportarExcel.tsx
import React from 'react';
import * as XLSX from 'xlsx';

interface UnidadData {
  id: string;
  nombre: string;
  tipo: string;
  modelo: string;
  patente: string;
  estado: string;
  // Aquí podrías agregar más campos si los necesitas en el resumen
}

interface ElementoData {
  nombre: string;
  cantidad: string;
  estado: string;
  unidadNombre: string; // Para vincularlo a la unidad en la hoja 2
}

interface ExportarExcelProps {
  unidades: UnidadData[];
  elementosPorUnidad: Record<string, ElementoData[]>; // Clave: unidad.id, Valor: array de elementos
  claseBoton?: string; // Opcional: para usar tus estilos existentes si los tienes
}

const ExportarExcel: React.FC<ExportarExcelProps> = ({ 
  unidades, 
  elementosPorUnidad,
  claseBoton = ""
}) => {

  const handleExport = () => {
    // 1. Crear un nuevo libro de trabajo
    const wb = XLSX.utils.book_new();

    // --- HOJA 1: Resumen de Unidades ---
    const datosResumen = unidades.map(u => ({
      'ID': u.id,
      'Nombre': u.nombre,
      'Tipo': u.tipo,
      'Modelo': u.modelo,
      'Patente': u.patente,
      'Estado': u.estado
    }));

    const wsResumen = XLSX.utils.json_to_sheet(datosResumen);
    
    // Ajustar ancho de columnas para mejor lectura
    const wsResumenAjuste = { 
      '!cols': [
        { wch: 10 }, // ID
        { wch: 20 }, // Nombre
        { wch: 25 }, // Tipo
        { wch: 15 }, // Modelo
        { wch: 15 }, // Patente
        { wch: 15 }, // Estado
      ] 
    };
    wsResumen['!cols'] = wsResumenAjuste['!cols'];

    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Unidades");

    // --- HOJA 2: Inventario Detallado ---
    // Aplanamos la estructura jerárquica: una fila por cada elemento de cada unidad
    const datosInventario: any[] = [];

    unidades.forEach(unidad => {
      const elementos = elementosPorUnidad[unidad.id] || [];
      
      elementos.forEach(elem => {
        datosInventario.push({
          'ID Unidad': unidad.id,
          'Nombre Unidad': unidad.nombre,
          'Elemento': elem.nombre,
          'Cantidad': elem.cantidad,
          'Estado': elem.estado
        });
      });
    });

    const wsInventario = XLSX.utils.json_to_sheet(datosInventario);
    
    // Ajustar ancho de columnas
    const wsInventarioAjuste = {
      '!cols': [
        { wch: 10 }, // ID Unidad
        { wch: 20 }, // Nombre Unidad
        { wch: 30 }, // Elemento
        { wch: 10 }, // Cantidad
        { wch: 15 }, // Estado
      ]
    };
    wsInventario['!cols'] = wsInventarioAjuste['!cols'];

    XLSX.utils.book_append_sheet(wb, wsInventario, "Inventario Detallado");

    // 3. Generar y descargar el archivo
    XLSX.writeFile(wb, `Inventario_Unidades_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <button 
      onClick={handleExport}
      className={`btn-exportar-excel ${claseBoton}`}
      style={{
        backgroundColor: '#2e8b57', // Verde para indicar éxito/exportación
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'background 0.2s',
        fontSize: '14px'
      }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#246b43')}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2e8b57')}
    >
      {/* Icono simple de Excel (SVG inline) */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      Exportar a Excel
    </button>
  );
};

export default ExportarExcel;
