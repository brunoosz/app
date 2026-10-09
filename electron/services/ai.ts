import fs from "node:fs";
import path from "node:path";
import type { AiConfigInfo } from "@shared/types";
import type { Store } from "./store";
import { AppError } from "./auth";
import { fetchWithTimeout } from "./http";

export const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_MODEL = "meta/llama-4-maverick-17b-128e-instruct";

// Modelos de conversa em ordem de preferência. A NVIDIA aposenta modelos com
// o tempo; quando o configurado some (404/410), o app escolhe o primeiro
// desta lista que ainda existir na conta e passa a usá-lo.
export const PREFERRED_MODELS = [
  "meta/llama-4-maverick-17b-128e-instruct",
  "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  "nvidia/llama-3.3-nemotron-super-49b-v1",
  "qwen/qwen3-235b-a22b",
  "deepseek-ai/deepseek-v3.1",
  "mistralai/mistral-medium-3-instruct",
  "openai/gpt-oss-120b",
  "meta/llama-3.1-405b-instruct",
  "meta/llama-4-scout-17b-16e-instruct",
  "meta/llama-3.1-70b-instruct",
];

export interface Secrets {
  encrypt(plain: string): { data: string; mode: "safe" | "plain" };
  decrypt(data: string, mode: "safe" | "plain"): string;
}

interface FileConfig {
  nvidiaApiKey?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

interface ResolvedConfig {
  key: string | null;
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
  if (status === 404 || status === 410) return new AppError("AI_MODEL", "O modelo de IA escolhido não está mais disponível. Escolha outro em Configurações → Inteligência Artificial.");
  if (status === 429) return new AppError("AI_RATE", "Limite de uso da API atingido. Aguarde alguns instantes e tente de novo.");
  if (status >= 500) return new AppError("AI_DOWN", "O serviço de IA está instável agora. Tente novamente em instantes.");
  return new AppError("AI_ERROR", `Erro da IA (${status}): ${body.slice(0, 200)}`);
}

export class AiService {
  constructor(private store: Store, private secrets: Secrets, private configDirs: string[]) {}

  private readFileConfig(): FileConfig | null {
    for (const dir of this.configDirs) {
      for (const name of ["config.json", "investa.config.json"]) {
        const file = path.join(dir, name);
        try {
          if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")) as FileConfig;
        } catch {
          // arquivo inválido: ignora
        }
      }
      const env = path.join(dir, ".env");
      try {
        if (fs.existsSync(env)) {
          const m = /^\s*NVIDIA_API_KEY\s*=\s*"?([^"\r\n]+)"?/m.exec(fs.readFileSync(env, "utf8"));
          if (m) return { nvidiaApiKey: m[1].trim() };
        }
      } catch {
        // ignora
      }
    }
    return null;
  }

  resolve(): ResolvedConfig {
    const stored = this.store.app.ai ?? {};
    const file = this.readFileConfig();
    const baseUrl = (stored.baseUrl || file?.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const model = stored.model || file?.model || DEFAULT_MODEL;
    if (stored.apiKeyEnc) {
      try {
        return { key: this.secrets.decrypt(stored.apiKeyEnc, stored.keyMode ?? "plain"), model, baseUrl, source: "app" };
      } catch {
        // chave corrompida: tenta as outras fontes
      }
    }
    const fileKey = file?.nvidiaApiKey || file?.apiKey;
    if (fileKey && !fileKey.includes("COLE")) return { key: fileKey.trim(), model, baseUrl, source: "arquivo" };
    const envKey = process.env.NVIDIA_API_KEY;
    if (envKey) return { key: envKey.trim(), model, baseUrl, source: "ambiente" };
    return { key: null, model, baseUrl, source: null };
  }

  info(): AiConfigInfo {
    const r = this.resolve();
    return {
      hasKey: !!r.key,
      keyPreview: r.key ? `${r.key.slice(0, 6)}••••${r.key.slice(-4)}` : undefined,
      model: r.model,
      baseUrl: r.baseUrl,
      source: r.source,
    };
  }

  setConfig(patch: { apiKey?: string | null; model?: string; baseUrl?: string }): AiConfigInfo {
    const current = { ...(this.store.app.ai ?? {}) };
    if (patch.apiKey === null || patch.apiKey === "") {
      delete current.apiKeyEnc;
      delete current.keyMode;
    } else if (patch.apiKey) {
      const { data, mode } = this.secrets.encrypt(patch.apiKey.trim());
      current.apiKeyEnc = data;
      current.keyMode = mode;
    }
    if (patch.model !== undefined) current.model = patch.model.trim() || undefined;
    if (patch.baseUrl !== undefined) current.baseUrl = patch.baseUrl.trim() || undefined;
    this.store.app.ai = current;
    this.store.save();
    return this.info();
  }

  async listModels(): Promise<string[]> {
    const r = this.resolve();
    if (!r.key) throw new AppError("AI_NO_KEY", "Configure a chave da API primeiro.");
    const res = await fetchWithTimeout(`${r.baseUrl}/models`, { headers: { Authorization: `Bearer ${r.key}`, Accept: "application/json" } }, 20_000);
    if (!res.ok) throw friendlyError(res.status, await res.text().catch(() => ""));
    const json = (await res.json()) as { data?: { id: string }[] };
    const skip = /(embed|rerank|guard|safety|reward|retriev|parse|clip|deplot|kosmos|fuyu|paligemma|neva|vila|detector|cosmos|ocr|asr|tts|whisper|bge|e5-|nv-embed|arctic-embed|sdxl|flux|stable)/i;
    return (json.data ?? []).map((m) => m.id).filter((id) => !skip.test(id)).sort();
  }

  async test(): Promise<string> {
    let text = "";
    await this.stream([{ role: "user", content: "Responda apenas: Conexão OK" }], (d) => (text += d), undefined, 30);
    return text.trim() || "Conexão OK";
  }

  // Troca para outro modelo disponível quando o atual foi aposentado.
  private async replaceRetiredModel(retired: string): Promise<boolean> {
    let available: string[];
    try {
      available = await this.listModels();
    } catch {
      return false;
    }
    const pick =
      PREFERRED_MODELS.find((m) => m !== retired && available.includes(m)) ??
      available.find((m) => m !== retired && /instruct|chat/i.test(m));
    if (!pick) return false;
    this.store.app.ai = { ...(this.store.app.ai ?? {}), model: pick };
    this.store.save();
    return true;
  }

  async stream(messages: ChatMessageIn[], onDelta: (text: string) => void, signal?: AbortSignal, maxTokens = 2048, retried = false): Promise<void> {
    const r = this.resolve();
    if (!r.key) throw new AppError("AI_NO_KEY", "A IA ainda não foi configurada. O Dono do app precisa colocar a chave da NVIDIA em Configurações → Inteligência Artificial.");
    let res: Response;
    try {
      res = await fetch(`${r.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${r.key}`, "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ model: r.model, messages, temperature: 0.4, top_p: 0.9, max_tokens: maxTokens, stream: true }),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      throw new AppError("AI_OFFLINE", "Sem conexão com o serviço de IA. Verifique sua internet.");
    }
    if ((res.status === 404 || res.status === 410) && !retried && (await this.replaceRetiredModel(r.model))) {
      return this.stream(messages, onDelta, signal, maxTokens, true);
    }
    if (!res.ok || !res.body) throw friendlyError(res.status, await res.text().catch(() => ""));
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
