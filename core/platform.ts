// O motor do app (contas, dados, IA, alertas e fontes de mercado) roda igual no
// desktop (processo principal do Electron) e no celular (dentro do WebView do
// Capacitor). Tudo o que depende do sistema passa por esta interface.
import type { AppNotification, UserSettings } from "@shared/types";

/** Arquivos pequenos do app. A leitura é síncrona: no celular os arquivos são carregados antes de abrir o motor. */
export interface FileStore {
  read(name: string): string | null;
  write(name: string, data: string): void;
}

export interface Secrets {
  encrypt(plain: string): { data: string; mode: "safe" | "plain" };
  decrypt(data: string, mode: "safe" | "plain"): string;
}

export interface AiFileConfig {
  nvidiaApiKey?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface ReportFile {
  ym: string;
  format: "pdf" | "xlsx";
  fileName: string;
  /** Relatório em HTML (usado para gerar o PDF no desktop). */
  html: () => string;
  /** Planilha pronta. */
  xlsx: () => Promise<Uint8Array>;
  /** PDF montado sem navegador (usado no celular). */
  pdf: () => Promise<Uint8Array>;
}

export interface Platform {
  kind: "desktop" | "mobile";
  os: string;
  version: string;
  dataDir: string;
  files: FileStore;
  secrets: Secrets;
  /** scrypt(senha, salt, 64 bytes) em hexadecimal. */
  hashPassword(password: string, salt: string): string;
  randomHex(bytes: number): string;
  /** Envia um evento para a interface (ai:event, notifications:new, navigate). */
  emit(channel: string, payload: unknown): void;
  /** Mostra a notificação do sistema, se fizer sentido na plataforma. */
  notify?(n: AppNotification, settings: UserSettings): void;
  aiFileConfig?(): AiFileConfig | null;
  saveReport(report: ReportFile): Promise<{ path: string } | null>;
  openExternal(url: string): void;
  setTheme?(theme: "dark" | "light"): void;
}

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function randomHexWeb(bytes: number): string {
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  return toHex(buf);
}

/** Comparação que não para no primeiro caractere diferente. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
