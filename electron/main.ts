import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, Notification, safeStorage, shell, Tray, type IpcMainInvokeEvent } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { AiChatRequest, AppNotification, ChartRange, Holding, LeaderboardEntry, Role, UserDataKey, UserDataMap, UserStatus } from "@shared/types";
import { USER_DATA_KEYS } from "@shared/types";
import { summarizeMonth } from "@shared/finance";
import { Store } from "./services/store";
import { AppError, AuthService, type NewUserInput } from "./services/auth";
import { AiService, type Secrets } from "./services/ai";
import { AlertEngine } from "./services/engine";
import { getChart, getQuotes, search } from "./services/yahoo";
import { getCopom, getIndicators, getIpcaHistory, getSelicHistory } from "./services/bcb";
import { getTesouro, setTesouroCacheFile } from "./services/tesouro";
import { setBrowserFetch } from "./services/http";
import { getNews } from "./services/news";
import { getBanks, setCreditCacheFile } from "./services/banks";
import { portfolioHistory } from "./services/portfolio";
import { buildAiContext, SYSTEM_PROMPT } from "./services/context";
import { buildExcel, buildReportHtml } from "./services/reports";

const isDev = process.argv.includes("--dev");
const DEV_URL = "http://localhost:5173";

if (process.env.INVESTA_USER_DATA) app.setPath("userData", process.env.INVESTA_USER_DATA);
if (process.platform === "win32") app.setAppUserModelId("com.investa.app");

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let store: Store;
let auth: AuthService;
let ai: AiService;
let engine: AlertEngine;
let currentUserId: string | null = null;
const aiControllers = new Map<string, AbortController>();

const resourcesDir = app.isPackaged ? path.join(process.resourcesPath, "resources") : path.join(__dirname, "..", "resources");
const iconPath = path.join(resourcesDir, "icon.png");

const secrets: Secrets = {
  encrypt(plain) {
    if (safeStorage.isEncryptionAvailable()) return { data: safeStorage.encryptString(plain).toString("base64"), mode: "safe" };
    return { data: Buffer.from(plain, "utf8").toString("base64"), mode: "plain" };
  },
  decrypt(data, mode) {
    const buf = Buffer.from(data, "base64");
    return mode === "safe" ? safeStorage.decryptString(buf) : buf.toString("utf8");
  },
};

function themeColors(theme: "dark" | "light") {
  return theme === "light"
    ? { bg: "#F2F4F8", symbol: "#334155" }
    : { bg: "#0B0F1A", symbol: "#CBD5E1" };
}

function send(channel: string, payload: unknown): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function createWindow(): void {
  const theme = store.app.lastTheme ?? "dark";
  const colors = themeColors(theme);
  win = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 380,
    minHeight: 620,
    show: false,
    title: "Investa",
    backgroundColor: colors.bg,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition: { x: 18, y: 16 },
    titleBarOverlay: process.platform === "darwin" ? undefined : { color: colors.bg, symbolColor: colors.symbol, height: 44 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once("ready-to-show", () => win?.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!isTrustedUrl(url)) {
      e.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });
  win.on("close", (e) => {
    if (quitting || !currentUserId) return;
    const settings = store.getData(currentUserId, "settings");
    if (settings.runInBackground) {
      e.preventDefault();
      win?.hide();
      ensureTray();
    }
  });

  if (isDev) void win.loadURL(DEV_URL);
  else void win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

function ensureTray(): void {
  if (tray) return;
  const image = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }) : nativeImage.createEmpty();
  tray = new Tray(image);
  tray.setToolTip("Investa — alertas ativos");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Abrir Investa", click: () => showWindow() },
      { type: "separator" },
      {
        label: "Sair",
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on("click", () => showWindow());
}

function showWindow(route?: string): void {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  if (route) send("navigate", route);
}

function isTrustedUrl(url: string): boolean {
  return url.startsWith("file://") || (isDev && url.startsWith(DEV_URL));
}

function errorMessage(err: unknown): { code: string; message: string } {
  if (err instanceof AppError) return { code: err.code, message: err.message };
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed|ENOTFOUND|ECONN|ETIMEDOUT|aborted|network|HTTP 5\d\d/i.test(msg)) {
    return { code: "NETWORK", message: "Não foi possível buscar os dados agora. Verifique sua conexão com a internet." };
  }
  return { code: "ERROR", message: msg || "Algo deu errado." };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function handle(channel: string, fn: (args: any, event: IpcMainInvokeEvent) => unknown, requireAuth = true): void {
  ipcMain.handle(channel, async (event, args) => {
    try {
      if (!isTrustedUrl(event.senderFrame?.url ?? "")) throw new AppError("FORBIDDEN", "Origem não permitida.");
      if (requireAuth && !currentUserId) throw new AppError("UNAUTHENTICATED", "Sua sessão expirou. Entre novamente.");
      return { ok: true, data: await fn(args, event) };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  });
}

function uid(): string {
  if (!currentUserId) throw new AppError("UNAUTHENTICATED", "Sua sessão expirou. Entre novamente.");
  return currentUserId;
}

function startSession(userId: string, remember: boolean): void {
  currentUserId = userId;
  if (remember) {
    store.app.session = { userId, token: crypto.randomBytes(24).toString("hex"), expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString() };
  } else {
    delete store.app.session;
  }
  store.save();
  engine.start(userId);
}

function onNotification(userId: string, n: AppNotification): void {
  send("notifications:new", n);
  const settings = store.getData(userId, "settings");
  const focused = win?.isFocused() && win.isVisible();
  if (settings.desktopNotifications && !focused && Notification.isSupported()) {
    const toast = new Notification({ title: n.title, body: n.message, icon: fs.existsSync(iconPath) ? iconPath : undefined, silent: false });
    toast.on("click", () => showWindow(n.link ?? "/alertas"));
    toast.show();
  }
}

const VALID_RANGES: ChartRange[] = ["1D", "5D", "1M", "6M", "1A", "5A", "MAX"];

function registerIpc(): void {
  handle(
    "app:info",
    () => ({ version: app.getVersion(), platform: process.platform, hasUsers: auth.hasUsers(), dataDir: app.getPath("userData") }),
    false
  );

  // ---- autenticação ----
  handle(
    "auth:session",
    () => {
      if (currentUserId) {
        const u = store.findUser(currentUserId);
        return u ? store.toPublic(u) : null;
      }
      const s = store.app.session;
      if (!s || Date.parse(s.expiresAt) < Date.now()) return null;
      const u = store.findUser(s.userId);
      if (!u || u.status !== "ativo") return null;
      startSession(u.id, true);
      return store.toPublic(u);
    },
    false
  );
  handle(
    "auth:register",
    (args: NewUserInput & { remember?: boolean }) => {
      const user = auth.register({ name: args.name, username: args.username, password: args.password, email: args.email });
      startSession(user.id, !!args.remember);
      return user;
    },
    false
  );
  handle(
    "auth:login",
    (args: { username: string; password: string; remember?: boolean }) => {
      const user = auth.login(String(args.username ?? ""), String(args.password ?? ""));
      startSession(user.id, !!args.remember);
      return user;
    },
    false
  );
  handle(
    "auth:logout",
    () => {
      currentUserId = null;
      delete store.app.session;
      store.save();
      engine.stop();
      for (const c of aiControllers.values()) c.abort();
      aiControllers.clear();
      return true;
    },
    false
  );
  handle("auth:changePassword", (a: { current: string; next: string }) => auth.changePassword(uid(), a.current, a.next));
  handle("auth:updateProfile", (a: { name?: string; email?: string; username?: string }) => auth.updateOwnProfile(uid(), a));

  // ---- usuários (Dono/Administrador) ----
  handle("users:list", () => auth.listUsers(uid()));
  handle("users:create", (a: NewUserInput) => auth.createUser(uid(), a));
  handle("users:update", (a: { id: string; patch: { name?: string; username?: string; email?: string; role?: Role; status?: UserStatus } }) =>
    auth.updateUser(uid(), a.id, a.patch)
  );
  handle("users:resetPassword", (a: { id: string; password: string }) => auth.resetPassword(uid(), a.id, a.password));
  handle("users:delete", (a: { id: string }) => auth.deleteUser(uid(), a.id));

  // ---- dados do usuário ----
  handle("data:getAll", () => store.getAllData(uid()));
  handle("data:set", (a: { key: UserDataKey; value: UserDataMap[UserDataKey] }) => {
    if (!USER_DATA_KEYS.includes(a.key)) throw new AppError("INVALID", "Dado inválido.");
    const isArray = ["portfolio", "goals", "expenses", "alerts", "chat"].includes(a.key);
    if (isArray !== Array.isArray(a.value) || a.value === null || typeof a.value !== "object") throw new AppError("INVALID", "Formato inválido.");
    store.setData(uid(), a.key, a.value);
    if (a.key === "alerts" || a.key === "portfolio" || a.key === "settings") engine.runNow();
    return true;
  });

  // ---- notificações ----
  handle("notifications:list", () => store.getNotifications(uid()));
  handle("notifications:markRead", (a: { id?: string }) => {
    const list = store.getNotifications(uid()).map((n) => (!a?.id || n.id === a.id ? { ...n, read: true } : n));
    store.setNotifications(uid(), list);
    return list;
  });
  handle("notifications:remove", (a: { id: string }) => {
    const list = store.getNotifications(uid()).filter((n) => n.id !== a.id);
    store.setNotifications(uid(), list);
    return list;
  });
  handle("notifications:clear", () => {
    store.setNotifications(uid(), []);
    return [];
  });
  handle("alerts:state", () => store.engine(uid()).alertState);
  handle("alerts:rearm", (a: { id: string }) => {
    delete store.engine(uid()).alertState[a.id];
    store.save();
    engine.runNow();
    return true;
  });

  // ---- mercado (dados reais) ----
  handle("market:quotes", (a: { symbols: string[]; maxAgeMs?: number }) =>
    getQuotes((a.symbols ?? []).slice(0, 400).map(String), Math.max(5_000, a.maxAgeMs ?? 10_000))
  );
  handle("market:chart", (a: { symbol: string; range: ChartRange }) => getChart(String(a.symbol), VALID_RANGES.includes(a.range) ? a.range : "1M"));
  handle("market:search", (a: { query: string }) => search(String(a.query ?? "").slice(0, 60)));
  handle("market:indicators", () => getIndicators());
  handle("market:copom", () => getCopom());
  handle("market:tesouro", () => getTesouro());
  handle("market:news", () => getNews());
  handle("market:selicHistory", () => getSelicHistory());
  handle("market:ipcaHistory", () => getIpcaHistory(25));
  handle("portfolio:history", (a: { range: ChartRange; holdings?: Holding[] }) =>
    portfolioHistory(a.holdings ?? store.getData(uid(), "portfolio"), VALID_RANGES.includes(a.range) ? a.range : "6M")
  );
  handle("banks:get", () => getBanks());

  handle("learning:leaderboard", (): LeaderboardEntry[] => {
    const me = uid();
    return store.users
      .filter((u) => u.status === "ativo")
      .map((u) => {
        const l = store.getData(u.id, "learning");
        return {
          userId: u.id,
          name: u.name,
          username: u.username,
          xp: l.xp,
          completed: Object.values(l.completed).filter((c) => c.approved).length,
          avatarHue: u.avatarHue,
          isMe: u.id === me,
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 50);
  });

  // ---- inteligência artificial ----
  const requireManager = () => {
    const u = store.findUser(uid());
    if (!u || (u.role !== "dono" && u.role !== "adm")) throw new AppError("FORBIDDEN", "Apenas o Dono ou Administradores podem configurar a IA.");
  };
  handle("ai:info", () => ai.info());
  handle("ai:setConfig", (a: { apiKey?: string | null; model?: string; baseUrl?: string }) => {
    requireManager();
    return ai.setConfig(a);
  });
  handle("ai:models", () => {
    requireManager();
    return ai.listModels();
  });
  handle("ai:test", () => {
    requireManager();
    return ai.test();
  });
  handle("ai:chat", (a: AiChatRequest) => {
    const userId = uid();
    if (!ai.info().hasKey) {
      throw new AppError("AI_NO_KEY", "A IA ainda não foi configurada. O Dono do app precisa colocar a chave da NVIDIA em Configurações → Inteligência Artificial.");
    }
    const user = store.findUser(userId)!;
    const messages = (a.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
    const question = messages.filter((m) => m.role === "user").pop()?.content ?? "";
    const controller = new AbortController();
    aiControllers.set(a.requestId, controller);
    void (async () => {
      try {
        const context = await buildAiContext({ name: user.name }, store.getAllData(userId), store.getNotifications(userId).slice(0, 8), question);
        if (controller.signal.aborted) return;
        send("ai:event", { requestId: a.requestId, type: "context", data: new Date().toISOString() });
        await ai.stream(
          [{ role: "system", content: `${SYSTEM_PROMPT}\n\n=== DADOS EM TEMPO REAL ===\n${context}` }, ...messages],
          (delta) => send("ai:event", { requestId: a.requestId, type: "chunk", data: delta }),
          controller.signal
        );
        send("ai:event", { requestId: a.requestId, type: "done" });
      } catch (err) {
        send("ai:event", { requestId: a.requestId, type: "error", data: errorMessage(err).message });
      } finally {
        aiControllers.delete(a.requestId);
      }
    })();
    return true;
  });
  handle("ai:cancel", (a: { requestId: string }) => {
    aiControllers.get(a.requestId)?.abort();
    aiControllers.delete(a.requestId);
    return true;
  });

  // ---- relatórios ----
  handle("reports:export", async (a: { ym: string; format: "pdf" | "xlsx" }) => {
    const userId = uid();
    const user = store.findUser(userId)!;
    const profile = store.getData(userId, "profile");
    const summary = summarizeMonth(store.getData(userId, "expenses"), String(a.ym), profile.salary, profile.extraIncome);
    const ext = a.format === "xlsx" ? "xlsx" : "pdf";
    const result = await dialog.showSaveDialog(win!, {
      title: "Salvar relatório de gastos",
      defaultPath: path.join(app.getPath("documents"), `Investa-Gastos-${a.ym}.${ext}`),
      filters: ext === "pdf" ? [{ name: "PDF", extensions: ["pdf"] }] : [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (result.canceled || !result.filePath) return null;
    const input = { userName: user.name, summary, salary: profile.salary, extraIncomeProfile: profile.extraIncome };
    if (ext === "xlsx") {
      await buildExcel(input, result.filePath);
    } else {
      const tmp = path.join(os.tmpdir(), `investa-relatorio-${Date.now()}.html`);
      fs.writeFileSync(tmp, buildReportHtml(input), "utf8");
      const pdfWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
      try {
        await pdfWin.loadFile(tmp);
        const pdf = await pdfWin.webContents.printToPDF({ printBackground: true, pageSize: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        fs.writeFileSync(result.filePath, pdf);
      } finally {
        pdfWin.destroy();
        fs.rmSync(tmp, { force: true });
      }
    }
    shell.showItemInFolder(result.filePath);
    return { path: result.filePath };
  });

  // ---- janela ----
  handle(
    "window:setTheme",
    (a: { theme: "dark" | "light" }) => {
      const theme = a.theme === "light" ? "light" : "dark";
      store.app.lastTheme = theme;
      store.save();
      const c = themeColors(theme);
      if (win && process.platform !== "darwin") {
        try {
          win.setTitleBarOverlay({ color: c.bg, symbolColor: c.symbol, height: 44 });
        } catch {
          // plataforma sem overlay
        }
      }
      win?.setBackgroundColor(c.bg);
      return true;
    },
    false
  );
  handle(
    "shell:openExternal",
    (a: { url: string }) => {
      if (/^https:\/\//.test(a.url)) void shell.openExternal(a.url);
      return true;
    },
    false
  );
}

app.on("second-instance", () => showWindow());

app.whenReady().then(() => {
  store = new Store(app.getPath("userData"));
  setBrowserFetch((url, init) => net.fetch(url, init));
  setTesouroCacheFile(path.join(app.getPath("userData"), "cache-tesouro.json"));
  setCreditCacheFile(path.join(app.getPath("userData"), "cache-credito.json"));
  auth = new AuthService(store);
  const configDirs = [app.getPath("userData"), process.env.PORTABLE_EXECUTABLE_DIR, path.dirname(process.execPath), isDev ? process.cwd() : undefined].filter(
    (d): d is string => !!d
  );
  ai = new AiService(store, secrets, configDirs);
  engine = new AlertEngine(store, onNotification);
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: "appMenu" },
        { role: "editMenu" },
        { label: "Visualizar", submenu: [{ role: "reload" }, { role: "togglefullscreen" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }] },
      ])
    );
  } else {
    Menu.setApplicationMenu(null);
  }
  registerIpc();
  createWindow();
  // Pré-carrega os dados oficiais mais lentos para as telas abrirem rápido.
  setTimeout(() => {
    void Promise.allSettled([getIndicators(), getCopom(), getNews(), getTesouro(), getBanks()]);
  }, 2500);
  if (isDev) win?.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F12") win?.webContents.toggleDevTools();
  });
});

app.on("before-quit", () => {
  quitting = true;
  store?.flush();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else showWindow();
});
