import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../app/firebase-config";
import { signOut } from "firebase/auth";
import {
  Home,
  LogOut,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Truck,
  Users,
  Shield,
  BookOpen,
  User,
  BarChart2,
} from "lucide-react";
import { useUser } from "../../context/UserContext";
import "./Sidebar.css";

interface SidebarSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ title, icon, children, isOpen, onClick }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState("0px");

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [isOpen, children]);

  return (
    <div className="sidebar-section">
      <div className={`nav-section-title ${isOpen ? "active" : ""}`} onClick={onClick}>
        <span className="nav-section-icon">{icon}</span>
        <span className="nav-section-text">{title}</span>
        <span className="nav-section-arrow">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>
      <div
        className="sidebar-section-content"
        ref={contentRef}
        style={{
          maxHeight: height,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div className="content-inner">{children}</div>
      </div>
    </div>
  );
};

const SECCIONES = [
  {
    title: "Gestión de Unidades",
    icon: <Truck size={16} />,
    links: [
      { text: "Unidades", to: "/unidades" },
      { text: "Control Combustible", to: "/combustible" },
      { text: "Informe Unidades", to: "/generador-informe" },
      { text: "Historial Revisiones", to: "/seleccionar-unidad-historial" },
    ],
    rolesPermitidos: ["admin", "jefatura", "graduados", "guardia"]
  },
  {
    title: "Gestión de Personal",
    icon: <Users size={16} />,
    links: [
      { text: "Legajos", to: "/legajos" },
      { text: "Vencimientos", to: "/vencimientos" },
    ],
    rolesPermitidos: ["admin", "legajo", "jefatura", "graduados"]
  },
  {
    title: "Gestión de Guardia",
    icon: <Shield size={16} />,
    links: [
      { text: "Choferes", to: "/choferes" },
      { text: "Áreas Protegidas", to: "/areas-protegidas" }
    ],
    rolesPermitidos: ["admin", "jefatura", "guardia"]
  },
  {
    title: "Gestión Interna",
    icon: <BookOpen size={16} />,
    links: [
      { text: "Biblioteca Virtual", to: "/editar-biblioteca" },
    ],
    rolesPermitidos: ["admin", "jefatura", "graduados"]
  }
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Para saber en qué página estamos
  const { user, setUser, miembroActivo, setMiembroActivo } = useUser();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setMiembroActivo(null);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleCerrarSesionMiembro = () => setMiembroActivo(null);
  const toggleDropdown = () => setDropdownOpen(prev => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRolNombreBonito = (rol: string) => {
    switch (rol) {
      case "admin":     return "Admin";
      case "jefatura":  return "Jefatura";
      case "graduados": return "Graduado";
      case "guardia":   return "Guardia";
      case "legajo":    return "Legajo";
      case "bombero":   return "Bombero";
      default:          return "Usuario";
    }
  };

  // Corregido: Ahora acepta string o null
  const handleSectionClick = (section: string | null) =>
    setOpenSection(prev => (prev === section ? null : section));

const renderLink = (to: string, text: string) => {
  // Comprobamos si la ruta actual coincide con el destino del link
  const isActive = location.pathname === to;

  return (
    <Link 
      key={to} 
      to={to} 
      className={`nav-button-inner ${isActive ? "active-link" : ""}`}
    >
      {text}
    </Link>
  );
};

  return (
    <div className="sidebar">
      <div className="sidebar-top">

        {/* Logo */}
        <div className="logo-container">
          <img src="/logo-bomberos.png" alt="Logo Bomberos" className="logo" />
        </div>

        {/* Saludo */}
        {user && (
          <div className="sidebar-greeting-inline">
            <span>¡Hola,&nbsp;</span>
            <span className="sidebar-greeting-role">{getRolNombreBonito(user.rol)}!</span>
          </div>
        )}

        {/* Miembro activo */}
        {miembroActivo && (
          <div className="sidebar-miembro-inline">
            <User size={13} className="sidebar-miembro-icon" />
            <span className="sidebar-miembro-text">
              {miembroActivo.apellido} {miembroActivo.nombre}
            </span>
          </div>
        )}

        <div className="divider" />

        {/* Nav */}
        <nav className="nav-buttons">
          {SECCIONES
            .filter(sec => sec.rolesPermitidos.includes(user?.rol || ""))
            .map(sec => (
              <SidebarSection
                key={sec.title}
                title={sec.title}
                icon={sec.icon}
                isOpen={openSection === sec.title}
                onClick={() => handleSectionClick(sec.title)}
              >
                {sec.links.map(link => renderLink(link.to, link.text))}
              </SidebarSection>
            ))}

          {user?.rol === "admin" && (
            <div 
              className={`nav-section-title nav-section-single ${location.pathname === '/admin' ? 'active' : ''}`} 
              onClick={() => {
                handleSectionClick(null);
                navigate("/admin");
              }}
            >
              <span className="nav-section-icon"><LayoutDashboard size={16} /></span>
              <span className="nav-section-text">Panel Admin</span>
            </div>
          )}

          {user?.rol === "bombero" && miembroActivo && (
            <>
              <div 
                className={`nav-section-title nav-section-single ${location.pathname.includes('/legajo/') ? 'active' : ''}`}
                onClick={() => {
                  handleSectionClick(null);
                  navigate(`/legajo/${miembroActivo.id}`);
                }}>
                <span className="nav-section-icon"><User size={16} /></span>
                <span className="nav-section-text">Mi Legajo</span>
              </div>
              <div 
                className={`nav-section-title nav-section-single ${location.pathname.includes('/estadisticas/') ? 'active' : ''}`}
                onClick={() => {
                  handleSectionClick(null);
                  navigate(`/estadisticas/${miembroActivo.id}`);
                }}>
                <span className="nav-section-icon"><BarChart2 size={16} /></span>
                <span className="nav-section-text">Mis Estadísticas</span>
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Bottom */}
      <div className="bottom-buttons-wrapper">
        <Link to="/" className="logout-button">
          <Home size={16} />
          <span>Inicio</span>
        </Link>

        {(miembroActivo || user) && (
          <div className="logout-combined-wrapper" ref={dropdownRef}>
            <button className="logout-button logout-button-danger" onClick={toggleDropdown}>
              <LogOut size={16} />
              <span>Cerrar sesión</span>
              <ChevronDown size={14} style={{ marginLeft: "auto" }} />
            </button>

            <div className={`logout-opciones-dropdown ${dropdownOpen ? "mostrar" : ""}`}>
              {miembroActivo && (
                <button className="logout-opcion" onClick={() => { handleCerrarSesionMiembro(); setDropdownOpen(false); }}>
                  <User size={14} />
                  Cambiar usuario
                </button>
              )}
              {user && (
                <button className="logout-opcion logout-opcion-danger" onClick={() => { handleLogout(); setDropdownOpen(false); }}>
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;