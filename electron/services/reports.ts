import ExcelJS from "exceljs";
import type { MonthSummary } from "@shared/finance";
import { PAYMENT_LABEL, ymLabel } from "@shared/finance";
import { institutionLabel } from "@shared/banks";
import { logoMarkSvg } from "@shared/brand";

export interface ReportInput {
  userName: string;
  summary: MonthSummary;
  salary: number;
  extraIncomeProfile: number;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brDate = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const BRL_FMT = '"R$" #,##0.00;[Red]-"R$" #,##0.00';

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function buildExcel(input: ReportInput, filePath: string): Promise<void> {
  const { summary } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Investa";
  wb.created = new Date();

  const header = (row: ExcelJS.Row) => {
    row.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F8CFF" } };
      c.alignment = { vertical: "middle" };
    });
    row.height = 22;
  };

  const resumo = wb.addWorksheet("Resumo", { views: [{ showGridLines: false }] });
  resumo.columns = [{ width: 34 }, { width: 20 }, { width: 14 }];
  resumo.mergeCells("A1:C1");
  resumo.getCell("A1").value = `Investa — Relatório de ${ymLabel(summary.ym)}`;
  resumo.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF0B0F1A" } };
  resumo.getCell("A2").value = `${input.userName} · gerado em ${new Date().toLocaleString("pt-BR")}`;
  resumo.getCell("A2").font = { color: { argb: "FF64748B" } };
  resumo.addRow([]);
  header(resumo.addRow(["Resumo do mês", "Valor", ""]));
  const kpis: [string, number][] = [
    ["Renda mensal (perfil)", summary.income],
    ["Receitas extras lançadas", summary.extraIncome],
    ["Total gasto no mês", summary.spent],
    ["Saldo do mês", summary.balance],
  ];
  for (const [k, v] of kpis) {
    const r = resumo.addRow([k, v]);
    r.getCell(2).numFmt = BRL_FMT;
  }
  resumo.addRow([]);
  header(resumo.addRow(["Gastos por categoria", "Total", "% do total"]));
  for (const c of summary.byCategory) {
    const r = resumo.addRow([c.category, c.total, summary.spent ? c.total / summary.spent : 0]);
    r.getCell(2).numFmt = BRL_FMT;
    r.getCell(3).numFmt = "0.0%";
  }
  resumo.addRow([]);
  header(resumo.addRow(["Gastos por banco / instituição", "Total", ""]));
  for (const b of summary.byInstitution) {
    const r = resumo.addRow([institutionLabel(b.institution), b.total]);
    r.getCell(2).numFmt = BRL_FMT;
  }
  if (summary.futureInstallments.length) {
    resumo.addRow([]);
    header(resumo.addRow(["Parcelas dos próximos meses", "Total", ""]));
    for (const f of summary.futureInstallments) {
      const r = resumo.addRow([ymLabel(f.ym), f.total]);
      r.getCell(2).numFmt = BRL_FMT;
    }
  }

  const lanc = wb.addWorksheet("Lançamentos", { views: [{ state: "frozen", ySplit: 1 }] });
  lanc.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Descrição", key: "desc", width: 34 },
    { header: "Tipo", key: "type", width: 11 },
    { header: "Categoria", key: "cat", width: 16 },
    { header: "Pagamento", key: "method", width: 14 },
    { header: "Banco", key: "bank", width: 18 },
    { header: "Parcela", key: "inst", width: 10 },
    { header: "Valor no mês", key: "value", width: 16 },
    { header: "Valor total", key: "total", width: 16 },
  ];
  header(lanc.getRow(1));
  for (const e of summary.entries) {
    const r = lanc.addRow({
      date: brDate(e.expense.date),
      desc: e.expense.description,
      type: e.expense.type === "receita" ? "Receita" : "Despesa",
      cat: e.expense.category,
      method: PAYMENT_LABEL[e.expense.method],
      bank: institutionLabel(e.expense.institution),
      inst: e.totalInstallments > 1 ? `${e.installment}/${e.totalInstallments}` : "à vista",
      value: e.expense.type === "receita" ? e.amount : -e.amount,
      total: e.expense.amount,
    });
    r.getCell("value").numFmt = BRL_FMT;
    r.getCell("total").numFmt = BRL_FMT;
  }
  lanc.autoFilter = { from: "A1", to: "I1" };

  await wb.xlsx.writeFile(filePath);
}

export function buildReportHtml(input: ReportInput): string {
  const { summary } = input;
  const max = Math.max(1, ...summary.byCategory.map((c) => c.total));
  const palette = ["#4F8CFF", "#A78BFA", "#34D399", "#FBBF24", "#F87171", "#22D3EE", "#F472B6", "#94A3B8"];
  const catRows = summary.byCategory
    .map(
      (c, i) => `<tr><td><span class="dot" style="background:${palette[i % palette.length]}"></span>${esc(c.category)}</td>
      <td class="bar"><div style="width:${(c.total / max) * 100}%;background:${palette[i % palette.length]}"></div></td>
      <td class="num">${brl(c.total)}</td><td class="num muted">${summary.spent ? ((c.total / summary.spent) * 100).toFixed(1).replace(".", ",") : "0"}%</td></tr>`
    )
    .join("");
  const entryRows = summary.entries
    .map(
      (e) => `<tr><td>${brDate(e.expense.date)}</td><td>${esc(e.expense.description)}</td><td>${esc(e.expense.category)}</td>
      <td>${PAYMENT_LABEL[e.expense.method]}</td><td>${esc(institutionLabel(e.expense.institution))}</td>
      <td>${e.totalInstallments > 1 ? `${e.installment}/${e.totalInstallments}` : "à vista"}</td>
      <td class="num ${e.expense.type === "receita" ? "pos" : ""}">${e.expense.type === "receita" ? "+" : "−"} ${brl(e.amount)}</td></tr>`
    )
    .join("");
  const future = summary.futureInstallments.map((f) => `<tr><td>${ymLabel(f.ym)}</td><td class="num">${brl(f.total)}</td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório ${ymLabel(summary.ym)}</title>
<style>
  *{box-sizing:border-box} body{font-family:"Segoe UI",Inter,system-ui,sans-serif;color:#0B0F1A;margin:0;font-size:11px}
  .hero{background:linear-gradient(135deg,#0B0F1A,#1A1F2E);color:#F8FAFC;padding:28px 32px;border-radius:0 0 18px 18px}
  .brand{display:flex;align-items:center;gap:10px} .brand b{font-size:20px;letter-spacing:-.3px}
  .tag{font-size:8px;letter-spacing:3px;color:#94A3B8;margin-top:2px}
  h1{font-size:22px;margin:18px 0 2px} .sub{color:#94A3B8}
  .wrap{padding:22px 32px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
  .kpi{border:1px solid #E2E8F0;border-radius:12px;padding:12px} .kpi span{color:#64748B;font-size:9px;text-transform:uppercase;letter-spacing:.6px}
  .kpi strong{display:block;font-size:16px;margin-top:4px} .pos{color:#059669} .neg{color:#DC2626}
  h2{font-size:13px;margin:18px 0 8px}
  table{width:100%;border-collapse:collapse} td,th{padding:6px 8px;border-bottom:1px solid #EEF2F7;text-align:left;vertical-align:middle}
  th{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#64748B;background:#F8FAFC}
  .num{text-align:right;white-space:nowrap} .muted{color:#64748B}
  .bar{width:40%} .bar div{height:8px;border-radius:6px}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
  footer{margin-top:22px;color:#94A3B8;font-size:9px;text-align:center}
</style></head><body>
<div class="hero"><div class="brand">${logoMarkSvg(30, "pdfg")}<div><b>Investa</b><div class="tag">APRENDA · INVISTA · EVOLUA</div></div></div>
<h1>Relatório de gastos — ${ymLabel(summary.ym)}</h1><div class="sub">${esc(input.userName)} · gerado em ${new Date().toLocaleString("pt-BR")}</div></div>
<div class="wrap">
<div class="kpis">
  <div class="kpi"><span>Renda do mês</span><strong>${brl(summary.income + summary.extraIncome)}</strong></div>
  <div class="kpi"><span>Total gasto</span><strong class="neg">${brl(summary.spent)}</strong></div>
  <div class="kpi"><span>Saldo</span><strong class="${summary.balance >= 0 ? "pos" : "neg"}">${brl(summary.balance)}</strong></div>
  <div class="kpi"><span>Lançamentos</span><strong>${summary.entries.length}</strong></div>
</div>
<h2>Gastos por categoria</h2>
<table>${catRows || '<tr><td class="muted">Nenhum gasto neste mês.</td></tr>'}</table>
${future ? `<h2>Parcelas dos próximos meses</h2><table>${future}</table>` : ""}
<h2>Lançamentos</h2>
<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th>Banco</th><th>Parcela</th><th class="num">Valor</th></tr></thead>
<tbody>${entryRows || '<tr><td colspan="7" class="muted">Nenhum lançamento.</td></tr>'}</tbody></table>
<footer>Relatório gerado pelo aplicativo Investa.</footer>
</div></body></html>`;
}
