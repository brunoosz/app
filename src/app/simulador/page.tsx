"use client";

import { useState, useEffect } from "react";
import { stocks, formatCurrency, formatPercent } from "@/data/market";

interface PortfolioItem {
  ticker: string;
  quantity: number;
  avgPrice: number;
}

export default function SimuladorPage() {
  const [balance, setBalance] = useState(100_000);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedTicker, setSelectedTicker] = useState(stocks[0].ticker);
  const [quantity, setQuantity] = useState(10);
  const [history, setHistory] = useState<{ action: string; date: string }[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices: Record<string, number> = {};
      stocks.forEach((stock) => {
        const current = prices[stock.ticker] || stock.price;
        const delta = (Math.random() - 0.5) * current * 0.004;
        newPrices[stock.ticker] = Math.round((current + delta) * 100) / 100;
      });
      setPrices(newPrices);
    }, 5000);
    return () => clearInterval(interval);
  }, [prices]);

  const getPrice = (ticker: string) => prices[ticker] || stocks.find((s) => s.ticker === ticker)!.price;

  const totalInvested = portfolio.reduce((acc, item) => acc + item.quantity * item.avgPrice, 0);
  const totalCurrent = portfolio.reduce((acc, item) => acc + item.quantity * getPrice(item.ticker), 0);
  const totalPL = totalCurrent - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const patrimonio = balance + totalCurrent;

  const handleBuy = () => {
    const price = getPrice(selectedTicker);
    const cost = price * quantity;
    if (cost > balance) return;

    setBalance((b) => Math.round((b - cost) * 100) / 100);

    const existing = portfolio.find((p) => p.ticker === selectedTicker);
    if (existing) {
      const totalQty = existing.quantity + quantity;
      const newAvg = (existing.avgPrice * existing.quantity + price * quantity) / totalQty;
      setPortfolio((prev) =>
        prev.map((p) =>
          p.ticker === selectedTicker ? { ...p, quantity: totalQty, avgPrice: Math.round(newAvg * 100) / 100 } : p
        )
      );
    } else {
      setPortfolio((prev) => [...prev, { ticker: selectedTicker, quantity, avgPrice: price }]);
    }

    setHistory((prev) => [
      { action: `Compra: ${quantity}x ${selectedTicker} a ${formatCurrency(price)}`, date: new Date().toLocaleTimeString("pt-BR") },
      ...prev.slice(0, 19),
    ]);
  };

  const handleSell = () => {
    const existing = portfolio.find((p) => p.ticker === selectedTicker);
    if (!existing || existing.quantity < quantity) return;

    const price = getPrice(selectedTicker);
    const revenue = price * quantity;
    setBalance((b) => Math.round((b + revenue) * 100) / 100);

    if (existing.quantity === quantity) {
      setPortfolio((prev) => prev.filter((p) => p.ticker !== selectedTicker));
    } else {
      setPortfolio((prev) =>
        prev.map((p) =>
          p.ticker === selectedTicker ? { ...p, quantity: p.quantity - quantity } : p
        )
      );
    }

    setHistory((prev) => [
      { action: `Venda: ${quantity}x ${selectedTicker} a ${formatCurrency(price)}`, date: new Date().toLocaleTimeString("pt-BR") },
      ...prev.slice(0, 19),
    ]);
  };

  const existingQty = portfolio.find((p) => p.ticker === selectedTicker)?.quantity || 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Simulador de Investimentos</h1>
        <p className="opacity-60 text-sm">
          Pratique com dinheiro ficticio. Compre e venda ativos para aprender como funciona o mercado.
        </p>
      </header>

      <div className="card mb-6" style={{ background: "var(--emerald)", border: "none" }}>
        <div className="flex items-center gap-2 mb-2">
          <span>🎮</span>
          <p className="text-white text-sm font-medium">Modo Simulacao</p>
        </div>
        <p className="text-white/80 text-xs">
          Este simulador usa dinheiro ficticio e precos simulados. Nenhuma transacao real e realizada.
          Use para praticar e aprender antes de investir de verdade.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card">
          <p className="text-xs opacity-50 mb-1">Patrimonio Total</p>
          <p className="text-lg font-bold">{formatCurrency(patrimonio)}</p>
        </div>
        <div className="card">
          <p className="text-xs opacity-50 mb-1">Saldo Disponivel</p>
          <p className="text-lg font-bold">{formatCurrency(balance)}</p>
        </div>
        <div className="card">
          <p className="text-xs opacity-50 mb-1">Investido</p>
          <p className="text-lg font-bold">{formatCurrency(totalCurrent)}</p>
        </div>
        <div className="card">
          <p className="text-xs opacity-50 mb-1">Lucro/Prejuizo</p>
          <p className={`text-lg font-bold ${totalPL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalPL >= 0 ? "+" : ""}{formatCurrency(totalPL)}
          </p>
          <p className={`text-xs ${totalPL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatPercent(totalPLPercent)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <h2 className="font-bold mb-4">Negociar</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border text-sm"
                style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
              >
                {stocks.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} - {s.name} ({formatCurrency(getPrice(s.ticker))})
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-24 px-4 py-3 rounded-xl border text-sm text-center"
                style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
              />
            </div>

            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="opacity-50">
                Total: {formatCurrency(getPrice(selectedTicker) * quantity)}
              </span>
              {existingQty > 0 && (
                <span className="opacity-50">Voce tem: {existingQty} cotas</span>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleBuy}
                disabled={getPrice(selectedTicker) * quantity > balance}
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-30"
                style={{ background: "var(--emerald)" }}
              >
                Comprar
              </button>
              <button
                onClick={handleSell}
                disabled={existingQty < quantity}
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-30"
                style={{ background: "var(--red)" }}
              >
                Vender
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold mb-4">Minha Carteira</h2>
            {portfolio.length === 0 ? (
              <p className="text-sm opacity-50 text-center py-8">
                Sua carteira esta vazia. Compre alguns ativos para comecar!
              </p>
            ) : (
              <div className="space-y-3">
                {portfolio.map((item) => {
                  const currentPrice = getPrice(item.ticker);
                  const pl = (currentPrice - item.avgPrice) * item.quantity;
                  const plPercent = ((currentPrice - item.avgPrice) / item.avgPrice) * 100;
                  const stock = stocks.find((s) => s.ticker === item.ticker)!;
                  return (
                    <div key={item.ticker} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: "var(--navy-border)" }}>
                      <div>
                        <p className="font-bold text-sm">{item.ticker}</p>
                        <p className="text-xs opacity-50">{stock.name}</p>
                        <p className="text-xs opacity-40">{item.quantity} cotas • PM: {formatCurrency(item.avgPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(currentPrice * item.quantity)}</p>
                        <p className={`text-xs font-medium ${pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({formatPercent(plPercent)})
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="font-bold mb-4">Historico</h2>
            {history.length === 0 ? (
              <p className="text-sm opacity-50 text-center py-4">
                Nenhuma operacao ainda
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg"
                    style={{ background: "var(--navy-border)" }}>
                    <span className={h.action.startsWith("Compra") ? "text-emerald-400" : "text-red-400"}>
                      {h.action.startsWith("Compra") ? "↗" : "↘"}
                    </span>
                    <div>
                      <p>{h.action}</p>
                      <p className="opacity-40">{h.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
