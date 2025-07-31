import { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../app/firebase-config";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoBase64 from "../../utils/logoBase64";
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

const GeneradorInforme = () => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [revisiones, setRevisiones] = useState<Revision[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
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

  const generarPDF = async () => {
    if (!previewRef.current) return;

    if (headerRef.current) {
      headerRef.current.classList.add("visible", "solo-pdf");
    }

    if (botonRef.current) {
      botonRef.current.style.display = "none";
    }

    // Ocultar título que no queremos en el PDF
    const tituloPantalla = document.querySelector(".informe-titulo") as HTMLElement;
    if (tituloPantalla) {
      tituloPantalla.style.display = "none";
    }

    await new Promise((res) => setTimeout(res, 300));

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.8);

    // Crear el objeto jsPDF pero sin especificar la altura
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [210, canvas.height * (210 / canvas.width)], // Ancho fijo A4, pero altura dinámica
    });

    // Asegurarse de que el contenido cabe correctamente
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // Agregar la imagen completa al PDF
    pdf.addImage(imgData, "PNG", 10, 10, pdfWidth, pdfHeight);

    // Guardar el PDF con el nombre de archivo
    const fecha = new Date().toLocaleDateString("es-AR");
    pdf.save(`Informe Unidades - ${fecha}.pdf`);

    // Restaurar los elementos ocultos
    if (headerRef.current) {
      headerRef.current.classList.remove("visible", "solo-pdf");
    }

    if (botonRef.current) {
      botonRef.current.style.display = "block";
    }

    if (tituloPantalla) {
      tituloPantalla.style.display = "block";
    }
  };

  return (
    <div className="informe-container">
      <div ref={previewRef}>
        {/* Header visible solo en PDF */}
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

        {/* Título solo para pantalla */}
        <h1 className="informe-titulo">Informe de Unidades</h1>

        {unidades.map((unidad) => (
          <div key={unidad.id} className="informe-unidad-card">
            <div className="informe-unidad-header">
              <h2 className="informe-unidad-nombre">{unidad.nombre}</h2>
              <span className="informe-unidad-tipo">
                {unidad.tipo} - {unidad.modelo}
              </span>
            </div>

            {revisiones
              .filter((rev) => rev.unidadId === unidad.id)
              .slice(0, 3) // Solo las últimas 3
              .map((rev, index, arr) => (
                <div key={rev.id}>
                  <div className="informe-revision-card">
                    <p>
                      <strong>
                        {new Date(rev.fecha?.seconds * 1000).toLocaleDateString()}
                      </strong>
                    </p>
                    <p>
                      <strong>Bombero:</strong> {rev.bombero}
                    </p>
                    <p>
                      <strong>Observaciones:</strong> {rev.observaciones}
                    </p>
                  </div>
                  {index < arr.length - 1 && <hr className="informe-separador" />}
                </div>
              ))}
          </div>
        ))}
      </div>

      <button
        className="informe-btn-descargar"
        onClick={generarPDF}
        ref={botonRef}
      >
        Descargar PDF
      </button>
    </div>
  );
};

export default GeneradorInforme;
