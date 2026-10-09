// "Vale a pena comprar?": busca o preço atual e, quando existe, o histórico.
// Jogos: Steam (preço em reais) e CheapShark (menor preço já registrado em
// várias lojas de PC, incluindo Steam e Epic, em dólar).
// Produtos: lê o preço da página do link (dados estruturados da loja). As lojas
// brasileiras não têm API pública de histórico, então o app indica onde
// conferir.
import type { DealCheck, DealOffer } from "@shared/types";
import { cached, fetchWithTimeout, getJson } from "./http";
import { getQuotes } from "./yahoo";

const CHEAPSHARK = "https://www.cheapshark.com/api/1.0";
// A CheapShark recusa (HTTP 400) User-Agent de navegador ou genérico: pede um
// que identifique o app.
const CHEAPSHARK_INIT: RequestInit = { headers: { "User-Agent": "Investa/1.0 (+https://github.com/brunoosz/app)" } };

interface SteamDetails {
  name: string;
  header_image?: string;
  is_free?: boolean;
  price_overview?: { currency: string; initial: number; final: number; discount_percent: number };
}

async function steamDetails(appId: string): Promise<SteamDetails | null> {
  const json = await getJson<Record<string, { success: boolean; data?: SteamDetails }>>(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br&l=portuguese`,
    {},
    15_000
  );
  return json[appId]?.success ? json[appId].data ?? null : null;
}

async function steamSearch(term: string): Promise<{ id: string; name: string } | null> {
  const json = await getJson<{ items?: { id: number; name: string }[] }>(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&cc=br&l=portuguese`,
    {},
    15_000
  );
  const item = json.items?.[0];
  return item ? { id: String(item.id), name: item.name } : null;
}

async function cheapsharkStores(): Promise<Record<string, string>> {
  return cached("cheapshark:stores", 7 * 86_400_000, async () => {
    const list = await getJson<{ storeID: string; storeName: string }[]>(`${CHEAPSHARK}/stores`, CHEAPSHARK_INIT, 15_000);
    return Object.fromEntries(list.map((s) => [s.storeID, s.storeName]));
  });
}

interface CheapGame {
  info: { title: string; steamAppID?: string | null; thumb?: string };
  cheapestPriceEver?: { price: string; date: number };
  deals: { storeID: string; price: string; retailPrice: string; savings: string; dealID: string }[];
}

async function cheapsharkGame(opts: { steamAppId?: string; title?: string }): Promise<CheapGame | null> {
  const q = opts.steamAppId ? `steamAppID=${opts.steamAppId}` : `title=${encodeURIComponent(opts.title ?? "")}&limit=5`;
  const list = await getJson<{ gameID: string; external: string }[]>(`${CHEAPSHARK}/games?${q}`, CHEAPSHARK_INIT, 15_000);
  const first = list[0];
  if (!first) return null;
  return getJson<CheapGame>(`${CHEAPSHARK}/games?id=${first.gameID}`, CHEAPSHARK_INIT, 15_000);
}

function parseNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return undefined;
  const clean = v.replace(/[^\d.,]/g, "");
  // "1.299,90" (pt-BR) ou "1299.90"
  const n = /,\d{1,2}$/.test(clean) ? Number(clean.replace(/\./g, "").replace(",", ".")) : Number(clean.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

interface PageProduct {
  title?: string;
  image?: string;
  price?: number;
  currency?: string;
  regularPrice?: number;
}

/** Lê nome e preço de uma página de produto (JSON-LD, Open Graph e microdados). */
export function extractProduct(html: string): PageProduct {
  const out: PageProduct = {};
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const json = JSON.parse(m[1].trim());
      const nodes: unknown[] = Array.isArray(json) ? json : json["@graph"] ? json["@graph"] : [json];
      for (const node of nodes as Record<string, unknown>[]) {
        const type = String(node["@type"] ?? "");
        if (!/product/i.test(type)) continue;
        out.title ??= typeof node.name === "string" ? decodeHtml(node.name) : undefined;
        const img = node.image;
        out.image ??= typeof img === "string" ? img : Array.isArray(img) && typeof img[0] === "string" ? img[0] : undefined;
        const offers = (Array.isArray(node.offers) ? node.offers[0] : node.offers) as Record<string, unknown> | undefined;
        if (offers) {
          out.price ??= parseNumber(offers.price) ?? parseNumber(offers.lowPrice);
          out.currency ??= typeof offers.priceCurrency === "string" ? offers.priceCurrency : undefined;
        }
      }
    } catch {
      // JSON-LD inválido
    }
  }
  const meta = (prop: string) =>
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i").exec(html)?.[1] ??
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${prop}["']`, "i").exec(html)?.[1];
  out.title ??= meta("og:title") ? decodeHtml(meta("og:title")!) : /<title>([^<]+)<\/title>/i.exec(html)?.[1]?.trim();
  out.image ??= meta("og:image");
  out.price ??= parseNumber(meta("product:price:amount")) ?? parseNumber(meta("og:price:amount")) ?? parseNumber(meta("price"));
  out.currency ??= meta("product:price:currency") ?? meta("og:price:currency") ?? meta("priceCurrency");
  out.regularPrice = parseNumber(meta("product:original_price:amount"));
  return out;
}

function storeName(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (/mercadolivre|mercadolibre/.test(host)) return "Mercado Livre";
  if (/amazon\./.test(host)) return "Amazon";
  if (/shopee/.test(host)) return "Shopee";
  if (/aliexpress/.test(host)) return "AliExpress";
  if (/magazineluiza|magalu/.test(host)) return "Magalu";
  if (/kabum/.test(host)) return "KaBuM!";
  if (/epicgames/.test(host)) return "Epic Games Store";
  if (/steampowered/.test(host)) return "Steam";
  return host;
}

const GAME_HINT = /\b(jogo|game|steam|epic|gog|playstation|ps5|xbox|nintendo|switch|dlc)\b/i;

export interface DealInput {
  query: string;
  price?: number;
}

export async function checkDeal(input: DealInput, budget: DealCheck["budget"]): Promise<DealCheck> {
  const query = input.query.trim();
  const url = /^https?:\/\//i.test(query) ? query : undefined;
  const steamId = url ? /store\.steampowered\.com\/app\/(\d+)/i.exec(url)?.[1] : undefined;
  const epicSlug = url ? /store\.epicgames\.com\/[^/]+\/p\/([^/?#]+)/i.exec(url)?.[1] : undefined;
  const isGame = !!steamId || !!epicSlug || (!url && GAME_HINT.test(query));
  const notes: string[] = [];
  const offers: DealOffer[] = [];
  const result: DealCheck = { query, kind: isGame ? "jogo" : "produto", currency: "BRL", offers, historyLinks: [], notes, budget };

  const usd = await getQuotes(["USDBRL=X"], 60_000)
    .then((q) => q["USDBRL=X"]?.price)
    .catch(() => undefined);
  const toBrl = (v: number) => (usd ? Math.round(v * usd * 100) / 100 : undefined);

  if (isGame) {
    const title = epicSlug ? epicSlug.replace(/-[0-9a-f]{6,}$/i, "").replace(/-/g, " ") : url ? undefined : query.replace(GAME_HINT, "").trim();
    let appId = steamId;
    try {
      if (!appId && title) appId = (await steamSearch(title))?.id;
      if (appId) {
        const d = await steamDetails(appId);
        if (d) {
          result.title = d.name;
          result.image = d.header_image;
          result.source = "Steam (preço no Brasil)";
          result.url = `https://store.steampowered.com/app/${appId}/`;
          if (d.is_free) notes.push("Este jogo é gratuito na Steam.");
          if (d.price_overview) {
            result.currentPrice = d.price_overview.final / 100;
            result.regularPrice = d.price_overview.initial / 100;
            result.discountPercent = d.price_overview.discount_percent;
            result.currency = d.price_overview.currency;
            offers.push({ store: "Steam", price: result.currentPrice, currency: result.currency, priceBrl: result.currentPrice, regularPrice: result.regularPrice, discountPercent: result.discountPercent, url: result.url });
          }
          result.historyLinks.push({ label: "Histórico de preço na SteamDB", url: `https://steamdb.info/app/${appId}/` });
        }
      }
    } catch {
      notes.push("Não foi possível consultar a Steam agora.");
    }
    try {
      const game = await cheapsharkGame({ steamAppId: appId, title: appId ? undefined : title ?? query });
      if (game) {
        result.title ??= game.info.title;
        result.image ??= game.info.thumb;
        const stores = await cheapsharkStores().catch(() => ({}) as Record<string, string>);
        if (game.cheapestPriceEver) {
          const price = Number(game.cheapestPriceEver.price);
          result.lowestPrice = {
            price,
            currency: "USD",
            priceBrl: toBrl(price),
            date: new Date(game.cheapestPriceEver.date * 1000).toISOString().slice(0, 10),
            note: "Menor preço já registrado nas lojas de PC dos EUA (CheapShark). No Brasil a Steam usa preço regional, normalmente menor que a conversão do dólar.",
          };
        }
        for (const deal of game.deals.slice(0, 6)) {
          const price = Number(deal.price);
          offers.push({
            store: stores[deal.storeID] ?? `Loja ${deal.storeID}`,
            price,
            currency: "USD",
            priceBrl: toBrl(price),
            regularPrice: Number(deal.retailPrice),
            discountPercent: Math.round(Number(deal.savings)),
            url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
          });
        }
      }
    } catch {
      notes.push("O histórico de preços (CheapShark) não respondeu agora.");
    }
    const term = encodeURIComponent(result.title ?? query);
    result.historyLinks.push({ label: "Comparar no IsThereAnyDeal", url: `https://isthereanydeal.com/search/?q=${term}` });
  } else {
    if (url) {
      try {
        const res = await fetchWithTimeout(url, { headers: { Accept: "text/html,application/xhtml+xml" } }, 20_000);
        const html = await res.text();
        const p = extractProduct(html);
        result.title = p.title;
        result.image = p.image;
        result.url = url;
        result.source = storeName(url);
        if (p.price) {
          result.currentPrice = p.price;
          result.currency = p.currency ?? "BRL";
          result.regularPrice = p.regularPrice;
          if (p.regularPrice && p.regularPrice > p.price) result.discountPercent = Math.round((1 - p.price / p.regularPrice) * 100);
          offers.push({ store: result.source, price: p.price, currency: result.currency, priceBrl: result.currency === "BRL" ? p.price : undefined, regularPrice: p.regularPrice, url });
        } else {
          notes.push(`Não consegui ler o preço na página da ${result.source}. Informe o preço no campo ao lado.`);
        }
      } catch {
        notes.push("Não foi possível abrir o link agora. Informe o preço no campo ao lado.");
      }
    }
    const term = encodeURIComponent(result.title ?? query);
    result.historyLinks.push(
      { label: "Histórico e comparação no Zoom", url: `https://www.zoom.com.br/search?q=${term}` },
      { label: "Comparar no Buscapé", url: `https://www.buscape.com.br/search?q=${term}` }
    );
    if (url && /amazon\./i.test(url)) result.historyLinks.push({ label: "Histórico da Amazon no Keepa", url: `https://keepa.com/#!search/12-${term}` });
    notes.push("As lojas brasileiras não oferecem histórico de preço aberto. Os links abaixo mostram o histórico nos comparadores.");
  }

  if (input.price && input.price > 0 && !result.currentPrice) {
    result.currentPrice = input.price;
    result.currency = "BRL";
    notes.push("Preço informado por você.");
  }
  result.title ??= url ? undefined : query;
  return result;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Resumo da consulta para o Assistente. */
export function dealToText(d: DealCheck, installments?: number): string {
  const lines = [`# Compra analisada`, `- Item: ${d.title ?? d.query} (${d.kind})${d.source ? ` — ${d.source}` : ""}`];
  if (d.currentPrice) lines.push(`- Preço atual: ${d.currency === "BRL" ? brl(d.currentPrice) : `${d.currency} ${d.currentPrice}`}${d.discountPercent ? ` (${d.discountPercent}% de desconto sobre ${d.regularPrice})` : ""}`);
  if (installments && installments > 1) lines.push(`- A pessoa pretende parcelar em ${installments}x.`);
  if (d.lowestPrice) lines.push(`- Menor preço histórico: US$ ${d.lowestPrice.price}${d.lowestPrice.priceBrl ? ` (≈ ${brl(d.lowestPrice.priceBrl)})` : ""} em ${d.lowestPrice.date}. ${d.lowestPrice.note}`);
  if (d.offers.length > 1) lines.push(`- Outras ofertas agora: ${d.offers.slice(0, 6).map((o) => `${o.store} ${o.currency} ${o.price}${o.priceBrl && o.currency !== "BRL" ? ` (≈ ${brl(o.priceBrl)})` : ""}`).join("; ")}`);
  if (!d.lowestPrice && d.kind === "produto") lines.push("- Sem histórico de preço disponível para esta loja.");
  const b = d.budget;
  lines.push(`- Orçamento: renda mensal ${brl(b.monthlyIncome)}, saldo previsto do mês ${brl(b.monthBalance)}, faturas em aberto ${brl(b.invoicesOpen)}, reserva de emergência ${brl(b.emergencyReserve)}.`);
  for (const n of d.notes) lines.push(`- Observação: ${n}`);
  return lines.join("\n");
}
