// Teste de ponta a ponta: abre o app Electron, cria conta, preenche o perfil,
// cadastra investimentos e percorre todas as telas, registrando erros e prints.
import { _electron as electron } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = process.env.SHOTS || path.join(root, "e2e-shots");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "investa-e2e-"));
fs.mkdirSync(shots, { recursive: true });

// O pacote electron baixa o binário na primeira vez em que é requisitado.
const exe = createRequire(import.meta.url)("electron");
const app = await electron.launch({
  executablePath: exe,
  args: [root, "--no-sandbox", "--disable-gpu"],
  env: { ...process.env, INVESTA_USER_DATA: dataDir },
});

const consoleErrors = [];
const pageErrors = [];
const win = await app.firstWindow();
win.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
win.on("pageerror", (e) => pageErrors.push(e.message));

const wait = (ms) => win.waitForTimeout(ms);
const shot = async (name) => {
  await wait(600);
  await win.screenshot({ path: path.join(shots, `${name}.png`) });
};
const report = async (name) => {
  const info = await win.evaluate(() => {
    const text = (sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent.trim()).filter(Boolean);
    return {
      errors: text('[role="alert"], .text-danger').slice(0, 5),
      skeletons: document.querySelectorAll(".skeleton").length,
      charts: document.querySelectorAll("canvas").length,
      heading: document.querySelector("h1")?.textContent?.trim(),
      values: [...document.querySelectorAll("main .tabular")].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 8),
    };
  });
  console.log(`[${name}] ${JSON.stringify(info)}`);
};
const go = async (route, name, waitMs = 4000) => {
  await win.evaluate((r) => {
    location.hash = `#/${r}`;
  }, route);
  await wait(waitMs);
  await report(name);
  await shot(name);
};

await wait(2000);
await win.click("text=Criar agora");
await wait(400);
await win.fill('input[placeholder="Como você se chama?"]', "Teste Investa");
await win.fill('input[placeholder="ex.: bruno.silva"]', "Teste");
await win.fill('input[placeholder="Mínimo de 6 caracteres"]', "Senha123!");
await win.fill('input[placeholder="Repita a senha"]', "Senha123!");
await win.click("button[type=submit]");
await wait(1800);

const money = win.locator('input[inputmode="decimal"]');
await win.click("text=Começar");
await wait(400);
await money.nth(0).fill("6500");
await win.click("text=Continuar");
await wait(400);
await money.nth(0).fill("3000");
await money.nth(1).fill("1500");
await win.click("text=Continuar");
await wait(400);
await money.nth(0).fill("1500");
await money.nth(1).fill("5000");
await win.click("text=Continuar");
await wait(400);
await win.click("text=Esperaria o preço se recuperar");
await win.click("text=Entre 2 e 5 anos");
await win.click("text=Equilíbrio entre segurança e retorno");
await win.click("text=Continuar");
await wait(400);
await win.click("text=Aprender a investir");
await win.click("text=Continuar");
await wait(400);
await win.click("text=Entrar no Investa");
await wait(2500);

// Carteira: uma ação e um CDB
await go("", "inicio-sem-investimentos", 2500);
await go("carteira", "carteira-vazia", 1500);
await win.click("text=Adicionar o primeiro");
await wait(500);
await win.fill('input[placeholder="Buscar ação, FII, ETF, cripto…"]', "PETR4");
await wait(2500);
await win.locator("button", { hasText: "Petrobras PN" }).first().click();
await wait(2500);
await money.nth(0).fill("100");
await money.nth(1).fill("30");
await win.getByRole("button", { name: "Salvar", exact: true }).click();
await wait(800);
await win.getByRole("button", { name: "Adicionar investimento" }).first().click();
await wait(500);
await win.getByRole("button", { name: "Renda fixa", exact: true }).click();
await wait(300);
await money.nth(0).fill("5000");
await win.locator('input[type="date"]').fill("2026-01-05");
await win.getByRole("button", { name: "Salvar", exact: true }).click();
await wait(1500);

await go("", "inicio", 7000);
await go("carteira", "carteira", 4000);
await go("mercado", "mercado", 6000);
await win.getByRole("button", { name: "Ações", exact: true }).click();
await wait(5000);
await report("mercado-acoes");
await shot("mercado-acoes");
await win.getByRole("button", { name: "Tesouro Direto", exact: true }).click();
await wait(6000);
await report("mercado-tesouro");
await shot("mercado-tesouro");
await win.getByRole("button", { name: "Renda Fixa Bancária", exact: true }).click();
await wait(2000);
await shot("mercado-rendafixa");
await go("mercado/PETR4.SA", "ativo-petr4", 6000);
await win.getByRole("button", { name: "1A", exact: true }).click();
await wait(3000);
await shot("ativo-petr4-1a");
await go("mercado/BTC-USD", "ativo-btc", 6000);
await go("aulas", "aulas", 1500);
await go("assistente", "assistente", 1500);
await go("simulador", "simulador", 2500);
await go("vale-a-pena", "vale-a-pena", 1500);
await go("objetivos", "objetivos", 2500);
await go("gastos", "gastos", 1500);
// Saldo de conta e entrada extra ("Recebi dinheiro") somando ao saldo.
{
  const dialog = win.getByRole("dialog");
  await win.getByRole("button", { name: "Adicionar conta" }).click();
  await wait(400);
  await dialog.locator("select").first().selectOption("nubank");
  await dialog.locator('input[inputmode="decimal"]').first().fill("2000");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await wait(600);
  await win.getByRole("button", { name: "Recebi dinheiro" }).click();
  await wait(400);
  await dialog.getByPlaceholder("Ex.: vendi o videogame").fill("Vendi o videogame");
  await dialog.locator('input[inputmode="decimal"]').first().fill("800");
  await dialog.getByRole("button", { name: "Registrar" }).click();
  await wait(800);
  const ok = /R\$\s?2\.800,00/.test(await win.locator("main").innerText());
  console.log(`[gastos-contas] saldo somado: ${ok ? "sim" : "NÃO"}`);
  if (!ok) pageErrors.push("Saldo da conta não somou a entrada extra");
  await shot("gastos-contas");
}
await go("bancos", "bancos", 8000);
await win.getByRole("button", { name: "Juros de crédito", exact: true }).click();
await wait(2000);
await shot("bancos-credito");
await go("alertas", "alertas", 3000);
await go("usuarios", "usuarios", 1500);
await go("configuracoes", "configuracoes", 1500);

const notifications = await win.evaluate(() => document.querySelector('[aria-label="Notificações"]')?.textContent ?? "");
console.log(`[notificacoes-nao-lidas] ${notifications || "0"}`);

// Celular e tablet: nenhuma tela pode ter texto saindo do card nem rolagem para o lado.
const layoutIssues = [];
const ROUTES = ["", "carteira", "mercado", "mercado/PETR4.SA", "aulas", "assistente", "simulador", "vale-a-pena", "objetivos", "gastos", "bancos", "alertas", "usuarios", "configuracoes"];
for (const [label, width, height] of [["celular", 380, 800], ["tablet", 768, 1024]]) {
  await app.evaluate(({ BrowserWindow }, s) => BrowserWindow.getAllWindows()[0].setContentSize(s.w, s.h), { w: width, h: height });
  await wait(600);
  for (const r of ROUTES) {
    await win.evaluate((route) => (location.hash = `#/${route}`), r);
    await wait(r.startsWith("mercado") ? 3500 : 1800);
    const found = await win.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`página rola para o lado (${document.documentElement.scrollWidth}px > ${innerWidth}px)`);
      for (const card of document.querySelectorAll("main .surface")) {
        const box = card.getBoundingClientRect();
        if (!box.width) continue;
        for (const el of card.querySelectorAll("*")) {
          if (el.children.length || !el.textContent.trim()) continue;
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          // Só conta como cortado de propósito se algum pai dentro do card esconde o excesso.
          let clipped = false;
          for (let a = el; a && a !== card; a = a.parentElement) {
            const cs = getComputedStyle(a);
            if (cs.overflowX !== "visible" || cs.textOverflow === "ellipsis") clipped = true;
          }
          if (r.width && (r.right > box.right + 2 || r.left < box.left - 2) && !clipped && style.position !== "absolute") {
            out.push(`"${el.textContent.trim().slice(0, 40)}" sai do card`);
          }
        }
      }
      return [...new Set(out)].slice(0, 8);
    });
    for (const f of found) layoutIssues.push(`[${label}] /${r}: ${f}`);
    if (r === "" || r === "gastos" || r === "simulador" || r === "carteira") await win.screenshot({ path: path.join(shots, `${label}-${r || "inicio"}.png`) });
  }
}
console.log(`\nProblemas de layout (${layoutIssues.length}):\n${layoutIssues.join("\n")}`);
console.log(`\nErros no console (${consoleErrors.length}):\n${consoleErrors.slice(0, 20).join("\n")}`);
console.log(`Exceções na página (${pageErrors.length}):\n${pageErrors.join("\n")}`);
await app.close();
fs.rmSync(dataDir, { recursive: true, force: true });
process.exit(pageErrors.length || layoutIssues.length ? 1 : 0);
