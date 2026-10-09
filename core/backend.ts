// Todos os canais que a interface chama (window.investa.invoke). O Electron e
// o app do celular criam este backend com o adaptador da sua plataforma.
import type { AiChatRequest, AiMode, AppNotification, ApiResult, ChartRange, DealCheck, Holding, LeaderboardEntry, Role, UserDataKey, UserDataMap, UserStatus } from "@shared/types";
import { USER_DATA_KEYS } from "@shared/types";
import { billsPending, currentYm, monthBudget, summarizeMonth } from "@shared/finance";
import { modeInfo } from "@shared/ai";
import type { Platform } from "./platform";
import { Store } from "./store";
import { AppError, AuthService, type NewUserInput } from "./auth";
import { AiService } from "./ai";
import { AlertEngine } from "./engine";
import { getChart, getQuotes, search } from "./yahoo";
import { getCopom, getIndicators, getIpcaHistory, getSelicHistory } from "./bcb";
import { getTesouro } from "./tesouro";
import { setCacheFiles } from "./http";
import { getNews } from "./news";
import { getBanks } from "./banks";
import { portfolioHistory } from "./portfolio";
import { buildAiContext, systemPrompt } from "./context";
import { buildExcel, buildPdf, buildReportHtml, type ReportInput } from "./reports";
import { checkDeal, dealToText } from "./deals";
import { modelLabel } from "./models";
import { CloudService } from "./cloud";

const VALID_RANGES: ChartRange[] = ["1D", "5D", "1M", "6M", "1A", "5A", "MAX"];
const MODES: AiMode[] = ["geral", "professor", "app", "financas", "mercado", "compras"];
const PUBLIC_CHANNELS = new Set(["app:info", "auth:session", "auth:register", "auth:login", "auth:logout", "window:setTheme", "shell:openExternal"]);
const SYNC_EVERY = 45_000;

/** Mensagem que quem não é Dono vê quando a IA falha. */
const AI_UNAVAILABLE = "O Assistente não está disponível agora. Tente de novo em alguns minutos.";

export function errorMessage(err: unknown): { code: string; message: string } {
  if (err instanceof AppError) return { code: err.code, message: err.message };
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed|failed to fetch|ENOTFOUND|ECONN|ETIMEDOUT|aborted|network|HTTP 5\d\d/i.test(msg)) {
    return { code: "NETWORK", message: "Não foi possível buscar os dados agora. Verifique sua conexão com a internet." };
  }
  return { code: "ERROR", message: msg || "Algo deu errado." };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (args: any) => unknown;

export class Backend {
  readonly store: Store;
  readonly auth: AuthService;
  readonly ai: AiService;
  readonly engine: AlertEngine;
  readonly cloud: CloudService;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private currentUserId: string | null = null;
  private aiControllers = new Map<string, AbortController>();
  private handlers = new Map<string, Handler>();
  private catalogTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private platform: Platform) {
    setCacheFiles(platform.files);
    this.store = new Store(platform.files);
    this.auth = new AuthService(this.store, platform);
    this.ai = new AiService(this.store, platform);
    this.cloud = new CloudService(this.store);
    this.engine = new AlertEngine(this.store, (userId, n) => this.onNotification(userId, n));
    this.ai.onModelChange = (from, to, reason) => this.notifyOwners(from, to, reason);
    this.register();
  }

  /** Pré-carrega os dados oficiais mais lentos e atualiza a lista de modelos da IA uma vez por dia. */
  start(): void {
    setTimeout(() => {
      void Promise.allSettled([getIndicators(), getCopom(), getNews(), getTesouro(), getBanks()]);
      void this.ai.catalog().catch(() => undefined);
    }, 2500);
    this.catalogTimer = setInterval(() => void this.ai.catalog().catch(() => undefined), 6 * 3600_000);
    if (this.cloud.enabled) this.syncTimer = setInterval(() => void this.sync(), SYNC_EVERY);
  }

  /** Sincroniza a conta aberta com a nuvem (dados, cargo e configuração da IA). */
  async sync(): Promise<void> {
    const userId = this.currentUserId;
    if (!this.cloud.enabled || !userId) return;
    try {
      const changed = await this.cloud.pull(userId);
      await this.syncAiKey(userId);
      const u = this.store.findUser(userId);
      if (u?.status === "bloqueado") {
        this.endSession();
        this.platform.emit("session:ended", "Esta conta foi bloqueada pelo Dono do aplicativo.");
      } else if (changed && userId === this.currentUserId) {
        this.platform.emit("data:changed", u ? this.store.toPublic(u) : null);
        this.engine.runNow();
      }
    } catch (err) {
      if (err instanceof AppError && err.code === "USER_NOT_FOUND") {
        this.endSession();
        this.platform.emit("session:ended", "Esta conta foi excluída.");
      }
      // sem internet: tenta de novo no próximo ciclo
    }
  }

  /**
   * A chave da IA fica guardada na nuvem: se este aparelho perdeu a dele (app
   * reinstalado, atualização que trocou a criptografia), busca de novo; se a
   * nuvem ainda não tem (chave colocada antes da nuvem), o Dono envia a dele.
   */
  private async syncAiKey(userId: string): Promise<void> {
    const local = this.ai.resolve();
    const ai = await this.cloud.pullAi(userId, !local.key);
    if (ai?.apiKey) {
      this.applyCloudAi(ai);
      return;
    }
    if (ai) this.applyCloudAi(ai);
    const r = this.ai.resolve();
    const cloudHasKey = !!ai?.apiKey;
    if (!cloudHasKey && r.key && r.source === "app" && this.isOwner(userId) && ai !== null) {
      await this.cloud.pushAi(userId, { apiKey: r.key, model: r.choice, baseUrl: this.store.app.ai?.baseUrl ?? "" });
    }
  }

  private applyCloudAi(ai: { apiKey?: string | null; model?: string; baseUrl?: string }): void {
    const r = this.ai.resolve();
    const patch: { apiKey?: string | null; model?: string; baseUrl?: string } = {};
    if (ai.apiKey !== undefined && (ai.apiKey || null) !== (r.source === "app" ? r.key : null)) patch.apiKey = ai.apiKey || null;
    if (ai.model !== undefined && ai.model !== r.choice) patch.model = ai.model;
    if (ai.baseUrl !== undefined && (ai.baseUrl || undefined) !== (this.store.app.ai?.baseUrl || undefined)) patch.baseUrl = ai.baseUrl ?? "";
    if (Object.keys(patch).length) this.ai.setConfig(patch);
  }

  private endSession(): void {
    this.cloud.logout(this.currentUserId);
    this.currentUserId = null;
    delete this.store.app.session;
    this.store.save();
    this.engine.stop();
    for (const c of this.aiControllers.values()) c.abort();
    this.aiControllers.clear();
  }

  stop(): void {
    if (this.catalogTimer) clearInterval(this.catalogTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.currentUserId) void this.cloud.push(this.currentUserId).catch(() => undefined);
    this.engine.stop();
    this.store.flush();
  }

  get userId(): string | null {
    return this.currentUserId;
  }

  settingsOfCurrentUser() {
    return this.currentUserId ? this.store.getData(this.currentUserId, "settings") : null;
  }

  async invoke(channel: string, args: unknown): Promise<ApiResult<unknown>> {
    try {
      const fn = this.handlers.get(channel);
      if (!fn) throw new AppError("NOT_FOUND", "Função desconhecida.");
      if (!PUBLIC_CHANNELS.has(channel) && !this.currentUserId) throw new AppError("UNAUTHENTICATED", "Sua sessão expirou. Entre novamente.");
      return { ok: true, data: await fn(args ?? {}) };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  }

  private on(channel: string, fn: Handler): void {
    this.handlers.set(channel, fn);
  }

  private uid(): string {
    if (!this.currentUserId) throw new AppError("UNAUTHENTICATED", "Sua sessão expirou. Entre novamente.");
    return this.currentUserId;
  }

  private isOwner(userId = this.currentUserId): boolean {
    return !!userId && this.store.findUser(userId)?.role === "dono";
  }

  private requireOwner(): void {
    if (!this.isOwner()) throw new AppError("FORBIDDEN", "Só o Dono do app pode mudar a Inteligência Artificial.");
  }

  private startSession(userId: string, remember: boolean): void {
    this.currentUserId = userId;
    if (remember) {
      this.store.app.session = { userId, token: this.platform.randomHex(24), expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString() };
    } else {
      delete this.store.app.session;
    }
    this.store.save();
    this.engine.start(userId);
  }

  private onNotification(userId: string, n: AppNotification): void {
    if (userId !== this.currentUserId) return;
    this.platform.emit("notifications:new", n);
    this.platform.notify?.(n, this.store.getData(userId, "settings"));
  }

  /** Avisa os Donos que o modelo da IA mudou sozinho. */
  private notifyOwners(from: string, to: string, reason: string): void {
    for (const u of this.store.users.filter((x) => x.role === "dono")) {
      this.engine.push(
        u.id,
        {
          type: "sistema",
          tone: "info",
          title: "O Assistente trocou de modelo de IA",
          message: `Passou de ${modelLabel(from)} para ${modelLabel(to)} porque ${reason}. Você pode escolher outro em Configurações → Inteligência Artificial.`,
          link: "/configuracoes",
        },
        `modelo-${from}-${to}`
      );
    }
  }

  /** Erro técnico da IA: quem não é Dono vê uma mensagem simples e o Dono recebe o detalhe. */
  private aiError(err: unknown): string {
    const { code, message } = errorMessage(err);
    if (this.isOwner()) return message;
    if (code !== "NETWORK" && code !== "AI_OFFLINE") {
      for (const u of this.store.users.filter((x) => x.role === "dono")) {
        this.engine.push(
          u.id,
          { type: "sistema", tone: "negative", title: "O Assistente falhou para um usuário", message, link: "/configuracoes" },
          `ia-erro-${code}-${new Date().toISOString().slice(0, 13)}`
        );
      }
    }
    if (code === "AI_NO_KEY") return "O Assistente ainda não foi ativado. Peça ao Dono do app para ativá-lo.";
    if (code === "NETWORK" || code === "AI_OFFLINE") return "Sem conexão com a internet. Verifique e tente de novo.";
    return AI_UNAVAILABLE;
  }

  private budgetOf(userId: string): DealCheck["budget"] {
    const profile = this.store.getData(userId, "profile");
    const ym = currentYm();
    const month = summarizeMonth(this.store.getData(userId, "expenses"), ym, profile.salary, profile.extraIncome);
    const budget = monthBudget(month, this.store.getData(userId, "invoices"), ym, new Date(), billsPending(this.store.getData(userId, "bills"), ym));
    const invoicesOpen = budget.invoicesOpen;
    const accounts = this.store.getData(userId, "accounts");
    return {
      monthBalance: month.balance,
      invoicesOpen,
      available: budget.available,
      emergencyReserve: profile.emergencyReserve,
      monthlyIncome: profile.salary + profile.extraIncome,
      accountsBalance: accounts.length ? accounts.reduce((s, a) => s + a.balance, 0) : undefined,
    };
  }

  private async aiMessages(userId: string, mode: AiMode, messages: { role: "user" | "assistant"; content: string }[], attachment?: string) {
    const user = this.store.findUser(userId)!;
    const question = messages.filter((m) => m.role === "user").pop()?.content ?? "";
    const context = await buildAiContext({
      user: { name: user.name },
      data: this.store.getAllData(userId),
      notifications: this.store.getNotifications(userId).slice(0, 8),
      question,
      mode,
    });
    const extra = attachment ? `\n\n${attachment.slice(0, 6000)}` : "";
    return [{ role: "system" as const, content: `${systemPrompt(mode)}\n\n=== DADOS EM TEMPO REAL ===\n${context}${extra}` }, ...messages];
  }

  private register(): void {
    const p = this.platform;
    this.on("app:info", () => ({ version: p.version, platform: p.os, kind: p.kind, hasUsers: this.cloud.enabled || this.auth.hasUsers(), cloud: this.cloud.enabled, dataDir: p.dataDir }));

    // ---- autenticação ----
    this.on("auth:session", () => {
      if (this.currentUserId) {
        const u = this.store.findUser(this.currentUserId);
        return u ? this.store.toPublic(u) : null;
      }
      const s = this.store.app.session;
      if (!s || Date.parse(s.expiresAt) < Date.now()) return null;
      const u = this.store.findUser(s.userId);
      if (!u || u.status !== "ativo") return null;
      this.startSession(u.id, true);
      void this.sync();
      return this.store.toPublic(u);
    });
    this.on("auth:register", async (a: NewUserInput & { remember?: boolean }) => {
      const input = { name: String(a.name ?? ""), username: String(a.username ?? ""), password: String(a.password ?? ""), email: a.email };
      let user;
      if (this.cloud.enabled) {
        this.auth.validateNew(input);
        user = this.store.toPublic(await this.cloud.register(input, this.auth.localPassword.hash));
      } else {
        user = this.auth.register(input);
      }
      this.startSession(user.id, !!a.remember);
      return user;
    });
    this.on("auth:login", async (a: { username: string; password: string; remember?: boolean }) => {
      const username = String(a.username ?? "");
      const password = String(a.password ?? "");
      // Com a nuvem, a conta vale em qualquer aparelho; sem internet, entra com a cópia local.
      const cloudUser = this.cloud.enabled ? await this.cloud.login(username, password, this.auth.localPassword) : null;
      const user = cloudUser ? this.store.toPublic(cloudUser) : this.auth.login(username, password);
      this.startSession(user.id, !!a.remember);
      if (cloudUser) void this.syncAiKey(user.id).catch(() => undefined);
      return user;
    });
    this.on("auth:logout", () => {
      this.endSession();
      return true;
    });
    this.on("auth:changePassword", async (a: { current: string; next: string }) => {
      const me = this.store.findUser(this.uid())!;
      if (this.cloud.enabled) {
        this.auth.validatePasswordOnly(a.next);
        await this.cloud.changePassword(me.id, me.username, a.current, a.next);
        Object.assign(me, (({ hash, salt }) => ({ passwordHash: hash, salt }))(this.auth.localPassword.hash(a.next)));
        this.store.save();
        return true;
      }
      return this.auth.changePassword(me.id, a.current, a.next);
    });
    this.on("auth:updateProfile", async (a: { name?: string; email?: string; username?: string }) => {
      if (this.cloud.enabled) {
        const me = this.store.findUser(this.uid())!;
        if (a.username !== undefined && a.username.trim() !== me.username) throw new AppError("FORBIDDEN", "O nome de usuário não pode ser trocado.");
        await this.cloud.updateUser(me.id, me.id, { name: a.name, email: a.email });
      }
      return this.auth.updateOwnProfile(this.uid(), { name: a.name, email: a.email, username: this.cloud.enabled ? undefined : a.username });
    });

    // ---- usuários (Dono/Administrador) ----
    // Com a nuvem, as regras de cargo também são conferidas no servidor.
    this.on("users:list", async () => {
      this.auth.requireManager(this.uid());
      return this.cloud.enabled ? this.cloud.listUsers(this.uid()) : this.auth.listUsers(this.uid());
    });
    this.on("users:create", async (a: NewUserInput) => {
      if (!this.cloud.enabled) return this.auth.createUser(this.uid(), a);
      const actor = this.auth.requireManager(this.uid());
      if (actor.role === "adm" && a.role && a.role !== "usuario") throw new AppError("FORBIDDEN", "Administradores só podem criar contas de Usuário.");
      this.auth.validateNew(a);
      await this.cloud.createUser(actor.id, a);
      return true;
    });
    this.on("users:update", async (a: { id: string; patch: { name?: string; username?: string; email?: string; role?: Role; status?: UserStatus } }) => {
      if (!this.cloud.enabled) return this.auth.updateUser(this.uid(), a.id, a.patch);
      const actor = this.auth.requireManager(this.uid());
      if (a.patch.role && actor.role !== "dono") throw new AppError("FORBIDDEN", "Apenas o Dono pode mudar cargos.");
      await this.cloud.updateUser(actor.id, a.id, { name: a.patch.name, email: a.patch.email, role: a.patch.role, status: a.patch.status });
      const local = this.store.findUser(a.id);
      if (local) Object.assign(local, a.patch.role ? { role: a.patch.role } : {}, a.patch.status ? { status: a.patch.status } : {});
      return true;
    });
    this.on("users:resetPassword", async (a: { id: string; password: string }) => {
      if (!this.cloud.enabled) return this.auth.resetPassword(this.uid(), a.id, a.password);
      this.auth.validatePasswordOnly(String(a.password ?? ""));
      return this.cloud.resetPassword(this.auth.requireManager(this.uid()).id, a.id, a.password);
    });
    this.on("users:delete", async (a: { id: string }) => {
      if (!this.cloud.enabled) return this.auth.deleteUser(this.uid(), a.id);
      await this.cloud.deleteUser(this.auth.requireManager(this.uid()).id, a.id);
      if (this.store.findUser(a.id)) this.store.removeUser(a.id);
      return true;
    });
    this.on("cloud:sync", async () => {
      await this.sync();
      return this.cloud.enabled;
    });

    // ---- dados do usuário ----
    this.on("data:getAll", () => this.store.getAllData(this.uid()));
    this.on("data:set", (a: { key: UserDataKey; value: UserDataMap[UserDataKey] }) => {
      if (!USER_DATA_KEYS.includes(a.key)) throw new AppError("INVALID", "Dado inválido.");
      const isArray = ["portfolio", "goals", "expenses", "alerts", "chat", "invoices", "accounts", "bills", "memory"].includes(a.key);
      if (isArray !== Array.isArray(a.value) || a.value === null || typeof a.value !== "object") throw new AppError("INVALID", "Formato inválido.");
      this.store.setData(this.uid(), a.key, a.value);
      this.cloud.schedulePush(this.uid());
      if (a.key === "alerts" || a.key === "portfolio" || a.key === "settings" || a.key === "invoices" || a.key === "bills") this.engine.runNow();
      return true;
    });

    // ---- notificações ----
    this.on("notifications:list", () => this.store.getNotifications(this.uid()));
    this.on("notifications:markRead", (a: { id?: string }) => {
      const list = this.store.getNotifications(this.uid()).map((n) => (!a?.id || n.id === a.id ? { ...n, read: true } : n));
      this.store.setNotifications(this.uid(), list);
      return list;
    });
    this.on("notifications:remove", (a: { id: string }) => {
      const list = this.store.getNotifications(this.uid()).filter((n) => n.id !== a.id);
      this.store.setNotifications(this.uid(), list);
      return list;
    });
    this.on("notifications:clear", () => {
      this.store.setNotifications(this.uid(), []);
      return [];
    });
    this.on("alerts:state", () => this.store.engine(this.uid()).alertState);
    this.on("alerts:rearm", (a: { id: string }) => {
      delete this.store.engine(this.uid()).alertState[a.id];
      this.store.save();
      this.engine.runNow();
      return true;
    });

    // ---- mercado (dados reais) ----
    this.on("market:quotes", (a: { symbols: string[]; maxAgeMs?: number }) =>
      getQuotes((a.symbols ?? []).slice(0, 400).map(String), Math.max(5_000, a.maxAgeMs ?? 10_000))
    );
    this.on("market:chart", (a: { symbol: string; range: ChartRange }) => getChart(String(a.symbol), VALID_RANGES.includes(a.range) ? a.range : "1M"));
    this.on("market:search", (a: { query: string }) => search(String(a.query ?? "").slice(0, 60)));
    this.on("market:indicators", () => getIndicators());
    this.on("market:copom", () => getCopom());
    this.on("market:tesouro", () => getTesouro());
    this.on("market:news", () => getNews());
    this.on("market:selicHistory", () => getSelicHistory());
    this.on("market:ipcaHistory", () => getIpcaHistory(25));
    this.on("portfolio:history", (a: { range: ChartRange; holdings?: Holding[] }) =>
      portfolioHistory(a.holdings ?? this.store.getData(this.uid(), "portfolio"), VALID_RANGES.includes(a.range) ? a.range : "6M")
    );
    this.on("banks:get", () => getBanks());

    this.on("learning:leaderboard", async (): Promise<LeaderboardEntry[]> => {
      const me = this.uid();
      if (this.cloud.enabled) {
        const rows = await this.cloud.leaderboard(me).catch(() => null);
        if (rows)
          return rows
            .map((r) => ({
              userId: r.id,
              name: r.name,
              username: r.username,
              xp: r.learning?.xp ?? 0,
              completed: Object.values(r.learning?.completed ?? {}).filter((c) => c.approved).length,
              avatarHue: r.avatar_hue,
              isMe: r.id === me,
            }))
            .sort((x, y) => y.xp - x.xp)
            .slice(0, 50);
      }
      return this.store.users
        .filter((u) => u.status === "ativo")
        .map((u) => {
          const l = this.store.getData(u.id, "learning");
          return {
            userId: u.id,
            name: u.name,
            username: u.username,
            xp: l.xp,
            completed: Object.values(l.completed).filter((c) => c.approved).length,
            avatarHue: u.avatarHue,
            isMe: u.id === me,
          };
        })
        .sort((x, y) => y.xp - x.xp)
        .slice(0, 50);
    });

    // ---- inteligência artificial ----
    this.on("ai:info", () => this.ai.info(this.isOwner()));
    this.on("ai:setConfig", (a: { apiKey?: string | null; model?: string; baseUrl?: string }) => {
      this.requireOwner();
      this.ai.setConfig(a);
      if (this.cloud.enabled) {
        // A chave vale para todas as contas, em qualquer aparelho.
        const r = this.ai.resolve();
        void this.cloud
          .pushAi(this.uid(), { apiKey: r.source === "app" ? r.key : null, model: r.choice, baseUrl: this.store.app.ai?.baseUrl ?? "" })
          .catch(() => undefined);
      }
      return this.ai.info(true);
    });
    this.on("ai:catalog", (a: { force?: boolean }) => {
      this.requireOwner();
      return this.ai.catalog(!!a.force);
    });
    this.on("ai:test", () => {
      this.requireOwner();
      return this.ai.test();
    });
    this.on("ai:chat", (a: AiChatRequest) => {
      const userId = this.uid();
      const mode = MODES.includes(a.mode as AiMode) ? (a.mode as AiMode) : "mercado";
      const messages = (a.messages ?? [])
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
      const controller = new AbortController();
      this.aiControllers.set(a.requestId, controller);
      void (async () => {
        try {
          if (!this.ai.info(true).hasKey) {
            throw new AppError("AI_NO_KEY", "A IA ainda não foi configurada. Coloque a chave da NVIDIA em Configurações → Inteligência Artificial.");
          }
          const full = await this.aiMessages(userId, mode, messages, a.attachment);
          if (controller.signal.aborted) return;
          p.emit("ai:event", { requestId: a.requestId, type: "context", data: modeInfo(mode).label });
          await this.ai.stream(full, (delta) => p.emit("ai:event", { requestId: a.requestId, type: "chunk", data: delta }), controller.signal);
          p.emit("ai:event", { requestId: a.requestId, type: "done" });
        } catch (err) {
          p.emit("ai:event", { requestId: a.requestId, type: "error", data: this.aiError(err) });
        } finally {
          this.aiControllers.delete(a.requestId);
        }
      })();
      return true;
    });
    this.on("ai:cancel", (a: { requestId: string }) => {
      this.aiControllers.get(a.requestId)?.abort();
      this.aiControllers.delete(a.requestId);
      return true;
    });

    // ---- vale a pena comprar? ----
    this.on("deals:check", async (a: { query: string; price?: number }) => {
      const userId = this.uid();
      const query = String(a.query ?? "").trim().slice(0, 500);
      if (!query) throw new AppError("INVALID", "Cole o link ou escreva o nome do produto.");
      return checkDeal({ query, price: Number(a.price) || undefined }, this.budgetOf(userId));
    });
    this.on("deals:context", (a: { deal: DealCheck; installments?: number }) => dealToText(a.deal, a.installments));

    // ---- relatórios ----
    this.on("reports:export", async (a: { ym: string; format: "pdf" | "xlsx"; withAi?: boolean }) => {
      const userId = this.uid();
      const user = this.store.findUser(userId)!;
      const profile = this.store.getData(userId, "profile");
      const ym = String(a.ym);
      const summary = summarizeMonth(this.store.getData(userId, "expenses"), ym, profile.salary, profile.extraIncome);
      const input: ReportInput = { userName: user.name, summary, salary: profile.salary, extraIncomeProfile: profile.extraIncome, invoices: this.store.getData(userId, "invoices") };
      if (a.withAi && this.ai.info(true).hasKey) {
        try {
          const ask = `Escreva a análise do relatório de gastos de ${ym} para colocar no PDF: diagnóstico do mês em 2 ou 3 frases, os 3 pontos de atenção com valores, e 3 ações concretas para o próximo mês. Use no máximo 220 palavras e Markdown simples (sem tabelas).`;
          input.aiAnalysis = await this.ai.complete(await this.aiMessages(userId, "financas", [{ role: "user", content: ask }]));
        } catch (err) {
          if (this.isOwner()) throw err;
        }
      }
      const format = a.format === "xlsx" ? "xlsx" : "pdf";
      return p.saveReport({
        ym,
        format,
        fileName: `Investa-Gastos-${ym}.${format}`,
        html: () => buildReportHtml(input),
        xlsx: () => buildExcel(input),
        pdf: () => buildPdf(input),
      });
    });

    // ---- janela e sistema ----
    this.on("window:setTheme", (a: { theme: "dark" | "light" }) => {
      const theme = a.theme === "light" ? "light" : "dark";
      this.store.app.lastTheme = theme;
      this.store.save();
      p.setTheme?.(theme);
      return true;
    });
    this.on("shell:openExternal", (a: { url: string }) => {
      if (/^https:\/\//.test(a.url)) p.openExternal(a.url);
      return true;
    });
  }
}
