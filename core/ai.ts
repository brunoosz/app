import type { AiCatalog, AiConfigInfo } from "@shared/types";
import type { Store } from "./store";
import type { Platform } from "./platform";
import { AppError } from "./auth";
import { fetchStream, fetchWithTimeout, isBufferedStream } from "./http";
import { searchProvider } from "./search";
import type { AiLogEntry } from "@shared/types";
import { describeModels, FALLBACK_MODEL, FALLBACK_MODELS, modelLabel, pickBest } from "./models";

export const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const CATALOG_TTL = 24 * 3600_000;
/** Quanto tempo um modelo que falhou fica fora da escolha automática. */
const COOLDOWN_MS = 30 * 60_000;
/** Tempo máximo esperando o primeiro sinal de vida do modelo, e entre um trecho e outro. */
const FIRST_BYTE_MS = 45_000;
/** Sem streaming (rede nativa do celular) a resposta chega inteira, então espera mais. */
const FIRST_BYTE_BUFFERED_MS = 90_000;
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
  return Object.assign(friendlyBase(status, body), { status, detail: body.slice(0, 400) });
}

function friendlyBase(status: number, body: string): AppError {
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
    else {
      // Automático: fica no modelo que já está funcionando; só troca se ele falhar
      // (aposentado ou em pausa por erro) ou sumir da lista da NVIDIA.
      const last = stored.lastUsed;
      const cooling = this.cooling();
      if (last && !retired.includes(last) && !cooling.includes(last) && (!ids || ids.includes(last))) model = last;
      else model = (ids && (pickBest(ids, [...retired, ...cooling]) || pickBest(ids, retired))) || FALLBACK_MODEL;
    }

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

  /** Chave da pesquisa na internet, se o Dono configurou. */
  searchKey(): string | null {
    const s = this.stored;
    if (!s.searchKeyEnc) return null;
    try {
      return this.platform.secrets.decrypt(s.searchKeyEnc, s.searchKeyMode ?? "plain");
    } catch {
      return null;
    }
  }

  info(canManage: boolean): AiConfigInfo {
    const r = this.resolve();
    const search = this.searchKey();
    if (!canManage) return { hasKey: !!r.key, canManage, hasSearch: !!search };
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
      hasSearch: !!search,
      searchProvider: search ? searchProvider(search) : undefined,
      searchPreview: search ? `${search.slice(0, 5)}••••${search.slice(-4)}` : undefined,
    };
  }

  setConfig(patch: { apiKey?: string | null; model?: string; baseUrl?: string; searchKey?: string | null }): void {
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
    if (patch.searchKey === null || patch.searchKey === "") {
      delete current.searchKeyEnc;
      delete current.searchKeyMode;
    } else if (patch.searchKey) {
      const { data, mode } = this.platform.secrets.encrypt(patch.searchKey.trim());
      current.searchKeyEnc = data;
      current.searchKeyMode = mode;
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
        if (after !== before) this.onModelChange?.(before, after, "o modelo em uso saiu da lista da NVIDIA");
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

  /** Ordem de tentativa: o modelo atual primeiro; os outros só entram se ele falhar. */
  private candidates(first: string): string[] {
    const skip = new Set([...(this.stored.retired ?? []), ...this.cooling()]);
    const ids = this.stored.catalog?.ids;
    const ranked = ids?.length ? describeModels(ids).map((m) => m.id) : FALLBACK_MODELS;
    return [...new Set([first, ...ranked.filter((id) => !skip.has(id))])].slice(0, MAX_MODELS);
  }

  /** Registro para a aba de Logs do Dono (últimos 300 eventos, neste aparelho). */
  private log(entry: Omit<AiLogEntry, "at">): void {
    const list = this.store.app.aiLog ?? [];
    list.unshift({ at: new Date().toISOString(), ...entry });
    this.store.app.aiLog = list.slice(0, 300);
    this.store.save();
  }

  /**
   * Envia a conversa e entrega a resposta em pedaços, sempre pelo mesmo modelo.
   * Só troca de modelo quando ele falha (erro do servidor, sem resposta no
   * prazo, resposta vazia ou modelo desativado). Tudo vai para o log do Dono.
   */
  async stream(messages: ChatMessageIn[], onDelta: (text: string) => void, signal?: AbortSignal, maxTokens = 2048): Promise<void> {
    const r = this.resolve();
    if (!r.key) {
      this.log({ kind: "erro", model: "-", code: "AI_NO_KEY", message: "Sem chave da NVIDIA configurada." });
      throw new AppError("AI_NO_KEY", "A IA ainda não foi configurada. O Dono do app precisa colocar a chave da NVIDIA em Configurações → Inteligência Artificial.");
    }
    if (!this.stored.catalog) await this.catalog().catch(() => undefined);
    const buffered = isBufferedStream();
    const list = this.candidates(this.resolve().model);
    let lastError: AppError | undefined;
    for (let i = 0; i < list.length; i++) {
      const model = list[i];
      if (signal?.aborted) return;
      const started = Date.now();
      let emitted = false;
      try {
        await this.streamOnce(r, model, messages, (d) => {
          emitted = true;
          onDelta(d);
        }, signal, maxTokens, buffered);
        if (!emitted) throw new AppError("AI_EMPTY", "O modelo de IA não devolveu nenhuma resposta.");
        const previous = this.stored.lastUsed;
        if (previous !== model) this.patch({ lastUsed: model });
        this.log({ kind: "ok", model, ms: Date.now() - started });
        if (i > 0) {
          this.log({ kind: "troca", model, message: `Trocou de ${modelLabel(list[0])} para ${modelLabel(model)} porque o anterior falhou.` });
          this.onModelChange?.(list[0], model, "o modelo anterior falhou");
        }
        return;
      } catch (err) {
        if (signal?.aborted || (err as Error).name === "AbortError") {
          this.log({ kind: "cancelado", model, ms: Date.now() - started });
          return;
        }
        const e = err instanceof AppError ? err : new AppError("AI_OFFLINE", "Sem conexão com o serviço de IA. Verifique sua internet.");
        const extra = e as AppError & { status?: number; detail?: string };
        this.log({ kind: "erro", model, code: e.code, status: extra.status, message: e.message, detail: extra.detail, ms: Date.now() - started });
        // Já começou a responder, chave inválida, limite da conta ou sem internet: trocar de modelo não resolve.
        if (emitted || ["AI_AUTH", "AI_RATE", "AI_OFFLINE"].includes(e.code)) throw e;
        if (e.code === "AI_MODEL") {
          this.patch({ retired: [...new Set([...(this.stored.retired ?? []), model])], ...(r.choice === model ? { model: "auto" } : {}) });
        } else {
          this.coolDown(model);
        }
        lastError = e;
      }
    }
    throw lastError ?? new AppError("AI_DOWN", "O serviço de IA está instável agora. Tente novamente em instantes.");
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
