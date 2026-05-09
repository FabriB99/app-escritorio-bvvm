import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';

import { db } from '../../app/firebase-config';

import { Trash2, Plus, Search, Pencil, Layers, Users, Settings } from 'lucide-react';

import './AdminIdentidades.css';
import Header from "../../components/Header";

type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
  pin: string;
  ordenOperativo: number;
  grupoSemana: number;
  roles: string[];
  categoria: string;
  grado?: string;
  activo: boolean;
};

const CATEGORIAS_ORDEN = [
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

const CATEGORIAS_LABELS: Record<string, string> = {
  "Oficiales Superiores": "Oficiales Superiores",
  "Oficiales Jefes": "Oficiales Jefes",
  "Oficiales Subalternos": "Oficiales Subalternos",
  "Suboficiales Superiores": "Suboficiales Superiores",
  "Suboficiales Subalternos": "Suboficiales Subalternos",
  "Bomberos": "Bomberos",
  "Aspirantes": "Aspirantes",
  "Brigada Auxiliar": "Brigada Auxiliar",
  "Retiro Efectivo": "Retiro Efectivo",
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

// 🔥 TRAER MIEMBROS (VERSIÓN SEGURA)
useEffect(() => {
  const q = query(collection(db, 'miembros'), orderBy('apellido'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const docs: Miembro[] = snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,

          nombre: data.nombre ?? "",
          apellido: data.apellido ?? "",
          pin: data.pin ?? "",

          roles: Array.isArray(data.roles) ? data.roles : [],
          categoria: data.categoria ?? "",

          ordenOperativo:
            typeof data.ordenOperativo === "number"
              ? data.ordenOperativo
              : typeof data.ordenMerito === "number"
                ? data.ordenMerito
                : typeof data.numero === "number"
                  ? data.numero
                  : 999,
          grupoSemana: typeof data.grupoSemana === "number" ? data.grupoSemana : 0,
          grado: typeof data.grado === "string" ? data.grado : "",

          // 🔥 CLAVE TOTAL
          activo: data.activo !== false
        };
      });

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

  // 🔥 SOFT DELETE
  const eliminarMiembro = async (id: string) => {
    try {
      await updateDoc(doc(db, 'miembros', id), {
        activo: false
      });

      setToast('Miembro desactivado correctamente.');
      setTimeout(() => setToast(''), 2500);

    } catch {
      setError('Error al eliminar.');
      setTimeout(() => setError(''), 2500);
    }
  };

  // 🔍 FILTRO
  const miembrosFiltrados = miembros.filter(
    m =>
      `${m.apellido} ${m.nombre}`.toLowerCase().includes(filtro.toLowerCase()) ||
      m.roles.some(r => r.toLowerCase().includes(filtro.toLowerCase())) ||
      (m.categoria && m.categoria.toLowerCase().includes(filtro.toLowerCase()))
  );

  // 🧠 AGRUPAR (MISMA LÓGICA TUYA)
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
            key: "configGrados",
            label: "Grados",
            icon: Settings,
            onClick: () => navigate('/admin/grados'),
            ariaLabel: "Configurar grados",
            className: "btn-toggle-vista"
          },
          {
            key: "toggleVista",
            label: vistaPor === "categoria" ? "Ver por Roles" : "Ver por Categorías",
            icon: vistaPor === "categoria" ? Layers : Users,
            onClick: () =>
              setVistaPor(vistaPor === "categoria" ? "rol" : "categoria"),
            ariaLabel: "Cambiar vista",
            className: "btn-toggle-vista"
          }
        ]}
      />

      {/* BUSCADOR */}
      <div className="admin-identidades__buscador-contenedor">

        <div className="admin-identidades__buscador-wrapper">
          <Search size={16} className="admin-identidades__icono-buscar" />
          <input
            type="text"
            placeholder="Buscar..."
            className="admin-identidades__buscador"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>

        <button
          className="admin-identidades__btn-agregar"
          onClick={() => navigate('/admin/crear-identidad')}
        >
          <Plus size={16} />
          Agregar Usuario
        </button>

      </div>

      {/* CONTENIDO */}
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

                  {[...lista]
                    .sort((a, b) => (a.ordenOperativo ?? 999) - (b.ordenOperativo ?? 999))
                    .map((m) => (
                      <div key={m.id} className="admin-identidades__tarjeta">

                      {/* NOMBRE */}
                      <p className="admin-identidades__nombre">
                        <strong>{m.apellido}, {m.nombre}</strong>
                      </p>

                      {/* META (№ y G) */}
                      <div className="admin-identidades__meta">
                        <span className="admin-identidades__badge admin-identidades__badge--orden">
                          №: {m.ordenOperativo}
                        </span>
                        {/* Corregido: Ahora muestra el 0 correctamente */}
                        <span className="admin-identidades__badge admin-identidades__badge--grupo">
                          G: {m.grupoSemana !== undefined ? m.grupoSemana : "-"}
                        </span>
                      </div>

                      {/* GRADO (Ahora es lo único que se ve abajo) */}
                      {m.grado ? (
                        <p className="admin-identidades__grado-unico">{m.grado}</p>
                      ) : (
                        <p className="admin-identidades__grado-pendiente">Grado no asignado</p>
                      )}

                      {/* ACCIONES */}
                      <div className="admin-identidades__acciones">
                        <button
                          className="admin-identidades__btn-editar"
                          onClick={() => navigate(`/admin/editar-identidad/${m.id}`)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          className="admin-identidades__btn-eliminar"
                          onClick={() => eliminarMiembro(m.id)}
                        >
                          <Trash2 size={16} />
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

      {toast && (
        <div className="admin-identidades__toast">
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminIdentidades;