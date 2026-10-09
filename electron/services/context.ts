import type { Quote, UserDataMap } from "@shared/types";
import { displaySymbol, LIQUID_UNIVERSE } from "@shared/catalog";
import { institutionLabel } from "@shared/banks";
import { annualRate, currentYm, projectGoal, ratesFromIndicators, summarizeMonth, ymLabel } from "@shared/finance";
import { getCopom, getIndicators } from "./bcb";
import { getNews } from "./news";
import { getTesouro, formatTesouroRate } from "./tesouro";
import { getChart, getQuotes } from "./yahoo";
import { fixedHoldingValue, fxFor } from "./portfolio";
import { nowInSaoPaulo } from "./http";
import { LEVELS, TOTAL_LESSONS } from "@shared/learning";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number, d = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(d).replace(".", ",")}%`;
const n2 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const brDate = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

function money(q: Quote): string {
  if (q.currency === "BRL") return brl(q.price);
  return `${q.currency} ${n2(q.price)}`;
}

const ALIASES: [RegExp, string][] = [
  [/petrobr[aá]s/i, "PETR4.SA"],
  [/\bita[uú]\b/i, "ITUB4.SA"],
  [/bradesco/i, "BBDC4.SA"],
  [/banco do brasil/i, "BBAS3.SA"],
  [/ambev/i, "ABEV3.SA"],
  [/\bweg\b/i, "WEGE3.SA"],
  [/magalu|magazine luiza/i, "MGLU3.SA"],
  [/nubank/i, "ROXO34.SA"],
  [/eletrobr[aá]s/i, "ELET3.SA"],
  [/sabesp/i, "SBSP3.SA"],
  [/embraer/i, "EMBR3.SA"],
  [/localiza/i, "RENT3.SA"],
  [/suzano/i, "SUZB3.SA"],
  [/gerdau/i, "GGBR4.SA"],
  [/(a[cç][aã]o|a[cç][oõ]es|pap[eé]is|papel|mineradora)\s+da\s+vale\b/i, "VALE3.SA"],
  [/bitcoin/i, "BTC-USD"],
  [/ethereum/i, "ETH-USD"],
  [/d[oó]lar/i, "USDBRL=X"],
  [/\beuro\b/i, "EURBRL=X"],
  [/\bouro\b/i, "GC=F"],
  [/ibovespa|\bibov\b/i, "^BVSP"],
  [/apple/i, "AAPL"],
  [/tesla/i, "TSLA"],
  [/nvidia/i, "NVDA"],
  [/microsoft/i, "MSFT"],
];

export function detectSymbols(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.toUpperCase().matchAll(/\b([A-Z]{4}\d{1,2})\b/g)) found.add(`${m[1]}.SA`);
  for (const [re, sym] of ALIASES) if (re.test(text)) found.add(sym);
  return [...found].slice(0, 6);
}

function marketStatus(now: Date): string {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (day === 0 || day === 6) return "fim de semana — B3 fechada";
  if (minutes >= 10 * 60 && minutes < 17 * 60 + 55) return "pregão da B3 aberto";
  if (minutes < 10 * 60) return "antes da abertura da B3 (abre às 10h)";
  return "após o fechamento da B3";
}

async function assetDetail(symbol: string, q?: Quote): Promise<string> {
  if (!q) return `- ${displaySymbol(symbol)}: sem cotação disponível agora.`;
  const parts = [`${displaySymbol(symbol)} (${q.name}): ${money(q)} (${pct(q.changePercent)} hoje)`];
  try {
    const chart = await getChart(symbol, "1A");
    const pts = chart.points;
    const lastClose = q.price;
    const at = (days: number) => {
      const target = Date.now() / 1000 - days * 86400;
      const p = pts.find((x) => x.time >= target);
      return p ? ((lastClose - p.close) / p.close) * 100 : undefined;
    };
    const m1 = at(30);
    const m6 = at(182);
    const y1 = pts.length ? ((lastClose - pts[0].close) / pts[0].close) * 100 : undefined;
    const perf = [m1 !== undefined && `1 mês ${pct(m1, 1)}`, m6 !== undefined && `6 meses ${pct(m6, 1)}`, y1 !== undefined && `12 meses ${pct(y1, 1)}`]
      .filter(Boolean)
      .join(", ");
    if (perf) parts.push(`desempenho: ${perf}`);
  } catch {
    // histórico indisponível
  }
  if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh) parts.push(`faixa 52 semanas ${n2(q.fiftyTwoWeekLow)}–${n2(q.fiftyTwoWeekHigh)}`);
  if (q.fiftyDayAverage) parts.push(`média 50 dias ${n2(q.fiftyDayAverage)} (${pct(((q.price - q.fiftyDayAverage) / q.fiftyDayAverage) * 100, 1)} vs média)`);
  if (q.pe) parts.push(`P/L ${n2(q.pe)}`);
  if (q.priceToBook) parts.push(`P/VP ${n2(q.priceToBook)}`);
  if (q.dividendYield) parts.push(`dividend yield ${n2(q.dividendYield)}%`);
  if (q.marketCap) parts.push(`valor de mercado ${brl(q.marketCap).replace(/,\d+$/, "")}`);
  return `- ${parts.join("; ")}`;
}

export async function buildAiContext(user: { name: string }, data: UserDataMap, notifications: { title: string; message: string; createdAt: string }[], question: string): Promise<string> {
  const now = nowInSaoPaulo();
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const lines: string[] = [];
  lines.push("# Data e hora");
  lines.push(
    `Agora: ${weekday}, ${now.toLocaleDateString("pt-BR")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} (horário de Brasília) — ${marketStatus(now)}.`
  );

  const mentioned = detectSymbols(question);
  const portfolioSymbols = data.portfolio.filter((h) => h.kind === "variavel" && h.symbol).map((h) => h.symbol!);
  const [indR, copomR, newsR, tesouroR, quotesR] = await Promise.allSettled([
    getIndicators(),
    getCopom(),
    getNews(),
    getTesouro(),
    getQuotes([...LIQUID_UNIVERSE, "^BVSP", "USDBRL=X", "EURBRL=X", "BTC-USD", "IFIX.SA", ...mentioned, ...portfolioSymbols], 30_000),
  ]);
  const ind = indR.status === "fulfilled" ? indR.value : undefined;
  const quotes = quotesR.status === "fulfilled" ? quotesR.value : ({} as Record<string, Quote>);

  lines.push("\n# Indicadores oficiais (Banco Central do Brasil)");
  if (ind) {
    if (ind.selic) lines.push(`- Selic meta: ${n2(ind.selic.value)}% a.a. (referência ${brDate(ind.selic.date)})`);
    if (ind.cdi) lines.push(`- CDI: ${n2(ind.cdi.value)}% a.a.`);
    if (ind.ipcaMonth) lines.push(`- IPCA de ${ymLabel(ind.ipcaMonth.date.slice(0, 7))}: ${n2(ind.ipcaMonth.value)}%`);
    if (ind.ipca12m) lines.push(`- IPCA acumulado em 12 meses: ${n2(ind.ipca12m.value)}%`);
    if (ind.dollarPtax) lines.push(`- Dólar PTAX: ${brl(ind.dollarPtax.value)} (${brDate(ind.dollarPtax.date)})`);
    if (ind.savingsMonth) lines.push(`- Poupança: ${n2(ind.savingsMonth.value)}% no mês`);
    const f = ind.focus;
    if (f) {
      const items = [
        f.ipcaYear && `IPCA ${f.ipcaYear.year}: ${n2(f.ipcaYear.value)}%`,
        f.selicYear && `Selic fim de ${f.selicYear.year}: ${n2(f.selicYear.value)}%`,
        f.pibYear && `PIB ${f.pibYear.year}: ${n2(f.pibYear.value)}%`,
        f.dollarYear && `câmbio fim de ${f.dollarYear.year}: R$ ${n2(f.dollarYear.value)}`,
      ].filter(Boolean);
      if (items.length) lines.push(`- Boletim Focus (${brDate(f.date)}), expectativas do mercado: ${items.join("; ")}`);
    }
  } else {
    lines.push("- Indicadores indisponíveis no momento (sem conexão com o Banco Central).");
  }

  if (copomR.status === "fulfilled") {
    const c = copomR.value;
    lines.push("\n# Copom");
    if (c.lastMeeting) {
      const lm = c.lastMeeting;
      const desc =
        lm.outcome === "aguardando"
          ? "decisão ainda não refletida nos dados"
          : lm.outcome === "manteve"
            ? `manteve a Selic em ${n2(lm.to ?? 0)}%`
            : `${lm.outcome} a Selic de ${n2(lm.from ?? 0)}% para ${n2(lm.to ?? 0)}%`;
      lines.push(`- Última reunião: ${brDate(lm.date)} — ${desc}`);
    }
    if (c.nextMeeting) lines.push(`- Próxima reunião: ${brDate(c.nextMeeting.start)} e ${brDate(c.nextMeeting.decision)} (decisão no segundo dia, após as 18h)`);
    if (c.expectation) lines.push(`- Expectativa do mercado (Focus) para a reunião ${c.expectation.meeting}: Selic em ${n2(c.expectation.value)}%`);
    if (c.history.length) lines.push(`- Mudanças recentes na Selic: ${c.history.slice(0, 4).map((h) => `${brDate(h.date)}: ${n2(h.from)}% → ${n2(h.to)}%`).join("; ")}`);
  }

  lines.push("\n# Mercado agora (Yahoo Finance; cotações da B3 podem ter atraso de até 15 minutos)");
  const ibov = quotes["^BVSP"];
  if (ibov) lines.push(`- Ibovespa: ${ibov.price.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pontos (${pct(ibov.changePercent)})`);
  const ifix = quotes["IFIX.SA"];
  if (ifix) lines.push(`- IFIX: ${n2(ifix.price)} pontos (${pct(ifix.changePercent)})`);
  const usd = quotes["USDBRL=X"];
  if (usd) lines.push(`- Dólar comercial agora: ${brl(usd.price)} (${pct(usd.changePercent)})`);
  const btc = quotes["BTC-USD"];
  if (btc && usd) lines.push(`- Bitcoin: US$ ${n2(btc.price)} ≈ ${brl(btc.price * usd.price)} (${pct(btc.changePercent)})`);
  const liquid = LIQUID_UNIVERSE.map((s) => quotes[s]).filter((q): q is Quote => !!q);
  if (liquid.length) {
    const fmt = (q: Quote) =>
      `${displaySymbol(q.symbol)} ${brl(q.price)} (${pct(q.changePercent)}${q.pe ? `, P/L ${n2(q.pe)}` : ""}${q.dividendYield ? `, DY ${n2(q.dividendYield)}%` : ""})`;
    const byChange = [...liquid].sort((a, b) => b.changePercent - a.changePercent);
    lines.push(`- Maiores altas hoje entre as ${liquid.length} ações mais negociadas: ${byChange.slice(0, 5).map(fmt).join("; ")}`);
    lines.push(`- Maiores quedas hoje: ${byChange.slice(-5).reverse().map(fmt).join("; ")}`);
    const dy = liquid.filter((q) => q.dividendYield).sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0));
    if (dy.length) lines.push(`- Maiores dividend yields (12 meses): ${dy.slice(0, 5).map(fmt).join("; ")}`);
    const pe = liquid.filter((q) => q.pe && q.pe > 0).sort((a, b) => (a.pe ?? 0) - (b.pe ?? 0));
    if (pe.length) lines.push(`- Menores P/L (positivos): ${pe.slice(0, 5).map(fmt).join("; ")}`);
    const vsAvg = liquid
      .filter((q) => q.fiftyDayAverage)
      .map((q) => ({ q, d: ((q.price - q.fiftyDayAverage!) / q.fiftyDayAverage!) * 100 }))
      .sort((a, b) => a.d - b.d);
    if (vsAvg.length) {
      lines.push(`- Mais abaixo da média de 50 dias: ${vsAvg.slice(0, 4).map((x) => `${displaySymbol(x.q.symbol)} (${pct(x.d, 1)})`).join("; ")}`);
      lines.push(`- Mais acima da média de 50 dias: ${vsAvg.slice(-4).reverse().map((x) => `${displaySymbol(x.q.symbol)} (${pct(x.d, 1)})`).join("; ")}`);
    }
  } else {
    lines.push("- Cotações indisponíveis no momento.");
  }

  if (tesouroR.status === "fulfilled") {
    const buyable = tesouroR.value.titles.filter((t) => t.canBuy);
    if (buyable.length) {
      lines.push(`\n# Tesouro Direto (taxas de compra, ${tesouroR.value.source})`);
      lines.push(buyable.slice(0, 12).map((t) => `- ${t.name}: ${formatTesouroRate(t)}${t.minInvestment ? `, mínimo ${brl(t.minInvestment)}` : ""}`).join("\n"));
    }
  }

  if (mentioned.length) {
    lines.push("\n# Ativos citados na pergunta");
    for (const s of mentioned) lines.push(await assetDetail(s, quotes[s]));
  }

  if (newsR.status === "fulfilled" && newsR.value.length) {
    lines.push("\n# Notícias recentes do mercado");
    for (const n of newsR.value.slice(0, 8)) {
      const d = new Date(n.publishedAt);
      lines.push(`- [${n.source}, ${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}] ${n.title}`);
    }
  }

  const p = data.profile;
  const rates = ratesFromIndicators(ind);
  lines.push(`\n# Sobre o usuário (${user.name})`);
  if (p.onboarded) {
    lines.push(
      `- Perfil de investidor: ${p.riskProfile}; experiência: ${p.experience}; objetivo principal: ${p.mainGoal}${p.age ? `; idade: ${p.age}` : ""}`
    );
    lines.push(
      `- Renda líquida mensal: ${brl(p.salary)}${p.extraIncome ? ` + renda extra ${brl(p.extraIncome)}` : ""}; gastos fixos ${brl(p.fixedExpenses)}; gastos variáveis ${brl(p.variableExpenses)}; pode investir ${brl(p.monthlyInvest)}/mês`
    );
    lines.push(`- Reserva de emergência atual: ${brl(p.emergencyReserve)}; já investido: ${brl(p.invested)}; dívidas: ${brl(p.debts)}`);
  } else {
    lines.push("- O usuário ainda não preencheu os dados financeiros (pode sugerir que preencha em Configurações).");
  }

  if (data.portfolio.length) {
    lines.push("- Carteira:");
    for (const h of data.portfolio.slice(0, 25)) {
      if (h.kind === "variavel" && h.symbol) {
        const q = quotes[h.symbol];
        const fx = fxFor(q?.currency ?? "BRL", quotes);
        const cur = q ? q.price : h.avgPrice ?? 0;
        const ret = h.avgPrice ? ((cur - h.avgPrice) / h.avgPrice) * 100 : 0;
        lines.push(
          `  - ${displaySymbol(h.symbol)}: ${n2(h.quantity ?? 0)} cotas, preço médio ${n2(h.avgPrice ?? 0)}, agora ${q ? n2(q.price) : "?"} (${pct(ret, 1)}), posição ≈ ${brl((h.quantity ?? 0) * cur * fx)} — ${institutionLabel(h.institution)}`
        );
      } else {
        const annual = annualRate(h.rateType ?? "cdi", h.rate ?? 100, rates);
        const rateLabel = h.rateType === "cdi" ? `${n2(h.rate ?? 0)}% do CDI` : h.rateType === "pre" ? `${n2(h.rate ?? 0)}% a.a.` : `${h.rateType?.toUpperCase()} + ${n2(h.rate ?? 0)}%`;
        lines.push(
          `  - ${h.name} (${rateLabel}) em ${institutionLabel(h.institution)}: aplicado ${brl(h.amount ?? 0)} em ${brDate(h.purchaseDate)}, vale ≈ ${brl(fixedHoldingValue(h, annual))}`
        );
      }
    }
  } else {
    lines.push("- Carteira: nenhum investimento cadastrado no app.");
  }

  if (data.goals.length) {
    lines.push("- Objetivos:");
    for (const g of data.goals.slice(0, 8)) {
      const proj = projectGoal(g, rates);
      const where = g.allocations.map((a) => `${a.asset || a.type} em ${institutionLabel(a.institution)} (${brl(a.amount)} + ${brl(a.monthly)}/mês)`).join(", ");
      lines.push(
        `  - ${g.name}: ${brl(proj.current)} de ${brl(g.target)} até ${g.deadline.split("-").reverse().join("/")}; projeção no prazo ${brl(proj.valueAtDeadline)} (${proj.reachesTarget ? "atinge" : `não atinge; precisaria de ${brl(proj.requiredMonthly)}/mês`})${where ? `; investido em: ${where}` : ""}`
      );
    }
  }

  const ym = currentYm();
  const month = summarizeMonth(data.expenses, ym, p.salary, p.extraIncome);
  if (month.entries.length) {
    lines.push(
      `- Gastos de ${ymLabel(ym)}: ${brl(month.spent)} (${month.byCategory.slice(0, 5).map((c) => `${c.category} ${brl(c.total)}`).join(", ")}); saldo previsto ${brl(month.balance)}`
    );
    if (month.futureInstallments.length) {
      lines.push(`- Parcelas futuras: ${month.futureInstallments.map((f) => `${ymLabel(f.ym)} ${brl(f.total)}`).join("; ")}`);
    }
  }

  const done = Object.values(data.learning.completed).filter((c) => c.approved).length;
  const level = [...LEVELS].reverse().find((l) => data.learning.xp >= l.xp) ?? LEVELS[0];
  lines.push(`- Aulas no app: nível "${level.name}", ${data.learning.xp} XP, ${done} de ${TOTAL_LESSONS} aulas concluídas.`);

  const activeAlerts = data.alerts.filter((a) => a.active && a.symbol);
  if (activeAlerts.length) {
    lines.push(`- Alertas de preço ativos: ${activeAlerts.slice(0, 8).map((a) => `${displaySymbol(a.symbol!)} ${a.kind} ${a.value ?? ""}`).join("; ")}`);
  }
  if (notifications.length) {
    lines.push("- Notificações recentes que o usuário recebeu:");
    for (const n of notifications.slice(0, 6)) lines.push(`  - ${n.title}: ${n.message}`);
  }

  return lines.join("\n");
}

export const SYSTEM_PROMPT = `Você é o Professor Investa, a inteligência artificial do aplicativo Investa (Aprenda · Invista · Evolua). Fale sempre em português do Brasil, de forma clara, acolhedora e didática — como um professor paciente que ensina finanças para iniciantes, mas que também conversa no nível de investidores experientes quando for o caso.

Como agir:
- Use os DADOS EM TEMPO REAL do contexto (data e hora, indicadores do Banco Central, Copom, cotações, Tesouro Direto, notícias, carteira, metas e gastos do usuário). Cite números e a data/hora quando usar dados de mercado.
- Nunca invente cotações, taxas, datas ou notícias. Se algo não estiver no contexto, diga que não tem esse dado agora e indique onde conferir.
- Personalize: considere renda, gastos, reserva de emergência, dívidas, perfil de risco, objetivos e carteira do usuário.
- "Por onde começo?": monte um plano em passos numerados baseado na situação dele (quitar dívidas caras → reserva de emergência → objetivos de curto prazo → longo prazo e diversificação), com valores em reais e produtos concretos (ex.: Tesouro Selic, CDB com liquidez diária ≥ 100% do CDI).
- "Quais as melhores ações/investimentos hoje?": analise com os dados (altas e quedas do dia, P/L, P/VP, dividend yield, distância da média de 50 dias, desempenho recente), explique o porquê de cada destaque em linguagem simples e relacione com o perfil do usuário. Termine com UMA frase curta lembrando que é uma análise educacional, não uma recomendação individual. Não se recuse a analisar.
- Explique termos técnicos na primeira vez que aparecerem.
- Pode responder perguntas gerais também, sempre de forma útil e direta.
- Formate em Markdown: parágrafos curtos, listas, **negrito** em números importantes e tabelas para comparar opções. Seja objetivo e ofereça aprofundar no final quando fizer sentido.
- Se o usuário quiser fazer algo arriscado (ex.: colocar a reserva em cripto, pegar empréstimo para investir), alerte com clareza e gentileza.`;

