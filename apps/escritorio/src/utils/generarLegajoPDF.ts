// src/utils/generarLegajoPDF.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface HijoPDF {
  nombre: string;
  dni: string;
  fechaNacimiento: string;
  localidad: string;
}

export interface LegajoPDFData {
  datosPersonales: {
    apellido: string;
    nombre: string;
    dni?: string;
    fechaNacimiento?: string;
    grupoSanguineo?: string;
    domicilio?: string;
    ciudad?: string;
    domicilioLaboral?: string;
    obraSocial?: string;
    carnetConducir?: string;
    altura?: number | string;
    peso?: number | string;
    estadoCivil?: string;
    conyuge?: string;
    dniConyuge?: string;
    fotoUrl?: string;
    hijos?: HijoPDF[];
  };
  datosInstitucionales: {
    numeroLegajo?: number | string;
    numeroLegajoFederacion?: number | string;
    numeroLegajoRUBA?: number | string;
    fechaIngreso?: string;
    grado?: string;
    cargo?: string;
    cargoRegional?: string;
    cargoProvincial?: string;
    cargoNacional?: string;
    fechaUltimoAscenso?: string;
    estado?: string;
    reingreso?: string;
    fechaReingreso?: string;
  };
  ascensos?: { fecha: string; grado: string; resolucion?: string; observaciones?: string }[];
  condecoraciones?: { fecha: string; tipo: string; motivo: string; observaciones?: string }[];
  sanciones?: { fecha: string; tipo: string; motivo: string; observaciones?: string }[];
  cursos?: { fecha: string; tipo: string; nombre: string; observaciones?: string }[];
  observaciones?: { fecha: string; motivo: string; observacion: string }[];
}

// ─── [AJUSTE MANUAL: Paleta de Colores RGB] ─────────────────────────────────
// Podés modificar los valores [R, G, B] (0 a 255) para cambiar los tonos del PDF:
type RGB = [number, number, number];
const COLOR_SIDEBAR: RGB = [44, 62, 80];        // #2c3e50 -> Azul institucional (Fondo de tarjeta y títulos)
const COLOR_SIDEBAR_DARK: RGB = [31, 45, 58];   // #1f2d3a -> Fondo oscuro para placeholder sin foto
// const COLOR_ACCENT: RGB = [230, 57, 70];     // #e63946 -> Rojo bomberos (opcional para acentos)
const TEXTO: RGB = [30, 41, 59];                // #1e293b -> Color de texto principal de los datos
const TEXTO_MUTED: RGB = [148, 163, 184];       // #94a3b8 -> Gris suave para etiquetas/labels
const TEXTO_MUTED_LIGHT: RGB = [203, 213, 225]; // #cbd5e1 -> Gris claro para subinformación en fondo oscuro
const BORDE_LINEA: RGB = [240, 242, 245];       // #f0f2f5 -> Líneas divisorias entre renglones
const BORDE_SUAVE: RGB = [226, 232, 240];       // #e2e8f0 -> Bordes estructurales
const FONDO_ITEM: RGB = [248, 249, 250];        // #f8f9fa -> Fondo para filas alternadas o tablas

// ─── Helpers de imagen ──────────────────────────────────────────────────────

// Convierte una URL a Data URL (evita problemas de CORS / canvas tainted)
const cargarImagenBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const cargarElementoImagen = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/**
 * Recorta la imagen tipo "object-fit: cover" a la proporción indicada y la
 * devuelve como JPEG. Así la foto carnet nunca se deforma.
 */
const recortarCover = async (src: string, ratio: number): Promise<string | null> => {
  const img = await cargarElementoImagen(src);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const imgRatio = img.naturalWidth / img.naturalHeight;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (imgRatio > ratio) sw = sh * ratio; // sobra ancho
  else sh = sw / ratio;                  // sobra alto
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;

  const outH = Math.min(700, Math.round(sh));
  const outW = Math.round(outH * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Redondear suavemente las aristas de la foto
  const r = Math.round(outW * 0.07);
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(0, 0, outW, outH, r);
  } else {
    ctx.moveTo(r, 0);
    ctx.lineTo(outW - r, 0);
    ctx.quadraticCurveTo(outW, 0, outW, r);
    ctx.lineTo(outW, outH - r);
    ctx.quadraticCurveTo(outW, outH, outW - r, outH);
    ctx.lineTo(r, outH);
    ctx.quadraticCurveTo(0, outH, 0, outH - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
  }
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  return canvas.toDataURL("image/png");
};

/** Normaliza cualquier imagen (png/webp/etc.) a PNG y devuelve sus dimensiones. */
const normalizarPNG = async (
  src: string
): Promise<{ data: string; w: number; h: number } | null> => {
  const img = await cargarElementoImagen(src);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return { data: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight };
};

/** Reduce el tamaño de fuente hasta que el texto entre en el ancho disponible. */
const ajustarFuente = (doc: jsPDF, texto: string, maxWidth: number, size: number, min: number) => {
  let s = size;
  doc.setFontSize(s);
  while (s > min && doc.getTextWidth(texto) > maxWidth) {
    s -= 0.5;
    doc.setFontSize(s);
  }
  return s;
};

const lastY = (doc: jsPDF): number => (doc as any).lastAutoTable?.finalY ?? 0;

// ─── Generador ──────────────────────────────────────────────────────────────

export const generarLegajoPDF = async (data: LegajoPDFData): Promise<void> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── [AJUSTE MANUAL: Márgenes y dimensiones de página] ──────────────────────
  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm (A4)
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm (A4)
  const marginX = 10;     // Margen lateral izquierdo y derecho en mm
  const contentWidth = pageWidth - marginX * 2;
  const footerSpace = 15; // Espacio reservado para el pie de página
  const limiteInferior = pageHeight - footerSpace;

  // ── [AJUSTE MANUAL: Medidas de la foto carnet] ────────────────────────────
  const FOTO_W = 28;      // Ancho de la foto en mm
  const FOTO_H = 28;      // Alto de la foto en mm 

  // Carga de imágenes en paralelo
  const [logoRaw, fotoRaw] = await Promise.all([
    cargarImagenBase64("/logo-bomberos.png"),
    data.datosPersonales.fotoUrl
      ? cargarImagenBase64(data.datosPersonales.fotoUrl)
      : Promise.resolve(null),
  ]);
  const [logo, fotoBase64] = await Promise.all([
    logoRaw ? normalizarPNG(logoRaw) : Promise.resolve(null),
    fotoRaw ? recortarCover(fotoRaw, FOTO_W / FOTO_H) : Promise.resolve(null),
  ]);

  // ─── 1. MEMBRETE (Y = 12 a 32) ────────────────────────────────────────────
  // ── [AJUSTE MANUAL: Medidas del membrete superior] ─────────────────────────
  const HEADER_TOP = 5;  // Posición Y superior del logo y títulos
  const LOGO_SIZE = 22;   // Tamaño máximo (ancho y alto) del logo en mm
  const HEADER_LINE_Y = 31; // Posición Y de la línea divisoria azul

  let headerTextX = marginX;
  if (logo) {
    try {
      // Encaja el logo dentro de 18x18 manteniendo la proporción
      const escala = Math.min(LOGO_SIZE / logo.w, LOGO_SIZE / logo.h);
      const lw = logo.w * escala;
      const lh = logo.h * escala;
      const lx = marginX + (LOGO_SIZE - lw) / 2;
      const ly = HEADER_TOP + (LOGO_SIZE - lh) / 2;
      doc.addImage(logo.data, "PNG", lx, ly, lw, lh);
      headerTextX = marginX + LOGO_SIZE + 4;
    } catch {
      headerTextX = marginX;
    }
  }

  // Título institucional
  const tituloTxt = "CUERPO DE BOMBEROS VOLUNTARIOS DE VILLA MARÍA";
  const tituloMaxW = pageWidth - marginX - headerTextX;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_SIDEBAR);
  ajustarFuente(doc, tituloTxt, tituloMaxW, 15, 15);
  doc.text(tituloTxt, headerTextX, HEADER_TOP + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_SIDEBAR);
  doc.text("Sistema de Gestión Operativa — Legajo Personal", headerTextX, HEADER_TOP + 16);

  // Línea divisoria azul continua hasta el final y más fina
  doc.setDrawColor(...COLOR_SIDEBAR);
  doc.setLineWidth(0.4);
  doc.line(marginX, HEADER_LINE_Y, pageWidth - marginX, HEADER_LINE_Y);

  let currentY = HEADER_LINE_Y + 5;

  // ─── 2. TARJETA DE IDENTIDAD (Estilo Header LegajoDetalle) ────────────────
  const CARD_PAD = 4;
  const cardY = currentY;
  const cardHeight = FOTO_H + CARD_PAD * 2; // 43mm
  const fotoX = marginX + CARD_PAD;
  const fotoY = cardY + CARD_PAD;
  const textX = fotoX + FOTO_W + 6;
  const textMaxW = marginX + contentWidth - CARD_PAD - textX;

  // Fondo oscuro institucional (.legajo-header de LegajoDetalle)
  doc.setFillColor(...COLOR_SIDEBAR);
  doc.roundedRect(marginX, cardY, contentWidth, cardHeight, 3.5, 3.5, "F");

  // Foto carnet a la izquierda con aristas redondeadas y marco blanco sutil
  let fotoDibujada = false;
  if (fotoBase64) {
    try {
      doc.addImage(fotoBase64, "PNG", fotoX, fotoY, FOTO_W, FOTO_H);
      fotoDibujada = true;
    } catch {
      fotoDibujada = false;
    }
  }
  if (!fotoDibujada) {
    doc.setFillColor(...COLOR_SIDEBAR_DARK);
    doc.roundedRect(fotoX, fotoY, FOTO_W, FOTO_H, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXTO_MUTED_LIGHT);
    doc.text("Sin foto", fotoX + FOTO_W / 2, fotoY + FOTO_H / 2 + 1, { align: "center" });
  }
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.roundedRect(fotoX, fotoY, FOTO_W, FOTO_H, 2, 2, "D");

  // Información principal a la derecha de la foto
  // Nombre completo (blanco grande)
  const nombreCompleto = `${(data.datosPersonales.apellido || "").toUpperCase()}, ${data.datosPersonales.nombre || ""}`;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  ajustarFuente(doc, nombreCompleto, textMaxW, 18, 11);
  doc.text(nombreCompleto, textX, cardY + 12.5);

  // Jerarquía / Grado en blanco formal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(data.datosInstitucionales.grado || "Jerarquía sin asignar", textX, cardY + 19);

  // ── [AJUSTE MANUAL: Identificadores numéricos bajo el grado] ─────────────
  const di = data.datosInstitucionales;
  const itemsInfo = [
    { label: "Legajo N°", val: String(di.numeroLegajo ?? "—") },
    { label: "Federación. N°", val: String(di.numeroLegajoFederacion || "—") },
    { label: "RUBA N°", val: String(di.numeroLegajoRUBA || "—") },
  ];

  doc.setFontSize(9.5);
  let curX = textX;
  const infoY = cardY + 29.5;
  itemsInfo.forEach((item, idx) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO_MUTED_LIGHT);
    const labelTxt = `${item.label}: `;
    doc.text(labelTxt, curX, infoY);
    curX += doc.getTextWidth(labelTxt);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(item.val, curX, infoY);
    curX += doc.getTextWidth(item.val);

    if (idx < itemsInfo.length - 1) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXTO_MUTED);
      const sep = "   ·   ";
      doc.text(sep, curX, infoY);
      curX += doc.getTextWidth(sep);
    }
  });

  currentY = cardY + cardHeight + 9;

  // ─── 3. COLUMNAS: PERSONALES | INSTITUCIONALES ────────────────────────────
  // ── [AJUSTE MANUAL: Separación y anchos de columnas] ──────────────────────
  const gap = 8;          // Separación en mm entre la columna izquierda y derecha
  const colWidth = (contentWidth - gap) / 2; // Ancho de cada columna
  const colLeftX = marginX;
  const colRightX = marginX + colWidth + gap;
  const labelWidth = 32;  // Ancho de la etiqueta/label izquierda en cada tabla

  const dp = data.datosPersonales;

  // Formateo inteligente de Altura / Peso
  let alturaStr = "—";
  if (dp.altura !== undefined && dp.altura !== null && dp.altura !== "") {
    const num = typeof dp.altura === "number" ? dp.altura : parseFloat(String(dp.altura).replace(",", "."));
    if (!isNaN(num) && num > 0) {
      alturaStr = num < 3 ? `${num} m` : `${num} cm`;
    } else {
      alturaStr = String(dp.altura);
    }
  }
  const pesoStr = dp.peso ? `${dp.peso} kg` : "—";
  const alturaPesoValor = (alturaStr === "—" && pesoStr === "—") ? "—" : `${alturaStr} / ${pesoStr}`;

  const datosPersonalesFilas: string[][] = [
    ["DNI", dp.dni || "—"],
    ["Nacimiento", dp.fechaNacimiento || "—"],
    ["Grupo sanguíneo", dp.grupoSanguineo || "—"],
    ["Domicilio", dp.domicilio || "—"],
    ["Ciudad", dp.ciudad || "—"],
    ["Domicilio laboral", dp.domicilioLaboral || "—"],
    ["Obra social", dp.obraSocial || "—"],
    ["Carnet conducir", dp.carnetConducir || "—"],
    ["Altura / Peso", alturaPesoValor],
    ["Estado civil", dp.estadoCivil || "—"],
  ];

  if (dp.estadoCivil === "Casado/a" || dp.estadoCivil === "Concubinato / Unión Convivencial" || Boolean(dp.conyuge)) {
    datosPersonalesFilas.push([
      "Cónyuge",
      dp.conyuge ? `${dp.conyuge}${dp.dniConyuge ? ` (DNI ${dp.dniConyuge})` : ""}` : "—"
    ]);
  }

  let reingresoValor = di.reingreso || "—";
  if (di.reingreso === "Sí" && di.fechaReingreso && di.fechaReingreso !== "—") {
    const partes = di.fechaReingreso.split("-");
    const fechaFormateada = (partes.length === 3 && partes[0].length === 4)
      ? `${partes[2]}-${partes[1]}-${partes[0]}`
      : di.fechaReingreso;
    reingresoValor = `Sí (${fechaFormateada})`;
  }

  // ── [AJUSTE MANUAL: Filas de Datos Institucionales (incluye Estado)] ──────
  const datosInstitucionalesFilas: string[][] = [
    ["Fecha ingreso", di.fechaIngreso || "—"],
    ["Último ascenso", di.fechaUltimoAscenso || "—"],
    ["Estado", di.estado || "—"],
    ["Cargo", di.cargo || "—"],
    ["Cargo regional", di.cargoRegional || "—"],
    ["Cargo provincial", di.cargoProvincial || "—"],
    ["Cargo nacional", di.cargoNacional || "—"],
    ["Reingreso", reingresoValor],
  ];

  // Títulos de sección con subrayado idéntico a .datos-seccion h3 de LegajoDetalle
  const dibujarTituloColumna = (titulo: string, x: number, y: number, ancho: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_SIDEBAR);
    doc.text(titulo, x, y);

    // border-bottom: 2px solid var(--color-sidebar)
    doc.setDrawColor(...COLOR_SIDEBAR);
    doc.setLineWidth(0.6);
    doc.line(x, y + 2, x + ancho, y + 2);
  };

  dibujarTituloColumna("DATOS PERSONALES", colLeftX, currentY, colWidth);
  dibujarTituloColumna("DATOS INSTITUCIONALES", colRightX, currentY, colWidth);

  const tablasStartY = currentY + 4; // idéntico para ambas tablas

  const estiloColumna = {
    theme: "plain" as const,
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1, right: 1 },
      textColor: TEXTO,
      overflow: "linebreak" as const,
      lineColor: BORDE_LINEA,
      lineWidth: { bottom: 0.25, top: 0, left: 0, right: 0 },
    },
    columnStyles: {
      0: { fontStyle: "bold" as const, fontSize: 8, cellWidth: labelWidth, textColor: TEXTO_MUTED },
      1: { cellWidth: colWidth - labelWidth, fontStyle: "normal" as const },
    },
  };

  autoTable(doc, {
    ...estiloColumna,
    startY: tablasStartY,
    tableWidth: colWidth,
    margin: { left: colLeftX, right: pageWidth - colLeftX - colWidth, bottom: footerSpace },
    body: datosPersonalesFilas,
  });
  const finalYPersonal = lastY(doc);

  autoTable(doc, {
    ...estiloColumna,
    startY: tablasStartY,
    tableWidth: colWidth,
    margin: { left: colRightX, right: marginX, bottom: footerSpace },
    body: datosInstitucionalesFilas,
  });
  const finalYInstitucional = lastY(doc);

  currentY = Math.max(finalYPersonal, finalYInstitucional) + 8;

  // ─── Helper: salto de página si no entra un bloque mínimo ─────────────────
  const asegurarEspacio = (alto: number) => {
    if (currentY + alto > limiteInferior) {
      doc.addPage();
      currentY = 16;
    }
  };

  const dibujarTituloSeccion = (titulo: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_SIDEBAR);
    doc.text(titulo.toUpperCase(), marginX, currentY);

    // border-bottom: 2px solid var(--color-sidebar)
    doc.setDrawColor(...COLOR_SIDEBAR);
    doc.setLineWidth(0.6);
    doc.line(marginX, currentY + 2, marginX + contentWidth, currentY + 2);
    currentY += 5;
  };

  // ─── 4. HIJOS (Subsección sutil con ancho controlado) ─────────────────────
  // ── [AJUSTE MANUAL: Ancho y alineación de la tabla de Hijos] ──────────────
  // Modificá HIJOS_ANCHO para cambiar cuánto ocupa la tabla:
  //   - colWidth              -> mismo ancho que la columna Datos Personales (~87mm)
  //   - 120                   -> medida fija en milímetros (ej. 120mm)
  //   - contentWidth * 0.7    -> porcentaje del ancho (ej. 70%)
  //   - contentWidth          -> ancho completo de la página
  const HIJOS_ANCHO = colWidth; // <-- [AJUSTE MANUAL] Ancho en mm de la tabla
  const HIJOS_X = marginX;      // <-- [AJUSTE MANUAL] Posición horizontal X

  if (dp.hijos && dp.hijos.length > 0) {
    asegurarEspacio(20);

    // Título sutil
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_SIDEBAR);
    doc.text("HIJOS", HIJOS_X, currentY);

    doc.setDrawColor(...BORDE_SUAVE);
    doc.setLineWidth(0.3);
    doc.line(HIJOS_X, currentY + 1.5, HIJOS_X + HIJOS_ANCHO, currentY + 1.5);
    currentY += 3.5;

    autoTable(doc, {
      startY: currentY,
      tableWidth: HIJOS_ANCHO,
      margin: { left: HIJOS_X, bottom: footerSpace },
      theme: "plain",
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 1.2, bottom: 1.2, left: 1, right: 1 },
        textColor: TEXTO,
        lineColor: BORDE_LINEA,
        lineWidth: { bottom: 0.2, top: 0, left: 0, right: 0 },
      },
      headStyles: {
        textColor: TEXTO_MUTED,
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: { top: 1, bottom: 1.5, left: 1, right: 1 },
        lineWidth: { bottom: 0.3, top: 0, left: 0, right: 0 },
        lineColor: BORDE_SUAVE,
      },
      head: [["Nombre y apellido", "DNI", "Fecha de nacimiento", "Localidad"]],
      body: dp.hijos.map((h) => [h.nombre || "—", h.dni || "—", h.fechaNacimiento || "—", h.localidad || "—"]),
    });
    currentY = lastY(doc) + 6;
  }

  // ─── 5. HISTORIALES ───────────────────────────────────────────────────────
  const renderHistorial = (titulo: string, cabeceras: string[], filas: (string | undefined)[][]) => {
    if (!filas || filas.length === 0) return;
    asegurarEspacio(25); // título + encabezado + al menos una fila
    dibujarTituloSeccion(titulo);
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX, top: 16, bottom: footerSpace },
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2, textColor: TEXTO, lineColor: BORDE_LINEA, lineWidth: 0.2 },
      headStyles: { fillColor: COLOR_SIDEBAR, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: FONDO_ITEM },
      head: [cabeceras],
      body: filas.map((fila) => fila.map((c) => c || "—")),
    });
    currentY = lastY(doc) + 8;
  };

  if (data.ascensos?.length) {
    renderHistorial(
      "Historial de Ascensos",
      ["Fecha", "Grado otorgado", "Resolución N°", "Observaciones"],
      data.ascensos.map((a) => [a.fecha, a.grado, a.resolucion, a.observaciones])
    );
  }

  if (data.cursos?.length) {
    renderHistorial(
      "Cursos y Capacitaciones",
      ["Fecha", "Tipo", "Nombre del curso", "Observaciones"],
      data.cursos.map((c) => [c.fecha, c.tipo, c.nombre, c.observaciones])
    );
  }

  if (data.condecoraciones?.length) {
    renderHistorial(
      "Condecoraciones y Menciones",
      ["Fecha", "Tipo", "Motivo", "Observaciones"],
      data.condecoraciones.map((m) => [m.fecha, m.tipo, m.motivo, m.observaciones])
    );
  }

  if (data.sanciones?.length) {
    renderHistorial(
      "Sanciones Disciplinarias",
      ["Fecha", "Tipo", "Motivo", "Observaciones"],
      data.sanciones.map((s) => [s.fecha, s.tipo, s.motivo, s.observaciones])
    );
  }

  if (data.observaciones?.length) {
    renderHistorial(
      "Observaciones de Servicio",
      ["Fecha", "Motivo", "Detalle"],
      data.observaciones.map((o) => [o.fecha, o.motivo, o.observacion])
    );
  }

  // ─── PIE DE PÁGINA (paginación) ───────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDE_SUAVE);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO_MUTED);
    doc.text(
      `Página ${i} de ${totalPages} — Cuerpo de Bomberos Voluntarios Villa María`,
      pageWidth / 2,
      pageHeight - 7,
      { align: "center" }
    );
  }

  // ── [AJUSTE MANUAL: Entrega del PDF] ──────────────────────────────────────
  const nombreArchivo = `Legajo_${data.datosPersonales.apellido}_${data.datosPersonales.nombre}.pdf`.replace(/\s+/g, "_");
  doc.save(nombreArchivo);
};