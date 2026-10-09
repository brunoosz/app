"use client";

import { useState } from "react";
import { stocks, formatCurrency } from "@/data/market";

interface Alert {
  id: string;
  ticker: string;
  type: "price_up" | "price_down" | "percent_change";
  threshold: number;
  active: boolean;
  description: string;
}

const sampleAlerts: Alert[] = [
  {
    id: "1",
    ticker: "PETR4",
    type: "percent_change",
    threshold: 5,
    active: true,
    description: "Notificar se variar mais de 5% no dia",
  },
  {
    id: "2",
    ticker: "VALE3",
    type: "price_down",
    threshold: 55,
    active: true,
    description: "Notificar se cair abaixo de R$ 55,00",
  },
  {
    id: "3",
    ticker: "HGLG11",
    type: "price_up",
    threshold: 170,
    active: false,
    description: "Notificar se subir acima de R$ 170,00",
  },
];

const sampleNotifications = [
  {
    id: "1",
    title: "PETR4 subiu 2,24% hoje",
    body: "Petrobras PN esta em R$ 38,72. A variacao pode estar relacionada ao preco do petroleo no mercado internacional. Acompanhe as noticias do setor.",
    time: "Hoje, 14:32",
    type: "info" as const,
  },
  {
    id: "2",
    title: "MRVE3 caiu 3,65%",
    body: "MRV Engenharia recuou para R$ 8,45. O setor de construcao civil pode estar sendo pressionado por expectativas de juros. Verifique se a queda e pontual ou parte de uma tendencia.",
    time: "Hoje, 11:15",
    type: "warning" as const,
  },
  {
    id: "3",
    title: "Resultado trimestral: ITUB4",
    body: "Itau Unibanco divulgara resultados do trimestre na proxima semana. Acompanhe o comunicado oficial no site de RI da empresa.",
    time: "Ontem, 18:00",
    type: "event" as const,
  },
];

export default function AlertasPage() {
  const [alerts, setAlerts] = useState(sampleAlerts);
  const [showCreate, setShowCreate] = useState(false);
  const [newTicker, setNewTicker] = useState(stocks[0].ticker);
  const [newType, setNewType] = useState<"price_up" | "price_down" | "percent_change">("percent_change");
  const [newThreshold, setNewThreshold] = useState(5);

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const createAlert = () => {
    let description = "";
    if (newType === "percent_change") {
      description = `Notificar se variar mais de ${newThreshold}% no dia`;
    } else if (newType === "price_up") {
      description = `Notificar se subir acima de ${formatCurrency(newThreshold)}`;
    } else {
      description = `Notificar se cair abaixo de ${formatCurrency(newThreshold)}`;
    }

    setAlerts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        ticker: newTicker,
        type: newType,
        threshold: newThreshold,
        active: true,
        description,
      },
    ]);
    setShowCreate(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Alertas</h1>
        <p className="opacity-60 text-sm">
          Configure notificacoes para acompanhar mudancas importantes sem ficar olhando o mercado o dia inteiro.
        </p>
      </header>

      <div className="card mb-6" style={{ background: "var(--emerald)", border: "none" }}>
        <p className="text-white text-sm font-medium mb-1">
          Sobre os alertas do Investa
        </p>
        <p className="text-white/80 text-xs">
          Os alertas ajudam voce a acompanhar o mercado de forma inteligente. Em vez de receber
          notificacoes a cada centavo de variacao, voce define o que e relevante para voce.
          Cada alerta vem com uma explicacao do que aconteceu e sugestoes do que estudar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Meus Alertas</h2>
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm py-2">
              + Novo Alerta
            </button>
          </div>

          {showCreate && (
            <div className="card mb-4">
              <h3 className="font-bold text-sm mb-3">Criar alerta</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs opacity-50">Ativo</label>
                  <select
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
                  >
                    {stocks.map((s) => (
                      <option key={s.ticker} value={s.ticker}>
                        {s.ticker} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-50">Tipo de alerta</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as typeof newType)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
                  >
                    <option value="percent_change">Variacao percentual no dia</option>
                    <option value="price_up">Preco acima de</option>
                    <option value="price_down">Preco abaixo de</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-50">
                    {newType === "percent_change" ? "Variacao (%)" : "Preco (R$)"}
                  </label>
                  <input
                    type="number"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
                  />
                </div>
                <button onClick={createAlert} className="btn-primary w-full text-sm">
                  Criar Alerta
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {alerts.map((alert) => {
              const stock = stocks.find((s) => s.ticker === alert.ticker);
              return (
                <div key={alert.id} className="card flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{alert.ticker}</span>
                      <span className="text-xs opacity-40">{stock?.name}</span>
                    </div>
                    <p className="text-xs opacity-60 mt-1">{alert.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className={`w-12 h-6 rounded-full transition-all relative ${
                        alert.active ? "" : "opacity-40"
                      }`}
                      style={{ background: alert.active ? "var(--emerald)" : "var(--navy-border)" }}
                    >
                      <div
                        className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
                        style={{ left: alert.active ? "26px" : "2px" }}
                      />
                    </button>
                    <button
                      onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                      className="text-xs opacity-30 hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-4">Notificacoes Recentes</h2>
          <div className="space-y-3">
            {sampleNotifications.map((notif) => (
              <div key={notif.id} className="card">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">
                    {notif.type === "warning" ? "⚠️" : notif.type === "event" ? "📅" : "📊"}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-sm">{notif.title}</h3>
                      <span className="text-xs opacity-40">{notif.time}</span>
                    </div>
                    <p className="text-xs opacity-70 leading-relaxed">{notif.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card mt-4" style={{ background: "var(--navy-border)", border: "none" }}>
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <span>💡</span> Dica educacional
            </h3>
            <p className="text-xs opacity-70 leading-relaxed">
              Um alerta de queda nao significa necessariamente que voce deve vender. Quedas
              podem ser temporarias. Antes de tomar qualquer decisao, entenda <strong>por que</strong> o
              preco caiu e se isso muda os fundamentos da empresa. O modulo &ldquo;Acoes e a Bolsa&rdquo; na
              trilha de aprendizado explica como analisar essas situacoes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
