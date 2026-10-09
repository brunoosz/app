import type { AiCatalog, AiConfigInfo } from "@shared/types";
import type { Store } from "./store";
import type { Platform } from "./platform";
import { AppError } from "./auth";
import { fetchStream, fetchWithTimeout } from "./http";
import { describeModels, FALLBACK_MODEL, modelLabel, pickBest } from "./models";

export const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const CATALOG_TTL = 24 * 3600_000;

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
    else model = (ids && pickBest(ids, retired)) || FALLBACK_MODEL;

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
    await this.stream([{ role: "user", content: "Responda apenas: Conexão OK" }], (d) => (text += d), undefined, 30);
    return `${text.trim() || "Conexão OK"} (${modelLabel(this.resolve().model)})`;
  }

  /** Resposta completa, sem streaming (relatórios). */
  async complete(messages: ChatMessageIn[], signal?: AbortSignal, maxTokens = 1500): Promise<string> {
    let text = "";
    await this.stream(messages, (d) => (text += d), signal, maxTokens);
    return text.trim();
  }

  async stream(messages: ChatMessageIn[], onDelta: (text: string) => void, signal?: AbortSignal, maxTokens = 2048, attempt = 0): Promise<void> {
    const r = this.resolve();
    if (!r.key) throw new AppError("AI_NO_KEY", "A IA ainda não foi configurada. O Dono do app precisa colocar a chave da NVIDIA em Configurações → Inteligência Artificial.");
    let res: Response;
    try {
      res = await fetchStream(`${r.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${r.key}`, "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ model: r.model, messages, temperature: 0.4, top_p: 0.9, max_tokens: maxTokens, stream: true }),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      throw new AppError("AI_OFFLINE", "Sem conexão com o serviço de IA. Verifique sua internet.");
    }
    // Modelo aposentado ou removido: marca, atualiza o catálogo e tenta o próximo melhor.
    if ((res.status === 404 || res.status === 410) && attempt < 3) {
      const retired = [...new Set([...(this.stored.retired ?? []), r.model])];
      this.patch({ retired, ...(r.choice !== "auto" && r.choice === r.model ? { model: "auto" } : {}) });
      await this.catalog(true).catch(() => undefined);
      const next = this.resolve().model;
      if (next !== r.model) {
        this.onModelChange?.(r.model, next, "o modelo anterior foi descontinuado pela NVIDIA");
        return this.stream(messages, onDelta, signal, maxTokens, attempt + 1);
      }
    }
    if (!res.ok || !res.body) throw friendlyError(res.status, await res.text().catch(() => ""));
    if (this.stored.lastUsed !== r.model) this.patch({ lastUsed: r.model });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const filter = new ThinkFilter();
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
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
            const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              const out = filter.push(delta);
              if (out) onDelta(out);
            }
          } catch {
            // linha parcial ou keep-alive
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      throw err;
    }
    const rest = filter.flush();
    if (rest) onDelta(rest);
  }
}
