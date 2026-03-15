import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import { FaTrash, FaPlus, FaSearch, FaEdit, FaLayerGroup } from 'react-icons/fa';
import './AdminIdentidades.css';
import Header from "../../components/Header";

type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
  pin: string;
  roles: string[];
  categoria: string;
};

// Orden real para la lógica
const CATEGORIAS_ORDEN = ["Jefe", "Oficial", "Suboficial", "Bombero", "Aspirante"];
// Cómo se muestran en los títulos
const CATEGORIAS_LABELS: Record<string, string> = {
  "Jefe": "Jefes",
  "Oficial": "Oficiales",
  "Suboficial": "SubOficiales",
  "Bombero": "Bomberos",
  "Aspirante": "Aspirantes"
};

const ROLES_ORDEN = ["admin", "jefatura", "graduados", "guardia", "legajo"];

const ROLES_LABELS: Record<string, string> = {
  "admin": "Administrador",
  "jefatura": "Jefatura",
  "graduados": "Graduados",
  "guardia": "Guardia",
  "legajo": "Legajo"
};

const AdminIdentidades: React.FC = () => {
  const navigate = useNavigate();

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [filtro, setFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [vistaPor, setVistaPor] = useState<"categoria" | "rol">("categoria");

  useEffect(() => {
    const q = query(collection(db, 'miembros'), orderBy('apellido'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre,
          apellido: doc.data().apellido,
          pin: doc.data().pin,
          roles: doc.data().roles || [],
          categoria: doc.data().categoria || "",
        }));
        setMiembros(docs);
        setCargando(false);
      },
      () => {
        setError('Error al cargar los datos.');
        setCargando(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const confirmarEliminacion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'miembros', id));
      setToast(`Miembro eliminado correctamente.`);
      setTimeout(() => setToast(''), 2500);
    } catch {
      setError('Error al eliminar el miembro.');
      setTimeout(() => setError(''), 2500);
    }
  };

  const miembrosFiltrados = miembros.filter(
    m =>
      `${m.apellido} ${m.nombre}`.toLowerCase().includes(filtro.toLowerCase()) ||
      m.roles.some(r => r.toLowerCase().includes(filtro.toLowerCase())) ||
      (m.categoria && m.categoria.toLowerCase().includes(filtro.toLowerCase()))
  );

  // Agrupador dinámico según vista
  const agruparMiembros = () => {
    if (vistaPor === "categoria") {
      const grupos: Record<string, Miembro[]> = {};
      CATEGORIAS_ORDEN.forEach(cat => {
        grupos[cat] = miembrosFiltrados.filter(m => m.categoria === cat);
      });
      return grupos;
    } else {
      const grupos: Record<string, Miembro[]> = {};
      ROLES_ORDEN.forEach(r => {
        grupos[r] = miembrosFiltrados.filter(m => m.roles.includes(r));
      });
      return grupos;
    }
  };

  const grupos = agruparMiembros();

  return (
    <div className="admin-identidades__contenedor">
      <Header
        title="Gestión de Usuarios"
        onBack={() => navigate('/admin')}
        extraButtons={[
          {
            key: "toggleVista",
            label: vistaPor === "categoria" ? "Ver por Roles" : "Ver por Categorías",
            icon: FaLayerGroup,
            onClick: () => setVistaPor(vistaPor === "categoria" ? "rol" : "categoria"),
            ariaLabel: "Cambiar vista",
            className: "btn-toggle-vista"
          }
        ]}
      />

      <div className="admin-identidades__buscador-contenedor">
        <div className="admin-identidades__buscador-wrapper">
          <FaSearch className="admin-identidades__icono-buscar" />
          <input
            type="text"
            placeholder="Buscar por nombre, rol o categoría..."
            className="admin-identidades__buscador"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>

        <button
          className="admin-identidades__btn-agregar"
          onClick={() => navigate('/admin/crear-identidad')}
        >
          <FaPlus /> Agregar Usuario
        </button>
      </div>

      {cargando ? (
        <p>Cargando miembros...</p>
      ) : error ? (
        <p className="admin-identidades__error">{error}</p>
      ) : miembrosFiltrados.length === 0 ? (
        <p className="admin-identidades__sin-resultados">No se encontraron resultados.</p>
      ) : (
        <div className="admin-identidades__grupos">
          {Object.entries(grupos).map(([grupo, lista]) =>
            lista.length > 0 && (
              <div key={grupo} className="admin-identidades__grupo">
                <h2 className="admin-identidades__grupo-titulo">
                  {vistaPor === "categoria"
                    ? CATEGORIAS_LABELS[grupo] || grupo
                    : ROLES_LABELS[grupo] || grupo}
                </h2>
                <div className="admin-identidades__tarjetas">
                  {lista.map((m) => (
                    <div key={m.id} className="admin-identidades__tarjeta">
                      <p className="admin-identidades__nombre">{m.apellido}, {m.nombre}</p>
                      <p className="admin-identidades__rol">{m.roles.join(', ') || 'Ninguno'}</p>
                      <p className="admin-identidades__categoria">{m.categoria}</p>
                      <div className="admin-identidades__acciones">
                        <button
                          className="admin-identidades__btn-editar"
                          onClick={() => navigate(`/admin/editar-identidad/${m.id}`)}
                          title="Editar miembro"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="admin-identidades__btn-eliminar"
                          onClick={() => confirmarEliminacion(m.id)}
                          title="Eliminar miembro"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {toast && <div className="admin-identidades__toast">{toast}</div>}
    </div>
  );
};

export default AdminIdentidades;
