import type { AllocationType, Expense, FixedType, Goal, GoalAllocation, Indicators, RateType } from "./types";

export interface Rates {
  cdi: number;
  selic: number;
  ipca12m: number;
}

export const FALLBACK_RATES: Rates = { cdi: 0, selic: 0, ipca12m: 0 };

export function ratesFromIndicators(ind?: Indicators | null): Rates {
  return {
    cdi: ind?.cdi?.value ?? ind?.selic?.value ?? 0,
    selic: ind?.selic?.value ?? ind?.cdi?.value ?? 0,
    ipca12m: ind?.ipca12m?.value ?? 0,
  };
}

/** Taxa anual (em %) de um produto, com base nos indicadores atuais. */
export function annualRate(rateType: RateType, rate: number, r: Rates): number {
  switch (rateType) {
    case "cdi":
      return (rate / 100) * r.cdi;
    case "selic":
      return r.selic + rate;
    case "ipca":
      return ((1 + r.ipca12m / 100) * (1 + rate / 100) - 1) * 100;
    case "pre":
    case "variavel":
      return rate;
  }
}

/** Alíquota de IR regressiva da renda fixa conforme o prazo em dias. */
export function irRate(days: number): number {
  if (days <= 180) return 22.5;
  if (days <= 360) return 20;
  if (days <= 720) return 17.5;
  return 15;
}

const EXEMPT: (AllocationType | FixedType)[] = ["lci", "lca", "poupanca"];
const VARIABLE: AllocationType[] = ["acao", "fii", "etf", "cripto"];

export function isTaxExempt(type: AllocationType | FixedType): boolean {
  return EXEMPT.includes(type);
}

export function isVariable(type: AllocationType): boolean {
  return VARIABLE.includes(type);
}

/** Rendimento líquido (em %) após IR para um prazo em dias. */
export function netReturn(annualPct: number, days: number, type: AllocationType | FixedType): number {
  const gross = Math.pow(1 + annualPct / 100, days / 365) - 1;
  if (isTaxExempt(type) || VARIABLE.includes(type as AllocationType)) return gross * 100;
  return gross * (1 - irRate(days) / 100) * 100;
}

/** Rendimento da poupança ao ano (regra atual: 0,5% a.m. + TR se Selic > 8,5%; senão 70% da Selic + TR). */
export function savingsAnnual(selic: number, trMonthly = 0): number {
  const monthly = selic > 8.5 ? 0.5 + trMonthly : (Math.pow(1 + (selic * 0.7) / 100, 1 / 12) - 1) * 100 + trMonthly;
  return (Math.pow(1 + monthly / 100, 12) - 1) * 100;
}

export function monthsBetween(fromYm: string, toYm: string): number {
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function currentYm(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonthsYm(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return currentYm(d);
}

export interface ProjectionPoint {
  month: number;
  ym: string;
  invested: number;
  value: number;
}

export interface GoalProjection {
  current: number;
  monthlyTotal: number;
  months: number;
  points: ProjectionPoint[];
  valueAtDeadline: number;
  netValueAtDeadline: number;
  investedAtDeadline: number;
  reachesTarget: boolean;
  monthsToTarget: number | null;
  requiredMonthly: number;
  blendedAnnual: number;
  progress: number;
}

function allocationAnnual(a: GoalAllocation, r: Rates): number {
  if (a.type === "poupanca") return savingsAnnual(r.selic);
  return annualRate(a.rateType, a.rate, r);
}

export function projectGoal(goal: Goal, r: Rates, now = new Date()): GoalProjection {
  const start = currentYm(now);
  const months = Math.max(0, monthsBetween(start, goal.deadline));
  const allocs = goal.allocations;
  const current = allocs.reduce((s, a) => s + a.amount, 0);
  const monthlyTotal = allocs.reduce((s, a) => s + a.monthly, 0);

  const weights = allocs.map((a) => a.amount + a.monthly * Math.max(1, months));
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const blendedAnnual =
    totalWeight > 0 ? allocs.reduce((s, a, i) => s + allocationAnnual(a, r) * weights[i], 0) / totalWeight : 0;

  const horizon = Math.min(Math.max(months, 1) * 3, 600);
  const values = allocs.map((a) => a.amount);
  const invested = allocs.map((a) => a.amount);
  const monthlyRates = allocs.map((a) => Math.pow(1 + allocationAnnual(a, r) / 100, 1 / 12) - 1);
  const points: ProjectionPoint[] = [{ month: 0, ym: start, invested: current, value: current }];
  let monthsToTarget: number | null = current >= goal.target ? 0 : null;

  for (let m = 1; m <= horizon; m++) {
    for (let i = 0; i < allocs.length; i++) {
      values[i] = values[i] * (1 + monthlyRates[i]) + allocs[i].monthly;
      invested[i] += allocs[i].monthly;
    }
    const total = values.reduce((s, v) => s + v, 0);
    const inv = invested.reduce((s, v) => s + v, 0);
    if (m <= Math.max(months, 1)) points.push({ month: m, ym: addMonthsYm(start, m), invested: inv, value: total });
    if (monthsToTarget === null && total >= goal.target) monthsToTarget = m;
    if (m >= months && monthsToTarget !== null) break;
  }

  const last = points[points.length - 1];
  const days = Math.max(1, months * 30);
  let netValue = 0;
  if (allocs.length) {
    for (let i = 0; i < allocs.length; i++) {
      const a = allocs[i];
      const inv = a.amount + a.monthly * months;
      const val = futureValue(a.amount, a.monthly, monthlyRates[i], months);
      const gain = Math.max(0, val - inv);
      const tax = isTaxExempt(a.type) || isVariable(a.type) ? 0 : gain * (irRate(days) / 100);
      netValue += val - tax;
    }
  }

  const blendedMonthly = Math.pow(1 + blendedAnnual / 100, 1 / 12) - 1;
  const requiredMonthly = requiredContribution(goal.target, current, blendedMonthly, months);

  return {
    current,
    monthlyTotal,
    months,
    points,
    valueAtDeadline: last.value,
    netValueAtDeadline: netValue || last.value,
    investedAtDeadline: last.invested,
    reachesTarget: last.value >= goal.target,
    monthsToTarget,
    requiredMonthly,
    blendedAnnual,
    progress: goal.target > 0 ? Math.min(1, current / goal.target) : 0,
  };
}

export function futureValue(pv: number, pmt: number, i: number, n: number): number {
  if (n <= 0) return pv;
  if (i === 0) return pv + pmt * n;
  const f = Math.pow(1 + i, n);
  return pv * f + pmt * ((f - 1) / i);
}

export function requiredContribution(target: number, pv: number, i: number, n: number): number {
  if (n <= 0) return Math.max(0, target - pv);
  const f = Math.pow(1 + i, n);
  const remaining = target - pv * f;
  if (remaining <= 0) return 0;
  return i === 0 ? remaining / n : remaining / ((f - 1) / i);
}

export interface MonthEntry {
  expense: Expense;
  amount: number;
  installment: number;
  totalInstallments: number;
}

/** Lançamentos que caem em um mês (considera compras parceladas). */
export function entriesForMonth(expenses: Expense[], ym: string): MonthEntry[] {
  const out: MonthEntry[] = [];
  for (const e of expenses) {
    const n = Math.max(1, e.installments || 1);
    const startYm = e.date.slice(0, 7);
    const k = monthsBetween(startYm, ym);
    if (k < 0 || k >= n) continue;
    out.push({ expense: e, amount: round2(e.amount / n), installment: k + 1, totalInstallments: n });
  }
  return out.sort((a, b) => b.expense.date.localeCompare(a.expense.date));
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export interface MonthSummary {
  ym: string;
  income: number;
  extraIncome: number;
  spent: number;
  balance: number;
  byCategory: { category: string; total: number }[];
  byInstitution: { institution: string; total: number }[];
  entries: MonthEntry[];
  futureInstallments: { ym: string; total: number }[];
}

export function summarizeMonth(expenses: Expense[], ym: string, salary: number, extra: number): MonthSummary {
  const entries = entriesForMonth(expenses, ym);
  const spentEntries = entries.filter((e) => e.expense.type === "despesa");
  const incomeEntries = entries.filter((e) => e.expense.type === "receita");
  const spent = round2(spentEntries.reduce((s, e) => s + e.amount, 0));
  const extraIncome = round2(incomeEntries.reduce((s, e) => s + e.amount, 0));
  const income = round2(salary + extra);
  const cat = new Map<string, number>();
  const inst = new Map<string, number>();
  for (const e of spentEntries) {
    cat.set(e.expense.category, (cat.get(e.expense.category) ?? 0) + e.amount);
    inst.set(e.expense.institution || "—", (inst.get(e.expense.institution || "—") ?? 0) + e.amount);
  }
  const futureInstallments: { ym: string; total: number }[] = [];
  for (let k = 1; k <= 6; k++) {
    const fym = addMonthsYm(ym, k);
    const total = entriesForMonth(expenses, fym)
      .filter((e) => e.expense.type === "despesa" && e.totalInstallments > 1)
      .reduce((s, e) => s + e.amount, 0);
    if (total > 0) futureInstallments.push({ ym: fym, total: round2(total) });
  }
  return {
    ym,
    income,
    extraIncome,
    spent,
    balance: round2(income + extraIncome - spent),
    byCategory: [...cat.entries()].map(([category, total]) => ({ category, total: round2(total) })).sort((a, b) => b.total - a.total),
    byInstitution: [...inst.entries()].map(([institution, total]) => ({ institution, total: round2(total) })).sort((a, b) => b.total - a.total),
    entries,
    futureInstallments,
  };
}

export const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function ymLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_PT[m - 1]} de ${y}`;
}

export const EXPENSE_CATEGORIES = [
  "Moradia", "Alimentação", "Mercado", "Transporte", "Saúde", "Educação", "Lazer",
  "Compras", "Assinaturas", "Contas", "Viagem", "Pets", "Presentes", "Outros",
];

export const INCOME_CATEGORIES = ["Salário extra", "Freelance", "Vendas", "Rendimentos", "Reembolso", "Outros"];

export const PAYMENT_LABEL: Record<Expense["method"], string> = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  transferencia: "Transferência",
};
