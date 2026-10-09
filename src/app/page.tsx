"use client";

import Link from "next/link";
import { courses } from "@/data/courses";
import { stocks } from "@/data/market";
import StockCard from "@/components/StockCard";

export default function Home() {
  const topMovers = [...stocks]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 4);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--emerald)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L15 10L22 12L15 14L12 22L9 14L2 12L9 10Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Bem-vindo ao <span style={{ color: "var(--emerald)" }}>Investa</span>
            </h1>
            <p className="opacity-60 mt-1">Aprenda a investir. Decida com consciencia.</p>
          </div>
        </div>

        <div className="card" style={{ background: "linear-gradient(135deg, var(--emerald-dark), var(--emerald))", border: "none" }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                Comece sua jornada de investimento
              </h2>
              <p className="text-white/80 text-sm max-w-lg">
                Voce nao precisa entender tudo para comecar. O Investa vai te guiar
                passo a passo, desde o basico ate saber analisar empresas e montar
                sua carteira.
              </p>
            </div>
            <Link
              href="/aprender"
              className="btn-primary whitespace-nowrap text-center"
              style={{ background: "white", color: "var(--emerald-dark)" }}
            >
              Comecar a aprender
            </Link>
          </div>
        </div>
      </header>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Trilha de Aprendizado</h2>
          <Link href="/aprender" className="text-sm font-medium" style={{ color: "var(--emerald)" }}>
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.slice(0, 3).map((course) => (
            <Link key={course.id} href={`/aprender/${course.id}`}>
              <div className="card hover:border-emerald-500/50 transition-all duration-200 cursor-pointer h-full">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{course.icon}</span>
                  <div>
                    <h3 className="font-bold">{course.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      course.difficulty === "iniciante"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : course.difficulty === "intermediario"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {course.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-sm opacity-60">{course.description}</p>
                <div className="mt-3 text-xs opacity-40">
                  {course.lessons.length} {course.lessons.length === 1 ? "aula" : "aulas"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Mercado Hoje</h2>
          <Link href="/mercado" className="text-sm font-medium" style={{ color: "var(--emerald)" }}>
            Ver mercado →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topMovers.map((stock) => (
            <StockCard key={stock.ticker} stock={stock} />
          ))}
        </div>
        <div className="card mt-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium">Dados educacionais</p>
              <p className="text-xs opacity-50 mt-1">
                Os precos e variacoes mostrados sao simulados para fins de aprendizado.
                Para dados reais, consulte sua corretora ou fontes oficiais da B3.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Ferramentas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/simulador">
            <div className="card hover:border-emerald-500/50 transition-all duration-200 cursor-pointer">
              <span className="text-3xl mb-3 block">🎮</span>
              <h3 className="font-bold mb-1">Simulador</h3>
              <p className="text-sm opacity-60">
                Pratique investimentos com dinheiro ficticio sem arriscar nada.
              </p>
            </div>
          </Link>
          <Link href="/professor">
            <div className="card hover:border-emerald-500/50 transition-all duration-200 cursor-pointer">
              <span className="text-3xl mb-3 block">🤖</span>
              <h3 className="font-bold mb-1">Professor IA</h3>
              <p className="text-sm opacity-60">
                Tire duvidas sobre investimentos com explicacoes simples.
              </p>
            </div>
          </Link>
          <Link href="/objetivos">
            <div className="card hover:border-emerald-500/50 transition-all duration-200 cursor-pointer">
              <span className="text-3xl mb-3 block">🎯</span>
              <h3 className="font-bold mb-1">Meus Objetivos</h3>
              <p className="text-sm opacity-60">
                Defina metas financeiras e simule cenarios para alcanca-las.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section>
        <div className="card">
          <h2 className="text-lg font-bold mb-3">O que voce vai aprender aqui</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "O que e investir e por que comecar",
              "Diferenca entre renda fixa e variavel",
              "Como funcionam acoes, FIIs e ETFs",
              "Como analisar uma empresa",
              "Como montar uma carteira diversificada",
              "Como interpretar o mercado financeiro",
              "Reserva de emergencia e perfil de risco",
              "Impostos e custos dos investimentos",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--emerald)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
                    <path d="M2 6L5 9L10 3" />
                  </svg>
                </div>
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
