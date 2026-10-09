// Valores grandes (R$ 100.000,00 num card estreito do celular) diminuem a
// fonte até caber, em vez de vazar do card. Vale para qualquer tela: observa
// os números (.tabular e títulos de valor) e ajusta quando o conteúdo ou o
// tamanho da tela muda.
const MIN_PX = 12;
const SELECTOR = '.surface .tabular, .surface [data-fit], .surface [class*="text-[2"], .surface [class*="text-[3"]';

function fit(el: HTMLElement): void {
  if (!el.isConnected) return;
  const base = Number(el.dataset.fitBase) || parseFloat(getComputedStyle(el).fontSize);
  if (base < 16) return; // só números grandes
  el.dataset.fitBase = String(base);
  const parent = el.parentElement;
  if (!parent) return;
  const avail = el.clientWidth || parent.clientWidth;
  // Nada mudou desde o último ajuste: não mexe (evita piscar durante animações).
  const key = `${el.textContent}|${avail}`;
  if (el.dataset.fitKey === key) return;
  el.dataset.fitKey = key;
  el.style.fontSize = "";
  el.style.whiteSpace = "nowrap";
  let size = base;
  while (el.scrollWidth > avail + 1 && size > MIN_PX) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
}

const MONEY = /(R\$|US\$|€)\s?[-−+]?\s?\d/;

/** Modo privacidade: marca todo texto com valor em dinheiro para ser borrado. */
function tagMoney(): void {
  if (!document.documentElement.classList.contains("privacy")) return;
  for (const el of document.querySelectorAll<HTMLElement>("main *, header *, [role=dialog] *")) {
    if (el.dataset.money || el.children.length > 2) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent ?? "").join("");
    if (MONEY.test(own)) el.dataset.money = "1";
  }
}

export function installAutoFit(): void {
  window.addEventListener("investa:privacy", () => tagMoney());
  const resize = new ResizeObserver((entries) => {
    for (const e of entries) for (const el of (e.target as HTMLElement).querySelectorAll<HTMLElement>(SELECTOR)) fit(el);
  });
  const seen = new WeakSet<Element>();
  let queued = false;
  const scan = () => {
    queued = false;
    tagMoney();
    for (const el of document.querySelectorAll<HTMLElement>(SELECTOR)) {
      fit(el);
      const card = el.closest(".surface");
      if (card && !seen.has(card)) {
        seen.add(card);
        resize.observe(card);
      }
    }
  };
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scan);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  scan();
}
