import { useNavigate } from "react-router-dom";
import LayoutContainer from "../components/LayoutContainer";
import "../styles/Home.css";

function Home() {
    const navigate = useNavigate();

    return (
        <LayoutContainer>
            <div className="home-container">
                <img
                    src="/logo-bomberos.png"
                    alt="Logo Bomberos"
                    className="home-logo"
                />
                <h1 className="home-title">Panel de Control</h1>

                <div className="home-buttons">
                    <button
                        className="home-button"
                        onClick={() => navigate("/control-unidades")}
                    >
                        Control de Unidades
                    </button>
                    <button
                        className="home-button"
                        onClick={() => navigate("/control-combustible")}
                    >
                        Control de Combustible
                    </button>
                </div>
            </div>
        </LayoutContainer>
    );
}

export default Home;
