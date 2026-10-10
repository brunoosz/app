// No celular não existe processo principal: o motor do app (core/) roda aqui
// mesmo, dentro do WebView, e responde pelo mesmo window.investa que o
// Electron expõe no desktop. As requisições às fontes de dados passam pela
// rede nativa (CapacitorHttp), sem bloqueio de CORS.
import { Capacitor, CapacitorHttp, registerPlugin } from "@capacitor/core";

/** Plugin nativo do app (android/…/VoiceInputPlugin.java): ditado pelo reconhecimento de voz do Android. */
/** Plugin nativo (android/…/AppIconPlugin.java): troca o ícone da tela inicial. */
const AppIcon = registerPlugin<{ set(o: { variant: "dark" | "light" }): Promise<void> }>("AppIcon");
const VoiceInput = registerPlugin<{ listen(o: { language?: string; prompt?: string }): Promise<{ text: string }> }>("VoiceInput");
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { scrypt } from "@noble/hashes/scrypt.js";
import { Backend } from "../../core/backend";
import { setStreamFetch } from "../../core/http";
import { randomHexWeb, toHex, type FileStore, type Platform } from "../../core/platform";
import { closeTopOverlay } from "../lib/overlays";

const FILES = ["investa-data.json", "investa-data.bak.json", "cache-tesouro.json", "cache-credito.json"];

async function loadFiles(): Promise<FileStore> {
  const cache = new Map<string, string>();
  await Promise.all(
    FILES.map(async (name) => {
      try {
        const r = await Filesystem.readFile({ path: name, directory: Directory.Data, encoding: Encoding.UTF8 });
        cache.set(name, typeof r.data === "string" ? r.data : await (r.data as Blob).text());
      } catch {
        // arquivo ainda não existe
      }
    })
  );
  // As gravações são em fila para nunca sobrescrever uma mais nova com uma antiga.
  let queue: Promise<unknown> = Promise.resolve();
  return {
    read: (name) => cache.get(name) ?? null,
    write(name, data) {
      cache.set(name, data);
      queue = queue
        .then(() => Filesystem.writeFile({ path: name, data, directory: Directory.Data, encoding: Encoding.UTF8, recursive: true }))
        .catch(() => undefined);
    },
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

type Listener = (payload: unknown) => void;

export async function installMobileBridge(): Promise<void> {
  const listeners = new Map<string, Set<Listener>>();
  const emit = (channel: string, payload: unknown) => listeners.get(channel)?.forEach((cb) => cb(payload));
  let active = true;
  let backendRef: Backend | null = null;
  App.addListener("appStateChange", (s) => {
    active = s.isActive;
    // Voltou para o app: busca o que mudou no PC antes de qualquer edição.
    if (s.isActive) void backendRef?.sync();
  });

  // A IA responde em streaming. Tenta primeiro o fetch do próprio WebView (que
  // entrega a resposta aos poucos); se ele falhar para aquele servidor (CORS),
  // usa a rede nativa, que entrega tudo de uma vez. Cada servidor é lembrado à
  // parte: a Groq aceita o WebView, a NVIDIA não. A rede nativa não respeita o
  // AbortSignal, então o cancelamento é feito aqui: a promessa termina na hora
  // e a resposta que chegar depois é descartada.
  const webFetch = (window as unknown as { CapacitorWebFetch?: typeof fetch }).CapacitorWebFetch;
  const webStreams = new Map<string, boolean>();
  const hostOf = (url: string) => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  };
  const nativeFetch = (url: string, init: RequestInit): Promise<Response> =>
    new Promise<Response>((resolve, reject) => {
      const signal = init.signal;
      const abort = () => reject(Object.assign(new Error("Cancelado"), { name: "AbortError" }));
      if (signal?.aborted) return abort();
      signal?.addEventListener("abort", abort, { once: true });
      const headers = Object.fromEntries(new Headers(init.headers).entries());
      CapacitorHttp.request({
        url,
        method: init.method ?? "GET",
        headers,
        data: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
        responseType: "text",
        connectTimeout: 15_000,
        readTimeout: 240_000,
      })
        .then((res) => {
          signal?.removeEventListener("abort", abort);
          if (signal?.aborted) return;
          const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
          resolve(new Response(body, { status: res.status, headers: res.headers }));
        })
        .catch((err) => {
          signal?.removeEventListener("abort", abort);
          reject(err);
        });
    });
  setStreamFetch(
    async (url, init) => {
      const host = hostOf(url);
      if (webFetch && webStreams.get(host) !== false) {
        try {
          const res = await webFetch(url, init);
          webStreams.set(host, true);
          return res;
        } catch (err) {
          if (init.signal?.aborted) throw err;
          // Só desiste do streaming se a rede nativa funcionar (era bloqueio do WebView,
          // não falta de internet).
          const res = await nativeFetch(url, init);
          webStreams.set(host, false);
          return res;
        }
      }
      return nativeFetch(url, init);
    },
    (url) => !webFetch || webStreams.get(hostOf(url)) !== true
  );

  const info = await App.getInfo().catch(() => ({ version: "1.0.0" }));
  const files = await loadFiles();
  // Id fixo por aviso: se o mesmo aviso chegar de novo, substitui o que está na barra em vez de repetir.
  const notificationId = (key: string) => {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    return (h & 0x7fffffff) || 1;
  };

  const platform: Platform = {
    kind: "mobile",
    os: Capacitor.getPlatform(),
    version: info.version,
    dataDir: "Armazenamento interno do app",
    files,
    secrets: {
      // O armazenamento do app no Android já é privado; a chave fica em base64.
      encrypt: (plain) => ({ data: btoa(unescape(encodeURIComponent(plain))), mode: "plain" }),
      decrypt: (data) => decodeURIComponent(escape(atob(data))),
    },
    hashPassword: (password, salt) => toHex(scrypt(new TextEncoder().encode(password), new TextEncoder().encode(salt), { N: 16384, r: 8, p: 1, dkLen: 64 })),
    randomHex: randomHexWeb,
    emit,
    notify(n, settings) {
      if (active || !settings.desktopNotifications) return;
      void LocalNotifications.schedule({
        notifications: [{ id: notificationId(n.key ?? n.id), title: n.title, body: n.message, smallIcon: "ic_stat_investa", extra: { link: n.link ?? "/alertas" } }],
      }).catch(() => undefined);
    },
    async saveReport(report) {
      const written =
        report.format === "json"
          ? await Filesystem.writeFile({ path: report.fileName, data: report.json?.() ?? "{}", directory: Directory.Cache, encoding: Encoding.UTF8 })
          : await Filesystem.writeFile({ path: report.fileName, data: bytesToBase64(report.format === "xlsx" ? await report.xlsx() : await report.pdf()), directory: Directory.Cache });
      await Share.share({ title: report.fileName, files: [written.uri], dialogTitle: "Salvar ou enviar relatório" }).catch(() => undefined);
      return { path: report.fileName };
    },
    openExternal: (url) => void Browser.open({ url }),
    async voiceInput() {
      const r = await VoiceInput.listen({ language: "pt-BR", prompt: "Fale com o Assistente" });
      return { mode: "text" as const, text: r.text };
    },
    async setAppIcon(variant) {
      await AppIcon.set({ variant });
    },
    setTheme(theme) {
      void StatusBar.setStyle({ style: theme === "light" ? Style.Light : Style.Dark }).catch(() => undefined);
      void StatusBar.setBackgroundColor({ color: theme === "light" ? "#F2F4F8" : "#0B0F1A" }).catch(() => undefined);
    },
  };

  const backend = new Backend(platform);
  backendRef = backend;
  window.investa = {
    platform: platform.os,
    invoke: (channel: string, args?: unknown) => backend.invoke(channel, args),
    on(event: string, cb: Listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => listeners.get(event)?.delete(cb);
    },
  };

  backend.start();
  void LocalNotifications.requestPermissions().catch(() => undefined);
  LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
    const link = (a.notification.extra as { link?: string } | undefined)?.link;
    if (link) emit("navigate", link);
  });
  // Botão voltar do Android: fecha a janela aberta; senão volta uma tela; na Início, minimiza.
  App.addListener("backButton", ({ canGoBack }) => {
    if (closeTopOverlay()) return;
    if (canGoBack && location.hash && location.hash !== "#/") history.back();
    else void App.minimizeApp();
  });
  App.addListener("pause", () => backend.store.flush());
  void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
  platform.setTheme?.(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  setTimeout(() => void SplashScreen.hide().catch(() => undefined), 300);
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
