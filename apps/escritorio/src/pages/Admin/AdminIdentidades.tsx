import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../app/firebase-config';
import {
  Plus,
  Search,
  Pencil,
  RotateCcw,
  MoreVertical,
  UserMinus,
  Trash2,
  ChevronDown,
  X,
  Award,
  Check,
  ShieldAlert,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import Header from "../../components/Header";
import {
  Miembro,
  CATEGORIAS_ORDEN,
  ROLES_ORDEN,
  ROLES_LABELS,
} from './identidadesConstants';
import './AdminIdentidades.css';

type TipoModal = 'desactivar' | 'reactivar' | 'eliminar';

interface ModalConfig {
  abierto: boolean;
  tipo: TipoModal;
  miembro: Miembro | null;
}

const AdminIdentidades: React.FC = () => {
  const navigate = useNavigate();

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos');
  const [filtroGrupoAbierto, setFiltroGrupoAbierto] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [vistaPor, setVistaPor] = useState<"categoria" | "rol">("categoria");

  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const filtroGrupoRef = useRef<HTMLDivElement | null>(null);

  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    abierto: false,
    tipo: 'desactivar',
    miembro: null,
  });
  const [ejecutandoAccion, setEjecutandoAccion] = useState(false);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuAbiertoId(null);
      }
      if (filtroGrupoRef.current && !filtroGrupoRef.current.contains(target)) {
        setFiltroGrupoAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'miembros'), orderBy('apellido'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Miembro[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nombre: data.nombre ?? "",
            apellido: data.apellido ?? "",
            dni: data.dni ?? "",
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
            activo: data.activo !== false,
          };
        });

        setMiembros(docs);
        setCargando(false);
      },
      (error) => {
        console.error("Error al cargar miembros:", error);
        toast.error("Error al sincronizar miembros.");
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const abrirModal = (tipo: TipoModal, miembro: Miembro) => {
    setMenuAbiertoId(null);
    setModalConfig({ abierto: true, tipo, miembro });
  };

  const cerrarModal = () => {
    if (ejecutandoAccion) return;
    setModalConfig({ abierto: false, tipo: 'desactivar', miembro: null });
  };

  const ejecutarAccionModal = async () => {
    const { tipo, miembro } = modalConfig;
    if (!miembro) return;

    setEjecutandoAccion(true);

    try {
      if (tipo === 'desactivar') {
        await updateDoc(doc(db, 'miembros', miembro.id), { activo: false });
        toast.success(`${miembro.apellido}, ${miembro.nombre} desactivado.`);
      } else if (tipo === 'reactivar') {
        await updateDoc(doc(db, 'miembros', miembro.id), { activo: true });
        toast.success(`${miembro.apellido}, ${miembro.nombre} reactivado.`);
      } else if (tipo === 'eliminar') {
        const tareas = [deleteDoc(doc(db, 'miembros', miembro.id))];
        if (miembro.dni) {
          tareas.push(deleteDoc(doc(db, 'usuariosBiblioteca', miembro.dni)));
        }
        await Promise.all(tareas);
        toast.success("Usuario eliminado de forma permanente.");
      }
      cerrarModal();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al procesar la solicitud.");
    } finally {
      setEjecutandoAccion(false);
    }
  };

  const miembrosFiltrados = useMemo(() => {
    const busqueda = filtroTexto.trim().toLowerCase();

    return miembros.filter((m) => {
      if (m.activo !== !verInactivos) return false;
      if (filtroGrupo !== 'todos' && m.grupoSemana !== Number(filtroGrupo)) return false;
      if (!busqueda) return true;

      const nombreCompleto = `${m.apellido} ${m.nombre}`.toLowerCase();
      const dni = m.dni ? m.dni.includes(busqueda) : false;
      const roles = m.roles.some((r) => r.toLowerCase().includes(busqueda));
      const categoria = m.categoria?.toLowerCase().includes(busqueda);
      const grado = m.grado?.toLowerCase().includes(busqueda);
      const orden = m.ordenOperativo.toString().includes(busqueda);

      return nombreCompleto.includes(busqueda) || dni || roles || categoria || grado || orden;
    });
  }, [miembros, filtroTexto, filtroGrupo, verInactivos]);

  const grupos = useMemo(() => {
    const resultado: Record<string, Miembro[]> = {};

    if (vistaPor === "categoria") {
      CATEGORIAS_ORDEN.forEach((cat) => {
        resultado[cat] = miembrosFiltrados
          .filter((m) => m.categoria === cat)
          .sort((a, b) => (a.ordenOperativo ?? 999) - (b.ordenOperativo ?? 999));
      });
    } else {
      ROLES_ORDEN.forEach((rol) => {
        resultado[rol] = miembrosFiltrados
          .filter((m) => m.roles.includes(rol))
          .sort((a, b) => (a.ordenOperativo ?? 999) - (b.ordenOperativo ?? 999));
      });
    }

    return resultado;
  }, [miembrosFiltrados, vistaPor]);

  return (
    <div className="admin-identidades">
      <Header
        title="Gestión de Personal"
        onBack={() => navigate('/admin')}
      />

      <div className="identidades-tabs">
        <button
          className={vistaPor === 'categoria' ? 'activo' : ''}
          onClick={() => setVistaPor('categoria')}
        >
          Por Categorías Jerárquicas
        </button>

        <button
          className={vistaPor === 'rol' ? 'activo' : ''}
          onClick={() => setVistaPor('rol')}
        >
          Por Roles de Sistema
        </button>
      </div>

      <section className="identidades-toolbar">
        <div className="identidades-busqueda">
          <Search size={18} />
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Buscar por nombre, orden, DNI o grado..."
          />
          {filtroTexto && (
            <button type="button" onClick={() => setFiltroTexto('')} className="busqueda-limpiar">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="identidades-toolbar-acciones">
          <div className="filtro-desplegable" ref={filtroGrupoRef}>
            <button
              type="button"
              className="filtro-desplegable-boton"
              onClick={() => setFiltroGrupoAbierto(!filtroGrupoAbierto)}
            >
              <span>{filtroGrupo === 'todos' ? 'Todos los grupos' : `Grupo ${filtroGrupo}`}</span>
              <ChevronDown size={16} />
            </button>

            {filtroGrupoAbierto && (
              <div className="filtro-desplegable-menu">
                {[
                  { value: 'todos', label: 'Todos los grupos' },
                  { value: '0', label: 'Grupo 0' },
                  { value: '1', label: 'Grupo 1' },
                  { value: '2', label: 'Grupo 2' },
                  { value: '3', label: 'Grupo 3' },
                ].map((opcion) => (
                  <button
                    key={opcion.value}
                    type="button"
                    className={filtroGrupo === opcion.value ? 'seleccionado' : ''}
                    onClick={() => {
                      setFiltroGrupo(opcion.value);
                      setFiltroGrupoAbierto(false);
                    }}
                  >
                    <span>{opcion.label}</span>
                    {filtroGrupo === opcion.value && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className={`btn-secundario-filtro ${verInactivos ? 'activo' : ''}`}
            onClick={() => setVerInactivos(prev => !prev)}
          >
            {verInactivos ? <UserCheck size={16} /> : <UserX size={16} />}
            <span>{verInactivos ? "Viendo Bajas" : "Ver Bajas"}</span>
          </button>

          <button
            type="button"
            className="btn-secundario-filtro"
            onClick={() => navigate('/admin/grados')}
          >
            <Award size={16} />
            <span>Grados</span>
          </button>

          <button
            type="button"
            className="btn-primario-accion"
            onClick={() => navigate('/admin/crear-identidad')}
          >
            <Plus size={16} />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </section>

      {cargando ? (
        <div className="identidades-cargando">
          <p>Cargando identidades...</p>
        </div>
      ) : miembrosFiltrados.length === 0 ? (
        <div className="tabla-vacia">
          <div className="tabla-vacia-icon"><Search size={22} /></div>
          <strong>No se encontraron resultados</strong>
          <span>Probá cambiando el texto de búsqueda o el grupo seleccionado.</span>
        </div>
      ) : (
        <div className="identidades-grupos-contenedor">
          {Object.entries(grupos).map(([grupoClave, lista]) => {
            if (lista.length === 0) return null;

            const titulo =
              vistaPor === "categoria" ? grupoClave : (ROLES_LABELS[grupoClave] || grupoClave);

            return (
              <div key={grupoClave} className="identidades-bloque">
                <div className="identidades-bloque-header">
                  <h3>{titulo}</h3>
                  <span className="identidades-badge-conteo">{lista.length}</span>
                </div>

                <div className="identidades-grid">
                  {lista.map((m) => {
                    const menuEstaAbierto = menuAbiertoId === m.id;

                    return (
                      <div
                        key={m.id}
                        className={`tarjeta-miembro ${!m.activo ? 'es-inactivo' : ''}`}
                      >
                        <div className="tarjeta-miembro-header">
                          <div className="tarjeta-miembro-info">
                            <strong className="tarjeta-nombre">
                              {m.apellido}, {m.nombre}
                            </strong>
                            <div className="tarjeta-chips">
                              <span className="chip chip-orden">№ {m.ordenOperativo}</span>
                              <span className="chip chip-grupo">G{m.grupoSemana ?? "-"}</span>
                              {m.dni && <span className="chip chip-dni">DNI {m.dni}</span>}
                            </div>
                          </div>

                          <div
                            className="tarjeta-menu-wrap"
                            ref={menuEstaAbierto ? menuRef : null}
                          >
                            <button
                              type="button"
                              className="btn-menu-puntos"
                              onClick={() => setMenuAbiertoId(menuEstaAbierto ? null : m.id)}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {menuEstaAbierto && (
                              <div className="dropdown-opciones">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuAbiertoId(null);
                                    navigate(`/admin/editar-identidad/${m.id}`);
                                  }}
                                >
                                  <Pencil size={14} />
                                  <span>Editar datos</span>
                                </button>

                                {m.activo ? (
                                  <button
                                    type="button"
                                    className="opcion-advertencia"
                                    onClick={() => abrirModal('desactivar', m)}
                                  >
                                    <UserMinus size={14} />
                                    <span>Desactivar</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="opcion-reactivar"
                                    onClick={() => abrirModal('reactivar', m)}
                                  >
                                    <RotateCcw size={14} />
                                    <span>Reactivar</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="opcion-peligro"
                                  onClick={() => abrirModal('eliminar', m)}
                                >
                                  <Trash2 size={14} />
                                  <span>Eliminar definitivo</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="tarjeta-miembro-footer">
                          <span className={`tarjeta-grado ${!m.grado ? 'sin-grado' : ''}`}>
                            {m.grado || 'Sin grado asignado'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalConfig.abierto && modalConfig.miembro && (
        <div className="modal-identidades" onClick={cerrarModal}>
          <div className="confirmacion-content" onClick={(e) => e.stopPropagation()}>
            <div className={`confirmacion-icono icono-${modalConfig.tipo}`}>
              <ShieldAlert size={20} />
            </div>

            <h2>
              {modalConfig.tipo === 'desactivar' && 'Desactivar miembro'}
              {modalConfig.tipo === 'reactivar' && 'Reactivar miembro'}
              {modalConfig.tipo === 'eliminar' && 'Eliminar definitivamente'}
            </h2>

            <p>
              {modalConfig.tipo === 'desactivar' && (
                <>¿Seguro que querés desactivar a <strong>{modalConfig.miembro.apellido}, {modalConfig.miembro.nombre}</strong>? No podrá registrar guardias pero conservará su historial.</>
              )}
              {modalConfig.tipo === 'reactivar' && (
                <>¿Confirmás la reactivación de <strong>{modalConfig.miembro.apellido}, {modalConfig.miembro.nombre}</strong>?</>
              )}
              {modalConfig.tipo === 'eliminar' && (
                <>¿Eliminar de forma permanente a <strong>{modalConfig.miembro.apellido}, {modalConfig.miembro.nombre}</strong>? Esta acción no se puede deshacer.</>
              )}
            </p>

            <div className="confirmacion-botones">
              <button
                type="button"
                className="boton-cancelar"
                onClick={cerrarModal}
                disabled={ejecutandoAccion}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={`boton-confirmar accion-${modalConfig.tipo}`}
                onClick={ejecutarAccionModal}
                disabled={ejecutandoAccion}
              >
                {ejecutandoAccion ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminIdentidades;