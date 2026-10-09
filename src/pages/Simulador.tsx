import { useState } from "react";
import { stocks, formatCurrency, formatPercent } from "@/data/market";

interface Position {
  ticker: string;
  name: string;
  shares: number;
  avgPrice: number;
}

interface Transaction {
  type: "compra" | "venda";
  ticker: string;
  shares: number;
  price: number;
  total: number;
  date: string;
}

const INITIAL_BALANCE = 100000;

export default function Simulador() {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [portfolio, setPortfolio] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTicker, setSelectedTicker] = useState(stocks[0].ticker);
  const [shares, setShares] = useState(1);
  const [tab, setTab] = useState<"negociar" | "carteira" | "historico">("negociar");

  const selectedStock = stocks.find((s) => s.ticker === selectedTicker)!;

  function buy() {
    const total = selectedStock.price * shares;
    if (total > balance) return;

    setBalance((b) => Math.round((b - total) * 100) / 100);

    setPortfolio((prev) => {
      const existing = prev.find((p) => p.ticker === selectedTicker);
      if (existing) {
        const newShares = existing.shares + shares;
        const newAvg = (existing.avgPrice * existing.shares + selectedStock.price * shares) / newShares;
        return prev.map((p) =>
          p.ticker === selectedTicker
            ? { ...p, shares: newShares, avgPrice: Math.round(newAvg * 100) / 100 }
            : p
        );
      }
      return [...prev, { ticker: selectedTicker, name: selectedStock.name, shares, avgPrice: selectedStock.price }];
    });

    setTransactions((prev) => [
      {
        type: "compra",
        ticker: selectedTicker,
        shares,
        price: selectedStock.price,
        total,
        date: new Date().toLocaleString("pt-BR"),
      },
      ...prev,
    ]);
  }

  function sell() {
    const position = portfolio.find((p) => p.ticker === selectedTicker);
    if (!position || position.shares < shares) return;

    const total = selectedStock.price * shares;
    setBalance((b) => Math.round((b + total) * 100) / 100);

    setPortfolio((prev) => {
      const newShares = position.shares - shares;
      if (newShares === 0) return prev.filter((p) => p.ticker !== selectedTicker);
      return prev.map((p) =>
        p.ticker === selectedTicker ? { ...p, shares: newShares } : p
      );
    });

    setTransactions((prev) => [
      {
        type: "venda",
        ticker: selectedTicker,
        shares,
        price: selectedStock.price,
        total,
        date: new Date().toLocaleString("pt-BR"),
      },
      ...prev,
    ]);
  }

  const portfolioValue = portfolio.reduce((acc, p) => {
    const stock = stocks.find((s) => s.ticker === p.ticker);
    return acc + (stock?.price || 0) * p.shares;
  }, 0);

  const totalValue = balance + portfolioValue;
  const totalReturn = totalValue - INITIAL_BALANCE;
  const totalReturnPercent = (totalReturn / INITIAL_BALANCE) * 100;

  const currentPosition = portfolio.find((p) => p.ticker === selectedTicker);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Simulador</h1>
        <p className="opacity-60">Pratique investimentos com dinheiro virtual. Sem risco!</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs opacity-50 mb-1">Saldo disponivel</p>
          <p className="text-2xl font-bold" style={{ color: "var(--emerald)" }}>
            {formatCurrency(balance)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs opacity-50 mb-1">Em investimentos</p>
          <p className="text-2xl font-bold">{formatCurrency(portfolioValue)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs opacity-50 mb-1">Retorno total</p>
          <p className={`text-2xl font-bold ${totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalReturn >= 0 ? "+" : ""}{formatCurrency(totalReturn)}
            <span className="text-sm ml-1">({totalReturnPercent >= 0 ? "+" : ""}{totalReturnPercent.toFixed(2)}%)</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["negociar", "carteira", "historico"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none capitalize"
            style={{
              background: tab === t ? "var(--emerald)" : "var(--navy-card)",
              color: tab === t ? "white" : "var(--foreground)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "negociar" && (
        <div className="card">
          <h3 className="font-bold mb-4" style={{ color: "var(--emerald)" }}>Comprar / Vender</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs opacity-50 block mb-1">Ativo</label>
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="input-field"
              >
                {stocks.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} - {s.name} ({formatCurrency(s.price)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs opacity-50 block mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={shares}
                  onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input-field"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs opacity-50 block mb-1">Preco unitario</label>
                <p className="text-lg font-bold mt-1">{formatCurrency(selectedStock.price)}</p>
              </div>
              <div className="flex-1">
                <label className="text-xs opacity-50 block mb-1">Total</label>
                <p className="text-lg font-bold mt-1">{formatCurrency(selectedStock.price * shares)}</p>
              </div>
            </div>

            {currentPosition && (
              <p className="text-xs opacity-50">
                Voce tem {currentPosition.shares} cotas de {currentPosition.ticker} (PM: {formatCurrency(currentPosition.avgPrice)})
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={buy}
                disabled={selectedStock.price * shares > balance}
                className="btn-primary flex-1"
              >
                Comprar
              </button>
              <button
                onClick={sell}
                disabled={!currentPosition || currentPosition.shares < shares}
                className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "var(--red)", color: "white" }}
              >
                Vender
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "carteira" && (
        <div className="card">
          <h3 className="font-bold mb-4" style={{ color: "var(--emerald)" }}>Minha carteira</h3>
          {portfolio.length === 0 ? (
            <p className="text-center opacity-40 py-8">Nenhum investimento ainda. Comece comprando!</p>
          ) : (
            <div className="space-y-1">
              {portfolio.map((p) => {
                const stock = stocks.find((s) => s.ticker === p.ticker);
                if (!stock) return null;
                const currentValue = stock.price * p.shares;
                const investedValue = p.avgPrice * p.shares;
                const pl = currentValue - investedValue;
                const plPercent = (pl / investedValue) * 100;
                return (
                  <div
                    key={p.ticker}
                    className="flex items-center justify-between py-3 border-b last:border-b-0"
                    style={{ borderColor: "var(--navy-border)" }}
                  >
                    <div>
                      <p className="font-bold">{p.ticker}</p>
                      <p className="text-xs opacity-50">{p.shares} cotas &middot; PM: {formatCurrency(p.avgPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(currentValue)}</p>
                      <p className={`text-xs font-medium ${pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({plPercent >= 0 ? "+" : ""}{plPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "historico" && (
        <div className="card">
          <h3 className="font-bold mb-4" style={{ color: "var(--emerald)" }}>Historico de transacoes</h3>
          {transactions.length === 0 ? (
            <p className="text-center opacity-40 py-8">Nenhuma transacao realizada.</p>
          ) : (
            <div className="space-y-1">
              {transactions.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                  style={{ borderColor: "var(--navy-border)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-1 rounded font-bold ${
                        t.type === "compra" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {t.type.toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{t.ticker}</p>
                      <p className="text-xs opacity-50">{t.shares} x {formatCurrency(t.price)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(t.total)}</p>
                    <p className="text-xs opacity-40">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
