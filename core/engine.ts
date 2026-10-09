import type { AppNotification, Holding, PriceAlert, Quote, UserSettings } from "@shared/types";
import { displaySymbol } from "@shared/catalog";
import { DAILY_TIPS } from "@shared/tips";
import { billDueDate, ymLabel } from "@shared/finance";
import type { Store } from "./store";
import { getQuotes } from "./yahoo";
import { getCopom, getIndicators } from "./bcb";
import { nowInSaoPaulo, todayIsoSaoPaulo } from "./http";
import { fxFor } from "./portfolio";

type NewNotification = Omit<AppNotification, "id" | "createdAt" | "read">;

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number, d = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(d).replace(".", ",")}%`;
const n2 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brDate = (iso: string) => iso.slice(0, 10).split("-").reverse().slice(0, 2).join("/");

function priceLabel(q: Quote): string {
  return q.currency === "BRL" ? brl(q.price) : `${q.currency} ${n2(q.price)}`;
}

function valueLabel(q: Quote, v: number): string {
  return q.currency === "BRL" ? brl(v) : `${q.currency} ${n2(v)}`;
}

export class AlertEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private userId: string | null = null;
  private running = false;

  /** Avisado quando o motor muda dados do usuário (para sincronizar e atualizar a tela). */
  onDataChanged?: (userId: string) => void;

  constructor(private store: Store, private emit: (userId: string, n: AppNotification) => void) {}

  start(userId: string): void {
    this.stop();
    this.userId = userId;
    setTimeout(() => void this.tick(), 3_000);
    this.timer = setInterval(() => void this.tick(), 60_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.userId = null;
  }

  runNow(): void {
    // As checagens locais (lembretes, faturas, contas, caixinhas) rodam na hora,
    // mesmo se a rodada anterior ainda estiver esperando cotações.
    if (this.userId) this.localChecks(this.userId);
    void this.tick();
  }

  private localChecks(uid: string): void {
    this.reminders(uid, this.store.getData(uid, "alerts"));
    this.invoices(uid);
    this.bills(uid);
    this.boxes(uid);
  }

  /** Cria uma notificação (uma vez por chave, quando houver chave). */
  push(userId: string, n: NewNotification, key?: string): boolean {
    const st = this.store.engine(userId);
    if (key && st.keys[key]) return false;
    if (key) st.keys[key] = new Date().toISOString();
    const notification: AppNotification = { ...n, id: globalThis.crypto.randomUUID(), createdAt: new Date().toISOString(), read: false };
    this.store.setNotifications(userId, [notification, ...this.store.getNotifications(userId)]);
    this.emit(userId, notification);
    return true;
  }

  /** Dispara apenas quando a condição passa de falsa para verdadeira (com rearme). */
  private edge(userId: string, id: string, condition: boolean, rearm: boolean): boolean {
    const st = this.store.engine(userId).alertState;
    const prev = st[id];
    if (condition && !prev?.fired) {
      st[id] = { fired: true, firedAt: new Date().toISOString() };
      this.store.save();
      return true;
    }
    if (!condition && prev?.fired && rearm) {
      st[id] = { fired: false };
      this.store.save();
    }
    return false;
  }

  async tick(): Promise<void> {
    const uid = this.userId;
    if (!uid || this.running) return;
    this.running = true;
    try {
      const user = this.store.findUser(uid);
      if (!user) return;
      const settings = this.store.getData(uid, "settings");
      const alerts = this.store.getData(uid, "alerts");
      const portfolio = this.store.getData(uid, "portfolio");

      this.push(
        uid,
        {
          type: "sistema",
          tone: "info",
          title: `Bem-vindo ao Investa, ${user.name.split(" ")[0]}!`,
          message: "Aqui você aprende a investir, acompanha o mercado em tempo real e planeja seus objetivos. Comece pelas Aulas ou pergunte qualquer coisa ao Assistente.",
        },
        "welcome"
      );

      this.localChecks(uid);

      const variable = portfolio.filter((h) => h.kind === "variavel" && h.symbol);
      const symbols = [
        ...alerts.filter((a) => a.active && a.symbol && a.kind !== "lembrete").map((a) => a.symbol!),
        ...(settings.smartAlerts ? variable.map((h) => h.symbol!) : []),
        "^BVSP",
        "USDBRL=X",
        "EURBRL=X",
      ];
      const quotes = await getQuotes(symbols, 45_000).catch(() => ({}) as Record<string, Quote>);

      this.priceAlerts(uid, alerts, quotes);
      if (settings.smartAlerts) this.smart(uid, variable, quotes, settings);
      if (settings.marketEvents) await this.marketEvents(uid, quotes);
      if (settings.dailyTip) this.tip(uid);
      this.prune(uid);
    } finally {
      this.running = false;
    }
  }

  /** Avisa uma vez por mês quando as faturas em aberto passam da renda. */
  /** Caixinhas: no dia marcado, guarda o valor do mês (uma vez por mês). */
  private boxes(userId: string): void {
    const today = todayIsoSaoPaulo();
    const ym = today.slice(0, 7);
    const day = Number(today.slice(8, 10));
    const list = this.store.getData(userId, "boxes");
    let changed = false;
    const next = list.map((b) => {
      if (!b.active || b.lastDeposit === ym || day < Math.min(b.day, 28) || b.monthly <= 0) return b;
      if (b.target && b.balance >= b.target) return b;
      const amount = b.target ? Math.min(b.monthly, Math.round((b.target - b.balance) * 100) / 100) : b.monthly;
      changed = true;
      const balance = Math.round((b.balance + amount) * 100) / 100;
      const reached = b.target > 0 && balance >= b.target;
      this.push(
        userId,
        {
          type: "carteira",
          tone: "positive",
          title: reached ? `Caixinha ${b.name} completa!` : `${brl(amount)} na caixinha ${b.name}`,
          message: reached ? `Você chegou a ${brl(balance)}. Meta batida.` : `Agora ela tem ${brl(balance)}${b.target ? ` de ${brl(b.target)}` : ""}. Lembre de transferir no seu banco.`,
          link: "/objetivos",
        },
        `caixinha-${b.id}-${ym}`
      );
      return { ...b, balance, lastDeposit: ym, history: [...b.history, { date: today, amount, note: "Depósito automático" }].slice(-120) };
    });
    if (changed) {
      this.store.setData(userId, "boxes", next);
      this.onDataChanged?.(userId);
    }
  }

  /** Contas fixas: aviso 3 dias antes, no dia e quando atrasa. */
  private bills(userId: string): void {
    const today = todayIsoSaoPaulo();
    const ym = today.slice(0, 7);
    for (const b of this.store.getData(userId, "bills")) {
      if (!b.active || b.paid.includes(ym)) continue;
      const due = billDueDate(b, ym);
      const days = Math.round((Date.parse(`${due}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86_400_000);
      const value = brl(b.amount);
      if (days === 3 || days === 2) {
        this.push(userId, { type: "carteira", tone: "info", title: `${b.name} vence em ${days} dias`, message: `${value} no dia ${Number(due.slice(8))}. Quando pagar, toque em "Paguei" em Gastos.`, link: "/gastos" }, `conta-${b.id}-${ym}-antes`);
      } else if (days === 0) {
        this.push(userId, { type: "carteira", tone: "info", title: `${b.name} vence hoje`, message: `${value}. Já pagou? Marque em Gastos para o disponível do mês ficar certo.`, link: "/gastos" }, `conta-${b.id}-${ym}-hoje`);
      } else if (days < 0 && days >= -5) {
        this.push(userId, { type: "carteira", tone: "negative", title: `${b.name} está atrasada`, message: `${value} venceu no dia ${Number(due.slice(8))}. Pagar logo evita multa e juros.`, link: "/gastos" }, `conta-${b.id}-${ym}-atrasada`);
      }
    }
  }

  private invoices(userId: string): void {
    const ym = todayIsoSaoPaulo().slice(0, 7);
    const profile = this.store.getData(userId, "profile");
    const open = this.store.getData(userId, "invoices").filter((i) => i.ym === ym && !i.paid);
    const total = open.reduce((s, i) => s + i.amount, 0);
    const income = profile.salary + profile.extraIncome;
    if (!total || !income) return;
    if (total > income) {
      this.push(
        userId,
        {
          type: "carteira",
          tone: "negative",
          title: "Faturas acima da sua renda",
          message: `As faturas em aberto de ${ymLabel(ym)} somam ${brl(total)}, mais que a sua renda de ${brl(income)}. Abra Gastos e use "Pedir ajuda ao Assistente" para montar um plano.`,
          link: "/gastos",
        },
        `fatura-renda-${ym}`
      );
    } else if (total > income * 0.6) {
      this.push(
        userId,
        {
          type: "carteira",
          tone: "info",
          title: "Faturas pesando no mês",
          message: `As faturas de ${ymLabel(ym)} somam ${brl(total)}, ${Math.round((total / income) * 100)}% da sua renda. Vale revisar os gastos no cartão.`,
          link: "/gastos",
        },
        `fatura-60-${ym}`
      );
    }
  }

  private reminders(uid: string, alerts: PriceAlert[]): void {
    const now = Date.now();
    for (const a of alerts) {
      if (a.kind !== "lembrete" || !a.active || !a.remindAt) continue;
      const at = Date.parse(a.remindAt);
      if (Number.isFinite(at) && at <= now) {
        this.push(uid, { type: "alerta", tone: "info", title: a.title || "Lembrete", message: a.message || "Você pediu para ser lembrado agora." }, `rem-${a.id}-${a.remindAt}`);
      }
    }
  }

  private priceAlerts(uid: string, alerts: PriceAlert[], quotes: Record<string, Quote>): void {
    for (const a of alerts) {
      if (!a.active || !a.symbol || a.kind === "lembrete") continue;
      const q = quotes[a.symbol];
      if (!q || a.value === undefined) continue;
      const name = displaySymbol(a.symbol);
      let cond = false;
      let title = "";
      let details = "";
      let tone: AppNotification["tone"] = "neutral";
      if (a.kind === "preco-acima") {
        cond = q.price >= a.value;
        title = `${name} passou de ${valueLabel(q, a.value)}`;
        details = `Agora está em ${priceLabel(q)} (${pct(q.changePercent)} hoje).`;
        tone = "positive";
      } else if (a.kind === "preco-abaixo") {
        cond = q.price <= a.value;
        title = `${name} caiu abaixo de ${valueLabel(q, a.value)}`;
        details = `Agora está em ${priceLabel(q)} (${pct(q.changePercent)} hoje).`;
        tone = "negative";
      } else if (a.kind === "variacao-dia") {
        cond = Math.abs(q.changePercent) >= a.value;
        title = `${name} ${q.changePercent >= 0 ? "dispara" : "despenca"} ${pct(q.changePercent)} hoje`;
        details = `Preço atual ${priceLabel(q)}. Seu alerta era para variações a partir de ${n2(a.value)}%.`;
        tone = q.changePercent >= 0 ? "positive" : "negative";
      } else if (a.kind === "abaixo-media" && q.fiftyDayAverage) {
        const diff = ((q.price - q.fiftyDayAverage) / q.fiftyDayAverage) * 100;
        cond = diff <= -a.value;
        title = `${name} está ${n2(Math.abs(diff))}% abaixo da média`;
        details = `Preço ${priceLabel(q)} contra média de 50 dias de ${valueLabel(q, q.fiftyDayAverage)}. Pode ser oportunidade — confira os fundamentos antes.`;
        tone = "info";
      }
      if (this.edge(uid, a.id, cond, a.repeat)) {
        this.push(uid, {
          type: "alerta",
          tone,
          symbol: a.symbol,
          title: a.title?.trim() || title,
          message: a.message?.trim() ? `${a.message.trim()} — ${details}` : details,
          link: `/mercado/${encodeURIComponent(a.symbol)}`,
        });
      }
    }
  }

  private smart(uid: string, holdings: Holding[], quotes: Record<string, Quote>, s: UserSettings): void {
    for (const h of holdings) {
      const q = quotes[h.symbol!];
      if (!q || !h.avgPrice || !h.quantity) continue;
      const name = displaySymbol(h.symbol!);
      const fx = fxFor(q.currency, quotes);
      const ret = ((q.price - h.avgPrice) / h.avgPrice) * 100;
      const profit = (q.price - h.avgPrice) * h.quantity * fx;
      const link = `/mercado/${encodeURIComponent(h.symbol!)}`;

      if (this.edge(uid, `gain:${h.id}`, ret >= s.gainThreshold, ret < s.gainThreshold - 2)) {
        this.push(uid, {
          type: "carteira",
          tone: "positive",
          symbol: h.symbol,
          link,
          title: `${name} está dando bom: ${pct(ret, 1)}`,
          message: `Sua posição valorizou ${pct(ret, 1)} sobre o preço médio de ${valueLabel(q, h.avgPrice)} (lucro de ${brl(profit)}). Avalie se mantém, conforme seu objetivo, ou se realiza parte do lucro.`,
        });
      }
      if (this.edge(uid, `loss:${h.id}`, ret <= -s.lossThreshold, ret > -s.lossThreshold + 2)) {
        this.push(uid, {
          type: "carteira",
          tone: "negative",
          symbol: h.symbol,
          link,
          title: `${name} está ${pct(ret, 1)} abaixo do seu preço médio`,
          message: `Prejuízo momentâneo de ${brl(profit)}. Quedas fazem parte; verifique se algo mudou nos fundamentos antes de decidir vender ou aproveitar para comprar mais barato.`,
        });
      }
      if (q.fiftyDayAverage) {
        const diff = ((q.price - q.fiftyDayAverage) / q.fiftyDayAverage) * 100;
        if (this.edge(uid, `low:${h.id}`, diff <= -s.deviationThreshold, diff > -s.deviationThreshold + 1.5)) {
          this.push(uid, {
            type: "carteira",
            tone: "info",
            symbol: h.symbol,
            link,
            title: `${name} está mais barata que o normal`,
            message: `Está ${n2(Math.abs(diff))}% abaixo da média dos últimos 50 dias (${priceLabel(q)} contra ${valueLabel(q, q.fiftyDayAverage)}). Se os fundamentos continuam bons, pode ser um bom momento para aportar.`,
          });
        }
        if (this.edge(uid, `high:${h.id}`, diff >= s.deviationThreshold, diff < s.deviationThreshold - 1.5)) {
          this.push(uid, {
            type: "carteira",
            tone: "positive",
            symbol: h.symbol,
            link,
            title: `${name} está acima do normal`,
            message: `Está ${n2(diff)}% acima da média de 50 dias (${priceLabel(q)}). Sua posição está ${pct(ret, 1)} no total. Evite comprar no impulso em momentos de euforia.`,
          });
        }
      }
    }
  }

  private async marketEvents(uid: string, quotes: Record<string, Quote>): Promise<void> {
    const today = todayIsoSaoPaulo();
    const now = nowInSaoPaulo();
    try {
      const copom = await getCopom();
      const next = copom.nextMeeting;
      if (next) {
        const daysTo = (Date.parse(next.start) - Date.parse(today)) / 86_400_000;
        if (daysTo >= 0 && daysTo <= 6) {
          const exp = copom.expectation ? ` O mercado espera a Selic em ${n2(copom.expectation.value)}% (Boletim Focus).` : "";
          this.push(
            uid,
            {
              type: "mercado",
              tone: "info",
              title: "Reunião do Copom esta semana",
              message: `O Copom se reúne em ${brDate(next.start)} e ${brDate(next.decision)} para decidir a taxa Selic, hoje em ${n2(copom.current ?? 0)}%.${exp} A decisão afeta a renda fixa, a bolsa e os juros de empréstimos. Você será avisado do resultado.`,
            },
            `copom-pre-${next.decision}`
          );
        }
      }
      const last = copom.lastMeeting;
      if (last && last.outcome !== "aguardando" && last.to !== undefined) {
        const daysAgo = (Date.parse(today) - Date.parse(last.date)) / 86_400_000;
        if (daysAgo <= 10) {
          const ind = await getIndicators().catch(() => undefined);
          const cdi = ind?.cdi?.value;
          const effect =
            last.outcome === "reduziu"
              ? "A renda fixa pós-fixada (CDI e Tesouro Selic) passa a render um pouco menos; ações e FIIs costumam reagir bem a cortes de juros."
              : last.outcome === "elevou"
                ? "CDBs, Tesouro Selic e outros pós-fixados passam a render mais; crédito fica mais caro e a bolsa pode sentir."
                : `Seus investimentos atrelados ao CDI seguem rendendo cerca de ${n2(cdi ?? last.to)}% ao ano.`;
          const title =
            last.outcome === "manteve"
              ? `Copom manteve a Selic em ${n2(last.to)}%`
              : `Copom ${last.outcome} a Selic para ${n2(last.to)}%`;
          const fromTxt = last.outcome === "manteve" ? "" : ` (antes ${n2(last.from ?? 0)}%)`;
          this.push(uid, { type: "mercado", tone: last.outcome === "elevou" ? "negative" : last.outcome === "reduziu" ? "positive" : "neutral", title, message: `Resultado da reunião de ${brDate(last.date)}: Selic em ${n2(last.to)}%${fromTxt}. ${effect}` }, `copom-res-${last.date}`);
        }
      }
    } catch {
      // sem conexão com o Banco Central
    }

    try {
      const ind = await getIndicators();
      const ipca = ind.ipcaMonth;
      if (ipca) {
        const ref = ipca.date.slice(0, 7);
        const ageMonths = (now.getFullYear() * 12 + now.getMonth()) - (Number(ref.slice(0, 4)) * 12 + Number(ref.slice(5, 7)) - 1);
        if (ageMonths <= 2) {
          const y = ind.ipca12m ? ` Acumulado em 12 meses: ${n2(ind.ipca12m.value)}%.` : "";
          this.push(
            uid,
            {
              type: "mercado",
              tone: ipca.value > 0.5 ? "negative" : "neutral",
              title: `Inflação de ${ymLabel(ref)}: ${n2(ipca.value)}%`,
              message: `O IBGE divulgou o IPCA de ${ymLabel(ref)}.${y} Para não perder poder de compra, seus investimentos precisam render acima disso.`,
            },
            `ipca-${ref}`
          );
        }
      }
    } catch {
      // sem conexão
    }

    const afternoon = now.getHours() >= 15;
    const ibov = quotes["^BVSP"];
    if (ibov && afternoon && Math.abs(ibov.changePercent) >= 1.5) {
      const up = ibov.changePercent > 0;
      this.push(
        uid,
        {
          type: "mercado",
          tone: up ? "positive" : "negative",
          symbol: "^BVSP",
          link: "/mercado/%5EBVSP",
          title: `Ibovespa ${up ? "sobe" : "cai"} ${pct(ibov.changePercent)} hoje`,
          message: `O principal índice da bolsa está em ${ibov.price.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pontos. ${up ? "Dia positivo para quem tem ações." : "Dias de queda acontecem — mantenha o foco no longo prazo."}`,
        },
        `ibov-${today}`
      );
    }
    const usd = quotes["USDBRL=X"];
    if (usd && Math.abs(usd.changePercent) >= 1) {
      this.push(
        uid,
        {
          type: "mercado",
          tone: "info",
          symbol: "USDBRL=X",
          link: "/mercado/USDBRL%3DX",
          title: `Dólar ${usd.changePercent > 0 ? "sobe" : "cai"} ${pct(usd.changePercent)}: ${brl(usd.price)}`,
          message: usd.changePercent > 0 ? "Dólar mais caro encarece viagens e produtos importados, e valoriza investimentos no exterior." : "Dólar mais barato é bom para viagens e compras importadas.",
        },
        `usd-${today}`
      );
    }
  }

  private tip(uid: string): void {
    const now = nowInSaoPaulo();
    if (now.getHours() < 8) return;
    const start = new Date(now.getFullYear(), 0, 0);
    const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
    const tip = DAILY_TIPS[day % DAILY_TIPS.length];
    this.push(uid, { type: "dica", tone: "info", title: `Dica do dia: ${tip.title}`, message: tip.message }, `tip-${todayIsoSaoPaulo()}`);
  }

  private prune(uid: string): void {
    const st = this.store.engine(uid);
    const limit = Date.now() - 120 * 86_400_000;
    let changed = false;
    for (const [k, v] of Object.entries(st.keys)) {
      if (k !== "welcome" && Date.parse(v) < limit) {
        delete st.keys[k];
        changed = true;
      }
    }
    const alertIds = new Set(this.store.getData(uid, "alerts").map((a) => a.id));
    const holdingIds = new Set(this.store.getData(uid, "portfolio").map((h) => h.id));
    for (const k of Object.keys(st.alertState)) {
      const [prefix, id] = k.includes(":") ? k.split(":") : ["", k];
      const keep = prefix ? holdingIds.has(id) : alertIds.has(k);
      if (!keep) {
        delete st.alertState[k];
        changed = true;
      }
    }
    if (changed) this.store.save();
  }
}
