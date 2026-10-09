"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/aprender", label: "Aprender", icon: "📚" },
  { href: "/mercado", label: "Mercado", icon: "📊" },
  { href: "/simulador", label: "Simulador", icon: "🎮" },
  { href: "/professor", label: "Professor IA", icon: "🤖" },
  { href: "/objetivos", label: "Objetivos", icon: "🎯" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col border-r p-6 z-50"
        style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)" }}>
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--emerald)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L15 10L22 12L15 14L12 22L9 14L2 12L9 10Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--emerald)" }}>Investa</h1>
            <p className="text-xs opacity-50">Aprenda a investir</p>
          </div>
        </Link>

        <div className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white"
                    : "opacity-60 hover:opacity-100"
                }`}
                style={isActive ? { background: "var(--emerald)", color: "white" } : {}}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="card mt-4" style={{ background: "var(--emerald)", border: "none" }}>
          <p className="text-white text-sm font-semibold mb-1">Dados simulados</p>
          <p className="text-white/70 text-xs">
            As cotacoes mostradas sao para fins educacionais. Nao sao dados reais em tempo real.
          </p>
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around border-t py-2 px-2 z-50"
        style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)" }}>
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-all ${
                isActive ? "font-bold" : "opacity-50"
              }`}
              style={isActive ? { color: "var(--emerald)" } : {}}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="truncate max-w-[60px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
