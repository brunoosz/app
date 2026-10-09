import type { AiCatalog, AiConfigInfo } from "@shared/types";
import type { Store } from "./store";
import type { Platform } from "./platform";
import { AppError } from "./auth";
import { fetchStream, fetchWithTimeout } from "./http";
import { describeModels, FALLBACK_MODEL, FALLBACK_MODELS, modelLabel, pickBest } from "./models";

export const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const CATALOG_TTL = 24 * 3600_000;
/** Quanto tempo um modelo que falhou fica fora da escolha automática. */
const COOLDOWN_MS = 30 * 60_000;
/** Tempo máximo esperando o primeiro sinal de vida do modelo, e entre um trecho e outro. */
const FIRST_BYTE_MS = 40_000;
const IDLE_MS = 60_000;
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

class ThinkFilter {
  private buf = "";
  private inThink = false;
  private started = false;

  push(s: string): string {
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

  /** Ordem de tentativa: o modelo escolhido (ou o melhor) e depois os próximos do ranking. */
  private candidates(first: string): string[] {
    const skip = new Set([...(this.stored.retired ?? []), ...this.cooling()]);
    const ids = this.stored.catalog?.ids;
    const ranked = ids?.length ? describeModels(ids).map((m) => m.id) : FALLBACK_MODELS;
    return [...new Set([first, ...ranked.filter((id) => !skip.has(id))])].slice(0, MAX_MODELS);
  }

  /**
   * Envia a conversa e entrega a resposta em pedaços. Se o modelo estiver fora
   * do ar, demorar demais ou responder vazio, tenta o próximo melhor da lista
   * sem o usuário perceber.
   */
  async stream(messages: ChatMessageIn[], onDelta: (text: string) => void, signal?: AbortSignal, maxTokens = 2048): Promise<void> {
    const r = this.resolve();
    if (!r.key) throw new AppError("AI_NO_KEY", "A IA ainda não foi configurada. O Dono do app precisa colocar a chave da NVIDIA em Configurações → Inteligência Artificial.");
    if (!this.stored.catalog) await this.catalog().catch(() => undefined);
    const tried: string[] = [];
    let lastError: AppError | undefined;
    for (const model of this.candidates(this.resolve().model)) {
      if (signal?.aborted) return;
      tried.push(model);
      let emitted = false;
      try {
        await this.streamOnce(r, model, messages, (d) => {
          emitted = true;
          onDelta(d);
        }, signal, maxTokens);
        if (!emitted) throw new AppError("AI_EMPTY", "O modelo de IA não devolveu nenhuma resposta.");
        if (this.stored.lastUsed !== model) this.patch({ lastUsed: model });
        if (tried.length > 1 && r.choice !== "auto") this.onModelChange?.(tried[0], model, "o modelo escolhido não respondeu");
        return;
      } catch (err) {
        if (signal?.aborted || (err as Error).name === "AbortError") return;
        const e = err instanceof AppError ? err : new AppError("AI_OFFLINE", "Sem conexão com o serviço de IA. Verifique sua internet.");
        // Já começou a responder, chave inválida, limite da conta ou sem internet: não adianta trocar de modelo.
        if (emitted || ["AI_AUTH", "AI_RATE", "AI_OFFLINE"].includes(e.code)) throw e;
        if (e.code === "AI_MODEL") {
          this.patch({ retired: [...new Set([...(this.stored.retired ?? []), model])], ...(r.choice === model ? { model: "auto" } : {}) });
          if (r.choice === model) this.onModelChange?.(model, this.resolve().model, "o modelo escolhido foi descontinuado pela NVIDIA");
        } else {
          this.coolDown(model);
        }
        lastError = e;
      }
    }
    throw lastError ?? new AppError("AI_DOWN", "O serviço de IA está instável agora. Tente novamente em instantes.");
  }

  private async streamOnce(r: ResolvedConfig, model: string, messages: ChatMessageIn[], onDelta: (text: string) => void, signal: AbortSignal | undefined, maxTokens: number): Promise<void> {
    const ctrl = new AbortController();
    let timedOut = false;
    let timer = setTimeout(() => ((timedOut = true), ctrl.abort()), FIRST_BYTE_MS);
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
