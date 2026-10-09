import { Link } from "react-router-dom";
import { StockData, formatCurrency, formatPercent, formatVolume } from "@/data/market";

interface StockCardProps {
  stock: StockData;
  compact?: boolean;
}

export default function StockCard({ stock, compact }: StockCardProps) {
  const isPositive = stock.changePercent >= 0;

  if (compact) {
    return (
      <div className="flex items-center justify-between py-3 border-b last:border-b-0"
        style={{ borderColor: "var(--navy-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--navy-border)" }}>
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
      </div>
    );
  }

  return (
    <Link to={`/mercado?ticker=${stock.ticker}`} className="no-underline">
      <div className="card hover:border-emerald-500/50 transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">{stock.ticker}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full opacity-60"
                style={{ background: "var(--navy-border)" }}>
                {stock.type === "acao" ? "Acao" : stock.type === "fii" ? "FII" : "ETF"}
              </span>
            </div>
            <p className="text-sm opacity-50">{stock.name}</p>
          </div>
          <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
            isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}>
            {formatPercent(stock.changePercent)}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(stock.price)}</p>
            <p className={`text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{formatCurrency(stock.change)}
            </p>
          </div>
          <div className="text-right text-xs opacity-50">
            <p>Vol: {formatVolume(stock.volume)}</p>
            {stock.pl && <p>P/L: {stock.pl}</p>}
            {stock.dy && <p>DY: {stock.dy}%</p>}
          </div>
        </div>

        <div className="mt-4 h-12 flex items-end gap-[2px]">
          {stock.history.slice(-20).map((h, i) => {
            const prices = stock.history.slice(-20).map((p) => p.close);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const range = max - min || 1;
            const height = ((h.close - min) / range) * 100;
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(height, 5)}%`,
                  background: isPositive ? "var(--emerald)" : "var(--red)",
                  opacity: 0.3 + (i / 20) * 0.7,
                }}
              />
            );
          })}
        </div>
      </div>
    </Link>
  );
}
