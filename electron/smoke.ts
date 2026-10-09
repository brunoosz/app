import { CATALOG } from "@shared/catalog";
import { getChart, getQuotes, search } from "./services/yahoo";
import { getCopom, getFocus, getIndicators, sgsProbe } from "./services/bcb";
import { fetchWithTimeout } from "./services/http";
import { getTesouro } from "./services/tesouro";
import { getNews } from "./services/news";
import { getBanks, getCreditRates } from "./services/banks";

let failures = 0;

async function step<T>(name: string, fn: () => Promise<T>, summarize: (r: T) => string, critical = false): Promise<T | undefined> {
  const started = Date.now();
  try {
    const r = await fn();
    console.log(`OK   ${name} (${Date.now() - started} ms): ${summarize(r)}`);
    return r;
  } catch (err) {
    console.log(`FAIL ${name} (${Date.now() - started} ms): ${(err as Error).message}`);
    if (critical) failures++;
    return undefined;
  }
}

async function main(): Promise<void> {
  console.log(`Teste de fontes de dados reais — ${new Date().toISOString()}\n`);

  await step(
    "Yahoo: cotações em lote",
    async () => {
      const r = await getQuotes(["PETR4.SA", "VALE3.SA", "^BVSP", "USDBRL=X", "BTC-USD", "BTC-BRL", "IFIX.SA", "HGLG11.SA", "AAPL34.SA", "GC=F", "AAPL"]);
      if (!Object.keys(r).length) throw new Error("nenhuma cotação retornada");
      return r;
    },
    (r) =>
      Object.values(r)
        .map((q) => `${q.symbol}=${q.price.toFixed(2)} ${q.currency} (${q.changePercent.toFixed(2)}%${q.pe ? ` P/L ${q.pe.toFixed(1)}` : ""}${q.dividendYield ? ` DY ${q.dividendYield.toFixed(1)}` : ""}${q.fiftyDayAverage ? ` MM50 ${q.fiftyDayAverage.toFixed(2)}` : ""})`)
        .join(" | "),
    true
  );
  await step("Yahoo: gráfico 1D PETR4", () => getChart("PETR4.SA", "1D"), (r) => `${r.points.length} pontos, fech. anterior ${r.previousClose}`, true);
  await step("Yahoo: gráfico 1A ^BVSP", () => getChart("^BVSP", "1A"), (r) => `${r.points.length} pontos`, true);
  await step("Yahoo: busca 'itau'", () => search("itau"), (r) => r.slice(0, 6).map((x) => x.symbol).join(", "));

  const all = CATALOG.map((a) => a.symbol);
  await step(
    `Yahoo: cobertura do catálogo (${all.length} ativos)`,
    () => getQuotes(all),
    (r) => {
      const missing = all.filter((s) => !r[s]);
      return `${all.length - missing.length}/${all.length} com cotação. Sem dados: ${missing.join(", ") || "nenhum"}`;
    }
  );

  await step(
    "BCB: indicadores",
    () => getIndicators(),
    (r) =>
      `Selic ${r.selic?.value} (${r.selic?.date}) | CDI ${r.cdi?.value?.toFixed(2)} | IPCA mês ${r.ipcaMonth?.value} (${r.ipcaMonth?.date}) | IPCA 12m ${r.ipca12m?.value} | PTAX ${r.dollarPtax?.value} | Poupança ${r.savingsMonth?.value} | TR ${r.tr?.value}`,
    true
  );
  await step("BCB: Focus", () => getFocus(), (r) => JSON.stringify(r));
  await step(
    "BCB: Copom",
    () => getCopom(),
    (r) => `atual ${r.current} | última ${JSON.stringify(r.lastMeeting)} | próxima ${JSON.stringify(r.nextMeeting)} | mudanças ${r.history.length} | expectativa ${JSON.stringify(r.expectation)}`
  );
  await step("Tesouro Direto", () => getTesouro(), (r) => `${r.source}: ${r.titles.length} títulos; ex.: ${r.titles.slice(0, 3).map((t) => `${t.name} ${t.buyRate}`).join(", ")}`);
  await step("Notícias RSS", () => getNews(), (r) => `${r.length} notícias; fontes: ${[...new Set(r.map((n) => n.source))].join(", ")}; 1ª: ${r[0]?.title}`);
  await step(
    "BCB: juros de crédito",
    () => getCreditRates(),
    (r) => `período ${r.period}; ${r.modalities.map((m) => `${m.label}: ${m.rates.length} instituições (menor ${m.rates[0]?.institution} ${m.rates[0]?.rateMonth}% a.m.)`).join(" | ")}`
  );
  await step("Ranking de bancos", () => getBanks(), (r) => r.scores.slice(0, 5).map((s) => `${s.bankId}:${s.score}`).join(", "));

  for (const code of [1, 10813, 21619, 433, 13522, 4389]) {
    await step(`BCB: série SGS ${code}`, () => sgsProbe(code), (r) => JSON.stringify(r));
  }
  for (const url of [
    "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoSelic?$top=1&$format=json",
    "https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json",
  ]) {
    await step(
      `Diagnóstico ${new URL(url).host}`,
      async () => {
        const res = await fetchWithTimeout(url, {}, 15_000);
        const body = await res.text();
        const title = /<title>([^<]*)/i.exec(body)?.[1];
        return `HTTP ${res.status} ${res.headers.get("server") ?? ""} ${title ? `título: ${title}` : body.slice(0, 120)}`;
      },
      (r) => r
    );
  }

  console.log(`\n${failures ? `${failures} verificação(ões) crítica(s) falharam.` : "Todas as verificações críticas passaram."}`);
  process.exit(failures ? 1 : 0);
}

void main();
