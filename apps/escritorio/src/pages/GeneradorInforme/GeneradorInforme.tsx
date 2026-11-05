import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoBase64 from "../../utils/logoBase64";
import { Download, Layers } from "lucide-react";
import { toast } from "sonner";
import Header from "../../components/Header";
import "./GeneradorInforme.css";

interface Unidad {
  id: string;
  nombre: string;
  tipo: string;
  modelo: string;
  estado: string;
  combustible: string;
  kilometraje: string;
  patente: string;
}

interface Revision {
  id: string;
  unidadId: string;
  bombero: string;
  fecha: any;
  observaciones: string;
}

// 🏷️ Helper para limpiar observaciones y normalizar "Sin novedades"
function limpiarObservacion(obs?: string): string {
  if (!obs) return "Sin novedades";
  const trimmed = obs.trim();
  const lower = trimmed.toLowerCase();

  const soloAlfanumericos = trimmed.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, "");
  if (
    trimmed === "." ||
    trimmed === "-" ||
    trimmed === "_" ||
    lower === "s/n" ||
    lower === "sn" ||
    lower === "sin novedad" ||
    lower === "sin novedades" ||
    lower === "ninguna" ||
    lower === "ninguno" ||
    soloAlfanumericos.length < 2
  ) {
    return "Sin novedades";
  }
  return trimmed;
}

// 📅 Helper para formatear fecha en formato es-AR (DD/MM/YYYY)
function formatearFecha(fecha: any): string {
  if (!fecha) return "--/--/----";
  let d: Date;
  if (fecha?.seconds) {
    d = new Date(fecha.seconds * 1000);
  } else if (fecha?.toDate) {
    d = fecha.toDate();
  } else if (fecha instanceof Date) {
    d = fecha;
  } else {
    d = new Date(fecha);
  }
  if (isNaN(d.getTime())) return "--/--/----";

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

const GeneradorInforme = () => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [revisiones, setRevisiones] = useState<Revision[]>([]);
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const unidadesSnapshot = await getDocs(collection(db, "unidades"));
        const unidadesData = unidadesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Unidad[];

        unidadesData.sort((a, b) => {
          const numA = parseInt(a.nombre.replace(/\D/g, ""), 10) || 0;
          const numB = parseInt(b.nombre.replace(/\D/g, ""), 10) || 0;
          return numA - numB;
        });

        const revisionesSnapshot = await getDocs(collection(db, "revisiones"));
        const revisionesData = revisionesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Revision[];

        revisionesData.sort((a, b) => {
          const timeA = a.fecha?.seconds ? a.fecha.seconds * 1000 : new Date(a.fecha).getTime() || 0;
          const timeB = b.fecha?.seconds ? b.fecha.seconds * 1000 : new Date(b.fecha).getTime() || 0;
          return timeB - timeA;
        });

        setUnidades(unidadesData);
        setRevisiones(revisionesData);
      } catch (error) {
        console.error("Error al cargar datos para el informe:", error);
        toast.error("Error al cargar datos de unidades y revisiones");
      }
    };

    obtenerDatos();
  }, []);

  const toggleUnidadSeleccionada = (id: string) => {
    setSelectedUnidades((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const unidadesFiltradas = selectedUnidades.length
    ? unidades.filter((u) => selectedUnidades.includes(u.id))
    : unidades;

  // 🖨️ Generación de PDF en A4 institucional con ancho fijo de 794px
  const generarPDF = async () => {
    if (generandoPdf) return;
    setGenerandoPdf(true);
    toast.loading("Generando informe institucional PDF...", { id: "generar-pdf" });

    try {
      const fechaEmision = formatearFecha(new Date());
      const fechaArchivo = fechaEmision.replace(/\//g, "-");

      const pdf = new jsPDF("portrait", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 12; // 12mm márgenes laterales
      const headerWidth = pageWidth - margin * 2; // 186mm área imprimible
      const marginBottom = 14;
      let cursorY = margin;
      let pageNumber = 1;

      // Renderizar el encabezado institucional dedicado a 794px (A4 a 96 DPI)
      const renderHeaderCanvas = async () => {
        const headerDiv = document.createElement("div");
        headerDiv.style.width = "794px";
        headerDiv.style.padding = "16px 20px 14px 20px";
        headerDiv.style.boxSizing = "border-box";
        headerDiv.style.backgroundColor = "#ffffff";
        headerDiv.style.borderBottom = "2.5px solid #1e293b";
        headerDiv.style.display = "flex";
        headerDiv.style.alignItems = "center";
        headerDiv.style.justifyContent = "space-between";
        headerDiv.style.fontFamily = "'Poppins', sans-serif";

        headerDiv.innerHTML = `
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${logoBase64}" style="width: 54px; height: auto; object-fit: contain;" />
            <div>
              <div style="font-size: 16px; font-weight: 800; color: #1e293b; letter-spacing: 0.5px;">BOMBEROS VOLUNTARIOS VILLA MARÍA</div>
              <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-top: 2px;">Informe de Estado y Revisiones de Flota</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de emisión</div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${fechaEmision}</div>
          </div>
        `;

        document.body.appendChild(headerDiv);
        const canvas = await html2canvas(headerDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        document.body.removeChild(headerDiv);

        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        const headerHeight = (imgProps.height * headerWidth) / imgProps.width;
        return { imgData, headerHeight };
      };

      const { imgData: headerImgData, headerHeight } = await renderHeaderCanvas();

      const addHeaderToPage = () => {
        pdf.addImage(headerImgData, "PNG", margin, cursorY, headerWidth, headerHeight);
        cursorY += headerHeight + 5;
      };

      const addFooterToPage = (numPagina: number) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          `Bomberos Voluntarios Villa María — Página ${numPagina}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: "center" }
        );
      };

      // Encabezado en la primera página
      addHeaderToPage();

      for (let i = 0; i < unidadesFiltradas.length; i++) {
        const unidad = unidadesFiltradas[i];
        const revisionesUnidad = revisiones
          .filter((rev) => rev.unidadId === unidad.id)
          .slice(0, 3);

        const subtituloUnidad = [unidad.tipo, unidad.modelo].filter(Boolean).join(" · ") || "Unidad Operativa";

        const tempDiv = document.createElement("div");
        tempDiv.style.width = "794px";
        tempDiv.style.backgroundColor = "#ffffff";
        tempDiv.style.boxSizing = "border-box";
        tempDiv.style.padding = "0 0 10px 0";
        tempDiv.style.fontFamily = "'Poppins', sans-serif";

        let filasHtml = "";
        if (revisionesUnidad.length === 0) {
          filasHtml = `
            <tr>
              <td colspan="3" style="padding: 13px 12px; text-align: center; color: #94a3b8; font-style: italic; font-size: 11.5px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
                Sin revisiones registradas recientemente
              </td>
            </tr>
          `;
        } else {
          filasHtml = revisionesUnidad
            .map((rev, index) => {
              const obsLimpia = limpiarObservacion(rev.observaciones);
              const esSinNovedad = obsLimpia === "Sin novedades";
              const bgFila = index % 2 === 0 ? "#ffffff" : "#f8fafc";
              const estiloObs = esSinNovedad
                ? "color: #94a3b8; font-style: italic; font-size: 11.5px;"
                : "color: #1e293b; font-weight: 600; font-size: 12px;";

              return `
                <tr style="background-color: ${bgFila}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 9px 12px; width: 15%; font-weight: 600; color: #334155; font-size: 11.5px; border-left: 1px solid #e2e8f0;">
                    ${formatearFecha(rev.fecha)}
                  </td>
                  <td style="padding: 9px 12px; width: 35%; color: #475569; font-size: 12px; font-weight: 500;">
                    ${rev.bombero || "Sin especificar"}
                  </td>
                  <td style="padding: 9px 12px; width: 50%; ${estiloObs} border-right: 1px solid #e2e8f0;">
                    ${obsLimpia}
                  </td>
                </tr>
              `;
            })
            .join("");
        }

        tempDiv.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; box-sizing: border-box; margin-bottom: 6px;">
            <thead>
              <tr style="background-color: #1e293b; color: #ffffff;">
                <th colspan="3" style="padding: 9px 14px; text-align: left; border-radius: 6px 6px 0 0;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">${unidad.nombre}</span>
                    <span style="font-size: 11.5px; font-weight: 500; color: #cbd5e1;">${subtituloUnidad}</span>
                  </div>
                </th>
              </tr>
              <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                <th style="padding: 7px 12px; width: 15%; text-align: left; font-weight: 700;">Fecha</th>
                <th style="padding: 7px 12px; width: 35%; text-align: left; font-weight: 700;">Responsable/s</th>
                <th style="padding: 7px 12px; width: 50%; text-align: left; font-weight: 700;">Observaciones / Novedades</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
        `;

        document.body.appendChild(tempDiv);
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        document.body.removeChild(tempDiv);

        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * headerWidth) / imgProps.width;

        // Comprobar salto de página si excede el alto imprimible
        if (cursorY + imgHeight > pageHeight - marginBottom - 6) {
          addFooterToPage(pageNumber);
          pdf.addPage();
          pageNumber++;
          cursorY = margin;
          addHeaderToPage();
        }

        pdf.addImage(imgData, "PNG", margin, cursorY, headerWidth, imgHeight);
        cursorY += imgHeight + 4;
      }

      // Pie de página de la última página
      addFooterToPage(pageNumber);

      pdf.save(`Informe_Unidades_Bomberos_${fechaArchivo}.pdf`);
      toast.success("Informe PDF descargado correctamente", { id: "generar-pdf" });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Ocurrió un error al generar el PDF", { id: "generar-pdf" });
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="informe-container">
      <Header
        title="Informe de Unidades"
        extraButtons={[
          {
            label: "Filtrar unidades",
            icon: Layers,
            onClick: () => setModalOpen(true),
            title: "Seleccionar unidades",
          },
          {
            label: generandoPdf ? "Generando..." : "Descargar PDF",
            icon: Download,
            onClick: generarPDF,
            title: "Generar PDF institucional",
          },
        ]}
      />

      {/* Grilla principal de tarjetas en pantalla */}
      <div className="informe-unidades-grid">
        {unidadesFiltradas.map((unidad) => {
          const revisionesUnidad = revisiones
            .filter((rev) => rev.unidadId === unidad.id)
            .slice(0, 3);

          const subtitulo = [unidad.tipo, unidad.modelo].filter(Boolean).join(" · ") || "Unidad Operativa";

          return (
            <div key={unidad.id} className="informe-unidad-card">
              <div className="informe-unidad-header">
                <h2 className="informe-unidad-nombre">{unidad.nombre}</h2>
                <span className="informe-unidad-tipo">{subtitulo}</span>
              </div>

              <div className="informe-revisiones-lista">
                {revisionesUnidad.length === 0 ? (
                  <div className="informe-sin-revisiones">
                    Sin revisiones registradas recientemente
                  </div>
                ) : (
                  revisionesUnidad.map((rev) => {
                    const obsLimpia = limpiarObservacion(rev.observaciones);
                    const esSinNovedad = obsLimpia === "Sin novedades";
                    const bomberoNombre = rev.bombero || "Sin especificar";

                    return (
                      <div key={rev.id} className="informe-revision-fila">
                        <div className="informe-revision-top">
                          <span className="informe-fecha-badge">
                            {formatearFecha(rev.fecha)}
                          </span>
                          <span className="informe-bombero-nombre">
                            {bomberoNombre}
                          </span>
                        </div>
                        <p
                          className={`informe-observacion-texto ${
                            esSinNovedad ? "sin-novedad" : "con-novedad"
                          }`}
                        >
                          {obsLimpia}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de selección de unidades */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seleccionar Unidades</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {unidades.map((unidad) => (
                <div
                  key={unidad.id}
                  className={`unidad-item ${selectedUnidades.includes(unidad.id) ? "activa" : "inactiva"}`}
                  onClick={() => toggleUnidadSeleccionada(unidad.id)}
                >
                  {unidad.nombre}
                </div>
              ))}
              <div
                className={`unidad-item ${selectedUnidades.length === unidades.length ? "activa" : "inactiva"} todas`}
                onClick={() => {
                  if (selectedUnidades.length === unidades.length) {
                    setSelectedUnidades([]);
                  } else {
                    setSelectedUnidades(unidades.map((u) => u.id));
                  }
                }}
              >
                Todas
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-aplicar"
                onClick={() => setModalOpen(false)}
              >
                Cerrar / Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneradorInforme;
