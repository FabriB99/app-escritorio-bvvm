import React, { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../app/firebase-config";
import { FilePlusCorner, Pencil, Trash2, ChevronRight } from "lucide-react";
import Header from "../../components/Header";
import "./AdminGrados.css";

type Grado = {
  id: string;
  nombre: string;
  categoria: string;
  orden: number;
  activo: boolean;
};

const CATEGORIAS = [
  "Oficiales Superiores",
  "Oficiales Jefes",
  "Oficiales Subalternos",
  "Suboficiales Superiores",
  "Suboficiales Subalternos",
  "Bomberos",
  "Aspirantes",
  "Brigada Auxiliar",
  "Retiro Efectivo",
];

const AdminGrados: React.FC = () => {
  const navigate = useNavigate();
  const [grados, setGrados] = useState<Grado[]>([]);
  const [nuevo, setNuevo] = useState({ nombre: "", categoria: "", orden: 0 });
  const [editando, setEditando] = useState<Grado | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "grados"), (snapshot) => {
      const data: Grado[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          nombre: d.nombre ?? "",
          categoria: d.categoria ?? "",
          orden: Number(d.orden) || 999,
          activo: d.activo !== false
        };
      });

      setGrados(data.filter((g) => g.activo).sort((a, b) => a.orden - b.orden));
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  const crearGrado = async () => {
    if (!nuevo.nombre || !nuevo.categoria) return alert("Completá nombre y categoría");
    try {
      await addDoc(collection(db, "grados"), { ...nuevo, activo: true });
      setNuevo({ nombre: "", categoria: "", orden: 0 });
    } catch (e: any) { alert(e.message); }
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    try {
      await updateDoc(doc(db, "grados", editando.id), {
        nombre: editando.nombre,
        categoria: editando.categoria,
        orden: Number(editando.orden)
      });
      setEditando(null);
    } catch (e: any) { alert(e.message); }
  };

  const eliminarGrado = async (id: string) => {
    if (!window.confirm("¿Eliminar este grado?")) return;
    try {
      await updateDoc(doc(db, "grados", id), { activo: false });
    } catch (e: any) { alert(e.message); }
  };

  // 🧠 Agrupar grados por categoría para la vista
  const gradosAgrupados = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = grados.filter(g => g.categoria === cat);
    return acc;
  }, {} as Record<string, Grado[]>);

  return (
    <div className="admin-grados">
      <Header title="Configuración de Grados" onBack={() => navigate("/admin/identidades")} />

      <div className="contenido-principal">
        {/* FORMULARIO DE CREACIÓN COMPACTO */}
        <div className="admin-grados__form-card">
          <h3><FilePlusCorner /> Nuevo Grado</h3>
          <div className="admin-grados__form-row">
            <input 
              placeholder="Ej: Cabo Primero" 
              value={nuevo.nombre} 
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} 
            />
            <select 
              value={nuevo.categoria} 
              onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
            >
              <option value="">Categoría...</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input 
              type="number" 
              placeholder="Orden" 
              value={nuevo.orden} 
              onChange={(e) => setNuevo({ ...nuevo, orden: Number(e.target.value) })} 
            />
            <button onClick={crearGrado} className="btn-crear">Crear</button>
          </div>
        </div>

        {/* LISTADO AGRUPADO */}
        {cargando ? (
          <p>Cargando...</p>
        ) : (
          <div className="admin-grados__secciones">
            {CATEGORIAS.map(cat => gradosAgrupados[cat].length > 0 && (
              <div key={cat} className="admin-grados__categoria-bloque">
                <h2 className="categoria-header">
                  <ChevronRight size={18} /> {cat}
                </h2>
                <div className="admin-grados__tabla">
                  {gradosAgrupados[cat].map(g => (
                    <div key={g.id} className="admin-grados__fila">
                      {editando?.id === g.id ? (
                        <div className="fila-edicion">
                          <input 
                            value={editando.nombre} 
                            onChange={e => setEditando({...editando, nombre: e.target.value})} 
                          />
                          <input 
                            type="number" 
                            value={editando.orden} 
                            onChange={e => setEditando({...editando, orden: Number(e.target.value)})} 
                          />
                          <button onClick={guardarEdicion}>OK</button>
                        </div>
                      ) : (
                        <>
                          <span className="grado-nombre">{g.nombre}</span>
                          <span className="grado-orden">Orden: {g.orden}</span>
                          <div className="grado-acciones">
                            <button onClick={() => setEditando(g)}><Pencil size={14} /></button>
                            <button onClick={() => eliminarGrado(g.id)}><Trash2 size={14} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGrados;