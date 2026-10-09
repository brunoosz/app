import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ExternalLink, FileDown, Globe, Rocket, RotateCcw, Sparkles } from "lucide-react";
import clsx from "clsx";
import type { WealthAnswers, WealthStyle } from "@shared/types";
import { ratesFromIndicators, wealthProjection, wealthRate } from "@shared/finance";
import { api } from "@/lib/api";
import { brl, dateBR, num } from "@/lib/format";
import { useSession, useUserData } from "@/store/session";
import { toastError, useUi } from "@/store/ui";
import { useAsync } from "@/hooks/useAsync";
import { useIndicators } from "@/hooks/useMarketData";
import { Badge, Card, PageHeader, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, SegmentedControl } from "@/components/ui/form";
import { Chart, type SeriesSpec } from "@/components/charts/Chart";

const STYLES: { value: WealthStyle; label: string; hint: string }[] = [
  { value: "seguro", label: "Seguro", hint: "Renda fixa e Tesouro, sem sustos. Cresce devagar e sempre." },
  { value: "equilibrado", label: "Equilibrado", hint: "Base em renda fixa e uma parte em fundos e ações." },
  { value: "crescimento", label: "Crescimento", hint: "Mais ações e fundos imobiliários, pensando em muitos anos." },
];

const GOALS = ["Montar minha reserva de emergência", "Independência financeira", "Ficar rico no longo prazo", "Comprar um carro", "Comprar uma casa", "Aposentadoria"];

export function Plano() {
  const wealth = useUserData("wealth");
  const profile = useUserData("profile");
  const update = useSession((s) => s.update);
  const toast = useUi((s) => s.toast);
  const navigate = useNavigate();
  const ai = useAsync("ai-info", () => api.ai.info(), { staleMs: 30_000 });
  const { data: ind } = useIndicators();
  const [answers, setAnswers] = useState<WealthAnswers>(
    () =>
      wealth.answers ?? {
        goal: "Ficar rico no longo prazo",
        years: 15,
        monthly: Math.max(1, Math.round(profile.monthlyInvest || 50)),
        start: profile.emergencyReserve || 0,
        style: profile.riskProfile === "arrojado" ? "crescimento" : profile.riskProfile === "moderado" ? "equilibrado" : "seguro",
      }
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showText, setShowText] = useState(false);

  const rate = wealthRate(answers.style, ratesFromIndicators(ind).cdi);
  const proj = useMemo(() => wealthProjection(answers.start, answers.monthly, rate, answers.years), [answers.start, answers.monthly, rate, answers.years]);
  const end = proj.points[proj.points.length - 1];
  const now = Date.now() / 1000;
  const series = useMemo<SeriesSpec[]>(() => {
    const t = (m: number) => Math.round(now + m * 30.44 * 86_400);
    return [
      { kind: "area", id: "value", color: "#34D399", data: proj.points.map((p) => ({ time: t(p.month), value: p.value })) },
      { kind: "line", id: "invested", color: "#94A3B8", dashed: true, width: 1, data: proj.points.map((p) => ({ time: t(p.month), value: p.invested })) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj]);

  const plan = wealth.plan;
  const done = plan?.steps.filter((s) => s.done).length ?? 0;
  const generate = async () => {
    setLoading(true);
    update("wealth", (w) => ({ ...w, answers }));
    try {
      const result = await api.plans.wealth(answers);
      update("wealth", (w) => ({ ...w, answers, plan: result }));
      toast({ title: "Plano pronto", message: result.searched ? `Com ${result.sources.length} fonte(s) da internet.` : "Feito com a base de livros do app.", tone: "success" });
    } catch (err) {
      toastError(err, "Não foi possível montar o plano");
    } finally {
      setLoading(false);
    }
  };
  const toggle = (id: string) => update("wealth", (w) => (w.plan ? { ...w, plan: { ...w.plan, steps: w.plan.steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) } } : w));
  const exportPdf = async () => {
    if (!plan) return;
    setExporting(true);
    try {
      const clean = plan.text.replace(/^\s*[-*]\s*\[( |x|X)\].*$/gm, "").trim();
      const checklist = plan.steps.map((s) => `- [${s.done ? "x" : " "}] ${s.date ? `${dateBR(s.date)}: ` : ""}${s.text}`).join("\n");
      const sources = plan.sources.length ? `\n\n## Fontes\n${plan.sources.map((s, i) => `- [${i + 1}] ${s.title} — ${s.url}`).join("\n")}` : "";
      const res = await api.plans.exportPdf(`Meu plano: ${answers.goal}`, `${clean}\n\n## Checklist\n${checklist}${sources}`, `${brl(answers.monthly)} por mês · ${answers.years} anos · estilo ${answers.style}`);
      if (res) toast({ title: "PDF salvo", message: res.path, tone: "success" });
    } catch (err) {
      toastError(err, "Não foi possível gerar o PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Meu plano" subtitle="Responda 5 perguntas e o Assistente monta um plano de investimento com datas, mesmo começando com R$ 1. O importante é começar." />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <SectionTitle title="Suas respostas" />
          <div className="space-y-4">
            <Field label="1. Qual é o seu objetivo?">
              <Input value={answers.goal} onChange={(e) => setAnswers({ ...answers, goal: e.target.value })} list="wealth-goals" />
              <datalist id="wealth-goals">
                {GOALS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="2. Em quantos anos?">
                <Input
                  inputMode="numeric"
                  value={answers.years || ""}
                  onChange={(e) => setAnswers({ ...answers, years: Math.min(50, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                />
              </Field>
              <Field label="3. Quanto por mês?" hint="Pode ser R$ 1.">
                <MoneyInput value={answers.monthly} onChange={(v) => setAnswers({ ...answers, monthly: v })} />
              </Field>
            </div>
            <Field label="4. Quanto já tem guardado?">
              <MoneyInput value={answers.start} onChange={(v) => setAnswers({ ...answers, start: v })} />
            </Field>
            <Field label="5. Qual estilo combina com você?" hint={STYLES.find((s) => s.value === answers.style)?.hint}>
              <SegmentedControl<WealthStyle> block value={answers.style} onChange={(v) => setAnswers({ ...answers, style: v })} options={STYLES.map((s) => ({ value: s.value, label: s.label }))} />
            </Field>
            <Field label="Algo mais? (opcional)">
              <Input value={answers.notes ?? ""} onChange={(e) => setAnswers({ ...answers, notes: e.target.value || undefined })} placeholder="Ex.: sou estudante, recebo por freela" />
            </Field>
            {ai.data?.hasKey ? (
              <Button block icon={plan ? RotateCcw : Sparkles} loading={loading} disabled={!answers.goal.trim() || !answers.years} onClick={() => void generate()}>
                {plan ? "Refazer o plano" : "Montar meu plano"}
              </Button>
            ) : (
              <div className="text-[13px] text-muted">O Assistente ainda não foi ativado. A projeção ao lado funciona mesmo assim.</div>
            )}
            {ai.data?.hasKey && (
              <div className="text-[12.5px] text-muted flex items-center gap-1.5">
                <Globe size={14} />
                {ai.data.hasSearch ? "Pesquisa na internet ligada: o plano usa fontes atuais e livros de finanças." : "Sem pesquisa na internet: o plano usa a base de livros de finanças do app."}
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3" padded={false}>
          <div className="p-5 pb-1">
            <div className="text-[13px] text-muted">Em {answers.years} anos, guardando {brl(answers.monthly)} por mês</div>
            <div className="text-[32px] font-bold tracking-tight tabular text-success">{brl(end.value)}</div>
            <div className="text-[13px] text-muted">
              você coloca {brl(end.invested)} e os juros fazem {brl(Math.max(0, end.value - end.invested))} · estimativa a ~{num(rate, 1)}% ao ano, não é garantia
            </div>
          </div>
          <div className="px-2">
            <Chart series={series} height={220} formatter={(v) => brl(v)} />
          </div>
          {proj.milestones.length > 0 && (
            <div className="flex flex-wrap gap-2 px-5 pb-5">
              {proj.milestones.map((m) => (
                <span key={m.value} className="rounded-full bg-success/10 text-success px-3 py-1 text-[12.5px] font-medium">
                  {brl(m.value).replace(",00", "")} em {m.month < 12 ? `${m.month} meses` : `${num(m.month / 12, 1).replace(",0", "")} anos`}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {plan && (
        <Card className="mt-4">
          <SectionTitle
            title="Seu plano"
            subtitle={`Feito em ${dateBR(plan.createdAt)} · ${done}/${plan.steps.length} passos concluídos`}
            action={
              <Button size="sm" variant="secondary" icon={FileDown} loading={exporting} onClick={() => void exportPdf()}>
                Baixar PDF
              </Button>
            }
          />
          {plan.steps.length > 0 && <ProgressBar value={done / plan.steps.length} height={6} className="mb-3" />}
          <div className="space-y-1">
            {plan.steps.map((s) => (
              <label key={s.id} className="flex items-start gap-2.5 py-1 cursor-pointer">
                <input type="checkbox" checked={s.done} onChange={() => toggle(s.id)} className="mt-1 h-4 w-4 accent-[rgb(var(--primary))]" />
                <span className={clsx("text-[14px]", s.done && "line-through text-muted")}>
                  {s.date && <span className="font-semibold tabular mr-1.5">{dateBR(s.date)}</span>}
                  {s.text}
                </span>
              </label>
            ))}
          </div>
          <button type="button" className="mt-3 text-[13px] text-primary font-medium inline-flex items-center gap-1" onClick={() => setShowText((v) => !v)}>
            <ChevronDown size={15} className={clsx("transition", showText && "rotate-180")} /> {showText ? "Esconder" : "Ler"} o plano completo
          </button>
          {showText && (
            <div className="prose-investa mt-3">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (href) void api.openExternal(href);
                      }}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {plan.text.replace(/^\s*[-*]\s*\[( |x|X)\].*$/gm, "").trim()}
              </ReactMarkdown>
            </div>
          )}
          {plan.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-line/10">
              <div className="text-[13px] font-semibold mb-1.5 flex items-center gap-1.5">
                <Globe size={14} /> Fontes da internet
              </div>
              <div className="space-y-1">
                {plan.sources.map((s, i) => (
                  <button key={s.url} type="button" onClick={() => void api.openExternal(s.url)} className="flex items-center gap-1.5 text-[13px] text-primary text-left hover:underline">
                    <Badge>{i + 1}</Badge> <span className="truncate">{s.title}</span> <ExternalLink size={12} className="shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Rocket} onClick={() => navigate("/carteira?novo=1")}>
              Registrar meu primeiro investimento
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const d = new Date();
                d.setMonth(d.getMonth() + Math.round(answers.years * 12));
                const prazo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                navigate(`/objetivos?novo=1&nome=${encodeURIComponent(answers.goal)}&valor=${Math.round(end.value)}&prazo=${prazo}`);
              }}
            >
              Criar uma meta com esse objetivo
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
