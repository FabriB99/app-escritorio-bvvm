import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../app/firebase-config";
import { signOut } from "firebase/auth";
import { FiHome } from "react-icons/fi";
import { FiLogOut } from "react-icons/fi";
import { useUser } from "../../context/UserContext"; 
import "./Sidebar.css"; 

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const { user, setUser } = useUser();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            navigate("/login");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    const getRolNombreBonito = (rol: string) => {
        switch (rol) {
            case 'admin': return 'Admin';
            case 'jefatura': return 'Jefatura';
            case 'guardia': return 'Guardia';
            case 'legajo': return 'Legajo';
            default: return rol;
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-top">
                <div className="logo-container">
                    <img src="/logo-bomberos.png" alt="Logo Bomberos" className="logo" />
                </div>

                {user && (
                    <div className="sidebar-greeting-inline">
                        <span className="sidebar-greeting-text">¡Hola, </span>
                        <span className="sidebar-greeting-role">{getRolNombreBonito(user.rol)}!</span>
                    </div>
                )}

                <div className="divider" />

                <nav className="nav-buttons">
                    {/* Links para admin, jefatura y guardia */}
                    {(user?.rol === 'admin' || user?.rol === 'jefatura' || user?.rol === 'guardia') && (
                        <>
                            <Link to="/unidades" className="nav-button">Unidades</Link>
                            <Link to="/combustible" className="nav-button">Control Combustible</Link>
                            <Link to="/generador-informe" className="nav-button">Informe Unidades</Link>
                            <Link to="/seleccionar-unidad-historial" className="nav-button">Historial Revisiones</Link>
                            {user?.rol === 'admin' && (
                                <Link to="/crear-unidad" className="nav-button">Crear Unidad</Link>
                            )}
                        </>
                    )}
                    {/* Link para admin y jefatura */}
                        {['admin', 'jefatura'].includes(user?.rol || '') && (
                            <Link to="/editar-biblioteca" className="nav-button">Biblioteca Virtual</Link>
                    )}
                    {/* Link para admin, legajo y jefatura */}
                        {['admin', 'legajo', 'jefatura'].includes(user?.rol || '') && (
                            <Link to="/legajos" className="nav-button">Legajos</Link>
                    )}
                </nav>
            </div>

            <div className="bottom-buttons-wrapper">
                <Link to="/" className="logout-button">
                    <FiHome className="logout-icon" />
                    Inicio
                </Link>
                <button className="logout-button" onClick={handleLogout}>
                    <FiLogOut className="logout-icon" />
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
