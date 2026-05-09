import React from "react";

interface Hijo {
  nombre: string;
  fechaNacimiento: string;
  dni: string;
  localidad: string;
}

interface LegajoCompleto {
  datosPersonales: {
    apellido: string;
    nombre: string;
    dni?: string;
    fechaNacimiento?: string;
    grupoSanguineo?: string;
    domicilio?: string;
    lugar?: string;
    domicilioLaboral?: string;
    obraSocial?: string;
    carnetConducir?: string;
    altura?: number;
    peso?: number;
    estadoCivil?: string;
    conyuge?: string;
    dniConyuge?: string;
    hijos?: Hijo[];
  };
  datosInstitucionales: {
    fechaIngreso?: string;
    grado?: string;
    cargo?: string;
    cargoRegional?: string;
    cargoProvincial?: string;
    cargoNacional?: string;
    fechaUltimoAscenso?: string;
    reingreso?: string;
  };
  ascensos: any[];
  condecoraciones: any[];
  sanciones: any[];
  cursos: any[];
  observaciones: string;
  elementos: string;
}

interface Props {
  legajo: LegajoCompleto;
}

const LegajoPDFRender: React.FC<Props> = ({ legajo }) => {
  return (
    <div
      id="legajo-pdf-container"
      style={{
        width: "210mm",    // Ancho A4 exacto
        minHeight: "297mm", // Alto A4 exacto
        padding: "15mm",
        backgroundColor: "white",
        color: "#2c3e50",
        fontFamily: "'Poppins', sans-serif",
        fontSize: "12pt",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ fontSize: "20pt", marginBottom: "10pt" }}>
        {legajo.datosPersonales.apellido}, {legajo.datosPersonales.nombre}
      </h1>

      {/* Datos Personales */}
      <section>
        <h2>Datos Personales</h2>
        <p><strong>DNI:</strong> {legajo.datosPersonales.dni || "—"}</p>
        <p><strong>Fecha nacimiento:</strong> {legajo.datosPersonales.fechaNacimiento || "—"}</p>
        <p><strong>Grupo sanguíneo:</strong> {legajo.datosPersonales.grupoSanguineo || "—"}</p>
        <p><strong>Domicilio:</strong> {legajo.datosPersonales.domicilio || "—"} <strong>Lugar:</strong> {legajo.datosPersonales.lugar || "—"}</p>
        <p><strong>Domicilio laboral:</strong> {legajo.datosPersonales.domicilioLaboral || "—"}</p>
        <p><strong>Obra social:</strong> {legajo.datosPersonales.obraSocial || "—"}</p>
        <p><strong>Carnet de conducir:</strong> {legajo.datosPersonales.carnetConducir || "—"}</p>
        <p><strong>Altura:</strong> {legajo.datosPersonales.altura || "—"} cm <strong>Peso:</strong> {legajo.datosPersonales.peso || "—"} kg</p>
        <p><strong>Estado civil:</strong> {legajo.datosPersonales.estadoCivil || "—"}</p>
        <p><strong>Casado/a con:</strong> {legajo.datosPersonales.conyuge || "—"} (DNI: {legajo.datosPersonales.dniConyuge || "—"})</p>

        <h3>Hijos</h3>
        {legajo.datosPersonales.hijos && legajo.datosPersonales.hijos.length > 0 ? (
          <ul style={{ paddingLeft: "1rem" }}>
            {legajo.datosPersonales.hijos.map((hijo, i) => (
              <li key={i}>
                <strong>Nombre:</strong> {hijo.nombre}, <strong>DNI:</strong> {hijo.dni}, <strong>Fecha Nac.:</strong> {hijo.fechaNacimiento}, <strong>Localidad:</strong> {hijo.localidad}
              </li>
            ))}
          </ul>
        ) : (
          <p>—</p>
        )}
      </section>

      {/* Datos Institucionales */}
      <section style={{ marginTop: "1rem" }}>
        <h2>Datos Institucionales</h2>
        <p><strong>Fecha de ingreso:</strong> {legajo.datosInstitucionales.fechaIngreso || "—"}</p>
        <p><strong>Grado:</strong> {legajo.datosInstitucionales.grado || "—"}</p>
        <p><strong>Cargo Institucional:</strong> {legajo.datosInstitucionales.cargo || "—"}</p>
        <p><strong>Cargo Regional:</strong> {legajo.datosInstitucionales.cargoRegional || "—"}</p>
        <p><strong>Cargo Provincial:</strong> {legajo.datosInstitucionales.cargoProvincial || "—"}</p>
        <p><strong>Cargo Nacional:</strong> {legajo.datosInstitucionales.cargoNacional || "—"}</p>
        <p><strong>Fecha último ascenso:</strong> {legajo.datosInstitucionales.fechaUltimoAscenso || "—"}</p>
        <p><strong>Reingreso:</strong> {legajo.datosInstitucionales.reingreso || "—"}</p>
      </section>

      {/* Más secciones como ascensos, condecoraciones, etc... */}
      {/* Podés agregar más secciones si querés */}
      
      <section style={{ marginTop: "1rem" }}>
        <h2>Observaciones</h2>
        <p>{legajo.observaciones || "—"}</p>
      </section>
    </div>
  );
};

export default LegajoPDFRender;
