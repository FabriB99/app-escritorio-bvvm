import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface LegajoCompleto {
  datosPersonales: Record<string, any>;
  datosInstitucionales: Record<string, any>;
  ascensos: any[];
  condecoraciones: any[];
  sanciones: any[];
  cursos: any[];
  observaciones: string;
}

export const generarLegajoPDF = async (
  legajo: LegajoCompleto,
  tabsIds: string[]
) => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  const capturarElemento = async (el: HTMLElement) => {
    return await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });
  };

  const encabezado = document.querySelector(".legajo-header") as HTMLElement;
  const datosGrid = document.querySelector(".datos-grid") as HTMLElement;
  if (!encabezado || !datosGrid) throw new Error("Elementos principales no encontrados");

  const canvasHeader = await capturarElemento(encabezado);
  const canvasDatos = await capturarElemento(datosGrid);

  const headerImg = canvasHeader.toDataURL("image/jpeg", 0.85);
  const datosImg = canvasDatos.toDataURL("image/jpeg", 0.85);

  const headerRatio = canvasHeader.width / canvasHeader.height;
  const datosRatio = canvasDatos.width / canvasDatos.height;

  const headerHeight = (pageWidth - 2 * margin) / headerRatio;
  const datosHeight = (pageWidth - 2 * margin) / datosRatio;

  pdf.addImage(headerImg, "JPEG", margin, margin, pageWidth - 2 * margin, headerHeight);

  let yOffset = margin + headerHeight + 8;
  pdf.addImage(datosImg, "JPEG", margin, yOffset, pageWidth - 2 * margin, datosHeight);
  yOffset += datosHeight + 10;

  const tabsLabels: Record<string, string> = {
    ascensos: "Historial de ascensos",
    condecoraciones: "Condecoraciones",
    sanciones: "Sanciones / Llamados de atención",
    cursos: "Cursos",
    observaciones: "Observaciones",
    elementos: "Elementos Entregados",
  };

  for (const id of tabsIds) {
    const section = document.getElementById(id);
    if (!section) continue;

    const titulo = tabsLabels[id] || id;

    // Configurar estilo: negrita, tamaño 11, color gris oscuro
    pdf.setFont("helvetica", "bold"); // Simula Poppins bold
    pdf.setFontSize(11);
    pdf.setTextColor(44, 62, 80); // Gris oscuro

    // Si no entra el título + contenido, salto de página
    const espacioTitulo = 5;
    const canvasTab = await capturarElemento(section);
    const tabImg = canvasTab.toDataURL("image/jpeg", 0.85);
    const tabRatio = canvasTab.width / canvasTab.height;
    const tabHeight = (pageWidth - 2 * margin) / tabRatio;

    if (yOffset + espacioTitulo + tabHeight > pageHeight - margin) {
      pdf.addPage();
      yOffset = margin;
    }

    // Dibujar título
    pdf.text(titulo, margin, yOffset);
    yOffset += 2; // espacio bien pegado al bloque

    // Dibujar imagen de la tab
    pdf.addImage(tabImg, "JPEG", margin, yOffset, pageWidth - 2 * margin, tabHeight);
    yOffset += tabHeight + 10;
  }

  const nombreArchivo = `Legajo-${legajo.datosPersonales.apellido}-${legajo.datosPersonales.nombre}.pdf`;
  pdf.save(nombreArchivo);
};
