import { Link } from "react-router-dom";
import { courses } from "@/data/courses";
import { stocks, formatCurrency, formatPercent } from "@/data/market";

const features = [
  { href: "/aprender", icon: "📚", title: "Aprender", desc: "Cursos do zero ao avancado" },
  { href: "/mercado", icon: "📊", title: "Mercado", desc: "Cotacoes simuladas em tempo real" },
  { href: "/simulador", icon: "🎮", title: "Simulador", desc: "Pratique com dinheiro virtual" },
  { href: "/professor", icon: "🤖", title: "Professor IA", desc: "Tire suas duvidas" },
  { href: "/objetivos", icon: "🎯", title: "Objetivos", desc: "Planeje suas metas financeiras" },
  { href: "/alertas", icon: "🔔", title: "Alertas", desc: "Monitore seus ativos" },
];

export default function Home() {
  const topMovers = [...stocks].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 5);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Bem-vindo ao <span style={{ color: "var(--emerald)" }}>Investa</span>
        </h1>
        <p className="opacity-60">Sua jornada para aprender a investir comeca aqui.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {features.map((f) => (
          <Link
            key={f.href}
            to={f.href}
            className="card hover:border-emerald-500/30 transition-all duration-200 no-underline"
            style={{ color: "var(--foreground)" }}
          >
            <span className="text-3xl mb-3 block">{f.icon}</span>
            <h3 className="font-bold mb-1">{f.title}</h3>
            <p className="text-xs opacity-50">{f.desc}</p>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Cursos disponiveis</h2>
          <Link to="/aprender" className="text-sm font-medium no-underline" style={{ color: "var(--emerald)" }}>
            Ver todos &rarr;
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {courses.slice(0, 4).map((course) => (
            <Link
              key={course.id}
              to={`/aprender/${course.id}`}
              className="card flex items-start gap-4 hover:border-emerald-500/30 transition-all no-underline"
              style={{ color: "var(--foreground)" }}
            >
              <span className="text-3xl">{course.icon}</span>
              <div>
                <h3 className="font-bold mb-1">{course.title}</h3>
                <p className="text-xs opacity-50 mb-2">{course.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--navy-border)" }}>
                    {course.difficulty}
                  </span>
                  <span className="text-xs opacity-40">{course.lessons.length} aulas</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Maiores movimentacoes</h2>
          <Link to="/mercado" className="text-sm font-medium no-underline" style={{ color: "var(--emerald)" }}>
            Ver mercado &rarr;
          </Link>
        </div>
        <div className="card">
          {topMovers.map((stock) => {
            const isPositive = stock.changePercent >= 0;
            return (
              <Link
                key={stock.ticker}
                to={`/mercado?ticker=${stock.ticker}`}
                className="flex items-center justify-between py-3 border-b last:border-b-0 no-underline"
                style={{ borderColor: "var(--navy-border)", color: "var(--foreground)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--navy-border)" }}
                  >
                    {stock.ticker.slice(0, 4)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{stock.ticker}</p>
                    <p className="text-xs opacity-50">{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(stock.price)}</p>
                  <p className={`text-xs font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPercent(stock.changePercent)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
