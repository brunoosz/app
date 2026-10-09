import { useState } from "react";
import { formatCurrency } from "@/data/market";

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  icon: string;
}

const sampleGoals: Goal[] = [
  { id: "1", name: "Reserva de emergencia", target: 18000, current: 12500, deadline: "2025-06", icon: "🛡️" },
  { id: "2", name: "Viagem", target: 8000, current: 3200, deadline: "2025-12", icon: "✈️" },
  { id: "3", name: "Entrada do apartamento", target: 60000, current: 15000, deadline: "2027-06", icon: "🏠" },
];

export default function Objetivos() {
  const [goals, setGoals] = useState<Goal[]>(sampleGoals);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", deadline: "", icon: "🎯" });

  const [simInitial, setSimInitial] = useState(1000);
  const [simMonthly, setSimMonthly] = useState(500);
  const [simRate, setSimRate] = useState(12);
  const [simYears, setSimYears] = useState(10);

  function addGoal() {
    if (!newGoal.name || !newGoal.target) return;
    setGoals((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newGoal.name,
        target: parseFloat(newGoal.target),
        current: 0,
        deadline: newGoal.deadline || "2026-12",
        icon: newGoal.icon,
      },
    ]);
    setNewGoal({ name: "", target: "", deadline: "", icon: "🎯" });
    setShowForm(false);
  }

  function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const monthlyRate = simRate / 100 / 12;
  const totalMonths = simYears * 12;
  let simTotal = simInitial;
  const simData: number[] = [simTotal];
  for (let m = 1; m <= totalMonths; m++) {
    simTotal = simTotal * (1 + monthlyRate) + simMonthly;
    if (m % 12 === 0) simData.push(Math.round(simTotal));
  }
  const totalInvested = simInitial + simMonthly * totalMonths;
  const totalInterest = Math.round(simTotal) - totalInvested;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Objetivos</h1>
        <p className="opacity-60">Planeje suas metas financeiras e acompanhe o progresso.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setShowSimulator(false); }}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none"
          style={{
            background: !showSimulator ? "var(--emerald)" : "var(--navy-card)",
            color: !showSimulator ? "white" : "var(--foreground)",
          }}
        >
          Metas
        </button>
        <button
          onClick={() => setShowSimulator(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none"
          style={{
            background: showSimulator ? "var(--emerald)" : "var(--navy-card)",
            color: showSimulator ? "white" : "var(--foreground)",
          }}
        >
          Simulador de juros compostos
        </button>
      </div>

      {!showSimulator ? (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div key={goal.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <h3 className="font-bold">{goal.name}</h3>
                      <p className="text-xs opacity-50">Meta: {goal.deadline}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="text-xs opacity-30 hover:opacity-100 transition-all cursor-pointer border-none bg-transparent"
                    style={{ color: "var(--red)" }}
                  >
                    Remover
                  </button>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-sm font-medium">{formatCurrency(goal.current)}</span>
                  <span className="text-sm opacity-50">{formatCurrency(goal.target)}</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--navy-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: "var(--emerald)" }}
                  />
                </div>
                <p className="text-xs opacity-40 mt-1 text-right">{progress.toFixed(1)}%</p>
              </div>
            );
          })}

          {showForm ? (
            <div className="card space-y-3">
              <h3 className="font-bold" style={{ color: "var(--emerald)" }}>Nova meta</h3>
              <input
                type="text"
                placeholder="Nome da meta"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="input-field"
              />
              <input
                type="number"
                placeholder="Valor alvo (R$)"
                value={newGoal.target}
                onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                className="input-field"
              />
              <input
                type="month"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                className="input-field"
              />
              <div className="flex gap-2">
                {["🎯", "🏠", "🚗", "✈️", "📱", "🎓", "💰"].map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewGoal({ ...newGoal, icon })}
                    className={`text-2xl p-2 rounded-lg cursor-pointer border-none transition-all ${
                      newGoal.icon === icon ? "scale-110" : "opacity-40"
                    }`}
                    style={{
                      background: newGoal.icon === icon ? "var(--navy-border)" : "transparent",
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addGoal} className="btn-primary flex-1">
                  Criar meta
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
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary w-full"
            >
              + Nova meta
            </button>
          )}
        </div>
      ) : (
        <div className="card space-y-6">
          <h3 className="font-bold text-lg" style={{ color: "var(--emerald)" }}>
            Simulador de juros compostos
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs opacity-50 block mb-1">Investimento inicial</label>
              <input
                type="range"
                min="0"
                max="50000"
                step="500"
                value={simInitial}
                onChange={(e) => setSimInitial(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-sm font-bold">{formatCurrency(simInitial)}</p>
            </div>
            <div>
              <label className="text-xs opacity-50 block mb-1">Aporte mensal</label>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={simMonthly}
                onChange={(e) => setSimMonthly(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-sm font-bold">{formatCurrency(simMonthly)}</p>
            </div>
            <div>
              <label className="text-xs opacity-50 block mb-1">Taxa anual (%)</label>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={simRate}
                onChange={(e) => setSimRate(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-sm font-bold">{simRate}% ao ano</p>
            </div>
            <div>
              <label className="text-xs opacity-50 block mb-1">Periodo (anos)</label>
              <input
                type="range"
                min="1"
                max="40"
                value={simYears}
                onChange={(e) => setSimYears(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-sm font-bold">{simYears} anos</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl" style={{ background: "var(--background)" }}>
              <p className="text-xs opacity-50 mb-1">Total investido</p>
              <p className="text-lg font-bold">{formatCurrency(totalInvested)}</p>
            </div>
            <div className="text-center p-4 rounded-xl" style={{ background: "var(--background)" }}>
              <p className="text-xs opacity-50 mb-1">Juros ganhos</p>
              <p className="text-lg font-bold" style={{ color: "var(--emerald)" }}>
                {formatCurrency(totalInterest)}
              </p>
            </div>
            <div className="text-center p-4 rounded-xl" style={{ background: "var(--background)" }}>
              <p className="text-xs opacity-50 mb-1">Total final</p>
              <p className="text-lg font-bold">{formatCurrency(Math.round(simTotal))}</p>
            </div>
          </div>

          <div>
            <p className="text-xs opacity-40 mb-2">Evolucao ano a ano</p>
            <div className="flex items-end gap-1" style={{ height: "120px" }}>
              {simData.map((val, i) => {
                const maxVal = Math.max(...simData);
                const height = (val / maxVal) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${Math.max(height, 2)}%`,
                        background: "var(--emerald)",
                        opacity: 0.3 + (i / simData.length) * 0.7,
                      }}
                    />
                    {simData.length <= 15 && (
                      <span className="text-[10px] opacity-30">{i}a</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-lg text-xs opacity-60" style={{ background: "var(--background)" }}>
            <strong>Dica:</strong> Os juros compostos sao o &ldquo;juros sobre juros&rdquo;. Quanto mais tempo voce
            deixa o dinheiro investido, mais ele cresce. Albert Einstein teria dito: &ldquo;Os juros compostos sao a oitava
            maravilha do mundo.&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
