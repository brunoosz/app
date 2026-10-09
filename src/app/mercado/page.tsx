"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { stocks, StockData, formatCurrency, formatPercent, formatVolume } from "@/data/market";
import StockCard from "@/components/StockCard";
import MiniChart from "@/components/MiniChart";

function MercadoContent() {
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get("ticker");
  const [filter, setFilter] = useState<"todos" | "acao" | "fii" | "etf">("todos");
  const [selectedStock, setSelectedStock] = useState<StockData | null>(
    tickerParam ? stocks.find((s) => s.ticker === tickerParam) || null : null
  );
  const [sortBy, setSortBy] = useState<"ticker" | "change" | "volume">("volume");
  const [prices, setPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices: Record<string, { price: number; change: number; changePercent: number }> = {};
      stocks.forEach((stock) => {
        const currentPrice = prices[stock.ticker]?.price || stock.price;
        const delta = (Math.random() - 0.5) * currentPrice * 0.003;
        const newPrice = Math.round((currentPrice + delta) * 100) / 100;
        const totalChange = newPrice - (stock.price - stock.change);
        const totalChangePercent = (totalChange / (stock.price - stock.change)) * 100;
        newPrices[stock.ticker] = {
          price: newPrice,
          change: Math.round(totalChange * 100) / 100,
          changePercent: Math.round(totalChangePercent * 100) / 100,
        };
      });
      setPrices(newPrices);
    }, 3000);

    return () => clearInterval(interval);
  }, [prices]);

  const getPrice = (stock: StockData) => prices[stock.ticker]?.price || stock.price;
  const getChange = (stock: StockData) => prices[stock.ticker]?.change || stock.change;
  const getChangePercent = (stock: StockData) => prices[stock.ticker]?.changePercent || stock.changePercent;

  const filtered = stocks.filter((s) => filter === "todos" || s.type === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "ticker") return a.ticker.localeCompare(b.ticker);
    if (sortBy === "change") return Math.abs(getChangePercent(b)) - Math.abs(getChangePercent(a));
    return b.volume - a.volume;
  });

  const ibovChange = stocks
    .filter((s) => s.type === "acao")
    .reduce((acc, s) => acc + getChangePercent(s), 0) / stocks.filter((s) => s.type === "acao").length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mercado</h1>
        <p className="opacity-60 text-sm">
          Acompanhe as cotacoes simuladas e aprenda a interpretar o mercado.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card">
          <p className="text-xs opacity-50 mb-1">Ibovespa (sim.)</p>
          <p className="text-lg font-bold">126.452</p>
          <p className={`text-sm font-medium ${ibovChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatPercent(ibovChange)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs opacity-50 mb-1">Selic</p>
          <p className="text-lg font-bold">10,50%</p>
          <p className="text-xs opacity-40">a.a.</p>
        </div>
        <div className="card">
          <p className="text-xs opacity-50 mb-1">Dolar (sim.)</p>
          <p className="text-lg font-bold">R$ 5,12</p>
          <p className="text-sm font-medium text-emerald-400">+0,35%</p>
        </div>
        <div className="card">
          <p className="text-xs opacity-50 mb-1">IPCA 12m</p>
          <p className="text-lg font-bold">4,62%</p>
          <p className="text-xs opacity-40">acumulado</p>
        </div>
      </div>

      <div className="card mb-4 py-3 px-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--emerald)" }} />
          <span className="opacity-60">
            Precos atualizando automaticamente (dados simulados para fins educacionais)
          </span>
        </div>
      </div>

      {selectedStock ? (
        <div className="mb-6">
          <button
            onClick={() => setSelectedStock(null)}
            className="text-sm opacity-60 hover:opacity-100 mb-4 flex items-center gap-1"
          >
            ← Voltar para lista
          </button>
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedStock.ticker}</h2>
                <p className="opacity-60">{selectedStock.name}</p>
                <p className="text-sm opacity-40 mt-1">{selectedStock.description}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--navy-border)" }}>
                {selectedStock.type === "acao" ? "Acao" : selectedStock.type === "fii" ? "FII" : "ETF"}
              </span>
            </div>

            <div className="flex items-end gap-4 mb-6">
              <p className="text-4xl font-bold">{formatCurrency(getPrice(selectedStock))}</p>
              <div>
                <p className={`text-lg font-semibold ${getChangePercent(selectedStock) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {getChangePercent(selectedStock) >= 0 ? "+" : ""}{formatCurrency(getChange(selectedStock))} ({formatPercent(getChangePercent(selectedStock))})
                </p>
              </div>
            </div>

            <div className="mb-6">
              <MiniChart
                data={selectedStock.history}
                positive={getChangePercent(selectedStock) >= 0}
                height={120}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs opacity-50">Volume</p>
                <p className="font-bold">{formatVolume(selectedStock.volume)}</p>
              </div>
              <div>
                <p className="text-xs opacity-50">Setor</p>
                <p className="font-bold">{selectedStock.sector}</p>
              </div>
              {selectedStock.pl && (
                <div>
                  <p className="text-xs opacity-50">P/L</p>
                  <p className="font-bold">{selectedStock.pl}</p>
                </div>
              )}
              {selectedStock.dy && (
                <div>
                  <p className="text-xs opacity-50">Dividend Yield</p>
                  <p className="font-bold">{selectedStock.dy}%</p>
                </div>
              )}
            </div>

            {selectedStock.pl && (
              <div className="p-4 rounded-xl" style={{ background: "var(--navy-border)" }}>
                <p className="text-sm font-bold mb-2 flex items-center gap-2">
                  <span>🤖</span> O que esses numeros significam?
                </p>
                <div className="space-y-2 text-sm opacity-80">
                  {selectedStock.pl && (
                    <p>
                      <strong>P/L de {selectedStock.pl}:</strong>{" "}
                      {selectedStock.pl < 10
                        ? "Relativamente baixo. Pode indicar uma acao barata ou que o mercado espera queda no lucro."
                        : selectedStock.pl < 20
                        ? "Na media do mercado. Indica expectativas normais para o setor."
                        : "Relativamente alto. Pode indicar que o mercado espera crescimento forte ou que a acao esta cara."}
                    </p>
                  )}
                  {selectedStock.dy && (
                    <p>
                      <strong>DY de {selectedStock.dy}%:</strong>{" "}
                      {selectedStock.dy > 8
                        ? "Alto. Pode ser atrativo para quem busca renda, mas verifique se e sustentavel."
                        : selectedStock.dy > 4
                        ? "Moderado. Equilibrio entre valorizacao e distribuicao."
                        : "Baixo. A empresa pode estar reinvestindo lucros para crescer."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex gap-2">
              {(["todos", "acao", "fii", "etf"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === type ? "text-white" : "opacity-50"
                  }`}
                  style={filter === type ? { background: "var(--emerald)" } : {}}
                >
                  {type === "todos" ? "Todos" : type === "acao" ? "Acoes" : type === "fii" ? "FIIs" : "ETFs"}
                </button>
              ))}
            </div>
            <div className="flex gap-2 ml-auto">
              {(["volume", "change", "ticker"] as const).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === sort ? "text-white" : "opacity-50"
                  }`}
                  style={sortBy === sort ? { background: "var(--navy-border)" } : {}}
                >
                  {sort === "volume" ? "Volume" : sort === "change" ? "Variacao" : "A-Z"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((stock) => {
              const updatedStock = {
                ...stock,
                price: getPrice(stock),
                change: getChange(stock),
                changePercent: getChangePercent(stock),
              };
              return (
                <div key={stock.ticker} onClick={() => setSelectedStock(stock)} className="cursor-pointer">
                  <StockCard stock={updatedStock} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function MercadoPage() {
  return (
    <Suspense fallback={<div className="p-8">Carregando...</div>}>
      <MercadoContent />
    </Suspense>
  );
}
