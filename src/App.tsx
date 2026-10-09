import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Aprender from "./pages/Aprender";
import Modulo from "./pages/Modulo";
import Mercado from "./pages/Mercado";
import Simulador from "./pages/Simulador";
import Professor from "./pages/Professor";
import Objetivos from "./pages/Objetivos";
import Alertas from "./pages/Alertas";

export default function App() {
  return (
    <div className="flex">
      <Navbar />
      <main className="md:ml-64 flex-1 min-h-screen pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/aprender" element={<Aprender />} />
          <Route path="/aprender/:moduleId" element={<Modulo />} />
          <Route path="/mercado" element={<Mercado />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/professor" element={<Professor />} />
          <Route path="/objetivos" element={<Objetivos />} />
          <Route path="/alertas" element={<Alertas />} />
        </Routes>
      </main>
    </div>
  );
}
