import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../app/firebase-config";
import { Plus, Trash2, User } from "lucide-react";
import "./EditarLegajo.css";
import { registrarAuditoria, buildOperador, calcularDiff } from "../../utils/auditoria";
import { useUser } from "../../context/UserContext";
import imageCompression from "browser-image-compression";
import Header from "../../components/Header";

interface Hijo { nombre: string; fechaNacimiento: string; dni: string; localidad: string; }
interface Legajo {
  apellido: string; nombre: string; numeroLegajo: number;
  numeroLegajoFederacion?: number; numeroLegajoRUBA?: number;
  dni?: string; fechaNacimiento?: string; grupoSanguineo?: string;
  domicilio?: string; domicilioLaboral?: string; ciudad?: string;
  altura?: number; peso?: number; estadoCivil?: string;
  conyuge?: string; dniConyuge?: string; hijos?: Hijo[];
  fechaIngreso?: string; grado?: string; cargo?: string;
  cargoRegional?: string; cargoProvincial?: string; cargoNacional?: string;
  fechaUltimoAscenso?: string; reingreso?: string; fechaReingreso?: string; fotoUrl?: string;
  obraSocial?: string; carnetConducir?: string; estado?: string;
  miembroId?: string;
}

const GRUPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"];
const ESTADOS_CIVILES = ["Soltero/a", "Casado/a", "Concubinato / Unión Convivencial", "Divorciado/a", "Viudo/a"];
const GRADOS_BOMBEROS = [
  "Aspirante", "Bombero", "Cabo", "Cabo Primero", "Sargento", "Sargento Primero",
  "Suboficial Principal", "Suboficial Mayor", "Oficial Ayudante", "Oficial Subinspector",
  "Oficial Inspector", "Oficial Principal", "Subcomisario", "Comisario",
  "Comisario Inspector", "Comisario Mayor", "Comisario General"
];
const ESTADOS_LEGAJO = ["Cuerpo Activo", "Reserva", "Comisión Directiva", "Licencia", "Baja", "Retirado"];

const EditarLegajo: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { miembroActivo, user } = useUser();
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [datos, setDatos] = useState<Legajo>({ apellido: "", nombre: "", numeroLegajo: 0 });
  const [loading, setLoading] = useState(true);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [listaGrados, setListaGrados] = useState<string[]>(GRADOS_BOMBEROS);
  const datosOriginales = useRef<Legajo | null>(null);

  // Cargar jerarquías desde la colección "grados" de Firestore (con fallback a GRADOS_BOMBEROS)
  useEffect(() => {
    const fetchGrados = async () => {
      try {
        const snap = await getDocs(collection(db, "grados"));
        if (!snap.empty) {
          const items = snap.docs
            .map(d => {
              const data = d.data();
              return {
                nombre: (data.nombre as string) || "",
                orden: typeof data.orden === "number" ? data.orden : 999,
                activo: data.activo !== false,
              };
            })
            .filter(g => g.activo && g.nombre.trim() !== "")
            .sort((a, b) => a.orden - b.orden)
            .map(g => g.nombre);

          if (items.length > 0) {
            setListaGrados(items);
          }
        }
      } catch (err) {
        console.warn("No se pudieron cargar grados desde Firestore, usando lista por defecto:", err);
      }
    };
    fetchGrados();
  }, []);

  useEffect(() => {
    const fetchLegajo = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, "legajos", id));
        if (docSnap.exists()) {
          const data = docSnap.data() as Legajo;
          let gradoActualizado = data.grado;
          let carnetActualizado = data.carnetConducir;
          let targetMiembroId = data.miembroId;

          // Si no tiene miembroId guardado pero tiene DNI, buscamos el miembro en "miembros"
          if (!targetMiembroId && data.dni) {
            try {
              const qSnap = await getDocs(
                query(collection(db, "miembros"), where("dni", "==", String(data.dni).trim()), limit(1))
              );
              if (!qSnap.empty) {
                targetMiembroId = qSnap.docs[0].id;
                if (!gradoActualizado) {
                  const mData = qSnap.docs[0].data();
                  gradoActualizado = mData.grado || mData.categoria || "";
                }
              }
            } catch (err) {
              console.warn("No se pudo buscar miembro por DNI:", err);
            }
          } else if (targetMiembroId && !gradoActualizado) {
            try {
              const mSnap = await getDoc(doc(db, "miembros", targetMiembroId));
              if (mSnap.exists()) {
                const mData = mSnap.data();
                gradoActualizado = mData.grado || mData.categoria || "";
              }
            } catch (err) {
              console.warn("No se pudo consultar miembro por ID:", err);
            }
          }

          // Consultar en la colección "vencimientos" para sincronizar automáticamente el carnet
          if (targetMiembroId) {
            try {
              const qCarnet = query(
                collection(db, "vencimientos"),
                where("miembroId", "==", targetMiembroId),
                where("tipo", "==", "carnet")
              );
              const snapCarnet = await getDocs(qCarnet);
              if (!snapCarnet.empty) {
                const vData = snapCarnet.docs[0].data();
                if (Array.isArray(vData.tipoCarnet) && vData.tipoCarnet.length > 0) {
                  carnetActualizado = vData.tipoCarnet.join(", ");
                } else if (typeof vData.tipoCarnet === "string" && vData.tipoCarnet.trim()) {
                  carnetActualizado = vData.tipoCarnet.trim();
                }
              } else if (!carnetActualizado) {
                carnetActualizado = "No posee";
              }
            } catch (errCarnet) {
              console.warn("Error al sincronizar carnet desde vencimientos:", errCarnet);
            }
          }

          const datosCargados: Legajo = {
            ...data,
            miembroId: targetMiembroId,
            grado: gradoActualizado || "",
            carnetConducir: carnetActualizado || "",
          };

          setDatos(datosCargados);
          datosOriginales.current = datosCargados;
          setFotoPreview(data.fotoUrl || null);
        }
      } catch (error) {
        console.error("Error al obtener legajo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLegajo();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDatos(prev => {
      const nuevoValor = ["numeroLegajo", "numeroLegajoFederacion", "numeroLegajoRUBA", "altura", "peso"].includes(name)
        ? (value === "" ? undefined : Number(value))
        : value;

      const updated: Legajo = {
        ...prev,
        [name]: nuevoValor,
      };

      // Si cambia estadoCivil y no es Casado/a ni Concubinato, limpiamos conyuge y dniConyuge
      if (name === "estadoCivil") {
        if (value !== "Casado/a" && value !== "Concubinato / Unión Convivencial") {
          updated.conyuge = "";
          updated.dniConyuge = "";
        }
      }

      // Si cambia reingreso y es distinto de "Sí", limpiamos fechaReingreso
      if (name === "reingreso") {
        if (value !== "Sí") {
          updated.fechaReingreso = "";
        }
      }

      return updated;
    });
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 800, useWebWorker: true });
      const storageRef = ref(storage, `legajos/${id}/imagen`);
      const uploadTask = uploadBytesResumable(storageRef, compressed);
      setUploadProgress(0);
      uploadTask.on("state_changed",
        snap => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        err => { console.error(err); setUploadProgress(null); },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setFotoPreview(url);
          setDatos(prev => ({ ...prev, fotoUrl: url }));
          setUploadProgress(null);
        }
      );
    } catch (error) { console.error(error); }
  };

  const handleBorrarFoto = async () => {
    if (!id || !datos.fotoUrl) return;
    try {
      await deleteObject(ref(storage, `legajos/${id}/imagen`));
      await setDoc(doc(db, "legajos", id), { fotoUrl: "" }, { merge: true });
      setFotoPreview(null);
      setDatos(prev => ({ ...prev, fotoUrl: "" }));
    } catch (error) { console.error(error); }
  };

  const handleHijoChange = (index: number, field: keyof Hijo, value: string) => {
    const nuevos = [...(datos.hijos || [])];
    nuevos[index] = { ...nuevos[index], [field]: value };
    setDatos(prev => ({ ...prev, hijos: nuevos }));
  };

  const agregarHijo = () => setDatos(prev => ({
    ...prev, hijos: [...(prev.hijos || []), { nombre: "", fechaNacimiento: "", dni: "", localidad: "" }]
  }));

  const toggleSeleccionado = (i: number) => setSeleccionados(prev =>
    prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
  );

  const eliminarSeleccionados = () => {
    setDatos(prev => ({ ...prev, hijos: (prev.hijos || []).filter((_, i) => !seleccionados.includes(i)) }));
    setSeleccionados([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !miembroActivo) return;
    try {
      const { miembroId, ...datosAGuardar } = datos;
      await setDoc(doc(db, "legajos", id), datosAGuardar, { merge: true });

      const cambios = calcularDiff(datosOriginales.current || {}, datosAGuardar);

      await registrarAuditoria({
        accion: "editar",
        coleccion: "legajos",
        docId: id,
        docResumen: `Legajo: ${datosAGuardar.apellido} ${datosAGuardar.nombre}`,
        operador: buildOperador(miembroActivo, user?.rol),
        detalles: { cambios },
      });

      navigate(`/legajo/${id}`);
    } catch (error) { console.error(error); }
};

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="editar-legajo-container">
      <Header title="Editar Legajo" onBack={() => navigate(`/legajo/${id}`)} />

      <form onSubmit={handleSubmit} className="form-legajo">

        {/* Fila superior: foto + números */}
        <div className="form-fila">
          <div className="form-seccion foto-seccion">
            <div className="form-seccion-titulo">Foto carnet</div>
            <div className="foto-carnet">
              {fotoPreview ? (
                <div className="foto-con-boton">
                  <img src={fotoPreview} alt="Foto carnet" />
                  <button type="button" className="btn-borrar-foto" onClick={handleBorrarFoto}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <div className="foto-placeholder">
                  <User size={32} color="#cbd5e1" />
                  <span>Sin foto</span>
                </div>
              )}
              <input ref={fotoInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="foto-input" />
              <button type="button" className="btn-subir-foto" onClick={() => fotoInputRef.current?.click()}>
                {fotoPreview ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {uploadProgress !== null && (
                <p className="foto-progress">Subiendo... {uploadProgress.toFixed(0)}%</p>
              )}
            </div>
          </div>

          <div className="form-seccion">
            <div className="form-seccion-titulo">Números de legajo</div>
            <div className="form-seccion-grid">
              <div className="form-grupo">
                <label>N° Legajo</label>
                <input type="number" name="numeroLegajo" value={datos.numeroLegajo} onChange={handleChange} required />
              </div>
              <div className="form-grupo">
                <label>Federación</label>
                <input type="number" name="numeroLegajoFederacion" value={datos.numeroLegajoFederacion || ""} onChange={handleChange} />
              </div>
              <div className="form-grupo">
                <label>RUBA</label>
                <input type="number" name="numeroLegajoRUBA" value={datos.numeroLegajoRUBA || ""} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className="form-seccion">
          <div className="form-seccion-titulo">Datos personales</div>
          <div className="form-seccion-grid">
            <div className="form-grupo">
              <label>Apellido</label>
              <input type="text" name="apellido" value={datos.apellido} onChange={handleChange} required />
            </div>
            <div className="form-grupo">
              <label>Nombre</label>
              <input type="text" name="nombre" value={datos.nombre} onChange={handleChange} required />
            </div>
            <div className="form-grupo">
              <label>DNI</label>
              <input type="text" name="dni" value={datos.dni || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Fecha nacimiento</label>
              <input type="date" name="fechaNacimiento" value={datos.fechaNacimiento || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Grupo sanguíneo</label>
              <select name="grupoSanguineo" value={datos.grupoSanguineo || ""} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {GRUPOS_SANGUINEOS.map(gs => (
                  <option key={gs} value={gs}>{gs}</option>
                ))}
              </select>
            </div>
            <div className="form-grupo">
              <label>Obra social</label>
              <input type="text" name="obraSocial" value={datos.obraSocial || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Carnet conducir <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>(desde Vencimientos)</span></label>
              <input type="text" name="carnetConducir" value={datos.carnetConducir || ""} onChange={handleChange} placeholder="Ej: B1, D4" />
            </div>
            <div className="form-grupo">
              <label>Altura (cm)</label>
              <input type="number" name="altura" value={datos.altura || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Peso (kg)</label>
              <input type="number" name="peso" value={datos.peso || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Estado civil</label>
              <select name="estadoCivil" value={datos.estadoCivil || ""} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {ESTADOS_CIVILES.map(ec => (
                  <option key={ec} value={ec}>{ec}</option>
                ))}
              </select>
            </div>
            {(datos.estadoCivil === "Casado/a" || datos.estadoCivil === "Concubinato / Unión Convivencial") && (
              <>
                <div className="form-grupo">
                  <label>Cónyuge</label>
                  <input type="text" name="conyuge" value={datos.conyuge || ""} onChange={handleChange} />
                </div>
                <div className="form-grupo">
                  <label>DNI cónyuge</label>
                  <input type="text" name="dniConyuge" value={datos.dniConyuge || ""} onChange={handleChange} />
                </div>
              </>
            )}
            <div className="grupo-domicilio-completo">
              <div className="form-grupo">
                <label>Domicilio</label>
                <input type="text" name="domicilio" value={datos.domicilio || ""} onChange={handleChange} />
              </div>
              <div className="form-grupo">
                <label>Ciudad</label>
                <input type="text" name="ciudad" value={datos.ciudad || ""} onChange={handleChange} />
              </div>
              <div className="form-grupo">
                <label>Domicilio laboral</label>
                <input type="text" name="domicilioLaboral" value={datos.domicilioLaboral || ""} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        {/* Hijos */}
        <div className="form-seccion">
          <div className="form-seccion-titulo">Hijos</div>
          {(datos.hijos || []).map((hijo, index) => (
            <div key={index} className="grupo-hijo">
              <input
                type="checkbox"
                checked={seleccionados.includes(index)}
                onChange={() => toggleSeleccionado(index)}
                className="checkbox-seleccion"
              />
              <div className="form-grupo">
                <label>Nombre</label>
                <input type="text" value={hijo.nombre} onChange={e => handleHijoChange(index, "nombre", e.target.value)} />
              </div>
              <div className="form-grupo">
                <label>Fecha nacimiento</label>
                <input type="date" value={hijo.fechaNacimiento} onChange={e => handleHijoChange(index, "fechaNacimiento", e.target.value)} />
              </div>
              <div className="form-grupo">
                <label>DNI</label>
                <input type="text" value={hijo.dni} onChange={e => handleHijoChange(index, "dni", e.target.value)} />
              </div>
              <div className="form-grupo">
                <label>Localidad</label>
                <input type="text" value={hijo.localidad} onChange={e => handleHijoChange(index, "localidad", e.target.value)} />
              </div>
            </div>
          ))}
          <div className="botones-hijos-container">
            <button type="button" onClick={agregarHijo} className="btn-agregar-hijo">
              <Plus size={14} /> Agregar hijo
            </button>
            <button
              type="button"
              onClick={eliminarSeleccionados}
              className="btn-eliminar-hijo"
              disabled={seleccionados.length === 0}
            >
              <Trash2 size={14} /> Eliminar seleccionados
            </button>
          </div>
        </div>

        {/* Datos institucionales */}
        <div className="form-seccion">
          <div className="form-seccion-titulo">Datos institucionales</div>
          <div className="form-seccion-grid">
            <div className="form-grupo">
              <label>Fecha ingreso</label>
              <input type="date" name="fechaIngreso" value={datos.fechaIngreso || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Grado</label>
              <select name="grado" value={datos.grado || ""} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {datos.grado && !listaGrados.includes(datos.grado) && (
                  <option value={datos.grado}>{datos.grado}</option>
                )}
                {listaGrados.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="form-grupo">
              <label>Cargo institucional</label>
              <input type="text" name="cargo" value={datos.cargo || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Cargo regional</label>
              <input type="text" name="cargoRegional" value={datos.cargoRegional || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Cargo provincial</label>
              <input type="text" name="cargoProvincial" value={datos.cargoProvincial || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Cargo nacional</label>
              <input type="text" name="cargoNacional" value={datos.cargoNacional || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Fecha último ascenso</label>
              <input type="date" name="fechaUltimoAscenso" value={datos.fechaUltimoAscenso || ""} onChange={handleChange} />
            </div>
            <div className="form-grupo">
              <label>Estado</label>
              <select name="estado" value={datos.estado || ""} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {datos.estado && !ESTADOS_LEGAJO.includes(datos.estado) && (
                  <option value={datos.estado}>{datos.estado}</option>
                )}
                {ESTADOS_LEGAJO.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div className="form-grupo">
              <label>Reingreso</label>
              <select name="reingreso" value={datos.reingreso || "No"} onChange={handleChange}>
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
            </div>
            {datos.reingreso === "Sí" && (
              <div className="form-grupo">
                <label>Fecha de reingreso</label>
                <input type="date" name="fechaReingreso" value={datos.fechaReingreso || ""} onChange={handleChange} />
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="botones-acciones">
          <button type="button" className="btn-cancel" onClick={() => navigate(`/legajo/${id}`)}>
            Cancelar
          </button>
          <button type="submit" className="btn-guardar1">
            Guardar cambios
          </button>
        </div>

      </form>
    </div>
  );
};

export default EditarLegajo;