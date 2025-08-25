import { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoBase64 from "../../utils/logoBase64";
import { FiDownload, FiLayers } from "react-icons/fi";
import "./GeneradorInforme.css";
import Header from "../../components/Header";

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

const GeneradorInforme = () => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [revisiones, setRevisiones] = useState<Revision[]>([]);
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obtenerDatos = async () => {
      const unidadesSnapshot = await getDocs(collection(db, "unidades"));
      const unidadesData = unidadesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Unidad[];

      unidadesData.sort((a, b) => {
        const numA = parseInt(a.nombre.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.nombre.replace(/\D/g, "")) || 0;
        return numA - numB;
      });

      const revisionesSnapshot = await getDocs(collection(db, "revisiones"));
      const revisionesData = revisionesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Revision[];

      revisionesData.sort((a, b) => b.fecha?.seconds - a.fecha?.seconds);

      setUnidades(unidadesData);
      setRevisiones(revisionesData);
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

  const generarPDF = async () => {
    if (!previewRef.current) return;

    const tituloPantalla = document.querySelector(".informe-titulo") as HTMLElement;
    const accionesPantalla = document.querySelector(".informe-acciones") as HTMLElement;
    if (tituloPantalla) tituloPantalla.style.display = "none";
    if (accionesPantalla) accionesPantalla.style.display = "none";

    if (headerRef.current) {
      headerRef.current.classList.add("visible", "solo-pdf");
    }

    await new Promise((res) => setTimeout(res, 300));

    const pdf = new jsPDF("portrait", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    let cursorY = margin;
    let pageNumber = 1; // contador manual de páginas

    const fecha = new Date().toLocaleDateString("es-AR");

    // Función para agregar header en cada página
    const addHeader = async () => {
      if (!headerRef.current) return;
      const headerCanvas = await html2canvas(headerRef.current!, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const headerImg = headerCanvas.toDataURL("image/png");
      const headerProps = pdf.getImageProperties(headerImg);
      const headerWidth = pageWidth - margin * 2;
      const headerHeight = (headerProps.height * headerWidth) / headerProps.width;
      pdf.addImage(headerImg, "PNG", margin, cursorY, headerWidth, headerHeight);
      cursorY += headerHeight + 5;
    };

    await addHeader();

    for (let i = 0; i < unidadesFiltradas.length; i++) {
      const unidad = unidadesFiltradas[i];

      const tempDiv = document.createElement("div");
      tempDiv.style.width = previewRef.current!.offsetWidth + "px";
      tempDiv.style.backgroundColor = "#ffffff";
      tempDiv.innerHTML = `
        <div class="informe-unidad-card">
          <div class="informe-unidad-header">
            <h2 class="informe-unidad-nombre">${unidad.nombre}</h2>
            <span class="informe-unidad-tipo">${unidad.tipo} - ${unidad.modelo}</span>
          </div>
          ${revisiones
            .filter((rev) => rev.unidadId === unidad.id)
            .slice(0, 3)
            .map(
              (rev) => `
            <div class="informe-revision-card">
              <p><strong>${new Date(rev.fecha?.seconds * 1000).toLocaleDateString()}</strong></p>
              <p><strong>Bombero:</strong> ${rev.bombero}</p>
              <p><strong>Observaciones:</strong> ${rev.observaciones}</p>
            </div>
          `
            )
            .join("")}
        </div>
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
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      if (cursorY + imgHeight > pageHeight - margin - 10) {
        // nueva página
        pdf.addPage();
        cursorY = margin;
        pageNumber++;
        await addHeader();
      }

      pdf.addImage(imgData, "PNG", margin, cursorY, imgWidth, imgHeight);
      cursorY += imgHeight + 5;

      // Pie de página sutil
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120); // gris suave
      pdf.text(`Página ${pageNumber}`, pageWidth - margin - 6, pageHeight - 6);
    }

    pdf.save(`Informe_Unidades_${fecha}.pdf`);

    if (tituloPantalla) tituloPantalla.style.display = "block";
    if (accionesPantalla) accionesPantalla.style.display = "flex";
    if (headerRef.current) {
      headerRef.current.classList.remove("visible", "solo-pdf");
    }
  };

  return (
    <div className="informe-container">
      <Header
        title="Informe de Unidades"
        extraButtons={[
          {
            label: '',
            icon: FiLayers,
            onClick: () => setModalOpen(true),
            title: 'Seleccionar unidades',
          },
          {
            label: '',
            icon: FiDownload,
            onClick: generarPDF,
            title: 'Generar PDF',
          },
        ]}
      />

      <div ref={previewRef}>
        <div className="informe-pdf-header" ref={headerRef}>
          <div className="informe-header-izquierda">
            <img src={logoBase64} alt="Logo Bomberos" className="informe-logo" />
            <div className="informe-logo-texto">
              <div className="informe-logo-titulo">Bomberos Voluntarios Villa María</div>
              <div className="informe-logo-subtitulo">Sin horarios ni honorarios</div>
            </div>
          </div>
          <div className="informe-header-derecha">
            <h1 className="informe-titulo-pdf">Informe de Unidades</h1>
            <p className="informe-pdf-fecha">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {unidadesFiltradas.map((unidad) => (
          <div key={unidad.id} className="informe-unidad-card">
            <div className="informe-unidad-header">
              <h2 className="informe-unidad-nombre">{unidad.nombre}</h2>
              <span className="informe-unidad-tipo">{unidad.tipo} - {unidad.modelo}</span>
            </div>
            {revisiones
              .filter((rev) => rev.unidadId === unidad.id)
              .slice(0, 3)
              .map((rev, index, arr) => (
                <div key={rev.id}>
                  <div className="informe-revision-card">
                    <p><strong>{new Date(rev.fecha?.seconds * 1000).toLocaleDateString()}</strong></p>
                    <p><strong>Bombero:</strong> {rev.bombero}</p>
                    <p><strong>Observaciones:</strong> {rev.observaciones}</p>
                  </div>
                  {index < arr.length - 1 && <hr className="informe-separador" />}
                </div>
              ))}
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seleccionar Unidades</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneradorInforme;
