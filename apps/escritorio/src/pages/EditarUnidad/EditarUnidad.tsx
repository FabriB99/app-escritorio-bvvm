// src/pages/EditarUnidad/EditarUnidad.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { db, storage } from "../../app/firebase-config";
import { doc, getDoc, collection, getDocs, query, where, orderBy, writeBatch } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import './EditarUnidad.css';
import { ArrowUp, ArrowDown, Trash2, Save } from 'lucide-react';
import Header from "../../components/Header";
import {
  TIPOS_UNIDAD,
  CATEGORIAS_CHOFER,
  CATEGORIA_SUGERIDA_POR_TIPO,
  TipoUnidad,
  TipoUnidadChofer,
} from '../../types/unidades';
import { useUser } from "../../context/UserContext";
import { registrarAuditoria, buildOperador, calcularDiff } from "../../utils/auditoria";

interface ElementoForm {
  id: string;
  nombre: string;
  cantidad: number | "-";
  estado?: string;
}

interface UbicacionForm {
  id: string;
  nombre: string;
  elementos: ElementoForm[];
}

interface UnidadFormData {
  nombre: string;
  tipo: string;
  categoria: TipoUnidadChofer | "";
  modelo: string;
  patente: string;
  kilometraje: string;
  combustible: string;
  estado: string;
  imagen: string;
  ubicaciones: UbicacionForm[];
}

const INITIAL_FORM_DATA: UnidadFormData = {
  nombre: "",
  tipo: "",
  categoria: "",
  modelo: "",
  patente: "",
  kilometraje: "0",
  combustible: "4/4",
  estado: "Operativa",
  imagen: "",
  ubicaciones: [],
};

const EditarUnidad: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const esModoCrear = !id;
  const navigate = useNavigate();
  const { user, miembroActivo } = useUser();

  const [formData, setFormData] = useState<UnidadFormData>(INITIAL_FORM_DATA);
  const [datosOriginales, setDatosOriginales] = useState<Record<string, any> | null>(null);
  const [categoriaTocada, setCategoriaTocada] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [cargando, setCargando] = useState(!esModoCrear);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const esGuardia = user?.rol === "guardia";

  useEffect(() => {
    if (esModoCrear) return;

    const fetchUnidad = async () => {
      setCargando(true);
      try {
        const [unidadDoc, ubicSnap, elemSnap] = await Promise.all([
          getDoc(doc(db, 'unidades', id)),
          esGuardia ? Promise.resolve(null) : getDocs(query(collection(db, 'ubicaciones'), where('unidad_id', '==', id), orderBy('orden'))),
          esGuardia ? Promise.resolve(null) : getDocs(query(collection(db, 'elementos'), where('unidad_id', '==', id), orderBy('orden'))),
        ]);

        if (!unidadDoc.exists()) {
          toast.error("No se encontró la unidad");
          navigate("/unidades");
          return;
        }

        const datos = unidadDoc.data();
        setDatosOriginales(datos);

        const ubicacionesData: UbicacionForm[] = [];
        if (ubicSnap && elemSnap) {
          const mapaUbic = new Map<string, UbicacionForm>();
          ubicSnap.docs.forEach(uDoc => {
            const uObj: UbicacionForm = { id: uDoc.id, nombre: uDoc.data().nombre || "", elementos: [] };
            ubicacionesData.push(uObj);
            mapaUbic.set(uDoc.id, uObj);
          });

          elemSnap.docs.forEach(eDoc => {
            const eData = eDoc.data();
            const target = mapaUbic.get(eData.ubicacion_id);
            if (target) {
              target.elementos.push({
                id: eDoc.id,
                nombre: eData.nombre || "",
                cantidad: eData.cantidad ?? 1,
                estado: eData.estado ?? "Desconocido",
              });
            }
          });
        }

        setFormData({
          nombre: datos.nombre || "",
          tipo: datos.tipo || "",
          categoria: (datos.categoria as TipoUnidadChofer) || "",
          modelo: datos.modelo || "",
          patente: datos.patente || "",
          kilometraje: datos.kilometraje || "0",
          combustible: datos.combustible || "4/4",
          estado: datos.estado || "Operativa",
          imagen: datos.imagen || "",
          ubicaciones: ubicacionesData,
        });
      } catch (error) {
        console.error('Error al obtener unidad:', error);
        toast.error("Error al cargar la unidad");
      } finally {
        setCargando(false);
      }
    };

    fetchUnidad();
  }, [id, esModoCrear, esGuardia, navigate]);

  if (cargando) return <p>Cargando datos...</p>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "tipo") {
      const sugerencia = !categoriaTocada && value ? CATEGORIA_SUGERIDA_POR_TIPO[value as TipoUnidad] : undefined;
      setFormData(prev => ({ ...prev, tipo: value, ...(sugerencia ? { categoria: sugerencia } : {}) }));
      return;
    }
    if (name === "categoria") setCategoriaTocada(true);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetId = id || `temp_${Date.now()}`;
    const storageRef = ref(storage, `unidades/${targetId}/imagen`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      snap => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      err => {
        console.error("Error subiendo imagen:", err);
        toast.error("Error al subir la imagen");
        setUploadProgress(null);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setFormData(prev => ({ ...prev, imagen: url }));
        toast.success("Imagen subida correctamente");
        setUploadProgress(null);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.categoria) {
      toast.warning("Seleccioná la categoría de chofer de la unidad.");
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const unidadRef = esModoCrear ? doc(collection(db, "unidades")) : doc(db, "unidades", id!);
      const unidadId = unidadRef.id;

      const payloadUnidad = {
        nombre: formData.nombre,
        tipo: formData.tipo,
        categoria: formData.categoria,
        modelo: formData.modelo,
        patente: formData.patente,
        kilometraje: formData.kilometraje,
        combustible: formData.combustible,
        estado: formData.estado,
        imagen: formData.imagen,
        ...(esModoCrear ? { ultima_revision: null } : {}),
      };

      if (esModoCrear) {
        batch.set(unidadRef, payloadUnidad);
      } else {
        batch.update(unidadRef, payloadUnidad);
      }

      if (!esGuardia) {
        let ubicacionesEnDB: any[] = [];
        let elementosEnDB: any[] = [];
        const estadoPorElementoId = new Map<string, string>();

        if (!esModoCrear) {
          const [uSnap, eSnap] = await Promise.all([
            getDocs(query(collection(db, "ubicaciones"), where("unidad_id", "==", unidadId))),
            getDocs(query(collection(db, "elementos"), where("unidad_id", "==", unidadId))),
          ]);
          ubicacionesEnDB = uSnap.docs;
          elementosEnDB = eSnap.docs;
          elementosEnDB.forEach(d => estadoPorElementoId.set(d.id, d.data().estado ?? "Desconocido"));
        }

        const ubicacionesGuardadas = new Set<string>();
        const elementosGuardados = new Set<string>();

        formData.ubicaciones.forEach((ubicacion, indexUbicacion) => {
          const ubicacionRef = ubicacion.id
            ? doc(db, "ubicaciones", ubicacion.id)
            : doc(collection(db, "ubicaciones"));

          ubicacionesGuardadas.add(ubicacionRef.id);
          batch.set(ubicacionRef, {
            nombre: ubicacion.nombre,
            unidad_id: unidadId,
            orden: indexUbicacion,
          });

          ubicacion.elementos.forEach((elemento, indexElemento) => {
            const elementoRef = elemento.id
              ? doc(db, "elementos", elemento.id)
              : doc(collection(db, "elementos"));

            elementosGuardados.add(elementoRef.id);
            const estadoFinal = elemento.estado ?? estadoPorElementoId.get(elementoRef.id) ?? "Desconocido";

            batch.set(elementoRef, {
              nombre: elemento.nombre,
              cantidad: elemento.cantidad === "-" ? "-" : Number(elemento.cantidad || 1),
              unidad_id: unidadId,
              ubicacion_id: ubicacionRef.id,
              orden: indexElemento,
              estado: estadoFinal,
            });
          });
        });

        elementosEnDB.forEach(d => { if (!elementosGuardados.has(d.id)) batch.delete(d.ref); });
        ubicacionesEnDB.forEach(d => { if (!ubicacionesGuardadas.has(d.id)) batch.delete(d.ref); });
      }

      await batch.commit();

      await registrarAuditoria({
        accion: esModoCrear ? "crear" : "editar",
        coleccion: "unidades",
        docId: unidadId,
        docResumen: `${formData.nombre} (${formData.patente})`,
        operador: buildOperador(miembroActivo, user?.rol),
        detalles: esModoCrear
          ? { descripcion: "Creación de unidad e inventario inicial" }
          : { cambios: datosOriginales ? calcularDiff(datosOriginales, payloadUnidad) : [] },
      });

      toast.success(esModoCrear ? "Unidad creada con éxito" : "Cambios guardados con éxito");
      navigate(esModoCrear ? "/unidades" : `/unidad/${unidadId}`);
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar la unidad");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const moverUbicacion = (index: number, direccion: "arriba" | "abajo") => {
    const nuevas = [...formData.ubicaciones];
    const destino = direccion === "arriba" ? index - 1 : index + 1;
    if (destino < 0 || destino >= nuevas.length) return;
    [nuevas[destino], nuevas[index]] = [nuevas[index], nuevas[destino]];
    setFormData(prev => ({ ...prev, ubicaciones: nuevas }));
  };

  const moverElemento = (idxU: number, idxE: number, direccion: "arriba" | "abajo") => {
    const nuevas = [...formData.ubicaciones];
    const elementos = [...nuevas[idxU].elementos];
    const destino = direccion === "arriba" ? idxE - 1 : idxE + 1;
    if (destino < 0 || destino >= elementos.length) return;
    [elementos[destino], elementos[idxE]] = [elementos[idxE], elementos[destino]];
    nuevas[idxU].elementos = elementos;
    setFormData(prev => ({ ...prev, ubicaciones: nuevas }));
  };

  return (
    <div className="editar-unidad__contenedor-principal">
      <Header
        title={esModoCrear ? "Crear Unidad" : "Editar Unidad"}
        onBack={() => navigate(esModoCrear ? "/unidades" : `/unidad/${id}`)}
      />

      <form onSubmit={handleSubmit} className="editar-unidad__formulario">
        <section className="editar-unidad__tarjeta">
          <h3 className="editar-unidad__seccion-titulo">Información de la Unidad</h3>
          <div className="editar-unidad__grid">
            <div className="editar-unidad__campo">
              <label>Nombre</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
            </div>

            <div className="editar-unidad__campo">
              <label>Tipo</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} required>
                <option value="">Seleccionar tipo</option>
                {TIPOS_UNIDAD.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>

            <div className="editar-unidad__campo">
              <label>Categoría (chofer)</label>
              <select name="categoria" value={formData.categoria} onChange={handleChange} required>
                <option value="">Seleccionar categoría</option>
                {CATEGORIAS_CHOFER.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <small className="editar-unidad__ayuda-campo">
                Define qué habilitación de chofer necesita esta unidad y se usa para vincular la VTV.
              </small>
            </div>

            <div className="editar-unidad__campo">
              <label>Modelo</label>
              <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} required />
            </div>

            <div className="editar-unidad__campo">
              <label>Patente</label>
              <input type="text" name="patente" value={formData.patente} onChange={handleChange} required />
            </div>

            <div className="editar-unidad__campo">
              <label>Kilometraje</label>
              <input type="number" name="kilometraje" value={formData.kilometraje} onChange={handleChange} required />
            </div>

            <div className="editar-unidad__campo">
              <label>Combustible</label>
              <select name="combustible" value={formData.combustible} onChange={handleChange} required>
                <option value="">Seleccionar nivel</option>
                <option value="1/4">1/4</option>
                <option value="2/4">2/4</option>
                <option value="3/4">3/4</option>
                <option value="4/4">4/4</option>
              </select>
            </div>

            <div className="editar-unidad__campo">
              <label>Estado</label>
              <select name="estado" value={formData.estado} onChange={handleChange} required>
                <option value="Operativa">Operativa</option>
                <option value="En Reparación">En Reparación</option>
                <option value="Fuera de Servicio">Fuera de Servicio</option>
              </select>
            </div>

            <div className="editar-unidad__campo">
              <label>Imagen</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {uploadProgress !== null && (
                <div className="editaru-progress-container">
                  <div className="editaru-progress-bar">
                    <div className="editaru-progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="editaru-progress-text">Subiendo imagen... {uploadProgress.toFixed(0)}%</p>
                </div>
              )}
              {formData.imagen && (
                <div className="editar-unidad__preview-container">
                  <img src={formData.imagen} alt="Imagen de la unidad" className="editar-unidad__preview-img" />
                  <button
                    type="button"
                    className="editar-unidad__remove-btn"
                    onClick={() => setFormData(prev => ({ ...prev, imagen: "" }))}
                  >
                    ✖
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {!esGuardia && (
          <section className="editar-unidad__tarjeta">
            <h3 className="editar-unidad__seccion-titulo">Ubicaciones y Elementos</h3>

            {formData.ubicaciones.map((ubicacion, indexUbicacion) => (
              <div key={indexUbicacion} className="editar-unidad__bloque-ubicacion">
                <div className="editar-unidad__fila-ubicacion">
                  <input
                    type="text"
                    value={ubicacion.nombre}
                    onChange={e => {
                      const nuevas = [...formData.ubicaciones];
                      nuevas[indexUbicacion].nombre = e.target.value;
                      setFormData({ ...formData, ubicaciones: nuevas });
                    }}
                    placeholder="Nombre de la ubicación"
                    className="editar-unidad__input-ubicacion"
                  />
                  <div className="editar-unidad__mover-ubicacion">
                    <button type="button" onClick={() => moverUbicacion(indexUbicacion, "arriba")} disabled={indexUbicacion === 0}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onClick={() => moverUbicacion(indexUbicacion, "abajo")} disabled={indexUbicacion === formData.ubicaciones.length - 1}>
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="editar-unidad__btn-icono"
                    onClick={() => {
                      const nuevas = formData.ubicaciones.filter((_, i) => i !== indexUbicacion);
                      setFormData({ ...formData, ubicaciones: nuevas });
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {ubicacion.elementos.map((elemento, indexElemento) => (
                  <div key={indexElemento} className="editar-unidad__fila-elemento">
                    <input
                      type="text"
                      value={elemento.nombre}
                      onChange={e => {
                        const nuevas = [...formData.ubicaciones];
                        nuevas[indexUbicacion].elementos[indexElemento].nombre = e.target.value;
                        setFormData({ ...formData, ubicaciones: nuevas });
                      }}
                      placeholder="Nombre del elemento"
                      className="editar-unidad__input-elemento"
                    />
                    <input
                      type="text"
                      value={elemento.cantidad === "-" ? "-" : elemento.cantidad ?? ""}
                      onChange={e => {
                        const valor = e.target.value;
                        const nuevas = [...formData.ubicaciones];
                        if (/^\d*$/.test(valor) || valor === "-") {
                          nuevas[indexUbicacion].elementos[indexElemento].cantidad = valor === "-" ? "-" : parseInt(valor);
                          setFormData({ ...formData, ubicaciones: nuevas });
                        }
                      }}
                      placeholder="Cant."
                      className="editar-unidad__input-cantidad"
                    />
                    <div className="editar-unidad__mover-elemento">
                      <button type="button" onClick={() => moverElemento(indexUbicacion, indexElemento, "arriba")} disabled={indexElemento === 0}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" onClick={() => moverElemento(indexUbicacion, indexElemento, "abajo")} disabled={indexElemento === ubicacion.elementos.length - 1}>
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="editar-unidad__btn-icono"
                      onClick={() => {
                        const nuevas = [...formData.ubicaciones];
                        nuevas[indexUbicacion].elementos = nuevas[indexUbicacion].elementos.filter((_, i) => i !== indexElemento);
                        setFormData({ ...formData, ubicaciones: nuevas });
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                <div className="editar-unidad__agregar-elemento-wrapper">
                  <button
                    type="button"
                    className="editar-unidad__btn-secundario"
                    onClick={() => {
                      const nuevas = [...formData.ubicaciones];
                      nuevas[indexUbicacion].elementos.push({ id: "", nombre: "", cantidad: 1 });
                      setFormData({ ...formData, ubicaciones: nuevas });
                    }}
                  >
                    + Agregar Elemento
                  </button>
                </div>
              </div>
            ))}

            <div className="editar-unidad__agregar-ubicacion-wrapper">
              <button
                type="button"
                className="editar-unidad__btn-principal"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  ubicaciones: [...prev.ubicaciones, { id: "", nombre: "", elementos: [] }],
                }))}
              >
                + Agregar nueva ubicación
              </button>
            </div>
          </section>
        )}

        <div className="editar-unidad__footer">
          <button type="submit" className="editar-unidad__btn-guardar" disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? "Guardando..." : esModoCrear ? "Crear Unidad" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditarUnidad;