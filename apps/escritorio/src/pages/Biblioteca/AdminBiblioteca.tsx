import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { invoke } from '@tauri-apps/api/core';
import { db, storage } from '../../app/firebase-config';
import { useUser } from '../../context/UserContext';
import Header from '../../components/Header';
import PageLoader from '../../components/PageLoader/PageLoader';
import { toast } from 'sonner';
import {
  FolderPlus,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Link2,
  UploadCloud,
  ExternalLink,
  Download,
  Eye,
  Save,
  BookOpen,
  History,
  ShieldAlert,
  Search,
  Calendar,
  Layers,
  HardDrive,
  Sparkles,
  Globe,
  AlertTriangle,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import './AdminBiblioteca.css';

// ─── Tipos de Datos ───────────────────────────────────────────────────────────

export interface GrupoBiblioteca {
  id: string;
  nombre: string;
  orden: number;
}

export interface ArchivoBiblioteca {
  nombre: string;
  url: string;
  fecha: number;
  tipo?: 'archivo' | 'link';
  peso?: number;
}

export interface TabBiblioteca {
  id: string;
  nombre: string;
  archivos?: ArchivoBiblioteca[];
}

export interface SeccionBiblioteca {
  id: string;
  nombre: string;
  ruta: string;
  descripcion?: string;
  grupo: string;
  orden: number;
  tabs: TabBiblioteca[];
}

export interface AccesoBiblioteca {
  id: string;
  dni: string;
  nombre: string;
  apellido?: string;
  roles?: string[];
  categoria?: string;
  timestamp: Timestamp;
}

interface UploadItem {
  id: string;
  fileName: string;
  size: number;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

// ─── Helpers de Formato y Archivos ────────────────────────────────────────────

const slugify = (text: string): string =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const formatFecha = (timestamp?: number): string => {
  if (!timestamp || isNaN(timestamp)) return '—';
  const d = new Date(timestamp);
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
};

const getFileExtension = (nombre: string): string => {
  const parts = nombre.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
};

const getResourceVisual = (recurso: ArchivoBiblioteca) => {
  if (recurso.tipo === 'link') {
    return {
      icon: Link2,
      variant: 'link',
      badge: 'LINK',
    };
  }
  const ext = getFileExtension(recurso.nombre);
  if (ext === 'pdf') {
    return {
      icon: FileText,
      variant: 'pdf',
      badge: 'PDF',
    };
  }
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) {
    return {
      icon: FileText,
      variant: 'word',
      badge: ext.toUpperCase(),
    };
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return {
      icon: FileSpreadsheet,
      variant: 'excel',
      badge: ext.toUpperCase(),
    };
  }
  return {
    icon: FileIcon,
    variant: 'other',
    badge: ext ? ext.toUpperCase() : 'ARCHIVO',
  };
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const AdminBiblioteca: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, miembroActivo, loading: authLoading } = useUser();

  // Permisos: 'admin', 'jefatura' o miembro identificado con rol administrativo/jefatura
  const tienePermiso =
    user?.rol === 'admin' ||
    user?.rol === 'jefatura' ||
    user?.rol === 'graduados' ||
    Boolean(
      miembroActivo?.roles?.some((r) =>
        ['admin', 'jefatura', 'graduados'].includes(r.toLowerCase())
      )
    );

  // Modo de vista en Header: Gestión de Contenidos vs Registro de Accesos
  const [vistaActiva, setVistaActiva] = useState<'contenidos' | 'accesos'>(() => {
    return location.pathname.includes('registro') ? 'accesos' : 'contenidos';
  });

  // ─── Estados de Grupos y Secciones (Tiempo real con Firestore) ─────────────
  const [grupos, setGrupos] = useState<GrupoBiblioteca[]>([]);
  const [secciones, setSecciones] = useState<SeccionBiblioteca[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [busquedaSidebar, setBusquedaSidebar] = useState('');

  // Nuevo Grupo (input rápido superior)
  const [mostrandoInputGrupo, setMostrandoInputGrupo] = useState(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [creandoGrupo, setCreandoGrupo] = useState(false);

  // Renombrar Grupo en línea y menú de acciones (3 puntos)
  const [grupoEditandoId, setGrupoEditandoId] = useState<string | null>(null);
  const [grupoNombreEditado, setGrupoNombreEditado] = useState('');
  const [menuGrupoAbiertoId, setMenuGrupoAbiertoId] = useState<string | null>(null);
  const [menuTabAbiertoIdx, setMenuTabAbiertoIdx] = useState<number | null>(null);

  // Nueva Sección rápida dentro de un grupo
  const [grupoCreandoSeccion, setGrupoCreandoSeccion] = useState<string | null>(null);
  const [nuevaSeccionNombre, setNuevaSeccionNombre] = useState('');
  const [nuevaSeccionDescripcion, setNuevaSeccionDescripcion] = useState('');
  const [creandoSeccion, setCreandoSeccion] = useState(false);

  // ─── Estados de la Sección Seleccionada (Panel Derecho) ────────────────────
  const [seccionActivaId, setSeccionActivaId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRuta, setEditRuta] = useState('');
  const [editGrupo, setEditGrupo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editTabs, setEditTabs] = useState<TabBiblioteca[]>([]);
  const [tabActivoIdx, setTabActivoIdx] = useState<number>(0);
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);
  const [guardandoSeccion, setGuardandoSeccion] = useState(false);

  // Edición de Pestañas (Tabs)
  const [creandoTab, setCreandoTab] = useState(false);
  const [nuevoTabNombre, setNuevoTabNombre] = useState('');
  const [renombrandoTabIdx, setRenombrandoTabIdx] = useState<number | null>(null);
  const [tabNombreTemporal, setTabNombreTemporal] = useState('');

  // Drag & Drop y Subida múltiple de archivos
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadsActivos, setUploadsActivos] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Agregar Link Externo
  const [modalLinkAbierto, setModalLinkAbierto] = useState(false);
  const [nuevoLinkNombre, setNuevoLinkNombre] = useState('');
  const [nuevoLinkUrl, setNuevoLinkUrl] = useState('');

  // Edición inline de recurso (nombre / url) y confirmación rápida de borrado
  const [recursoEditandoIdx, setRecursoEditandoIdx] = useState<number | null>(null);
  const [recursoNombreTemp, setRecursoNombreTemp] = useState('');
  const [recursoUrlTemp, setRecursoUrlTemp] = useState('');
  const [recursoConfirmarBorrarIdx, setRecursoConfirmarBorrarIdx] = useState<number | null>(null);
  const [busquedaRecursos, setBusquedaRecursos] = useState('');

  // Modal de confirmación general (Eliminar Grupo / Eliminar Sección / Eliminar Tab)
  const [confirmModal, setConfirmModal] = useState<{
    abierto: boolean;
    titulo: string;
    mensaje: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [ejecutandoConfirm, setEjecutandoConfirm] = useState(false);

  // ─── Estados de Registro de Accesos (Auditoría) ────────────────────────────
  const [accesos, setAccesos] = useState<AccesoBiblioteca[]>([]);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [busquedaAccesos, setBusquedaAccesos] = useState('');
  const [cargandoAccesos, setCargandoAccesos] = useState(false);

  // ─── Suscripción en Tiempo Real a Grupos y Secciones ───────────────────────
  useEffect(() => {
    if (!tienePermiso) return;

    const qGrupos = query(collection(db, 'grupos_biblioteca'), orderBy('orden'));
    const unsubGrupos = onSnapshot(
      qGrupos,
      (snap) => {
        const lista: GrupoBiblioteca[] = snap.docs.map((d) => ({
          id: d.id,
          nombre: d.data().nombre || '',
          orden: typeof d.data().orden === 'number' ? d.data().orden : 0,
        }));
        setGrupos(lista);
      },
      (err) => {
        console.error('Error al escuchar grupos_biblioteca:', err);
        toast.error('Error al sincronizar grupos de la biblioteca.');
      }
    );

    const qSecciones = query(collection(db, 'secciones'), orderBy('orden'));
    const unsubSecciones = onSnapshot(
      qSecciones,
      (snap) => {
        const lista: SeccionBiblioteca[] = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            nombre: raw.nombre || '',
            ruta: raw.ruta || '',
            descripcion: raw.descripcion || '',
            grupo: raw.grupo || '',
            orden: typeof raw.orden === 'number' ? raw.orden : 0,
            tabs: Array.isArray(raw.tabs)
              ? raw.tabs.map((t: any) => ({
                  id: t.id || slugify(t.nombre || 'tab'),
                  nombre: t.nombre || 'Sin título',
                  archivos: Array.isArray(t.archivos) ? t.archivos : [],
                }))
              : [],
          };
        });
        setSecciones(lista);
        setCargandoDatos(false);
      },
      (err) => {
        console.error('Error al escuchar secciones:', err);
        toast.error('Error al sincronizar secciones.');
        setCargandoDatos(false);
      }
    );

    return () => {
      unsubGrupos();
      unsubSecciones();
    };
  }, [tienePermiso]);

  // Cerrar menús contextuales al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setMenuGrupoAbiertoId(null);
      setMenuTabAbiertoIdx(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Seleccionar primera sección automáticamente si no hay ninguna activa
  useEffect(() => {
    if (!seccionActivaId && secciones.length > 0 && grupos.length > 0) {
      const primerGrupo = grupos[0];
      const primeraDelGrupo = secciones.find((s) => s.grupo === primerGrupo.nombre);
      const candidata = primeraDelGrupo || secciones[0];
      if (candidata) {
        seleccionarSeccion(candidata);
      }
    }
  }, [secciones, grupos, seccionActivaId]);

  // ─── Cargar sección en el editor derecho ───────────────────────────────────
  const seleccionarSeccion = (sec: SeccionBiblioteca) => {
    setSeccionActivaId(sec.id);
    setEditNombre(sec.nombre);
    setEditRuta(sec.ruta || slugify(sec.nombre));
    setEditGrupo(sec.grupo);
    setEditDescripcion(sec.descripcion || '');
    const tabsNormalizados =
      sec.tabs && sec.tabs.length > 0
        ? sec.tabs.map((t) => ({
            id: t.id || slugify(t.nombre),
            nombre: t.nombre,
            archivos: [...(t.archivos || [])],
          }))
        : [{ id: 'documentos', nombre: 'Documentos', archivos: [] }];
    setEditTabs(tabsNormalizados);
    setTabActivoIdx(0);
    setHayCambiosSinGuardar(false);
    setRecursoEditandoIdx(null);
    setRecursoConfirmarBorrarIdx(null);
    setRenombrandoTabIdx(null);
    setBusquedaRecursos('');
  };

  // Mantener sincronizada la sección activa cuando cambia desde Firestore (si no hay edición pendiente)
  useEffect(() => {
    if (!seccionActivaId || hayCambiosSinGuardar) return;
    const actualizada = secciones.find((s) => s.id === seccionActivaId);
    if (actualizada) {
      setEditNombre(actualizada.nombre);
      setEditRuta(actualizada.ruta || slugify(actualizada.nombre));
      setEditGrupo(actualizada.grupo);
      setEditDescripcion(actualizada.descripcion || '');
      const tabsNorm =
        actualizada.tabs && actualizada.tabs.length > 0
          ? actualizada.tabs
          : [{ id: 'documentos', nombre: 'Documentos', archivos: [] }];
      setEditTabs(tabsNorm);
      if (tabActivoIdx >= tabsNorm.length) {
        setTabActivoIdx(Math.max(0, tabsNorm.length - 1));
      }
    }
  }, [secciones, seccionActivaId, hayCambiosSinGuardar]);

  // ─── Persistencia directa de la sección activa en Firestore ────────────────
  const persistirSeccionEnFirestore = async (
    customData?: Partial<{
      nombre: string;
      ruta: string;
      grupo: string;
      descripcion: string;
      tabs: TabBiblioteca[];
    }>,
    mostrarToast = true
  ) => {
    if (!seccionActivaId) return;

    const nombreFinal = (customData?.nombre ?? editNombre).trim();
    const rutaFinal = slugify(customData?.ruta ?? (editRuta || nombreFinal));
    const grupoFinal = customData?.grupo ?? editGrupo;
    const descFinal = (customData?.descripcion ?? editDescripcion).trim();
    const tabsFinal = customData?.tabs ?? editTabs;

    if (!nombreFinal) {
      toast.warning('El nombre de la sección no puede estar vacío.');
      return;
    }
    if (!grupoFinal) {
      toast.warning('Seleccioná un grupo para la sección.');
      return;
    }

    setGuardandoSeccion(true);
    try {
      await updateDoc(doc(db, 'secciones', seccionActivaId), {
        nombre: nombreFinal,
        ruta: rutaFinal,
        grupo: grupoFinal,
        descripcion: descFinal,
        tabs: tabsFinal,
        actualizadoEn: serverTimestamp(),
      });
      setEditRuta(rutaFinal);
      setHayCambiosSinGuardar(false);
      if (mostrarToast) {
        toast.success('Cambios guardados en la sección.');
      }
    } catch (error) {
      console.error('Error al guardar sección:', error);
      toast.error('No se pudieron guardar los cambios.');
    } finally {
      setGuardandoSeccion(false);
    }
  };

  // ─── Acciones de Grupos (Columna Izquierda) ────────────────────────────────

  const handleCrearGrupo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const nombreLimpio = nuevoGrupoNombre.trim();
    if (!nombreLimpio) return;

    if (grupos.some((g) => g.nombre.toLowerCase() === nombreLimpio.toLowerCase())) {
      toast.warning('Ya existe un grupo con ese nombre.');
      return;
    }

    setCreandoGrupo(true);
    try {
      const maxOrden = grupos.reduce((max, g) => (g.orden > max ? g.orden : max), 0);
      await addDoc(collection(db, 'grupos_biblioteca'), {
        nombre: nombreLimpio,
        orden: maxOrden + 1,
      });
      setNuevoGrupoNombre('');
      setMostrandoInputGrupo(false);
      toast.success(`Grupo "${nombreLimpio}" creado.`);
    } catch (error) {
      console.error('Error creando grupo:', error);
      toast.error('No se pudo crear el grupo.');
    } finally {
      setCreandoGrupo(false);
    }
  };

  const handleRenombrarGrupo = async (grupo: GrupoBiblioteca) => {
    const nuevoNombre = grupoNombreEditado.trim();
    if (!nuevoNombre || nuevoNombre === grupo.nombre) {
      setGrupoEditandoId(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'grupos_biblioteca', grupo.id), {
        nombre: nuevoNombre,
      });

      // Actualizar secciones asociadas para mantener la relación por nombre de grupo
      const seccionesDelGrupo = secciones.filter((s) => s.grupo === grupo.nombre);
      await Promise.all(
        seccionesDelGrupo.map((s) =>
          updateDoc(doc(db, 'secciones', s.id), { grupo: nuevoNombre })
        )
      );

      if (editGrupo === grupo.nombre) {
        setEditGrupo(nuevoNombre);
      }

      setGrupoEditandoId(null);
      toast.success('Grupo renombrado correctamente.');
    } catch (error) {
      console.error('Error renombrando grupo:', error);
      toast.error('Error al renombrar el grupo.');
    }
  };

  const handleMoverGrupo = async (index: number, direccion: 'up' | 'down') => {
    const targetIdx = direccion === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= grupos.length) return;

    const actual = grupos[index];
    const otro = grupos[targetIdx];

    const ordenActual = typeof actual.orden === 'number' ? actual.orden : index;
    const ordenOtro =
      typeof otro.orden === 'number' && otro.orden !== ordenActual
        ? otro.orden
        : targetIdx;

    try {
      await Promise.all([
        updateDoc(doc(db, 'grupos_biblioteca', actual.id), { orden: ordenOtro }),
        updateDoc(doc(db, 'grupos_biblioteca', otro.id), { orden: ordenActual }),
      ]);
    } catch (error) {
      console.error('Error al reordenar grupos:', error);
      toast.error('No se pudo cambiar el orden del grupo.');
    }
  };

  const solicitarEliminarGrupo = (grupo: GrupoBiblioteca) => {
    const cantSecciones = secciones.filter((s) => s.grupo === grupo.nombre).length;
    setConfirmModal({
      abierto: true,
      titulo: `Eliminar grupo "${grupo.nombre}"`,
      mensaje:
        cantSecciones > 0
          ? `Se eliminará el grupo "${grupo.nombre}" junto con sus ${cantSecciones} sección(es) y todos sus recursos asociados. Esta acción es irreversible.`
          : `¿Confirmás la eliminación del grupo "${grupo.nombre}"?`,
      onConfirm: async () => {
        const seccionesAsociadas = secciones.filter((s) => s.grupo === grupo.nombre);
        await Promise.all(
          seccionesAsociadas.map((s) => deleteDoc(doc(db, 'secciones', s.id)))
        );
        await deleteDoc(doc(db, 'grupos_biblioteca', grupo.id));
        if (seccionesAsociadas.some((s) => s.id === seccionActivaId)) {
          setSeccionActivaId(null);
        }
        toast.success(`Grupo "${grupo.nombre}" eliminado.`);
      },
    });
  };

  // ─── Acciones de Secciones (Crear, Reordenar, Eliminar) ────────────────────

  const handleCrearSeccionRapida = async (e: React.FormEvent, grupoNombre: string) => {
    e.preventDefault();
    const nombreLimpio = nuevaSeccionNombre.trim();
    if (!nombreLimpio) return;

    setCreandoSeccion(true);
    try {
      const rutaGenerada = slugify(nombreLimpio);
      const maxOrden = secciones.reduce(
        (max, s) => (typeof s.orden === 'number' && s.orden > max ? s.orden : max),
        0
      );

      const nuevaData = {
        nombre: nombreLimpio,
        ruta: rutaGenerada,
        descripcion: nuevaSeccionDescripcion.trim(),
        grupo: grupoNombre,
        orden: maxOrden + 1,
        tabs: [
          {
            id: 'general',
            nombre: 'General',
            archivos: [],
          },
        ],
        creadoEn: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'secciones'), nuevaData);

      setNuevaSeccionNombre('');
      setNuevaSeccionDescripcion('');
      setGrupoCreandoSeccion(null);

      seleccionarSeccion({
        id: docRef.id,
        ...nuevaData,
      });

      toast.success(`Sección "${nombreLimpio}" creada.`);
    } catch (error) {
      console.error('Error creando sección:', error);
      toast.error('No se pudo crear la sección.');
    } finally {
      setCreandoSeccion(false);
    }
  };

  const handleMoverSeccion = async (
    seccionesGrupo: SeccionBiblioteca[],
    index: number,
    direccion: 'up' | 'down',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const targetIdx = direccion === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= seccionesGrupo.length) return;

    const actual = seccionesGrupo[index];
    const otra = seccionesGrupo[targetIdx];

    const ordenActual = typeof actual.orden === 'number' ? actual.orden : index;
    const ordenOtra =
      typeof otra.orden === 'number' && otra.orden !== ordenActual
        ? otra.orden
        : targetIdx;

    try {
      await Promise.all([
        updateDoc(doc(db, 'secciones', actual.id), { orden: ordenOtra }),
        updateDoc(doc(db, 'secciones', otra.id), { orden: ordenActual }),
      ]);
    } catch (error) {
      console.error('Error reordenando sección:', error);
      toast.error('No se pudo reordenar la sección.');
    }
  };

  const solicitarEliminarSeccion = (sec: SeccionBiblioteca, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmModal({
      abierto: true,
      titulo: `Eliminar sección "${sec.nombre}"`,
      mensaje: `¿Seguro que deseas eliminar la sección "${sec.nombre}" y todas sus pestañas y recursos? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        await deleteDoc(doc(db, 'secciones', sec.id));
        if (seccionActivaId === sec.id) {
          const restante = secciones.find((s) => s.id !== sec.id);
          if (restante) seleccionarSeccion(restante);
          else setSeccionActivaId(null);
        }
        toast.success(`Sección "${sec.nombre}" eliminada.`);
      },
    });
  };

  // ─── Acciones de Pestañas (Tabs) ───────────────────────────────────────────

  const handleAgregarTab = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const nombreLimpio = nuevoTabNombre.trim();
    if (!nombreLimpio) return;

    const nuevoTab: TabBiblioteca = {
      id: slugify(nombreLimpio) || `tab-${Date.now()}`,
      nombre: nombreLimpio,
      archivos: [],
    };

    const nuevosTabs = [...editTabs, nuevoTab];
    setEditTabs(nuevosTabs);
    setTabActivoIdx(nuevosTabs.length - 1);
    setNuevoTabNombre('');
    setCreandoTab(false);

    await persistirSeccionEnFirestore({ tabs: nuevosTabs }, false);
    toast.success(`Pestaña "${nombreLimpio}" agregada.`);
  };

  const handleConfirmarRenombrarTab = async (idx: number) => {
    const limpio = tabNombreTemporal.trim();
    if (!limpio) {
      setRenombrandoTabIdx(null);
      return;
    }

    const nuevosTabs = editTabs.map((t, i) =>
      i === idx ? { ...t, nombre: limpio, id: slugify(limpio) || t.id } : t
    );
    setEditTabs(nuevosTabs);
    setRenombrandoTabIdx(null);
    await persistirSeccionEnFirestore({ tabs: nuevosTabs }, false);
    toast.success('Pestaña renombrada.');
  };

  const handleMoverTab = async (idx: number, direccion: 'left' | 'right') => {
    const nuevoIdx = direccion === 'left' ? idx - 1 : idx + 1;
    if (nuevoIdx < 0 || nuevoIdx >= editTabs.length) return;

    const nuevosTabs = [...editTabs];
    [nuevosTabs[idx], nuevosTabs[nuevoIdx]] = [nuevosTabs[nuevoIdx], nuevosTabs[idx]];
    setEditTabs(nuevosTabs);
    setTabActivoIdx(nuevoIdx);
    await persistirSeccionEnFirestore({ tabs: nuevosTabs }, false);
  };

  const solicitarEliminarTab = (idx: number) => {
    if (editTabs.length <= 1) {
      toast.warning('La sección debe tener al menos una pestaña.');
      return;
    }
    const tab = editTabs[idx];
    const cantArchivos = tab.archivos?.length || 0;

    setConfirmModal({
      abierto: true,
      titulo: `Eliminar pestaña "${tab.nombre}"`,
      mensaje:
        cantArchivos > 0
          ? `Esta pestaña contiene ${cantArchivos} recurso(s). ¿Seguro que querés eliminarla?`
          : `¿Confirmás la eliminación de la pestaña "${tab.nombre}"?`,
      onConfirm: async () => {
        const nuevosTabs = editTabs.filter((_, i) => i !== idx);
        setEditTabs(nuevosTabs);
        setTabActivoIdx((prev) => Math.max(0, Math.min(prev, nuevosTabs.length - 1)));
        await persistirSeccionEnFirestore({ tabs: nuevosTabs }, false);
        toast.success(`Pestaña "${tab.nombre}" eliminada.`);
      },
    });
  };

  // ─── Subida Múltiple de Archivos (Drag & Drop + Lote hacia Firebase Storage) ─

  const procesarSubidaArchivos = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0 || !seccionActivaId) return;

    // Asegurar que exista al menos una pestaña
    let tabsBase = [...editTabs];
    let targetTabIdx = tabActivoIdx;
    if (tabsBase.length === 0) {
      tabsBase = [{ id: 'general', nombre: 'General', archivos: [] }];
      targetTabIdx = 0;
      setEditTabs(tabsBase);
      setTabActivoIdx(0);
    }

    const batchItems: UploadItem[] = filesArray.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      fileName: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
    }));

    setUploadsActivos((prev) => [...prev, ...batchItems]);

    const nuevosArchivosSubidos: ArchivoBiblioteca[] = [];

    await Promise.all(
      filesArray.map(
        (file, idx) =>
          new Promise<void>((resolve) => {
            const uploadId = batchItems[idx].id;
            const storageRef = ref(storage, `biblioteca/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                setUploadsActivos((prev) =>
                  prev.map((item) =>
                    item.id === uploadId ? { ...item, progress } : item
                  )
                );
              },
              (error) => {
                console.error(`Error subiendo ${file.name}:`, error);
                setUploadsActivos((prev) =>
                  prev.map((item) =>
                    item.id === uploadId ? { ...item, status: 'error' } : item
                  )
                );
                toast.error(`Error al subir "${file.name}".`);
                resolve();
              },
              async () => {
                try {
                  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  nuevosArchivosSubidos.push({
                    nombre: file.name,
                    url: downloadUrl,
                    fecha: Date.now(),
                    tipo: 'archivo',
                    peso: file.size,
                  });
                  setUploadsActivos((prev) =>
                    prev.map((item) =>
                      item.id === uploadId
                        ? { ...item, progress: 100, status: 'completed' }
                        : item
                    )
                  );
                } catch (err) {
                  console.error('Error obteniendo URL de descarga:', err);
                  setUploadsActivos((prev) =>
                    prev.map((item) =>
                      item.id === uploadId ? { ...item, status: 'error' } : item
                    )
                  );
                }
                resolve();
              }
            );
          })
      )
    );

    if (nuevosArchivosSubidos.length > 0) {
      const tabsActualizados = tabsBase.map((t, i) =>
        i === targetTabIdx
          ? {
              ...t,
              archivos: [...(t.archivos || []), ...nuevosArchivosSubidos],
            }
          : t
      );

      setEditTabs(tabsActualizados);
      await persistirSeccionEnFirestore({ tabs: tabsActualizados }, false);

      toast.success(
        nuevosArchivosSubidos.length === 1
          ? `Archivo "${nuevosArchivosSubidos[0].nombre}" subido con éxito.`
          : `${nuevosArchivosSubidos.length} archivos subidos correctamente.`
      );
    }

    // Limpiar barras completadas luego de 2 segundos
    setTimeout(() => {
      setUploadsActivos((prev) =>
        prev.filter((u) => u.status === 'uploading')
      );
    }, 2000);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      procesarSubidaArchivos(e.dataTransfer.files);
    }
  };

  // ─── Acciones de Links Externos y Recursos ─────────────────────────────────

  const handleAgregarLinkExterno = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nuevoLinkNombre.trim();
    let url = nuevoLinkUrl.trim();
    if (!nombre || !url) {
      toast.warning('Completá el nombre y la URL del enlace.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const nuevoLink: ArchivoBiblioteca = {
      nombre,
      url,
      fecha: Date.now(),
      tipo: 'link',
    };

    const nuevosTabs = editTabs.map((t, i) =>
      i === tabActivoIdx
        ? { ...t, archivos: [...(t.archivos || []), nuevoLink] }
        : t
    );

    setEditTabs(nuevosTabs);
    setNuevoLinkNombre('');
    setNuevoLinkUrl('');
    setModalLinkAbierto(false);

    await persistirSeccionEnFirestore({ tabs: nuevosTabs }, false);
    toast.success(`Enlace "${nombre}" agregado.`);
  };

  const iniciarEdicionRecurso = (idx: number, recurso: ArchivoBiblioteca) => {
    setRecursoEditandoIdx(idx);
    setRecursoNombreTemp(recurso.nombre);
    setRecursoUrlTemp(recurso.url);
    setRecursoConfirmarBorrarIdx(null);
  };

  const guardarEdicionRecurso = async (idx: number) => {
    const nombreLimpio = recursoNombreTemp.trim();
    if (!nombreLimpio) {
      toast.warning('El nombre del recurso no puede estar vacío.');
      return;
    }

    const tabActual = editTabs[tabActivoIdx];
    if (!tabActual || !tabActual.archivos) return;

    const recursoOriginal = tabActual.archivos[idx];
    let urlLimpia = recursoUrlTemp.trim() || recursoOriginal.url;
    if (recursoOriginal.tipo === 'link' && !/^https?:\/\//i.test(urlLimpia)) {
      urlLimpia = `https://${urlLimpia}`;
    }

    const nuevosArchivos = tabActual.archivos.map((a, i) =>
      i === idx ? { ...a, nombre: nombreLimpio, url: urlLimpia } : a
    );

    const nuevosTabs = editTabs.map((t, i) =>
      i === tabActivoIdx ? { ...t, archivos: nuevosArchivos } : t
    );

    setEditTabs(nuevosTabs);
    setRecursoEditandoIdx(null);
    await persistirSeccionEnFirestore({ tabs: nuevosTabs }, false);
    toast.success('Recurso actualizado.');
  };

  const eliminarRecursoConfirmado = async (idx: number) => {
    const tabActual = editTabs[tabActivoIdx];
    if (!tabActual || !tabActual.archivos) return;

    const eliminado = tabActual.archivos[idx];
    const nuevosArchivos = tabActual.archivos.filter((_, i) => i !== idx);
    const nuevosTabs = editTabs.map((t, i) =>
      i === tabActivoIdx ? { ...t, archivos: nuevosArchivos } : t
    );

    setEditTabs(nuevosTabs);
    setRecursoConfirmarBorrarIdx(null);
    await persistirSeccionEnFirestore({ tabs: nuevosTabs }, false);
    toast.success(`"${eliminado.nombre}" eliminado.`);
  };

  const abrirRecurso = async (recurso: ArchivoBiblioteca, indexEnTab: number) => {
    if (recurso.tipo === 'link') {
      let url = recurso.url;
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      try {
        await invoke('abrir_en_navegador', { url });
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (tabActivoIdx === 0 && editRuta) {
      navigate(`/biblioteca/previsualizar/${editRuta}/${indexEnTab}`);
    } else if (recurso.url) {
      window.open(recurso.url, '_blank', 'noopener,noreferrer');
    }
  };

  const descargarRecurso = async (recurso: ArchivoBiblioteca) => {
    if (!recurso.url) return;
    try {
      const response = await fetch(recurso.url);
      if (!response.ok) throw new Error('Error al descargar');
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = recurso.nombre;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);
    } catch {
      window.open(recurso.url, '_blank', 'noopener,noreferrer');
    }
  };

  // ─── Lógica del Registro de Accesos (Auditoría) ────────────────────────────

  useEffect(() => {
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(hoy.getMonth() - 1);

    const formatDate = (d: Date) => d.toISOString().slice(0, 10);
    const inicio = formatDate(haceUnMes);
    const fin = formatDate(hoy);

    setFechaInicio(inicio);
    setFechaFin(fin);
    if (tienePermiso) {
      cargarAccesosPorRango(inicio, fin);
    }
  }, [tienePermiso]);

  const cargarAccesosPorRango = async (inicioStr: string, finStr: string) => {
    if (!inicioStr || !finStr) {
      toast.warning('Seleccioná un rango de fechas válido.');
      return;
    }
    setCargandoAccesos(true);
    try {
      const inicio = new Date(`${inicioStr}T00:00:00`);
      const fin = new Date(`${finStr}T23:59:59`);
      const accesosRef = collection(db, 'accesosBiblioteca');
      const q = query(
        accesosRef,
        where('timestamp', '>=', Timestamp.fromDate(inicio)),
        where('timestamp', '<=', Timestamp.fromDate(fin)),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      const lista: AccesoBiblioteca[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AccesoBiblioteca, 'id'>),
      }));
      setAccesos(lista);
    } catch (error) {
      console.error('Error al cargar registro de accesos:', error);
      toast.error('Error al cargar el historial de accesos.');
    } finally {
      setCargandoAccesos(false);
    }
  };

  const eliminarAccesoIndividual = async (acceso: AccesoBiblioteca) => {
    const esAdmin =
      user?.rol === 'admin' ||
      Boolean(miembroActivo?.roles?.some((r) => r.toLowerCase() === 'admin'));

    if (!esAdmin) {
      const ok = window.confirm(
        `¿Eliminar el registro de acceso de ${acceso.apellido || ''} ${acceso.nombre || ''}?`
      );
      if (!ok) return;
    }

    try {
      await deleteDoc(doc(db, 'accesosBiblioteca', acceso.id));
      setAccesos((prev) => prev.filter((a) => a.id !== acceso.id));
      toast.success('Acceso eliminado');
    } catch (error) {
      console.error('Error al eliminar acceso individual:', error);
      toast.error('No se pudo eliminar el registro de acceso.');
    }
  };

  const solicitarEliminarAccesosRango = () => {
    if (!fechaInicio || !fechaFin) {
      toast.warning('Seleccioná fechas para limpiar registros.');
      return;
    }
    setConfirmModal({
      abierto: true,
      titulo: 'Eliminar registros del período',
      mensaje: `¿Confirmás la eliminación de los ${accesos.length} registros de acceso entre ${fechaInicio} y ${fechaFin}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        const inicio = new Date(`${fechaInicio}T00:00:00`);
        const fin = new Date(`${fechaFin}T23:59:59`);
        const q = query(
          collection(db, 'accesosBiblioteca'),
          where('timestamp', '>=', Timestamp.fromDate(inicio)),
          where('timestamp', '<=', Timestamp.fromDate(fin))
        );
        const snap = await getDocs(q);
        await Promise.all(
          snap.docs.map((d) => deleteDoc(doc(db, 'accesosBiblioteca', d.id)))
        );
        toast.success('Registros de acceso eliminados.');
        await cargarAccesosPorRango(fechaInicio, fechaFin);
      },
    });
  };

  const accesosFiltrados = useMemo(() => {
    const q = busquedaAccesos.trim().toLowerCase();
    if (!q) return accesos;
    return accesos.filter((a) => {
      const nombreCompleto = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
      const dni = (a.dni || '').toLowerCase();
      const cat = (a.categoria || '').toLowerCase();
      return nombreCompleto.includes(q) || dni.includes(q) || cat.includes(q);
    });
  }, [accesos, busquedaAccesos]);

  // ─── Datos derivados para el Editor ────────────────────────────────────────
  const tabActual = editTabs[tabActivoIdx] || null;
  const recursosTabActual = useMemo(() => {
    const lista = tabActual?.archivos || [];
    const q = busquedaRecursos.trim().toLowerCase();
    if (!q) return lista.map((item, idx) => ({ item, originalIdx: idx }));
    return lista
      .map((item, idx) => ({ item, originalIdx: idx }))
      .filter(({ item }) => item.nombre.toLowerCase().includes(q));
  }, [tabActual, busquedaRecursos]);

  const totalRecursosSeccion = useMemo(
    () => editTabs.reduce((acc, t) => acc + (t.archivos?.length || 0), 0),
    [editTabs]
  );

  // ─── Validación de Permisos y Seguridad ────────────────────────────────────
  if (authLoading && !user) {
    return (
      <div className="admin-biblio-page">
        <Header title="Biblioteca Virtual" onBack={() => navigate('/dashboard-guardia')} />
        <PageLoader texto="Cargando administración de biblioteca..." />
      </div>
    );
  }

  if (!tienePermiso) {
    return (
      <div className="admin-biblio-page">
        <Header title="Biblioteca Virtual" onBack={() => navigate('/biblioteca')} />
        <div className="admin-biblio-denied">
          <div className="admin-biblio-denied__card">
            <div className="admin-biblio-denied__icon">
              <ShieldAlert size={36} />
            </div>
            <h2>Permisos Insuficientes</h2>
            <p>
              Esta consola de administración está restringida exclusivamente a usuarios con rol{' '}
              <strong>Administrador</strong> o <strong>Jefatura</strong>.
            </p>
            <div className="admin-biblio-denied__actions">
              <button
                type="button"
                className="ab-btn ab-btn--secondary"
                onClick={() => navigate('/dashboard-guardia')}
              >
                Ir al Panel Principal
              </button>
              <button
                type="button"
                className="ab-btn ab-btn--primary"
                onClick={() => navigate('/biblioteca')}
              >
                Ir a Biblioteca Virtual
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render Principal ──────────────────────────────────────────────────────

  return (
    <div className="admin-biblio-page">
      <Header
        title="Biblioteca Virtual"
        onBack={() => navigate('/dashboard-guardia')}
      />

      {/* Sub-header con Selector de Modo (Gestión de Contenidos | Registro de Accesos) */}
      <div className="admin-biblio-topbar">
        <div className="admin-biblio-topbar__info">
          <div className="admin-biblio-topbar__badge">
            <BookOpen size={16} />
          </div>
          <div>
            <h2 className="admin-biblio-topbar__title">Consola de Administración de Biblioteca</h2>
            <p className="admin-biblio-topbar__subtitle">
              Gestioná grupos, secciones, pestañas, documentos en la nube y auditoría de ingresos en un solo lugar.
            </p>
          </div>
        </div>

        <div className="admin-biblio-mode-switch" role="tablist" aria-label="Modo de administración">
          <button
            type="button"
            role="tab"
            aria-selected={vistaActiva === 'contenidos'}
            className={`mode-switch-btn ${vistaActiva === 'contenidos' ? 'active' : ''}`}
            onClick={() => setVistaActiva('contenidos')}
          >
            <Layers size={16} />
            <span>Gestión de Contenidos</span>
            <span className="mode-switch-pill">{secciones.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={vistaActiva === 'accesos'}
            className={`mode-switch-btn ${vistaActiva === 'accesos' ? 'active' : ''}`}
            onClick={() => setVistaActiva('accesos')}
          >
            <History size={16} />
            <span>Registro de Accesos</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          VISTA 1: MASTER-DETAIL — GESTIÓN DE CONTENIDOS
         ═══════════════════════════════════════════════════════════════════════ */}
      {vistaActiva === 'contenidos' ? (
        <div className="admin-biblio-workspace">
          {/* ─── COLUMNA LATERAL IZQUIERDA: EXPLORADOR DE GRUPOS Y SECCIONES ─── */}
          <aside className="admin-biblio-sidebar">
            <div className="ab-sidebar-header">
              <div className="ab-sidebar-header__top">
                <span className="ab-sidebar-title">Estructura de Biblioteca</span>
                <button
                  type="button"
                  className="ab-btn-new-group"
                  onClick={() => {
                    setMostrandoInputGrupo((prev) => !prev);
                    setNuevoGrupoNombre('');
                  }}
                >
                  <FolderPlus size={15} />
                  <span>+ Nuevo Grupo</span>
                </button>
              </div>

              {/* Input rápido para crear Nuevo Grupo */}
              {mostrandoInputGrupo && (
                <form onSubmit={handleCrearGrupo} className="ab-quick-group-form">
                  <input
                    type="text"
                    placeholder="Nombre del nuevo grupo..."
                    value={nuevoGrupoNombre}
                    onChange={(e) => setNuevoGrupoNombre(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="ab-icon-btn ab-icon-btn--emerald"
                    disabled={creandoGrupo || !nuevoGrupoNombre.trim()}
                    title="Crear grupo"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    className="ab-icon-btn"
                    onClick={() => setMostrandoInputGrupo(false)}
                    title="Cancelar"
                  >
                    <X size={15} />
                  </button>
                </form>
              )}

              {/* Buscador rápido en el explorador */}
              <div className="ab-sidebar-search">
                <Search size={14} className="ab-sidebar-search__icon" />
                <input
                  type="text"
                  placeholder="Buscar sección o grupo..."
                  value={busquedaSidebar}
                  onChange={(e) => setBusquedaSidebar(e.target.value)}
                />
                {busquedaSidebar && (
                  <button
                    type="button"
                    className="ab-sidebar-search__clear"
                    onClick={() => setBusquedaSidebar('')}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="ab-sidebar-groups">
              {cargandoDatos ? (
                <div className="ab-sidebar-empty">
                  <Loader2 size={22} className="spin-icon" />
                  <span>Cargando estructura...</span>
                </div>
              ) : grupos.length === 0 ? (
                <div className="ab-sidebar-empty">
                  <Folder size={28} />
                  <p>No hay grupos creados aún.</p>
                  <span>Usá el botón "+ Nuevo Grupo" para comenzar.</span>
                </div>
              ) : (
                grupos.map((grupo, gIdx) => {
                  const terminoBusqueda = busquedaSidebar.trim().toLowerCase();
                  const coincideGrupo =
                    !terminoBusqueda || grupo.nombre.toLowerCase().includes(terminoBusqueda);
                  const seccionesDelGrupo = secciones
                    .filter((s) => s.grupo === grupo.nombre)
                    .filter((s) =>
                      !terminoBusqueda || coincideGrupo
                        ? true
                        : s.nombre.toLowerCase().includes(terminoBusqueda)
                    )
                    .sort((a, b) => a.orden - b.orden);

                  if (terminoBusqueda && !coincideGrupo && seccionesDelGrupo.length === 0) {
                    return null;
                  }

                  const estaEditandoGrupo = grupoEditandoId === grupo.id;
                  const estaCreandoSeccionAqui = grupoCreandoSeccion === grupo.id;
                  const menuGrupoAbierto = menuGrupoAbiertoId === grupo.id;

                  return (
                    <div key={grupo.id} className="ab-group-block">
                      <div className="ab-group-header">
                        {estaEditandoGrupo ? (
                          <div className="ab-group-rename-row">
                            <input
                              type="text"
                              value={grupoNombreEditado}
                              onChange={(e) => setGrupoNombreEditado(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenombrarGrupo(grupo);
                                if (e.key === 'Escape') setGrupoEditandoId(null);
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="ab-icon-btn ab-icon-btn--emerald"
                              onClick={() => handleRenombrarGrupo(grupo)}
                              title="Guardar nombre"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              className="ab-icon-btn"
                              onClick={() => setGrupoEditandoId(null)}
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="ab-group-title-wrap">
                              <span className="ab-group-name" title={grupo.nombre}>
                                {grupo.nombre}
                              </span>
                              <span className="ab-group-count">{seccionesDelGrupo.length}</span>
                            </div>

                            <div
                              className="ab-group-menu-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="ab-icon-btn ab-group-more-btn"
                                onClick={() =>
                                  setMenuGrupoAbiertoId((prev) =>
                                    prev === grupo.id ? null : grupo.id
                                  )
                                }
                                title="Acciones del grupo"
                                aria-label="Acciones del grupo"
                              >
                                <MoreVertical size={15} />
                              </button>

                              {menuGrupoAbierto && (
                                <div className="ab-context-menu">
                                  <button
                                    type="button"
                                    className="ab-context-menu__item"
                                    onClick={() => {
                                      setMenuGrupoAbiertoId(null);
                                      setGrupoEditandoId(grupo.id);
                                      setGrupoNombreEditado(grupo.nombre);
                                    }}
                                  >
                                    <Pencil size={13} />
                                    <span>Renombrar grupo</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="ab-context-menu__item"
                                    disabled={gIdx === 0}
                                    onClick={() => {
                                      setMenuGrupoAbiertoId(null);
                                      handleMoverGrupo(gIdx, 'up');
                                    }}
                                  >
                                    <ChevronUp size={14} />
                                    <span>Subir</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="ab-context-menu__item"
                                    disabled={gIdx === grupos.length - 1}
                                    onClick={() => {
                                      setMenuGrupoAbiertoId(null);
                                      handleMoverGrupo(gIdx, 'down');
                                    }}
                                  >
                                    <ChevronDown size={14} />
                                    <span>Bajar</span>
                                  </button>
                                  <div className="ab-context-menu__divider" />
                                  <button
                                    type="button"
                                    className="ab-context-menu__item ab-context-menu__item--danger"
                                    onClick={() => {
                                      setMenuGrupoAbiertoId(null);
                                      solicitarEliminarGrupo(grupo);
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    <span>Eliminar</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Listado de secciones del grupo */}
                      <div className="ab-section-list">
                        {seccionesDelGrupo.length === 0 ? (
                          <div className="ab-section-empty">Sin secciones en este grupo</div>
                        ) : (
                          seccionesDelGrupo.map((sec, sIdx) => {
                            const esActiva = sec.id === seccionActivaId;
                            const cantTabs = sec.tabs?.length || 0;
                            const cantArchivos =
                              sec.tabs?.reduce(
                                (acc, t) => acc + (t.archivos?.length || 0),
                                0
                              ) || 0;

                            return (
                              <div
                                key={sec.id}
                                className={`ab-section-item ${esActiva ? 'active' : ''}`}
                                onClick={() => seleccionarSeccion(sec)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') seleccionarSeccion(sec);
                                }}
                              >
                                <div className="ab-section-item__icon">
                                  {esActiva ? (
                                    <FolderOpen size={17} />
                                  ) : (
                                    <Folder size={17} />
                                  )}
                                </div>

                                <div className="ab-section-item__body">
                                  <div className="ab-section-item__name">{sec.nombre}</div>
                                  <div className="ab-section-item__meta">
                                    <span>{cantTabs} {cantTabs === 1 ? 'tab' : 'tabs'}</span>
                                    <span className="ab-dot">•</span>
                                    <span>{cantArchivos} {cantArchivos === 1 ? 'archivo' : 'archivos'}</span>
                                  </div>
                                </div>

                                <div
                                  className="ab-section-item__actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {sIdx > 0 && (
                                    <button
                                      type="button"
                                      className="ab-mini-btn"
                                      onClick={(e) =>
                                        handleMoverSeccion(seccionesDelGrupo, sIdx, 'up', e)
                                      }
                                      title="Subir sección"
                                    >
                                      <ChevronUp size={13} />
                                    </button>
                                  )}
                                  {sIdx < seccionesDelGrupo.length - 1 && (
                                    <button
                                      type="button"
                                      className="ab-mini-btn"
                                      onClick={(e) =>
                                        handleMoverSeccion(seccionesDelGrupo, sIdx, 'down', e)
                                      }
                                      title="Bajar sección"
                                    >
                                      <ChevronDown size={13} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="ab-mini-btn ab-mini-btn--danger"
                                    onClick={(e) => solicitarEliminarSeccion(sec, e)}
                                    title="Eliminar sección"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Formulario rápido en línea o botón "+ Nueva Sección" */}
                      {estaCreandoSeccionAqui ? (
                        <form
                          className="ab-quick-section-form"
                          onSubmit={(e) => handleCrearSeccionRapida(e, grupo.nombre)}
                        >
                          <input
                            type="text"
                            placeholder="Nombre de la sección..."
                            value={nuevaSeccionNombre}
                            onChange={(e) => setNuevaSeccionNombre(e.target.value)}
                            autoFocus
                            required
                          />
                          <input
                            type="text"
                            placeholder="Descripción breve (opcional)..."
                            value={nuevaSeccionDescripcion}
                            onChange={(e) => setNuevaSeccionDescripcion(e.target.value)}
                          />
                          <div className="ab-quick-section-form__actions">
                            <button
                              type="button"
                              className="ab-btn ab-btn--ghost ab-btn--sm"
                              onClick={() => {
                                setGrupoCreandoSeccion(null);
                                setNuevaSeccionNombre('');
                                setNuevaSeccionDescripcion('');
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="ab-btn ab-btn--emerald ab-btn--sm"
                              disabled={creandoSeccion || !nuevaSeccionNombre.trim()}
                            >
                              {creandoSeccion ? 'Creando...' : 'Crear Sección'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="ab-btn-add-section"
                          onClick={() => {
                            setGrupoCreandoSeccion(grupo.id);
                            setNuevaSeccionNombre('');
                            setNuevaSeccionDescripcion('');
                          }}
                        >
                          <Plus size={14} />
                          <span>Nueva Sección</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ─── PANEL DERECHO: EDITOR EN VIVO DE LA SECCIÓN SELECCIONADA ─── */}
          <main className="admin-biblio-detail">
            {!seccionActivaId ? (
              <div className="ab-detail-empty">
                <div className="ab-detail-empty__icon">
                  <Sparkles size={32} />
                </div>
                <h3>Seleccioná o creá una sección para comenzar</h3>
                <p>
                  Elegí cualquier sección en el explorador izquierdo para editar sus pestañas,
                  subir documentos PDF, Word o Excel en lote y gestionar enlaces externos.
                </p>
              </div>
            ) : (
              <>
                {/* 1. CABECERA DE LA SECCIÓN ACTIVA */}
                <section className="ab-section-editor-header">
                  <div className="ab-section-editor-header__top">
                    <div className="ab-section-title-heading">
                      <input
                        type="text"
                        className="ab-section-title-input"
                        value={editNombre}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditNombre(val);
                          setEditRuta(slugify(val));
                          setHayCambiosSinGuardar(true);
                        }}
                        placeholder="Título de la sección..."
                        aria-label="Título de la sección"
                      />
                      {hayCambiosSinGuardar && (
                        <span className="ab-unsaved-pill">Sin guardar</span>
                      )}
                    </div>

                    <div className="ab-section-header-actions">
                      <button
                        type="button"
                        className="ab-btn ab-btn--primary"
                        onClick={() => persistirSeccionEnFirestore()}
                        disabled={guardandoSeccion}
                      >
                        {guardandoSeccion ? (
                          <Loader2 size={15} className="spin-icon" />
                        ) : (
                          <Save size={15} />
                        )}
                        <span>{guardandoSeccion ? 'Guardando...' : 'Guardar Cambios'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="ab-section-fields-grid">
                    <div className="ab-field">
                      <label>Grupo</label>
                      <select
                        value={editGrupo}
                        onChange={(e) => {
                          setEditGrupo(e.target.value);
                          setHayCambiosSinGuardar(true);
                        }}
                      >
                        {grupos.map((g) => (
                          <option key={g.id} value={g.nombre}>
                            {g.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ab-field ab-field--wide">
                      <label>Descripción de la Sección</label>
                      <input
                        type="text"
                        value={editDescripcion}
                        onChange={(e) => {
                          setEditDescripcion(e.target.value);
                          setHayCambiosSinGuardar(true);
                        }}
                        placeholder="Descripción breve o subtítulo informativo para las tarjetas..."
                      />
                    </div>
                  </div>
                </section>

                {/* 2. NAVEGACIÓN DE TABS (SOLAPAS) */}
                <section className="ab-tabs-bar-container">
                  <div className="ab-tabs-bar">
                    <div className="ab-tabs-scroll">
                      {editTabs.map((tab, idx) => {
                        const esTabActivo = idx === tabActivoIdx;
                        const estaRenombrando = renombrandoTabIdx === idx;
                        const cant = tab.archivos?.length || 0;
                        const menuTabAbierto = menuTabAbiertoIdx === idx;

                        return (
                          <div
                            key={`${tab.id}-${idx}`}
                            className={`ab-tab-pill ${esTabActivo ? 'active' : ''}`}
                            onClick={() => {
                              if (!estaRenombrando) {
                                setTabActivoIdx(idx);
                                setRecursoEditandoIdx(null);
                                setRecursoConfirmarBorrarIdx(null);
                              }
                            }}
                          >
                            {estaRenombrando ? (
                              <div
                                className="ab-tab-rename-inline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={tabNombreTemporal}
                                  onChange={(e) => setTabNombreTemporal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirmarRenombrarTab(idx);
                                    if (e.key === 'Escape') setRenombrandoTabIdx(null);
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleConfirmarRenombrarTab(idx)}
                                  title="Confirmar"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenombrandoTabIdx(null)}
                                  title="Cancelar"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span
                                  className="ab-tab-pill__label"
                                  onDoubleClick={() => {
                                    setRenombrandoTabIdx(idx);
                                    setTabNombreTemporal(tab.nombre);
                                  }}
                                  title="Doble clic para renombrar pestaña"
                                >
                                  {tab.nombre}
                                </span>
                                <span className="ab-tab-pill__count">{cant}</span>

                                <div
                                  className={`ab-tab-menu-wrap ${menuTabAbierto ? 'open' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="ab-tab-more-btn"
                                    onClick={() =>
                                      setMenuTabAbiertoIdx((prev) =>
                                        prev === idx ? null : idx
                                      )
                                    }
                                    title="Opciones de pestaña"
                                    aria-label="Opciones de pestaña"
                                  >
                                    <MoreVertical size={14} />
                                  </button>

                                  {menuTabAbierto && (
                                    <div className="ab-context-menu ab-context-menu--tab">
                                      <button
                                        type="button"
                                        className="ab-context-menu__item"
                                        onClick={() => {
                                          setMenuTabAbiertoIdx(null);
                                          setRenombrandoTabIdx(idx);
                                          setTabNombreTemporal(tab.nombre);
                                        }}
                                      >
                                        <Pencil size={13} />
                                        <span>Renombrar pestaña</span>
                                      </button>
                                      {idx > 0 && (
                                        <button
                                          type="button"
                                          className="ab-context-menu__item"
                                          onClick={() => {
                                            setMenuTabAbiertoIdx(null);
                                            handleMoverTab(idx, 'left');
                                          }}
                                        >
                                          <ChevronLeft size={14} />
                                          <span>Mover a la izquierda</span>
                                        </button>
                                      )}
                                      {idx < editTabs.length - 1 && (
                                        <button
                                          type="button"
                                          className="ab-context-menu__item"
                                          onClick={() => {
                                            setMenuTabAbiertoIdx(null);
                                            handleMoverTab(idx, 'right');
                                          }}
                                        >
                                          <ChevronRight size={14} />
                                          <span>Mover a la derecha</span>
                                        </button>
                                      )}
                                      {editTabs.length > 1 && (
                                        <>
                                          <div className="ab-context-menu__divider" />
                                          <button
                                            type="button"
                                            className="ab-context-menu__item ab-context-menu__item--danger"
                                            onClick={() => {
                                              setMenuTabAbiertoIdx(null);
                                              solicitarEliminarTab(idx);
                                            }}
                                          >
                                            <Trash2 size={13} />
                                            <span>Eliminar pestaña</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Botón / Input "+ Nueva Pestaña" */}
                      {creandoTab ? (
                        <form onSubmit={handleAgregarTab} className="ab-new-tab-inline">
                          <input
                            type="text"
                            placeholder="Nombre de pestaña..."
                            value={nuevoTabNombre}
                            onChange={(e) => setNuevoTabNombre(e.target.value)}
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="ab-icon-btn ab-icon-btn--emerald"
                            disabled={!nuevoTabNombre.trim()}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="ab-icon-btn"
                            onClick={() => {
                              setCreandoTab(false);
                              setNuevoTabNombre('');
                            }}
                          >
                            <X size={14} />
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="ab-btn-add-tab"
                          onClick={() => {
                            setCreandoTab(true);
                            setNuevoTabNombre('');
                          }}
                        >
                          <Plus size={14} />
                          <span>Nueva Pestaña</span>
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* 3. ZONA DE CARGA DE ARCHIVOS UNIFICADA */}
                <section className="ab-upload-section">
                  <div
                    className={`ab-unified-dropzone ${isDraggingOver ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          procesarSubidaArchivos(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />

                    <div className="ab-unified-dropzone__icon">
                      <UploadCloud size={28} />
                    </div>

                    <div className="ab-unified-dropzone__text">
                      <strong>
                        Arrastrá tus archivos aquí (PDF, Word, Excel, fotos)
                      </strong>
                      <span>
                        Se subirán directamente a la pestaña{' '}
                        <em>"{tabActual?.nombre || 'Actual'}"</em>
                      </span>
                    </div>

                    <div className="ab-unified-dropzone__actions">
                      <button
                        type="button"
                        className="ab-btn ab-btn--primary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadCloud size={15} />
                        <span>Seleccionar archivos desde la PC</span>
                      </button>

                      <span className="ab-unified-dropzone__divider">o</span>

                      <button
                        type="button"
                        className="ab-btn ab-btn--secondary"
                        onClick={() => {
                          setModalLinkAbierto((prev) => !prev);
                          setNuevoLinkNombre('');
                          setNuevoLinkUrl('');
                        }}
                      >
                        <Globe size={15} />
                        <span>O agregar enlace externo (Drive, YouTube, etc.)</span>
                      </button>
                    </div>
                  </div>

                  {/* Formulario rápido para agregar Link Externo */}
                  {modalLinkAbierto && (
                    <form onSubmit={handleAgregarLinkExterno} className="ab-external-link-box">
                      <div className="ab-external-link-box__header">
                        <Link2 size={16} />
                        <span>Nuevo Enlace Externo en "{tabActual?.nombre}"</span>
                      </div>
                      <div className="ab-external-link-box__inputs">
                        <input
                          type="text"
                          placeholder="Título del recurso (ej: Video instructivo RCP / Carpeta Drive)"
                          value={nuevoLinkNombre}
                          onChange={(e) => setNuevoLinkNombre(e.target.value)}
                          autoFocus
                          required
                        />
                        <input
                          type="text"
                          placeholder="URL (https://drive.google.com/... o https://youtube.com/...)"
                          value={nuevoLinkUrl}
                          onChange={(e) => setNuevoLinkUrl(e.target.value)}
                          required
                        />
                        <div className="ab-external-link-box__actions">
                          <button
                            type="button"
                            className="ab-btn ab-btn--ghost"
                            onClick={() => setModalLinkAbierto(false)}
                          >
                            Cancelar
                          </button>
                          <button type="submit" className="ab-btn ab-btn--emerald">
                            <Plus size={15} />
                            <span>Agregar Enlace</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Barras de Progreso por Archivo en Lote */}
                  {uploadsActivos.length > 0 && (
                    <div className="ab-upload-progress-list">
                      {uploadsActivos.map((u) => (
                        <div key={u.id} className={`ab-upload-item ${u.status}`}>
                          <div className="ab-upload-item__info">
                            <span className="ab-upload-item__name">{u.fileName}</span>
                            <span className="ab-upload-item__meta">
                              {formatFileSize(u.size)} •{' '}
                              {u.status === 'completed'
                                ? 'Completado'
                                : u.status === 'error'
                                ? 'Error'
                                : `${u.progress}%`}
                            </span>
                          </div>
                          <div className="ab-upload-item__bar-bg">
                            <div
                              className="ab-upload-item__bar-fill"
                              style={{ width: `${u.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* 4. LISTADO DE RECURSOS DE LA PESTAÑA ACTIVA */}
                <section className="ab-resources-section">
                  <div className="ab-resources-header">
                    <div className="ab-resources-header__left">
                      <h3>Recursos en "{tabActual?.nombre || 'Pestaña'}"</h3>
                      <span className="ab-resources-badge">
                        {tabActual?.archivos?.length || 0} recursos en esta pestaña ({totalRecursosSeccion} en total)
                      </span>
                    </div>

                    {(tabActual?.archivos?.length || 0) > 3 && (
                      <div className="ab-resources-search">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Buscar recurso en esta pestaña..."
                          value={busquedaRecursos}
                          onChange={(e) => setBusquedaRecursos(e.target.value)}
                        />
                        {busquedaRecursos && (
                          <button
                            type="button"
                            onClick={() => setBusquedaRecursos('')}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {recursosTabActual.length === 0 ? (
                    <div className="ab-resources-empty">
                      <HardDrive size={30} />
                      <h4>No hay archivos ni enlaces en esta pestaña</h4>
                      <p>
                        Arrastrá documentos al recuadro punteado superior o usá el botón{' '}
                        <strong>+ Agregar Link Externo</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="ab-resources-grid">
                      {recursosTabActual.map(({ item: recurso, originalIdx }) => {
                        const visual = getResourceVisual(recurso);
                        const IconComponent = visual.icon;
                        const estaEditando = recursoEditandoIdx === originalIdx;
                        const pideConfirmarBorrado = recursoConfirmarBorrarIdx === originalIdx;

                        return (
                          <div
                            key={`${recurso.url}-${originalIdx}`}
                            className={`ab-resource-card ab-resource-card--${visual.variant}`}
                          >
                            <div className={`ab-resource-icon ab-resource-icon--${visual.variant}`}>
                              <IconComponent size={20} />
                              <span className="ab-resource-ext">{visual.badge}</span>
                            </div>

                            <div className="ab-resource-body">
                              {estaEditando ? (
                                <div className="ab-resource-inline-edit">
                                  <input
                                    type="text"
                                    value={recursoNombreTemp}
                                    onChange={(e) => setRecursoNombreTemp(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') guardarEdicionRecurso(originalIdx);
                                      if (e.key === 'Escape') setRecursoEditandoIdx(null);
                                    }}
                                    placeholder="Nombre del archivo o enlace"
                                    autoFocus
                                  />
                                  {recurso.tipo === 'link' && (
                                    <input
                                      type="text"
                                      value={recursoUrlTemp}
                                      onChange={(e) => setRecursoUrlTemp(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') guardarEdicionRecurso(originalIdx);
                                        if (e.key === 'Escape') setRecursoEditandoIdx(null);
                                      }}
                                      placeholder="https://..."
                                    />
                                  )}
                                  <div className="ab-resource-inline-edit__btns">
                                    <button
                                      type="button"
                                      className="ab-btn ab-btn--emerald ab-btn--xs"
                                      onClick={() => guardarEdicionRecurso(originalIdx)}
                                    >
                                      <Check size={13} /> Guardar
                                    </button>
                                    <button
                                      type="button"
                                      className="ab-btn ab-btn--ghost ab-btn--xs"
                                      onClick={() => setRecursoEditandoIdx(null)}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div
                                    className="ab-resource-name"
                                    onClick={() => iniciarEdicionRecurso(originalIdx, recurso)}
                                    title="Hacé clic para editar el nombre en línea"
                                  >
                                    <span>{recurso.nombre}</span>
                                    <Pencil size={12} className="ab-resource-name__edit-hint" />
                                  </div>

                                  <div className="ab-resource-meta">
                                    {recurso.tipo === 'link' ? (
                                      <span className="ab-resource-url-preview" title={recurso.url}>
                                        {recurso.url}
                                      </span>
                                    ) : (
                                      <span>Peso: {formatFileSize(recurso.peso)}</span>
                                    )}
                                    <span className="ab-dot">•</span>
                                    <span>Cargado: {formatFecha(recurso.fecha)}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Acciones al hover o confirmación rápida de borrado */}
                            <div className="ab-resource-actions">
                              {pideConfirmarBorrado ? (
                                <div className="ab-resource-confirm-delete">
                                  <span>¿Eliminar?</span>
                                  <button
                                    type="button"
                                    className="ab-confirm-yes"
                                    onClick={() => eliminarRecursoConfirmado(originalIdx)}
                                  >
                                    Sí
                                  </button>
                                  <button
                                    type="button"
                                    className="ab-confirm-no"
                                    onClick={() => setRecursoConfirmarBorrarIdx(null)}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="ab-action-btn"
                                    onClick={() => abrirRecurso(recurso, originalIdx)}
                                    title={
                                      recurso.tipo === 'link'
                                        ? 'Abrir enlace externo'
                                        : 'Abrir vista previa'
                                    }
                                  >
                                    {recurso.tipo === 'link' ? (
                                      <ExternalLink size={15} />
                                    ) : (
                                      <Eye size={15} />
                                    )}
                                  </button>

                                  {recurso.tipo !== 'link' && (
                                    <button
                                      type="button"
                                      className="ab-action-btn"
                                      onClick={() => descargarRecurso(recurso)}
                                      title="Descargar archivo"
                                    >
                                      <Download size={15} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="ab-action-btn"
                                    onClick={() => iniciarEdicionRecurso(originalIdx, recurso)}
                                    title="Renombrar recurso"
                                  >
                                    <Pencil size={15} />
                                  </button>

                                  <button
                                    type="button"
                                    className="ab-action-btn ab-action-btn--danger"
                                    onClick={() => setRecursoConfirmarBorrarIdx(originalIdx)}
                                    title="Eliminar recurso"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════
           VISTA 2: AUDITORÍA — REGISTRO DE ACCESOS A LA BIBLIOTECA
           ═══════════════════════════════════════════════════════════════════════ */
        <div className="admin-biblio-audit">
          <div className="ab-audit-card">
            <div className="ab-audit-toolbar">
              <div className="ab-audit-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar por DNI, nombre, apellido o categoría..."
                  value={busquedaAccesos}
                  onChange={(e) => setBusquedaAccesos(e.target.value)}
                />
                {busquedaAccesos && (
                  <button type="button" onClick={() => setBusquedaAccesos('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="ab-audit-filters">
                <label className="ab-date-input">
                  <Calendar size={14} />
                  <span>Desde:</span>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </label>

                <label className="ab-date-input">
                  <Calendar size={14} />
                  <span>Hasta:</span>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="ab-btn ab-btn--primary"
                  disabled={cargandoAccesos}
                  onClick={() => cargarAccesosPorRango(fechaInicio, fechaFin)}
                >
                  {cargandoAccesos ? 'Consultando...' : 'Filtrar Período'}
                </button>

                {user?.rol === 'admin' && accesos.length > 0 && (
                  <button
                    type="button"
                    className="ab-btn ab-btn--danger-outline"
                    disabled={cargandoAccesos}
                    onClick={solicitarEliminarAccesosRango}
                  >
                    <Trash2 size={15} />
                    <span>Limpiar Período</span>
                  </button>
                )}
              </div>
            </div>

            <div className="ab-audit-summary">
              <span>
                Mostrando <strong>{accesosFiltrados.length}</strong> ingreso(s) registrado(s) en la Biblioteca Virtual
              </span>
            </div>

            {cargandoAccesos ? (
              <PageLoader texto="Cargando historial de accesos..." />
            ) : accesosFiltrados.length === 0 ? (
              <div className="ab-audit-empty">
                <History size={32} />
                <h4>No se encontraron accesos en este rango</h4>
                <p>Probá ajustando las fechas de inicio y fin o el filtro de búsqueda.</p>
              </div>
            ) : (
              <div className="ab-audit-table-wrap">
                <table className="ab-audit-table">
                  <thead>
                    <tr>
                      <th>DNI</th>
                      <th>Bombero / Usuario</th>
                      <th>Categoría</th>
                      <th>Fecha y Hora de Ingreso</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {accesosFiltrados.map((acceso) => (
                      <tr key={acceso.id}>
                        <td>
                          <span className="ab-dni-chip">{acceso.dni || '—'}</span>
                        </td>
                        <td>
                          <strong className="ab-user-fullname">
                            {`${acceso.apellido || ''} ${acceso.nombre || ''}`.trim() || 'Usuario'}
                          </strong>
                        </td>
                        <td>
                          <span className="ab-cat-badge">
                            {acceso.categoria || 'General'}
                          </span>
                        </td>
                        <td className="ab-timestamp-cell">
                          {acceso.timestamp?.toDate
                            ? acceso.timestamp.toDate().toLocaleString('es-AR', {
                                hour12: false,
                              })
                            : '—'}
                        </td>
                        <td className="ab-actions-cell">
                          <button
                            type="button"
                            className="ab-audit-delete-btn"
                            onClick={() => eliminarAccesoIndividual(acceso)}
                            title="Eliminar este registro de acceso"
                            aria-label="Eliminar acceso"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación General */}
      {confirmModal?.abierto && (
        <div
          className="ab-modal-backdrop"
          onClick={() => !ejecutandoConfirm && setConfirmModal(null)}
        >
          <div className="ab-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-icon">
              <AlertTriangle size={24} />
            </div>
            <h3>{confirmModal.titulo}</h3>
            <p>{confirmModal.mensaje}</p>
            <div className="ab-modal-actions">
              <button
                type="button"
                className="ab-btn ab-btn--ghost"
                disabled={ejecutandoConfirm}
                onClick={() => setConfirmModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="ab-btn ab-btn--danger"
                disabled={ejecutandoConfirm}
                onClick={async () => {
                  setEjecutandoConfirm(true);
                  try {
                    await confirmModal.onConfirm();
                    setConfirmModal(null);
                  } catch (err) {
                    console.error(err);
                    toast.error('Ocurrió un error al ejecutar la acción.');
                  } finally {
                    setEjecutandoConfirm(false);
                  }
                }}
              >
                {ejecutandoConfirm ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBiblioteca;

