export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export class HttpError extends Error {
  constructor(public status: number, public url: string, body?: string) {
    super(`HTTP ${status} em ${new URL(url).host}${body ? `: ${body.slice(0, 160)}` : ""}`);
  }
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8", ...(init.headers as Record<string, string>) },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T>(url: string, init: RequestInit = {}, timeoutMs?: number): Promise<T> {
  const res = await fetchWithTimeout(url, { ...init, headers: { Accept: "application/json", ...(init.headers as Record<string, string>) } }, timeoutMs);
  if (!res.ok) throw new HttpError(res.status, url, await res.text().catch(() => ""));
  return (await res.json()) as T;
}

export async function getText(url: string, init: RequestInit = {}, timeoutMs?: number): Promise<string> {
  const res = await fetchWithTimeout(url, init, timeoutMs);
  if (!res.ok) throw new HttpError(res.status, url);
  return res.text();
}

interface CacheEntry<T> {
  value?: T;
  at: number;
  pending?: Promise<T>;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Cache com TTL, deduplicação de requisições e retorno do último valor válido em caso de falha. */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();
  if (entry?.value !== undefined && now - entry.at < ttlMs) return entry.value;
  if (entry?.pending) return entry.pending;
  const pending = loader()
    .then((value) => {
      cache.set(key, { value, at: Date.now() });
      return value;
    })
    .catch((err) => {
      const prev = cache.get(key) as CacheEntry<T> | undefined;
      if (prev?.value !== undefined) {
        cache.set(key, { value: prev.value, at: prev.at });
        return prev.value;
      }
      cache.delete(key);
      throw err;
    });
  cache.set(key, { ...(entry ?? { at: 0 }), pending });
  return pending;
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export function brDateToIso(d: string): string {
  const [day, month, year] = d.split("/");
  return `${year}-${month}-${day}`;
}

export function isoToBrDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function nowInSaoPaulo(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

export function todayIsoSaoPaulo(): string {
  const d = nowInSaoPaulo();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
