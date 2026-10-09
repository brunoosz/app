// Ranking dos modelos de conversa da NVIDIA (build.nvidia.com) para o uso do
// Investa: português, finanças pessoais, respostas rápidas em streaming.
// A lista abaixo é a referência conhecida em outubro de 2026. Modelos novos que
// aparecerem na conta entram pelo ranking por família e versão, sem precisar de
// uma versão nova do app.
import type { AiModelInfo } from "@shared/types";

const CURATED: Record<string, number> = {
  "deepseek-ai/deepseek-v4-flash": 100,
  "moonshotai/kimi-k2.6": 97,
  "z-ai/glm5": 95,
  "deepseek-ai/deepseek-v4-pro": 94,
  "minimaxai/minimax-m3": 91,
  "qwen/qwen3-235b-a22b": 90,
  "deepseek-ai/deepseek-v3.2": 88,
  "mistralai/mistral-large-3-675b-instruct-2512": 86,
  "z-ai/glm4.7": 85,
  "openai/gpt-oss-120b": 84,
  "meta/llama-4-maverick-17b-128e-instruct": 82,
  "nvidia/llama-3.3-nemotron-super-49b-v1.5": 80,
  "moonshotai/kimi-k2-thinking": 79,
  "deepseek-ai/deepseek-v3.1": 78,
  "nvidia/llama-3.1-nemotron-ultra-253b-v1": 76,
  "minimaxai/minimax-m2.1": 74,
  "meta/llama-3.1-405b-instruct": 70,
  "openai/gpt-oss-20b": 62,
  "meta/llama-4-scout-17b-16e-instruct": 60,
};

interface Family {
  name: string;
  test: RegExp;
  /** Captura a versão (ex.: "v4" → 4, "k2.6" → 2.6, "glm5" → 5). */
  version: RegExp;
  base: number;
}

const FAMILIES: Family[] = [
  { name: "DeepSeek", test: /deepseek/i, version: /deepseek-v?(\d+(?:\.\d+)?)/i, base: 80 },
  { name: "Kimi", test: /kimi|moonshot/i, version: /kimi-k(\d+(?:\.\d+)?)/i, base: 80 },
  { name: "GLM", test: /glm/i, version: /glm-?(\d+(?:\.\d+)?)/i, base: 78 },
  { name: "Qwen", test: /qwen/i, version: /qwen(\d+(?:\.\d+)?)/i, base: 75 },
  { name: "MiniMax", test: /minimax/i, version: /minimax-m(\d+(?:\.\d+)?)/i, base: 75 },
  { name: "Mistral", test: /mistral-large|mistral-medium/i, version: /(?:large|medium)-(\d+(?:\.\d+)?)/i, base: 72 },
  { name: "GPT-OSS", test: /gpt-oss/i, version: /gpt-oss-(\d+(?:\.\d+)?)(?!b)/i, base: 72 },
  { name: "Llama", test: /llama/i, version: /llama-?(\d+(?:\.\d+)?)/i, base: 62 },
  { name: "Nemotron", test: /nemotron/i, version: /nemotron-?(\d+(?:\.\d+)?)/i, base: 66 },
  { name: "Gemma", test: /gemma/i, version: /gemma-?(\d+(?:\.\d+)?)/i, base: 55 },
  { name: "Phi", test: /phi-/i, version: /phi-(\d+(?:\.\d+)?)/i, base: 48 },
];

const NOT_CHAT =
  /(embed|rerank|guard|safety|reward|retriev|parse|clip|deplot|kosmos|fuyu|paligemma|neva|vila|detector|cosmos|ocr|asr|tts|whisper|bge|e5-|arctic-embed|sdxl|flux|stable-diffusion|nv-embed|grounding|segment|translate|riva|audio|speech|-base$|chatqa|pii|content-safety|topic-control|jailbreak)/i;

function versionOf(id: string, fam?: Family): number | undefined {
  if (!fam) return undefined;
  const m = fam.version.exec(id);
  return m ? Number(m[1]) : undefined;
}

export function isChatModel(id: string): boolean {
  return !NOT_CHAT.test(id);
}

export function scoreModel(id: string): number {
  if (CURATED[id] !== undefined) return CURATED[id];
  const fam = FAMILIES.find((f) => f.test.test(id));
  let score = fam?.base ?? 40;
  const v = versionOf(id, fam);
  if (fam && v !== undefined) {
    // Geração mais nova que todas as conhecidas da família: provavelmente melhor.
    const known = Object.entries(CURATED).filter(([k]) => fam.test.test(k));
    const maxKnown = Math.max(...known.map(([k]) => versionOf(k, fam) ?? 0), 0);
    const topKnown = Math.max(...known.map(([, s]) => s), fam.base);
    if (v > maxKnown) score = topKnown + 2;
  }
  if (/coder|code/i.test(id)) score -= 15;
  if (/vision|-vl|vlm/i.test(id)) score -= 10;
  if (/\b(1b|2b|3b|4b|7b|8b|9b|mini|small|tiny|nano)\b/i.test(id.replace(/[-_/]/g, " "))) score -= 20;
  return score;
}

const PUBLISHERS: Record<string, string> = {
  "deepseek-ai": "DeepSeek",
  moonshotai: "Moonshot AI",
  "z-ai": "Z.ai",
  qwen: "Alibaba Qwen",
  minimaxai: "MiniMax",
  mistralai: "Mistral AI",
  openai: "OpenAI",
  meta: "Meta",
  nvidia: "NVIDIA",
  google: "Google",
  microsoft: "Microsoft",
  ibm: "IBM",
  thinkingmachines: "Thinking Machines",
};

export function modelLabel(id: string): string {
  const name = id.split("/").pop() ?? id;
  return name
    .replace(/-instruct.*$/i, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => {
      if (/^v\d/i.test(part)) return part.toUpperCase();
      if (/^\d+(\.\d+)?b$/i.test(part)) return part.toUpperCase();
      if (/^(glm|gpt|oss|llm)\d*/i.test(part)) return part.toUpperCase().replace(/^GLM(\d)/, "GLM-$1");
      if (/^k\d/i.test(part)) return part.toUpperCase();
      if (/^m\d/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ")
    .replace(/^Deepseek/, "DeepSeek")
    .replace(/^Minimax/, "MiniMax");
}

export function describeModels(ids: string[]): AiModelInfo[] {
  return ids
    .filter(isChatModel)
    .map((id) => {
      const score = scoreModel(id);
      const tags: string[] = [];
      if (/flash|turbo|fast/i.test(id)) tags.push("rápido");
      if (/thinking|reason|r1|pro\b|-pro/i.test(id)) tags.push("raciocínio");
      if (/vision|-vl|vlm/i.test(id)) tags.push("imagem");
      if (/coder|code/i.test(id)) tags.push("código");
      return { id, label: modelLabel(id), publisher: PUBLISHERS[id.split("/")[0]] ?? id.split("/")[0], score, tags };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** Melhor modelo disponível, ignorando os que já falharam. */
export function pickBest(ids: string[], exclude: string[] = []): string | undefined {
  return describeModels(ids.filter((id) => !exclude.includes(id)))[0]?.id;
}

export const FALLBACK_MODEL = "deepseek-ai/deepseek-v4-flash";
