"use client";

import { useState } from "react";
import { formatCurrency } from "@/data/market";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  deadline: number;
  icon: string;
}

const presetGoals = [
  { name: "Reserva de Emergencia", icon: "🛡️", target: 15000 },
  { name: "Viagem", icon: "✈️", target: 8000 },
  { name: "Computador Novo", icon: "💻", target: 5000 },
  { name: "Faculdade", icon: "🎓", target: 50000 },
  { name: "Carro", icon: "🚗", target: 60000 },
  { name: "Apartamento (Entrada)", icon: "🏠", target: 100000 },
];

function calculateMonths(target: number, current: number, monthly: number, annualRate: number): number {
  if (monthly <= 0) return Infinity;
  const monthlyRate = annualRate / 12;
  let balance = current;
  let months = 0;
  while (balance < target && months < 600) {
    balance = balance * (1 + monthlyRate) + monthly;
    months++;
  }
  return months;
}

function SimulationCard() {
  const [amount, setAmount] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(10);

  const monthlyRate = rate / 100 / 12;
  const totalMonths = years * 12;
  let balance = amount;
  const data: number[] = [balance];

  for (let i = 0; i < totalMonths; i++) {
    balance = balance * (1 + monthlyRate) + monthly;
    if ((i + 1) % 12 === 0) data.push(balance);
  }

  const totalInvested = amount + monthly * totalMonths;
  const totalReturn = balance - totalInvested;

  return (
    <div className="card">
      <h2 className="font-bold mb-4 flex items-center gap-2">
        <span>📊</span> Simulador de Rendimentos
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs opacity-50 block mb-1">Valor inicial</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full px-4 py-2 rounded-xl border text-sm"
            style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
          />
        </div>
        <div>
          <label className="text-xs opacity-50 block mb-1">Aporte mensal</label>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(Math.max(0, Number(e.target.value)))}
            className="w-full px-4 py-2 rounded-xl border text-sm"
            style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
          />
        </div>
        <div>
          <label className="text-xs opacity-50 block mb-1">Prazo (anos): {years}</label>
          <input
            type="range"
            min={1}
            max={30}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs opacity-50 block mb-1">Taxa anual (%): {rate}%</label>
          <input
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl text-center" style={{ background: "var(--navy-border)" }}>
          <p className="text-xs opacity-50">Total investido</p>
          <p className="font-bold text-sm">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "var(--navy-border)" }}>
          <p className="text-xs opacity-50">Rendimento</p>
          <p className="font-bold text-sm text-emerald-400">{formatCurrency(totalReturn)}</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "var(--navy-border)" }}>
          <p className="text-xs opacity-50">Total final</p>
          <p className="font-bold text-sm">{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="h-40 flex items-end gap-1">
        {data.map((val, i) => {
          const max = Math.max(...data);
          const height = (val / max) * 100;
          const investedPortion = (amount + monthly * 12 * i) / val;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end" title={`Ano ${i}: ${formatCurrency(val)}`}>
              <div className="rounded-t-sm" style={{
                height: `${Math.max(height, 3)}%`,
                background: `linear-gradient(to top, var(--navy-border) ${investedPortion * 100}%, var(--emerald) ${investedPortion * 100}%)`,
              }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs opacity-40 mt-1">
        <span>Ano 0</span>
        <span>Ano {years}</span>
      </div>
      <div className="flex items-center gap-4 text-xs mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--navy-border)" }} />
          <span className="opacity-50">Investido</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--emerald)" }} />
          <span className="opacity-50">Rendimento</span>
        </div>
      </div>

      <p className="text-xs opacity-30 mt-4">
        Simulacao hipotetica. Rentabilidade passada nao garante resultados futuros. A taxa informada nao considera inflacao nem impostos.
      </p>
    </div>
  );
}

export default function ObjetivosPage() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      name: "Reserva de Emergencia",
      targetAmount: 15000,
      currentAmount: 3200,
      monthlyContribution: 500,
      deadline: 24,
      icon: "🛡️",
    },
  ]);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(10000);
  const [newGoalMonthly, setNewGoalMonthly] = useState(300);
  const [newGoalIcon, setNewGoalIcon] = useState("🎯");

  const addGoal = () => {
    if (!newGoalName.trim()) return;
    const months = calculateMonths(newGoalTarget, 0, newGoalMonthly, 0.10);
    setGoals((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newGoalName,
        targetAmount: newGoalTarget,
        currentAmount: 0,
        monthlyContribution: newGoalMonthly,
        deadline: months,
        icon: newGoalIcon,
      },
    ]);
    setNewGoalName("");
    setNewGoalTarget(10000);
    setNewGoalMonthly(300);
    setShowNewGoal(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Meus Objetivos</h1>
        <p className="opacity-60 text-sm">
          Defina metas financeiras e simule cenarios para alcanca-las.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Suas Metas</h2>
            <button
              onClick={() => setShowNewGoal(!showNewGoal)}
              className="btn-primary text-sm py-2"
            >
              + Nova Meta
            </button>
          </div>

          {showNewGoal && (
            <div className="card mb-4">
              <h3 className="font-bold mb-3 text-sm">Criar nova meta</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex gap-1">
                    {["🎯", "🛡️", "✈️", "💻", "🎓", "🚗", "🏠", "💰"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewGoalIcon(emoji)}
                        className={`w-8 h-8 rounded-lg text-lg ${newGoalIcon === emoji ? "ring-2 ring-emerald-500" : ""}`}
                        style={{ background: "var(--navy-border)" }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="Nome da meta"
                  className="w-full px-4 py-2 rounded-xl border text-sm"
                  style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs opacity-50">Valor alvo (R$)</label>
                    <input
                      type="number"
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl border text-sm"
                      style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs opacity-50">Aporte mensal (R$)</label>
                    <input
                      type="number"
                      value={newGoalMonthly}
                      onChange={(e) => setNewGoalMonthly(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl border text-sm"
                      style={{ background: "var(--navy-card)", borderColor: "var(--navy-border)", color: "var(--foreground)" }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {presetGoals.map((pg) => (
                    <button
                      key={pg.name}
                      onClick={() => {
                        setNewGoalName(pg.name);
                        setNewGoalTarget(pg.target);
                        setNewGoalIcon(pg.icon);
                      }}
                      className="px-2 py-1 rounded-lg text-xs border transition-all hover:border-emerald-500"
                      style={{ borderColor: "var(--navy-border)" }}
                    >
                      {pg.icon} {pg.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <button onClick={addGoal} className="btn-primary w-full text-sm">
                  Criar Meta
                </button>
              </div>
            </div>
          )}

          {goals.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-3xl mb-3">🎯</p>
              <p className="font-bold mb-1">Nenhuma meta criada</p>
              <p className="text-sm opacity-50">
                Crie sua primeira meta financeira para comecar a planejar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const months = calculateMonths(
                  goal.targetAmount,
                  goal.currentAmount,
                  goal.monthlyContribution,
                  0.10
                );
                return (
                  <div key={goal.id} className="card">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{goal.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{goal.name}</h3>
                        <p className="text-xs opacity-50">
                          {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <button
                        onClick={() => setGoals((prev) => prev.filter((g) => g.id !== goal.id))}
                        className="text-xs opacity-30 hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>

                    <div className="w-full h-3 rounded-full overflow-hidden mb-2" style={{ background: "var(--navy-border)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%`, background: "var(--emerald)" }}
                      />
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="opacity-50">{progress.toFixed(1)}% concluido</span>
                      <span className="opacity-50">
                        {months === Infinity
                          ? "Defina um aporte mensal"
                          : months <= 0
                          ? "Meta atingida!"
                          : `~${months} meses (${(months / 12).toFixed(1)} anos)`}
                      </span>
                    </div>
                    <p className="text-xs opacity-40 mt-1">
                      Aporte mensal: {formatCurrency(goal.monthlyContribution)} • Taxa hipotetica: 10% a.a.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SimulationCard />
      </div>
    </div>
  );
}
