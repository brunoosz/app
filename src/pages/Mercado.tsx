import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { stocks, StockData, formatCurrency, formatPercent, formatVolume, getStockByTicker } from "@/data/market";
import MiniChart from "@/components/MiniChart";

export default function Mercado() {
  const [searchParams] = useSearchParams();
  const selectedTicker = searchParams.get("ticker");
  const [filter, setFilter] = useState<"todos" | "acao" | "fii" | "etf">("todos");
  const [sort, setSort] = useState<"name" | "change" | "volume">("change");
  const [liveStocks, setLiveStocks] = useState<StockData[]>(stocks);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStocks((prev) =>
        prev.map((s) => {
          const variation = (Math.random() - 0.48) * 0.5;
          const newPrice = Math.round((s.price + variation) * 100) / 100;
          const change = Math.round((newPrice - (s.price - s.change)) * 100) / 100;
          const changePercent = Math.round((change / (newPrice - change)) * 10000) / 100;
          return { ...s, price: newPrice, change, changePercent };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = liveStocks
    .filter((s) => filter === "todos" || s.type === filter)
    .sort((a, b) => {
      if (sort === "change") return Math.abs(b.changePercent) - Math.abs(a.changePercent);
      if (sort === "volume") return b.volume - a.volume;
      return a.ticker.localeCompare(b.ticker);
    });

  const selectedStock = selectedTicker ? liveStocks.find((s) => s.ticker === selectedTicker) : null;

  if (selectedStock) {
    const isPositive = selectedStock.changePercent >= 0;
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Link
          to="/mercado"
          className="text-sm opacity-50 hover:opacity-100 transition-all no-underline inline-block"
          style={{ color: "var(--foreground)" }}
        >
          &larr; Voltar para o mercado
        </Link>

        <div className="card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">{selectedStock.ticker}</h1>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "var(--navy-border)" }}
                >
                  {selectedStock.type === "acao" ? "Acao" : selectedStock.type === "fii" ? "FII" : "ETF"}
                </span>
              </div>
              <p className="opacity-60">{selectedStock.name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatCurrency(selectedStock.price)}</p>
              <p className={`text-lg font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{formatCurrency(selectedStock.change)} ({formatPercent(selectedStock.changePercent)})
              </p>
            </div>
          </div>

          <MiniChart data={selectedStock.history} positive={isPositive} height={200} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-bold mb-3" style={{ color: "var(--emerald)" }}>Informacoes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-60">Setor</span>
                <span>{selectedStock.sector}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Volume</span>
                <span>{formatVolume(selectedStock.volume)}</span>
              </div>
              {selectedStock.pl && (
                <div className="flex justify-between">
                  <span className="opacity-60">P/L</span>
                  <span>{selectedStock.pl}</span>
                </div>
              )}
              {selectedStock.dy && (
                <div className="flex justify-between">
                  <span className="opacity-60">Dividend Yield</span>
                  <span>{selectedStock.dy}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold mb-3" style={{ color: "var(--emerald)" }}>Sobre</h3>
            <p className="text-sm opacity-80">{selectedStock.description}</p>
            {selectedStock.type === "acao" && (
              <div className="mt-4 p-3 rounded-lg text-xs opacity-60" style={{ background: "var(--background)" }}>
                <strong>Dica educacional:</strong> O P/L de {selectedStock.pl} indica que, mantendo o lucro atual,
                levaria {selectedStock.pl} anos para o lucro acumulado igualar o preco da acao.
                {selectedStock.dy && (
                  <> O Dividend Yield de {selectedStock.dy}% significa que, para cada R$ 100 investidos,
                  voce receberia R$ {selectedStock.dy} por ano em dividendos.</>
                )}
              </div>
            )}
            {selectedStock.type === "fii" && (
              <div className="mt-4 p-3 rounded-lg text-xs opacity-60" style={{ background: "var(--background)" }}>
                <strong>Dica educacional:</strong> FIIs distribuem rendimentos mensais.
                Com DY de {selectedStock.dy}%, esse FII pagaria aproximadamente
                {" "}{formatCurrency((selectedStock.price * (selectedStock.dy || 0)) / 100 / 12)} por cota por mes.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mercado</h1>
        <p className="opacity-60">
          Cotacoes simuladas &middot; Atualizam a cada 3 segundos
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1">
          {(["todos", "acao", "fii", "etf"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none"
              style={{
                background: filter === f ? "var(--emerald)" : "var(--navy-card)",
                color: filter === f ? "white" : "var(--foreground)",
              }}
            >
              {f === "todos" ? "Todos" : f === "acao" ? "Acoes" : f === "fii" ? "FIIs" : "ETFs"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([
            { key: "change", label: "Variacao" },
            { key: "volume", label: "Volume" },
            { key: "name", label: "Nome" },
          ] as const).map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none"
              style={{
                background: sort === s.key ? "var(--navy-border)" : "transparent",
                color: "var(--foreground)",
                opacity: sort === s.key ? 1 : 0.5,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((stock) => {
          const isPositive = stock.changePercent >= 0;
          return (
            <Link
              key={stock.ticker}
              to={`/mercado?ticker=${stock.ticker}`}
              className="card hover:border-emerald-500/30 transition-all no-underline"
              style={{ color: "var(--foreground)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{stock.ticker}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full opacity-60" style={{ background: "var(--navy-border)" }}>
                      {stock.type === "acao" ? "Acao" : stock.type === "fii" ? "FII" : "ETF"}
                    </span>
                  </div>
                  <p className="text-xs opacity-50">{stock.name}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {formatPercent(stock.changePercent)}
                </div>
              </div>
              <p className="text-xl font-bold mb-2">{formatCurrency(stock.price)}</p>
              <MiniChart data={stock.history} positive={isPositive} height={40} />
              <div className="flex justify-between mt-2 text-xs opacity-40">
                <span>Vol: {formatVolume(stock.volume)}</span>
                {stock.dy && <span>DY: {stock.dy}%</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
