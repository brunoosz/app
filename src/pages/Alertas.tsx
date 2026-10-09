import { useState } from "react";
import { stocks, formatCurrency } from "@/data/market";

interface Alert {
  id: string;
  ticker: string;
  type: "acima" | "abaixo";
  price: number;
  active: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "tip" | "alert";
  time: string;
}

const sampleNotifications: Notification[] = [
  {
    id: "1",
    title: "Dica do dia",
    message: "Voce sabia que diversificar entre renda fixa e variavel reduz o risco da sua carteira sem necessariamente reduzir o retorno?",
    type: "tip",
    time: "Hoje, 09:00",
  },
  {
    id: "2",
    title: "Mercado em alta",
    message: "O Ibovespa subiu 1.2% hoje. Acoes de bancos lideram a alta. Lembre-se: oscilacoes diarias sao normais!",
    type: "info",
    time: "Hoje, 10:30",
  },
  {
    id: "3",
    title: "Reuniao do COPOM",
    message: "O COPOM se reune esta semana para decidir a taxa Selic. Isso pode afetar seus investimentos de renda fixa.",
    type: "alert",
    time: "Ontem, 18:00",
  },
  {
    id: "4",
    title: "Lembrete educacional",
    message: "Ja revisou seus objetivos este mes? Manter consistencia nos aportes e mais importante que tentar acertar o momento certo do mercado.",
    type: "tip",
    time: "Ontem, 09:00",
  },
];

export default function Alertas() {
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: "1", ticker: "PETR4", type: "acima", price: 42.0, active: true },
    { id: "2", ticker: "VALE3", type: "abaixo", price: 58.0, active: true },
  ]);
  const [notifications] = useState<Notification[]>(sampleNotifications);
  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState<{ ticker: string; type: "acima" | "abaixo"; price: string }>({ ticker: stocks[0].ticker, type: "acima", price: "" });
  const [tab, setTab] = useState<"alertas" | "notificacoes">("alertas");

  function createAlert() {
    if (!newAlert.price) return;
    setAlerts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        ticker: newAlert.ticker,
        type: newAlert.type,
        price: parseFloat(newAlert.price),
        active: true,
      },
    ]);
    setNewAlert({ ticker: stocks[0].ticker, type: "acima", price: "" });
    setShowForm(false);
  }

  function toggleAlert(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  }

  function removeAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Alertas</h1>
        <p className="opacity-60">Configure alertas de preco e receba dicas educacionais.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("alertas")}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none"
          style={{
            background: tab === "alertas" ? "var(--emerald)" : "var(--navy-card)",
            color: tab === "alertas" ? "white" : "var(--foreground)",
          }}
        >
          Alertas de preco
        </button>
        <button
          onClick={() => setTab("notificacoes")}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none"
          style={{
            background: tab === "notificacoes" ? "var(--emerald)" : "var(--navy-card)",
            color: tab === "notificacoes" ? "white" : "var(--foreground)",
          }}
        >
          Notificacoes
        </button>
      </div>

      {tab === "alertas" ? (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const stock = stocks.find((s) => s.ticker === alert.ticker);
            const triggered = stock
              ? alert.type === "acima"
                ? stock.price >= alert.price
                : stock.price <= alert.price
              : false;
            return (
              <div
                key={alert.id}
                className="card flex items-center justify-between"
                style={{
                  borderColor: triggered ? "var(--emerald)" : undefined,
                  borderWidth: triggered ? "2px" : undefined,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: "var(--navy-border)" }}
                  >
                    {alert.ticker.slice(0, 4)}
                  </div>
                  <div>
                    <p className="font-bold">{alert.ticker}</p>
                    <p className="text-xs opacity-50">
                      Alertar quando {alert.type === "acima" ? "acima de" : "abaixo de"}{" "}
                      {formatCurrency(alert.price)}
                    </p>
                    {stock && (
                      <p className="text-xs opacity-40">
                        Preco atual: {formatCurrency(stock.price)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {triggered && (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      ATINGIDO
                    </span>
                  )}
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className="w-12 h-6 rounded-full transition-all cursor-pointer border-none"
                    style={{
                      background: alert.active ? "var(--emerald)" : "var(--navy-border)",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-white transition-all"
                      style={{
                        marginLeft: alert.active ? "26px" : "2px",
                        marginTop: "2px",
                      }}
                    />
                  </button>
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="text-xs opacity-30 hover:opacity-100 cursor-pointer border-none bg-transparent"
                    style={{ color: "var(--red)" }}
                  >
                    X
                  </button>
                </div>
              </div>
            );
          })}

          {showForm ? (
            <div className="card space-y-3">
              <h3 className="font-bold" style={{ color: "var(--emerald)" }}>Novo alerta</h3>
              <div>
                <label className="text-xs opacity-50 block mb-1">Ativo</label>
                <select
                  value={newAlert.ticker}
                  onChange={(e) => setNewAlert({ ...newAlert, ticker: e.target.value })}
                  className="input-field"
                >
                  {stocks.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} - {s.name} ({formatCurrency(s.price)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs opacity-50 block mb-1">Condicao</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewAlert({ ...newAlert, type: "acima" })}
                    className="flex-1 px-4 py-2 rounded-xl text-sm cursor-pointer border-none"
                    style={{
                      background: newAlert.type === "acima" ? "var(--emerald)" : "var(--navy-border)",
                      color: "white",
                    }}
                  >
                    Acima de
                  </button>
                  <button
                    onClick={() => setNewAlert({ ...newAlert, type: "abaixo" })}
                    className="flex-1 px-4 py-2 rounded-xl text-sm cursor-pointer border-none"
                    style={{
                      background: newAlert.type === "abaixo" ? "var(--red)" : "var(--navy-border)",
                      color: "white",
                    }}
                  >
                    Abaixo de
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs opacity-50 block mb-1">Preco (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 40.00"
                  value={newAlert.price}
                  onChange={(e) => setNewAlert({ ...newAlert, price: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={createAlert} className="btn-primary flex-1">
                  Criar alerta
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold cursor-pointer border-none"
                  style={{ background: "var(--navy-border)", color: "var(--foreground)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)} className="btn-primary w-full">
              + Novo alerta
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div key={notif.id} className="card">
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {notif.type === "tip" ? "💡" : notif.type === "alert" ? "⚠️" : "📢"}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-sm">{notif.title}</h3>
                    <span className="text-xs opacity-30">{notif.time}</span>
                  </div>
                  <p className="text-sm opacity-70">{notif.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
