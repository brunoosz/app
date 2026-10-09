import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  BrainCircuit,
  CircleCheck,
  Database,
  ExternalLink,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  Monitor,
  Palette,
  PiggyBank,
  Sparkles,
  Sun,
  UserRound,
  Wallet,
} from "lucide-react";
import type { FinancialProfile, UserSettings } from "@shared/types";
import { ROLE_LABEL } from "@shared/types";
import { api } from "@/lib/api";
import { brl } from "@/lib/format";
import { isManager, useSession, useUserData } from "@/store/session";
import { toastError, useUi } from "@/store/ui";
import { useAsync } from "@/hooks/useAsync";
import { Avatar, Badge, Card, ListGroup, ListRow, PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput, SegmentedControl, Select, Toggle } from "@/components/ui/form";
import { ConfirmDialog, Sheet } from "@/components/ui/Sheet";
import { ExpenseFields, IncomeFields, InvestFields, ProfileFields, RISK_LABEL, totalExpenses, totalIncome } from "@/components/ProfileForm";
import { ErrorBanner } from "@/pages/auth/Login";

const RECOMMENDED_MODELS = [
  { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B (recomendado, rápido e ótimo em português)" },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B (raciocínio mais profundo)" },
  { id: "nvidia/llama-3.3-nemotron-super-49b-v1", label: "Nemotron Super 49B (NVIDIA)" },
  { id: "meta/llama-3.1-405b-instruct", label: "Llama 3.1 405B (muito grande, mais lento)" },
  { id: "deepseek-ai/deepseek-r1", label: "DeepSeek R1 (raciocínio)" },
];

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted mb-2 px-1">{title}</h2>
      {children}
    </section>
  );
}

function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useSession((s) => s.user)!;
  const setUser = useSession((s) => s.setUser);
  const toast = useUi((s) => s.toast);
  const [form, setForm] = useState({ name: user.name, username: user.username, email: user.email ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ name: user.name, username: user.username, email: user.email ?? "" });
      setError(null);
    }
  }, [open, user]);
  const save = async () => {
    setSaving(true);
    try {
      const u = await api.updateProfile(form);
      setUser(u);
      toast({ title: "Perfil atualizado", tone: "success" });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setShake((s) => s + 1);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Seu perfil"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Usuário" hint="Usado para entrar. Não diferencia maiúsculas de minúsculas.">
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, "") })} />
        </Field>
        <Field label="E-mail">
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <ErrorBanner message={error} shakeKey={shake} />
      </div>
    </Sheet>
  );
}

function FinanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useUserData("profile");
  const update = useSession((s) => s.update);
  const toast = useUi((s) => s.toast);
  const [p, setP] = useState<FinancialProfile>(profile);
  const [section, setSection] = useState<"renda" | "gastos" | "investir" | "perfil">("renda");
  useEffect(() => {
    if (open) setP(profile);
  }, [open, profile]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="lg"
      title="Dados financeiros"
      subtitle="Ganhou aumento? Mudou de emprego? Atualize aqui — o Professor IA e as metas usam essas informações."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              update("profile", { ...p, updatedAt: new Date().toISOString() });
              toast({ title: "Dados financeiros atualizados", tone: "success" });
              onClose();
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <SegmentedControl
        block
        className="mb-5"
        value={section}
        onChange={setSection}
        options={[
          { value: "renda", label: "Renda" },
          { value: "gastos", label: "Gastos" },
          { value: "investir", label: "Investir" },
          { value: "perfil", label: "Perfil" },
        ]}
      />
      {section === "renda" && <IncomeFields value={p} onChange={setP} />}
      {section === "gastos" && <ExpenseFields value={p} onChange={setP} />}
      {section === "investir" && <InvestFields value={p} onChange={setP} />}
      {section === "perfil" && <ProfileFields value={p} onChange={setP} />}
    </Sheet>
  );
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useUi((s) => s.toast);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
    }
  }, [open]);
  const fail = (m: string) => {
    setError(m);
    setShake((s) => s + 1);
  };
  const save = async () => {
    if (next.length < 6) return fail("A nova senha precisa ter pelo menos 6 caracteres.");
    if (next !== confirm) return fail("As senhas não conferem.");
    setSaving(true);
    try {
      await api.changePassword(current, next);
      toast({ title: "Senha alterada com sucesso", tone: "success" });
      onClose();
    } catch (err) {
      fail((err as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Alterar senha"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} loading={saving} disabled={!current || !next}>
            Alterar senha
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Senha atual">
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
        </Field>
        <Field label="Nova senha">
          <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirmar nova senha">
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <ErrorBanner message={error} shakeKey={shake} />
      </div>
    </Sheet>
  );
}

function AiSettings() {
  const info = useAsync("ai-info", () => api.ai.info(), { staleMs: 2_000 });
  const toast = useUi((s) => s.toast);
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (info.data && !model) setModel(info.data.model);
  }, [info.data, model]);

  const save = async () => {
    setSaving(true);
    try {
      await api.ai.setConfig({ apiKey: key.trim() || undefined, model });
      setKey("");
      info.reload();
      toast({ title: "Configuração da IA salva", tone: "success" });
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      if (key.trim()) await api.ai.setConfig({ apiKey: key.trim(), model });
      setKey("");
      const r = await api.ai.test();
      info.reload();
      toast({ title: "IA conectada!", message: `Resposta do modelo: “${r.slice(0, 80)}”`, tone: "success" });
    } catch (err) {
      toastError(err, "Falha ao conectar");
    } finally {
      setTesting(false);
    }
  };

  const loadModels = async () => {
    setLoadingModels(true);
    try {
      setModels(await api.ai.models());
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingModels(false);
    }
  };

  const options = [...RECOMMENDED_MODELS.map((m) => m.id), ...(models ?? [])].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-brand flex items-center justify-center shadow-glow shrink-0">
          <BrainCircuit size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-[16px]">Inteligência Artificial (NVIDIA)</div>
            {info.data?.hasKey ? (
              <Badge tone="success" icon={CircleCheck}>
                Configurada {info.data.source === "arquivo" ? "(arquivo config.json)" : info.data.source === "ambiente" ? "(variável de ambiente)" : ""}
              </Badge>
            ) : (
              <Badge tone="warning">Não configurada</Badge>
            )}
          </div>
          <p className="text-[13.5px] text-muted mt-1">
            Cole sua chave da API da NVIDIA (começa com <code className="text-fg">nvapi-</code>). Ela fica guardada criptografada neste computador e vale para todos os usuários do app.
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <Field label="Chave da API" hint={info.data?.keyPreview ? `Chave atual: ${info.data.keyPreview}` : undefined}>
          <PasswordInput icon={KeyRound} value={key} onChange={(e) => setKey(e.target.value)} placeholder={info.data?.hasKey ? "Deixe em branco para manter a chave atual" : "nvapi-..."} />
        </Field>
        <Field label="Modelo">
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={model} onChange={(e) => setModel(e.target.value)}>
                {options.map((id) => (
                  <option key={id} value={id}>
                    {RECOMMENDED_MODELS.find((m) => m.id === id)?.label ?? id}
                  </option>
                ))}
                {model && !options.includes(model) && <option value={model}>{model}</option>}
              </Select>
            </div>
            <Button variant="secondary" loading={loadingModels} disabled={!info.data?.hasKey} onClick={() => void loadModels()}>
              Carregar lista
            </Button>
          </div>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} loading={saving}>
            Salvar
          </Button>
          <Button variant="secondary" icon={Sparkles} loading={testing} disabled={!info.data?.hasKey && !key.trim()} onClick={() => void test()}>
            Testar conexão
          </Button>
          <Button variant="ghost" icon={ExternalLink} onClick={() => void api.openExternal("https://build.nvidia.com/settings/api-keys")}>
            Gerar chave na NVIDIA
          </Button>
          {info.data?.source === "app" && (
            <Button variant="ghost" className="text-danger" onClick={() => setConfirmRemove(true)}>
              Remover chave
            </Button>
          )}
        </div>
        <div className="rounded-2xl bg-line/[0.04] px-4 py-3 text-[12.5px] text-muted">
          Alternativa: crie um arquivo <code className="text-fg">config.json</code> com <code className="text-fg">{'{ "nvidiaApiKey": "nvapi-..." }'}</code> na pasta de dados do Investa (veja em Sobre) ou ao lado do .exe.
        </div>
      </div>
      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={async () => {
          await api.ai.setConfig({ apiKey: null });
          setConfirmRemove(false);
          info.reload();
        }}
        title="Remover chave da IA?"
        message="O Professor IA deixará de funcionar até uma nova chave ser configurada."
        confirmLabel="Remover"
        danger
      />
    </Card>
  );
}

export function Configuracoes() {
  const user = useSession((s) => s.user)!;
  const profile = useUserData("profile");
  const settings = useUserData("settings");
  const update = useSession((s) => s.update);
  const signOut = useSession((s) => s.signOut);
  const applyTheme = useUi((s) => s.applyTheme);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const appInfo = useAsync("app-info", () => api.appInfo(), { staleMs: 60_000 });
  const [sheet, setSheet] = useState<"perfil" | "financeiro" | "senha" | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.get("secao") === "ia") setTimeout(() => aiRef.current?.scrollIntoView({ behavior: "smooth" }), 250);
  }, [params]);

  const setSetting = (patch: Partial<UserSettings>) => update("settings", (s) => ({ ...s, ...patch }));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações" />

      <div className="space-y-7">
        <Card className="flex items-center gap-4">
          <Avatar name={user.name} hue={user.avatarHue} size={64} />
          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-semibold truncate">{user.name}</div>
            <div className="text-[14px] text-muted">
              @{user.username}
              {user.email ? ` · ${user.email}` : ""}
            </div>
            <Badge className="mt-1.5" tone={user.role === "dono" ? "warning" : user.role === "adm" ? "primary" : "neutral"}>
              {ROLE_LABEL[user.role]}
            </Badge>
          </div>
          <Button variant="secondary" onClick={() => setSheet("perfil")}>
            Editar
          </Button>
        </Card>

        <Section title="Finanças">
          <ListGroup>
            <ListRow icon={Wallet} iconColor="#34D399" title="Renda mensal" subtitle={`${brl(profile.salary)} de salário${profile.extraIncome ? ` + ${brl(profile.extraIncome)} extra` : ""}`} right={<span className="font-semibold tabular">{brl(totalIncome(profile))}</span>} onClick={() => setSheet("financeiro")} chevron />
            <ListRow icon={PiggyBank} iconColor="#FBBF24" title="Gastos e investimentos" subtitle={`Gasta ${brl(totalExpenses(profile))} · investe ${brl(profile.monthlyInvest)} por mês`} onClick={() => setSheet("financeiro")} chevron />
            <ListRow icon={UserRound} iconColor="#A78BFA" title="Perfil de investidor" subtitle="Usado pelo Professor IA para personalizar sugestões" right={<Badge tone="secondary">{RISK_LABEL[profile.riskProfile]}</Badge>} onClick={() => setSheet("financeiro")} chevron />
          </ListGroup>
        </Section>

        <Section title="Aparência">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Palette size={20} className="text-primary" />
              <div className="font-medium">Tema</div>
            </div>
            <SegmentedControl
              block
              value={settings.theme}
              onChange={(t) => {
                setSetting({ theme: t });
                applyTheme(t);
              }}
              options={[
                { value: "dark", label: "Escuro", icon: Moon },
                { value: "light", label: "Claro", icon: Sun },
                { value: "system", label: "Sistema", icon: Monitor },
              ]}
            />
          </Card>
        </Section>

        <Section title="Segurança">
          <ListGroup>
            <ListRow icon={Lock} iconColor="#4F8CFF" title="Alterar senha" onClick={() => setSheet("senha")} chevron />
          </ListGroup>
        </Section>

        <Section title="Notificações">
          <ListGroup>
            <ToggleRow title="Notificações do Windows" subtitle="Avisos na área de notificações do sistema" checked={settings.desktopNotifications} onChange={(v) => setSetting({ desktopNotifications: v })} />
            <ToggleRow title="Alertas inteligentes da carteira" subtitle="Lucro, prejuízo e preço fora do normal" checked={settings.smartAlerts} onChange={(v) => setSetting({ smartAlerts: v })} />
            <ToggleRow title="Eventos do mercado" subtitle="Copom, IPCA, dólar e Ibovespa" checked={settings.marketEvents} onChange={(v) => setSetting({ marketEvents: v })} />
            <ToggleRow title="Dica do dia" subtitle="Uma dica de educação financeira por dia" checked={settings.dailyTip} onChange={(v) => setSetting({ dailyTip: v })} />
            <ToggleRow title="Continuar em segundo plano" subtitle="Ao fechar, fica na bandeja e continua avisando" checked={settings.runInBackground} onChange={(v) => setSetting({ runInBackground: v })} />
          </ListGroup>
          <button className="text-[13px] text-primary font-semibold mt-2 px-1 inline-flex items-center gap-1" onClick={() => navigate("/alertas")}>
            <Bell size={14} /> Gerenciar alertas
          </button>
        </Section>

        {isManager(user) && (
          <Section title="Inteligência Artificial" id="ia">
            <div ref={aiRef}>
              <AiSettings />
            </div>
          </Section>
        )}

        <Section title="Sobre">
          <ListGroup>
            <ListRow icon={Info} iconColor="#94A3B8" title="Versão" right={<span className="text-muted">{appInfo.data?.version ?? "—"}</span>} />
            <ListRow
              icon={Database}
              iconColor="#94A3B8"
              title="Pasta de dados"
              subtitle={<span className="break-all">{appInfo.data?.dataDir ?? "—"}</span>}
            />
          </ListGroup>
          <Card className="mt-3 text-[13px] text-muted space-y-1.5">
            <div className="font-semibold text-fg text-[14px] mb-1">Fontes de dados</div>
            <div>Cotações: Yahoo Finance (B3 com atraso de até 15 minutos; cripto e câmbio em tempo real).</div>
            <div>Selic, CDI, IPCA, dólar PTAX, Boletim Focus e juros de crédito: Banco Central do Brasil (dados abertos oficiais).</div>
            <div>Títulos públicos: Tesouro Direto / Tesouro Transparente.</div>
            <div>Notícias: InfoMoney, Money Times, g1, Exame e CNN Brasil (RSS).</div>
            <div className="pt-2">O Investa é uma ferramenta educacional. Nada aqui é recomendação individual de investimento.</div>
          </Card>
        </Section>

        <Button variant="danger" size="lg" block icon={LogOut} onClick={() => setConfirmOut(true)}>
          Sair da conta
        </Button>
      </div>

      <ProfileSheet open={sheet === "perfil"} onClose={() => setSheet(null)} />
      <FinanceSheet open={sheet === "financeiro"} onClose={() => setSheet(null)} />
      <PasswordSheet open={sheet === "senha"} onClose={() => setSheet(null)} />
      <ConfirmDialog
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        onConfirm={async () => {
          setConfirmOut(false);
          await signOut();
          navigate("/");
        }}
        title="Sair da conta?"
        message="Você precisará entrar novamente com seu usuário e senha."
        confirmLabel="Sair"
        danger
      />
    </div>
  );
}

function ToggleRow({ title, subtitle, checked, onChange }: { title: string; subtitle: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1">
        <div className="font-medium text-[15px]">{title}</div>
        <div className="text-[13px] text-muted">{subtitle}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
