// Pesquisa na internet para o Assistente. A IA da NVIDIA não navega sozinha:
// o app faz a busca e entrega os resultados (com os links) junto da pergunta.
// Provedores gratuitos: Tavily (chave "tvly-…", feita para IA, devolve o texto
// das páginas) ou Brave Search (devolve resumos). Para Brave, o texto da
// primeira página vem do Jina Reader (r.jina.ai), que é gratuito e sem chave.
import { fetchWithTimeout } from "./http";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export function searchProvider(key: string): "tavily" | "brave" {
  return key.trim().startsWith("tvly-") ? "tavily" : "brave";
}

async function tavily(key: string, query: string, max: number): Promise<SearchResult[]> {
  const res = await fetchWithTimeout(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, Accept: "application/json" },
      body: JSON.stringify({ query, max_results: max, search_depth: "basic", include_answer: false, country: "brazil" }),
    },
    20_000
  );
  if (res.status === 401 || res.status === 403) throw new Error("Chave da pesquisa (Tavily) inválida.");
  if (!res.ok) throw new Error(`Pesquisa indisponível (HTTP ${res.status}).`);
  const json = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (json.results ?? []).filter((r) => r.url).map((r) => ({ title: r.title ?? r.url!, url: r.url!, content: (r.content ?? "").slice(0, 1200) }));
}

async function brave(key: string, query: string, max: number): Promise<SearchResult[]> {
  const res = await fetchWithTimeout(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${max}&country=BR&search_lang=pt-br`,
    { headers: { Accept: "application/json", "X-Subscription-Token": key } },
    15_000
  );
  if (res.status === 401 || res.status === 403 || res.status === 422) throw new Error("Chave da pesquisa (Brave) inválida.");
  if (!res.ok) throw new Error(`Pesquisa indisponível (HTTP ${res.status}).`);
  const json = (await res.json()) as { web?: { results?: { title?: string; url?: string; description?: string; extra_snippets?: string[] }[] } };
  const results = (json.web?.results ?? [])
    .filter((r) => r.url)
    .map((r) => ({ title: r.title ?? r.url!, url: r.url!, content: [r.description, ...(r.extra_snippets ?? [])].filter(Boolean).join(" ").replace(/<[^>]+>/g, "").slice(0, 900) }));
  // Texto completo da primeira página, para a IA ter mais do que o resumo.
  if (results[0]) {
    const page = await fetchWithTimeout(`https://r.jina.ai/${results[0].url}`, { headers: { Accept: "text/plain" } }, 15_000)
      .then((r) => (r.ok ? r.text() : ""))
      .catch(() => "");
    if (page) results[0].content = page.replace(/\s+/g, " ").slice(0, 2500);
  }
  return results;
}

export async function webSearch(key: string, query: string, max = 5): Promise<SearchResult[]> {
  return searchProvider(key) === "tavily" ? tavily(key.trim(), query, max) : brave(key.trim(), query, max);
}

/** Resultados em texto para o contexto da IA, numerados para ela citar [1], [2]… */
export function resultsToContext(results: SearchResult[]): string {
  if (!results.length) return "";
  return [
    "# Resultados da pesquisa na internet (cite como [1], [2]… e só use o que estiver aqui; não invente links)",
    ...results.map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.content}`),
  ].join("\n\n");
}

/** Princípios de livros conhecidos de finanças pessoais, resumidos com palavras próprias. */
export const BOOK_PRINCIPLES = `# Princípios de livros de finanças pessoais (base do app, sempre disponível)
- "O Homem Mais Rico da Babilônia" (George S. Clason): guarde pelo menos 10% de tudo o que ganhar antes de gastar; faça o dinheiro guardado trabalhar; proteja o patrimônio de riscos que você não entende.
- "Pai Rico, Pai Pobre" (Robert Kiyosaki): diferencie ativos (colocam dinheiro no bolso) de passivos (tiram); invista em educação financeira; aumente a renda e compre ativos antes de luxos.
- "Os Segredos da Mente Milionária" (T. Harv Eker): separe a renda em potes (necessidades, liberdade financeira, educação, diversão, longo prazo, doação); o hábito importa mais que o valor.
- "Me Poupe!" (Nathalia Arcuri): conheça seus gastos, monte a reserva de emergência antes de investir em renda variável, defina sonhos com valor e prazo.
- "Do Mil ao Milhão" (Thiago Nigro): gaste bem, invista melhor e ganhe mais; juros compostos e aportes constantes; diversificação de acordo com o perfil.
- "A Psicologia Financeira" (Morgan Housel): tempo e constância vencem acertos pontuais; evite decisões por impulso; margem de segurança e liberdade de tempo são o verdadeiro objetivo.
- "Investidor Inteligente" (Benjamin Graham): diferencie investir de especular; margem de segurança; não deixe o humor do mercado ditar suas decisões.
- "O Investidor de Bogle" (John Bogle): custos baixos e fundos/índices diversificados; ficar no mercado por muito tempo.`;
