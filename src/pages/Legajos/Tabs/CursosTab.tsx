import React, { useEffect, useState, useRef } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../app/firebase-config";
import { FaEdit, FaTrash, FaPlus, FaCheckCircle, FaFilePdf, FaUpload } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./TabsGeneral.css";
import { useUser } from "../../../context/UserContext";
import { registrarCambioLegajo } from "../../../utils/registrarCambioLegajo";

interface Curso {
  id: string;
  fecha: string;
  tipo: string;
  nombre: string;
  observaciones?: string;
  pdfUrl?: string;
}

const CursosTab: React.FC = () => {
  const { id } = useParams();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoCurso, setEditandoCurso] = useState<Curso | null>(null);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<Curso | null>(null);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const { user } = useUser();
  const puedeEditar = user?.rol === "admin" || user?.rol === "legajo";

  useEffect(() => {
    const fetchCursos = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "legajos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCursos(data.cursos || []);
        }
      } catch (error) {
        console.error("Error al obtener cursos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCursos();
  }, [id]);

  const guardarEnFirebase = async (cursosActualizados: Curso[]) => {
    if (!id) return;
    try {
      const docRef = doc(db, "legajos", id);
      await updateDoc(docRef, { cursos: cursosActualizados });
      setCursos(cursosActualizados);
    } catch (error) {
      console.error("Error al guardar cursos:", error);
      alert("Error al guardar en Firebase.");
    }
  };

  const abrirFormulario = (curso?: Curso) => {
    setEditandoCurso(curso || null);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditandoCurso(null);
  };

  const guardarCurso = async (curso: Curso) => {
    const esEdicion = !!editandoCurso;
    const nuevos = esEdicion
      ? cursos.map((c) => (c.id === curso.id ? curso : c))
      : [...cursos, { ...curso, id: Date.now().toString() }];

    await guardarEnFirebase(nuevos);

    if (user) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: esEdicion ? "modificado" : "agregado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "curso",
        datosPrevios: esEdicion ? cursos.find((c) => c.id === curso.id) : null,
        datosNuevos: curso,
      });
    }

    cerrarFormulario();
  };


  const eliminarCurso = async (idCurso: string) => {
    if (!window.confirm("¿Eliminar curso?")) return;

    const cursoAEliminar = cursos.find((c) => c.id === idCurso);
    const nuevos = cursos.filter((c) => c.id !== idCurso);

    await guardarEnFirebase(nuevos);

    if (user && cursoAEliminar) {
      await registrarCambioLegajo({
        legajoId: id!,
        accion: "eliminado",
        usuarioId: user.uid,
        usuarioRol: user.rol,
        tipoCambio: "curso",
        datosPrevios: cursoAEliminar,
      });
    }

    if (cursoSeleccionado?.id === idCurso) setCursoSeleccionado(null);
  };

  const seleccionarCurso = (curso: Curso) => {
    setCursoSeleccionado(curso);
  };

  const formatearFecha = (fechaISO: string): string => {
    if (!fechaISO) return "—";
    const [a, m, d] = fechaISO.split("-");
    return `${d}-${m}-${a}`;
  };

  const manejarClickSubirArchivo = () => {
    if (!cursoSeleccionado) {
      alert("Selecciona un curso para subir archivo.");
      return;
    }
    inputFileRef.current?.click();
  };

  const manejarArchivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !id || !cursoSeleccionado) return;
    const archivo = e.target.files[0];
    if (archivo.type !== "application/pdf") {
      alert("Solo se permiten archivos PDF.");
      return;
    }
    try {
      const storageRef = ref(storage, `legajos/${id}/cursos/${cursoSeleccionado.id}.pdf`);
      await uploadBytes(storageRef, archivo);
      const url = await getDownloadURL(storageRef);

      const cursosActualizados = cursos.map((c) =>
        c.id === cursoSeleccionado.id ? { ...c, pdfUrl: url } : c
      );
      await guardarEnFirebase(cursosActualizados);

      if (user) {
        await registrarCambioLegajo({
          legajoId: id!,
          accion: "modificado",
          usuarioId: user.uid,
          usuarioRol: user.rol,
          tipoCambio: "curso",
          datosPrevios: cursoSeleccionado,
          datosNuevos: { ...cursoSeleccionado, pdfUrl: url },
        });
      }

      alert("Archivo subido correctamente.");
    } catch (error) {
      console.error("Error al subir archivo:", error);
      alert("Error al subir archivo.");
    } finally {
      if (inputFileRef.current) inputFileRef.current.value = "";
    }
  };


  if (loading) return <p>Cargando cursos...</p>;

  return (
    <div className="tab-container">
      <table className="tabla-general">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Nombre</th>
            <th>Observaciones</th>
            <th>Archivo</th>
          </tr>
        </thead>
        <tbody>
          {cursos.length ? (
            [...cursos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((c) => (

              <tr
                key={c.id}
                className={cursoSeleccionado?.id === c.id ? "fila-seleccionada" : ""}
                onClick={() => seleccionarCurso(c)}
                style={{ cursor: "pointer" }}
                title="Click para seleccionar"
              >
                <td>{formatearFecha(c.fecha)}</td>
                <td>{c.tipo}</td>
                <td>{c.nombre}</td>
                <td>{c.observaciones || "—"}</td>
                <td>
                  {c.pdfUrl ? (
                    <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" title="Ver PDF">
                      <FaCheckCircle className="icono-verde" /> <FaFilePdf className="icono-pdf" />
                    </a>
                  ) : (
                    <span className="sin-archivo">Sin archivo</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ textAlign: "center" }}>
                No hay cursos cargados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    {puedeEditar && (
      <div className="btn-acciones">
        <button
          className="btn-accion"
          onClick={() => abrirFormulario()}
          title="Agregar curso"
          aria-label="Agregar curso"
        >
          <FaPlus />
        </button>

        <button
          className="btn-accion"
          onClick={() => {
            if (!cursoSeleccionado) return alert("Seleccioná un curso para editar.");
            abrirFormulario(cursoSeleccionado);
          }}
          disabled={!cursoSeleccionado}
          title="Editar curso seleccionado"
          aria-label="Editar curso seleccionado"
        >
          <FaEdit />
        </button>

        <button
          className="btn-accion btn-eliminar"
          onClick={() => {
            if (!cursoSeleccionado) return alert("Seleccioná un curso para eliminar.");
            eliminarCurso(cursoSeleccionado.id);
          }}
          disabled={!cursoSeleccionado}
          title="Eliminar curso seleccionado"
          aria-label="Eliminar curso seleccionado"
        >
          <FaTrash />
        </button>

        <button
          className="btn-accion"
          onClick={manejarClickSubirArchivo}
          disabled={!cursoSeleccionado}
          title="Subir archivo PDF para curso seleccionado"
          aria-label="Subir archivo PDF"
        >
          <FaUpload />
        </button>

        <input
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          ref={inputFileRef}
          onChange={manejarArchivoChange}
        />
      </div>
    )}
      {mostrarForm && (
        <CursoForm curso={editandoCurso} onClose={cerrarFormulario} onGuardar={guardarCurso} />
      )}
    </div>
  );
};

interface CursoFormProps {
  curso: Curso | null;
  onClose: () => void;
  onGuardar: (curso: Curso) => void;
}

const CursoForm: React.FC<CursoFormProps> = ({ curso, onClose, onGuardar }) => {
  const [fecha, setFecha] = useState(curso?.fecha || "");
  const [tipo, setTipo] = useState(curso?.tipo || "");
  const [nombre, setNombre] = useState(curso?.nombre || "");
  const [observaciones, setObservaciones] = useState(curso?.observaciones || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !tipo || !nombre) {
      alert("Fecha, tipo y nombre son obligatorios.");
      return;
    }
    onGuardar({
      id: curso?.id || Date.now().toString(),
      fecha,
      tipo,
      nombre,
      observaciones,
      pdfUrl: curso?.pdfUrl || "",
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{curso ? "Editar curso" : "Agregar curso"}</h3>
        <form onSubmit={handleSubmit} className="form-general">
          <label>
            Fecha:
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label>
            Tipo:
            <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} required autoFocus />
          </label>
          <label>
            Nombre:
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </label>
          <label>
            Observaciones:
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
          <div className="modal-buttons">
            <button type="submit">{curso ? "Guardar" : "Agregar"}</button>
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CursosTab;
