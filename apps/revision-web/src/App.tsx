// src/App.tsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ElegirUnidad from "./pages/ElegirUnidad";
import RevisionUnidad from "./pages/RevisionUnidad";
import ControlCombustible from "./pages/ControlCombustible";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/control-unidades" element={<ElegirUnidad />} />
      <Route path="/revision/:unidadId" element={<RevisionUnidad />} />
      <Route path="/control-combustible" element={<ControlCombustible />} />
    </Routes>
  );
}

export default App;
