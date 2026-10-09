import type { AiCatalog, AiConfigInfo } from "@shared/types";
import type { Store } from "./store";
import type { Platform } from "./platform";
import { AppError } from "./auth";
import { fetchStream, fetchWithTimeout, isBufferedStream } from "./http";
import { describeModels, FALLBACK_MODEL, FALLBACK_MODELS, modelLabel, pickBest } from "./models";

export const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const CATALOG_TTL = 24 * 3600_000;
/** Quanto tempo um modelo que falhou fica fora da escolha automática. */
const COOLDOWN_MS = 30 * 60_000;
/** Tempo máximo esperando o primeiro sinal de vida do modelo, e entre um trecho e outro. */
const FIRST_BYTE_MS = 25_000;
/** Sem streaming (rede nativa do celular) a resposta chega inteira, então espera mais. */
const FIRST_BYTE_BUFFERED_MS = 75_000;
const IDLE_MS = 45_000;
/** Se o primeiro modelo não começar a responder nesse tempo, um segundo entra na disputa. */
const RACE_AFTER_MS = 6_000;
const RACE_AFTER_BUFFERED_MS = 15_000;
/** Quantos modelos tentar antes de desistir. */
const MAX_MODELS = 4;

interface ResolvedConfig {
  key: string | null;
  /** "auto" ou o id escolhido pelo Dono. */
  choice: string;
  model: string;
  baseUrl: string;
  source: AiConfigInfo["source"];
}

export type ChatMessageIn = { role: "system" | "user" | "assistant"; content: string };

/** Começos típicos de modelos que escrevem o raciocínio como texto, sem as tags <think>. */
const THINKING_START =
  /^\s*(\*\*)?(here'?s (a|my) (thinking|thought) process|thinking process|thought process|okay[,.!]\s+(so|let|the|i|we|here)\b|alright[,.]\s|let me |let's |we need to |the user |i need to |i will |i'll |first,? i |\d\.\s+\*\*analy[sz]e)/i;

export class ThinkFilter {
  private buf = "";
  private inThink = false;
  private started = false;
  /** Início da resposta guardado até saber se é raciocínio ou resposta. */
  private lead: string | null = "";

  push(s: string): string {
    if (this.lead !== null) {
      this.lead += s;
      const close = this.lead.indexOf("</think>");
      if (close >= 0) {
        // Raciocínio sem a tag de abertura: descarta tudo até o fechamento.
        const rest = this.lead.slice(close + "</think>".length);
        this.lead = null;
        return this.process(rest);
      }
      if (this.lead.trimStart().length < 60) return "";
      if (THINKING_START.test(this.lead) && !this.lead.includes("<think>")) return "";
      const all = this.lead;
      this.lead = null;
      return this.process(all);
    }
    return this.process(s);
  }

  private process(s: string): string {
    this.buf += s;
    let out = "";
    for (;;) {
      const tag = this.inThink ? "</think>" : "<think>";
      const i = this.buf.indexOf(tag);
      if (i >= 0) {
        if (!this.inThink) out += this.buf.slice(0, i);
        this.buf = this.buf.slice(i + tag.length);
        this.inThink = !this.inThink;
        continue;
      }
      let keep = 0;
      for (let k = Math.min(tag.length - 1, this.buf.length); k > 0; k--) {
        if (tag.startsWith(this.buf.slice(-k))) {
          keep = k;
          break;
        }
      }
      if (!this.inThink) out += this.buf.slice(0, this.buf.length - keep);
      this.buf = this.buf.slice(this.buf.length - keep);
      break;
    }
    if (!this.started) {
      out = out.replace(/^\s+/, "");
      if (out) this.started = true;
    }
    return out;
  }

  flush(): string {
    if (this.lead !== null) {
      const lead = this.lead;
      this.lead = null;
      // Só raciocínio, sem resposta: devolve vazio para o app tentar outro modelo.
      if (THINKING_START.test(lead)) return "";
      return this.process(lead) + this.flush();
    }
    const rest = this.inThink ? "" : this.buf;
    this.buf = "";
    return rest;
  }
}

function friendlyError(status: number, body: string): AppError {
  if (status === 401 || status === 403) return new AppError("AI_AUTH", "Chave da API inválida ou sem permissão. Confira em Configurações → Inteligência Artificial.");
  if (status === 404 || status === 410) return new AppError("AI_MODEL", "Nenhum modelo de IA disponível respondeu. Atualize a lista em Configurações → Inteligência Artificial.");
  if (status === 429) return new AppError("AI_RATE", "Limite de uso da API atingido. Aguarde alguns instantes e tente de novo.");
  if (status >= 500) return new AppError("AI_DOWN", "O serviço de IA está instável agora. Tente novamente em instantes.");
  return new AppError("AI_ERROR", `Erro da IA (${status}): ${body.slice(0, 200)}`);
}

export class AiService {
  /** Chamado quando o modelo em uso muda sozinho (para avisar o Dono). */
  onModelChange?: (from: string, to: string, reason: string) => void;

  constructor(private store: Store, private platform: Platform) {}

  private get stored() {
    return this.store.app.ai ?? {};
  }

  private patch(p: Partial<NonNullable<Store["app"]["ai"]>>): void {
    this.store.app.ai = { ...this.stored, ...p };
    this.store.save();
  }

  resolve(): ResolvedConfig {
    const stored = this.stored;
    const file = this.platform.aiFileConfig?.() ?? null;
    const baseUrl = (stored.baseUrl || file?.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const choice = stored.model || file?.model || "auto";
    const retired = stored.retired ?? [];
    const ids = stored.catalog?.ids;
    let model: string;
    if (choice !== "auto" && !retired.includes(choice) && (!ids || ids.includes(choice))) model = choice;
    else model = (ids && (pickBest(ids, [...retired, ...this.cooling()]) || pickBest(ids, retired))) || FALLBACK_MODEL;

    let key: string | null = null;
    let source: AiConfigInfo["source"] = null;
    if (stored.apiKeyEnc) {
      try {
        key = this.platform.secrets.decrypt(stored.apiKeyEnc, stored.keyMode ?? "plain");
        source = "app";
      } catch {
        // chave corrompida: tenta as outras fontes
      }
    }
    const fileKey = file?.nvidiaApiKey || file?.apiKey;
    if (!key && fileKey && !fileKey.includes("COLE")) {
      key = fileKey.trim();
      source = "arquivo";
    }
    const envKey = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NVIDIA_API_KEY;
    if (!key && envKey) {
      key = envKey.trim();
      source = "ambiente";
    }
    return { key, choice, model, baseUrl, source };
  }

  info(canManage: boolean): AiConfigInfo {
    const r = this.resolve();
    if (!canManage) return { hasKey: !!r.key, canManage };
    return {
      hasKey: !!r.key,
      canManage,
      choice: r.choice,
      model: r.model,
      modelLabel: modelLabel(r.model),
      keyPreview: r.key ? `${r.key.slice(0, 6)}••••${r.key.slice(-4)}` : undefined,
      baseUrl: r.baseUrl,
      source: r.source,
      catalogUpdatedAt: this.stored.catalog?.updatedAt,
    };
  }

  setConfig(patch: { apiKey?: string | null; model?: string; baseUrl?: string }): void {
    const current = { ...this.stored };
    if (patch.apiKey === null || patch.apiKey === "") {
      delete current.apiKeyEnc;
      delete current.keyMode;
    } else if (patch.apiKey) {
      const { data, mode } = this.platform.secrets.encrypt(patch.apiKey.trim());
      current.apiKeyEnc = data;
      current.keyMode = mode;
      // Chave nova: a lista de modelos pode ser outra.
      delete current.catalog;
      delete current.retired;
    }
    if (patch.model !== undefined) current.model = patch.model.trim() || "auto";
    if (patch.baseUrl !== undefined) current.baseUrl = patch.baseUrl.trim() || undefined;
    this.store.app.ai = current;
    this.store.save();
  }

  /** Lista os modelos de conversa da conta (uma vez por dia, ou quando pedido). */
  async catalog(force = false): Promise<AiCatalog> {
    const r = this.resolve();
    const cached = this.stored.catalog;
    const fresh = cached && Date.now() - Date.parse(cached.updatedAt) < CATALOG_TTL;
    if (r.key && (force || !fresh)) {
      const before = r.model;
      const res = await fetchWithTimeout(`${r.baseUrl}/models`, { headers: { Authorization: `Bearer ${r.key}`, Accept: "application/json" } }, 20_000);
      if (!res.ok) throw friendlyError(res.status, await res.text().catch(() => ""));
      const json = (await res.json()) as { data?: { id: string }[] };
      const ids = (json.data ?? []).map((m) => m.id);
      if (ids.length) {
        // Modelos que voltaram a aparecer saem da lista de aposentados.
        this.patch({ catalog: { ids, updatedAt: new Date().toISOString() }, retired: (this.stored.retired ?? []).filter((m) => !ids.includes(m)) });
        const after = this.resolve().model;
        if (after !== before) this.onModelChange?.(before, after, r.choice === "auto" ? "há um modelo melhor disponível" : "o modelo escolhido saiu do catálogo");
      }
    }
    const ids = this.stored.catalog?.ids ?? [];
    return { models: describeModels(ids), best: ids.length ? pickBest(ids, this.stored.retired ?? []) : undefined, updatedAt: this.stored.catalog?.updatedAt };
  }

  async test(): Promise<string> {
    let text = "";
    await this.stream([{ role: "user", content: "Responda apenas: Conexão OK" }], (d) => (text += d), undefined, 400);
    return `${text.trim().slice(0, 80) || "Conexão OK"} (${modelLabel(this.stored.lastUsed ?? this.resolve().model)})`;
  }

  /** Resposta completa, sem streaming (relatórios). */
  async complete(messages: ChatMessageIn[], signal?: AbortSignal, maxTokens = 1500): Promise<string> {
    let text = "";
    await this.stream(messages, (d) => (text += d), signal, maxTokens);
    return text.trim();
  }

  /** Modelos em pausa por terem falhado há pouco. */
  private cooling(): string[] {
    const now = Date.now();
    return Object.entries(this.stored.cooldown ?? {})
      .filter(([, until]) => until > now)
      .map(([id]) => id);
  }

  private coolDown(model: string): void {
    const now = Date.now();
    const cooldown = Object.fromEntries(Object.entries(this.stored.cooldown ?? {}).filter(([, until]) => until > now));
    cooldown[model] = now + COOLDOWN_MS;
    this.patch({ cooldown });
  }

  /** Nota do modelo descontando a lentidão medida (cada segundo até a primeira palavra pesa). */
  private speedScore(id: string, base: number): number {
    const ms = this.stored.latency?.[id];
    return ms === undefined ? base : base - Math.min(35, (ms / 1000) * 2.5);
  }

  private recordLatency(model: string, ms: number): void {
    const prev = this.stored.latency?.[model];
    const value = prev === undefined ? ms : Math.round(prev * 0.6 + ms * 0.4);
    this.patch({ latency: { ...(this.stored.latency ?? {}), [model]: value } });
  }

  /** Ordem de tentativa: o modelo escolhido (ou o melhor e mais rápido) e depois os próximos do ranking. */
  private candidates(first: string, auto: boolean): string[] {
    const skip = new Set([...(this.stored.retired ?? []), ...this.cooling()]);
    const ids = this.stored.catalog?.ids;
    const ranked = ids?.length
      ? describeModels(ids)
          .map((m) => ({ id: m.id, s: this.speedScore(m.id, m.score) }))
          .sort((a, b) => b.s - a.s)
          .map((m) => m.id)
      : FALLBACK_MODELS;
    const rest = ranked.filter((id) => !skip.has(id));
    // No automático vale o ranking com velocidade; com um modelo fixo, ele vem primeiro.
    return [...new Set(auto ? [...rest, first] : [first, ...rest])].slice(0, MAX_MODELS);
  }

  /**
   * Envia a conversa e entrega a resposta em pedaços. Começa pelo melhor
   * modelo; se ele não começar a responder em poucos segundos, um segundo
   * modelo entra na disputa e fica valendo o primeiro que responder. Modelos
   * fora do ar, lentos demais ou que respondem vazio são trocados sem o
   * usuário perceber.
   */
  async stream(messages: ChatMessageIn[], onDelta: (text: string) => void, signal?: AbortSignal, maxTokens = 2048): Promise<void> {
    const r = this.resolve();
    if (!r.key) throw new AppError("AI_NO_KEY", "A IA ainda não foi configurada. O Dono do app precisa colocar a chave da NVIDIA em Configurações → Inteligência Artificial.");
    if (!this.stored.catalog) await this.catalog().catch(() => undefined);
    const list = this.candidates(this.resolve().model, r.choice === "auto");
    const buffered = isBufferedStream();
    if (signal?.aborted) return;

    return new Promise<void>((resolve, reject) => {
      let next = 0;
      let running = 0;
      let winner: number | null = null;
      let done = false;
      let lastError: AppError | undefined;
      const ctrls: AbortController[] = [];
      const startedAt: number[] = [];
      let raceTimer: ReturnType<typeof setTimeout> | undefined;

      const finish = (err?: unknown) => {
        if (done) return;
        done = true;
        clearTimeout(raceTimer);
        signal?.removeEventListener("abort", onOuterAbort);
        ctrls.forEach((c, i) => i !== winner && c.abort());
        if (err) reject(err);
        else resolve();
      };
      const onOuterAbort = () => {
        ctrls.forEach((c) => c.abort());
        finish();
      };
      signal?.addEventListener("abort", onOuterAbort);

      const proceed = () => {
        if (done || winner !== null) return;
        if (next < list.length) launch();
        else if (running === 0) finish(lastError ?? new AppError("AI_DOWN", "O serviço de IA está instável agora. Tente novamente em instantes."));
      };

      const launch = () => {
        const i = next++;
        const model = list[i];
        const ctrl = new AbortController();
        ctrls[i] = ctrl;
        running++;
        const started = Date.now();
        startedAt[i] = started;
        let emitted = false;
        this.streamOnce(r, model, messages, (d) => {
          if (winner === null) {
            winner = i;
            clearTimeout(raceTimer);
            this.recordLatency(model, Date.now() - started);
            // Quem perdeu a disputa ainda não tinha respondido: conta como lento.
            ctrls.forEach((c, j) => {
              if (j === i || c.signal.aborted) return;
              this.recordLatency(list[j], Math.max(this.stored.latency?.[list[j]] ?? 0, Date.now() - startedAt[j]));
              c.abort();
            });
          }
          if (winner !== i) return;
          emitted = true;
          onDelta(d);
        }, ctrl.signal, maxTokens, buffered)
          .then(() => {
            running--;
            if (done) return;
            if (winner === i) {
              if (this.stored.lastUsed !== model) this.patch({ lastUsed: model });
              if (i > 0 && r.choice !== "auto" && model !== r.choice) this.onModelChange?.(r.choice, model, "o modelo escolhido não respondeu");
              finish();
              return;
            }
            if (winner !== null) return;
            this.coolDown(model);
            lastError = new AppError("AI_EMPTY", "O modelo de IA não devolveu nenhuma resposta.");
            proceed();
          })
          .catch((err) => {
            running--;
            if (done || signal?.aborted) return;
            if (winner === i) {
              finish(err);
              return;
            }
            if (winner !== null) return; // perdeu a disputa e foi cancelado
            const e = err instanceof AppError ? err : new AppError("AI_OFFLINE", "Sem conexão com o serviço de IA. Verifique sua internet.");
            // Chave inválida ou limite da conta: trocar de modelo não resolve.
            if (e.code === "AI_AUTH" || e.code === "AI_RATE") return finish(e);
            if (e.code === "AI_OFFLINE" && !emitted) {
              lastError = e;
              if (running === 0) finish(e);
              return;
            }
            if (e.code === "AI_MODEL") {
              this.patch({ retired: [...new Set([...(this.stored.retired ?? []), model])], ...(r.choice === model ? { model: "auto" } : {}) });
              if (r.choice === model) this.onModelChange?.(model, this.resolve().model, "o modelo escolhido foi descontinuado pela NVIDIA");
            } else {
              this.coolDown(model);
              if (e.code === "AI_SLOW") this.recordLatency(model, buffered ? FIRST_BYTE_BUFFERED_MS : FIRST_BYTE_MS);
            }
            lastError = e;
            proceed();
          });
      };

      launch();
      // Se o primeiro demorar, um segundo modelo entra na disputa.
      raceTimer = setTimeout(() => {
        if (!done && winner === null && next < list.length) launch();
      }, buffered ? RACE_AFTER_BUFFERED_MS : RACE_AFTER_MS);
    });
  }

  private async streamOnce(r: ResolvedConfig, model: string, messages: ChatMessageIn[], onDelta: (text: string) => void, signal: AbortSignal | undefined, maxTokens: number, buffered = false): Promise<void> {
    const ctrl = new AbortController();
    let timedOut = false;
    let timer = setTimeout(() => ((timedOut = true), ctrl.abort()), buffered ? FIRST_BYTE_BUFFERED_MS : FIRST_BYTE_MS);
    const alive = () => {
      clearTimeout(timer);
      timer = setTimeout(() => ((timedOut = true), ctrl.abort()), IDLE_MS);
    };
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort);
    const fail = (err: unknown): never => {
      if (timedOut) throw new AppError("AI_SLOW", "O modelo de IA demorou demais para responder.");
      if (signal?.aborted) throw err;
      if (err instanceof AppError) throw err;
      throw new AppError("AI_OFFLINE", "Sem conexão com o serviço de IA. Verifique sua internet.");
    };
    try {
      let res: Response;
      try {
        res = await fetchStream(`${r.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${r.key}`, "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ model, messages, temperature: 0.4, top_p: 0.9, max_tokens: maxTokens, stream: true }),
          signal: ctrl.signal,
        });
      } catch (err) {
        return fail(err);
      }
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        // 400/422: o modelo não aceita algo do pedido; trata como fora do ar e tenta outro.
        if (res.status === 400 || res.status === 422) throw new AppError("AI_DOWN", `Erro da IA (${res.status}): ${body.slice(0, 200)}`);
        throw friendlyError(res.status, body);
      }
      alive();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const filter = new ThinkFilter();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          alive();
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              const rest = filter.flush();
              if (rest) onDelta(rest);
              return;
            }
            try {
              const json = JSON.parse(payload) as { choices?: { delta?: { content?: string | null } }[]; error?: { message?: string } };
              if (json.error) throw new AppError("AI_DOWN", `Erro da IA: ${json.error.message ?? "falha no modelo"}`);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                const out = filter.push(delta);
                if (out) onDelta(out);
              }
            } catch (err) {
              if (err instanceof AppError) throw err;
              // linha parcial ou keep-alive
            }
          }
        }
      } catch (err) {
        return fail(err);
      }
      const rest = filter.flush();
      if (rest) onDelta(rest);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
}
