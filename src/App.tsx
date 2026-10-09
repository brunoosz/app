import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { motion } from "framer-motion";
import { useSession, isManager } from "@/store/session";
import { LogoMark } from "@/components/Logo";
import { AppLayout } from "@/components/layout/AppLayout";
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";
import { Onboarding } from "@/pages/Onboarding";
import { Inicio } from "@/pages/Inicio";
import { Carteira } from "@/pages/Carteira";
import { Mercado } from "@/pages/Mercado";
import { Ativo } from "@/pages/Ativo";
import { Aulas } from "@/pages/Aulas";
import { Aula } from "@/pages/Aula";
import { Assistente } from "@/pages/Assistente";
import { Simulador } from "@/pages/Simulador";
import { Objetivos } from "@/pages/Objetivos";
import { Gastos } from "@/pages/Gastos";
import { Bancos } from "@/pages/Bancos";
import { Alertas } from "@/pages/Alertas";
import { Usuarios } from "@/pages/Usuarios";
import { Configuracoes } from "@/pages/Configuracoes";

function Splash() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5">
      <div className="drag fixed inset-x-0 top-0 h-12" />
      <div
        className="flex items-center justify-center"
        style={{
          width: 112,
          height: 112,
          borderRadius: 28,
          background: "radial-gradient(circle at 50% 42%, rgba(79,140,255,0.28), transparent 62%), linear-gradient(135deg, #232B45, #0B0F1A)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 30px 60px -18px rgba(79,140,255,0.55)",
        }}
      >
        <LogoMark size={72} animated />
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-center">
        <div className="text-[28px] font-bold tracking-tight">Investa</div>
        <div className="text-[10px] tracking-[0.32em] text-muted mt-1.5 font-semibold">APRENDA · INVISTA · EVOLUA</div>
      </motion.div>
    </div>
  );
}

function ManagerOnly({ children }: { children: JSX.Element }) {
  const user = useSession((s) => s.user);
  return isManager(user) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const ready = useSession((s) => s.ready);
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.loaded);
  const onboarded = useSession((s) => s.data.profile.onboarded);
  const boot = useSession((s) => s.boot);
  const [minDelay, setMinDelay] = useState(true);

  useEffect(() => {
    void boot();
    const t = setTimeout(() => setMinDelay(false), 900);
    return () => clearTimeout(t);
  }, [boot]);

  const screen = !ready || minDelay || (user && !loaded) ? "splash" : !user ? "auth" : !onboarded ? "onboarding" : "app";

  return (
    <motion.div key={screen} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      {screen === "splash" && <Splash />}
      {screen === "auth" && (
        <Routes>
          <Route path="/cadastro" element={<Register />} />
          <Route path="*" element={<Login />} />
        </Routes>
      )}
      {screen === "onboarding" && <Onboarding />}
      {screen === "app" && (
        <Routes>
          <Route path="/aula/:lessonId" element={<Aula />} />
          <Route element={<AppLayout />}>
            <Route index element={<Inicio />} />
            <Route path="carteira" element={<Carteira />} />
            <Route path="mercado" element={<Mercado />} />
            <Route path="mercado/:symbol" element={<Ativo />} />
            <Route path="aulas" element={<Aulas />} />
            <Route path="assistente" element={<Assistente />} />
            <Route path="simulador" element={<Simulador />} />
            <Route path="objetivos" element={<Objetivos />} />
            <Route path="gastos" element={<Gastos />} />
            <Route path="bancos" element={<Bancos />} />
            <Route path="alertas" element={<Alertas />} />
            <Route
              path="usuarios"
              element={
                <ManagerOnly>
                  <Usuarios />
                </ManagerOnly>
              }
            />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </motion.div>
  );
}
