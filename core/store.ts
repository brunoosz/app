import type { AlertRuntimeState, AppNotification, PublicUser, Role, UserDataKey, UserDataMap, UserStatus } from "@shared/types";
import { defaultUserData } from "@shared/defaults";
import type { FileStore } from "./platform";

const DB_FILE = "investa-data.json";
const BACKUP_FILE = "investa-data.bak.json";

export interface UserRecord {
  id: string;
  name: string;
  username: string;
  usernameLower: string;
  email?: string;
  role: Role;
  status: UserStatus;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLoginAt?: string;
  avatarHue: number;
}

export interface EngineState {
  keys: Record<string, string>;
  alertState: Record<string, AlertRuntimeState>;
}

export interface AiStoredConfig {
  /** "auto" (padrão) ou o id de um modelo escolhido pelo Dono. */
  model?: string;
  baseUrl?: string;
  apiKeyEnc?: string;
  keyMode?: "safe" | "plain";
  /** Modelos de conversa disponíveis na conta, atualizados uma vez por dia. */
  catalog?: { ids: string[]; updatedAt: string };
  /** Modelos que responderam 404/410 e foram retirados da escolha automática. */
  retired?: string[];
  /** Último modelo usado de fato, para avisar o Dono quando ele mudar. */
  lastUsed?: string;
}

interface DBShape {
  version: 1;
  users: UserRecord[];
  data: Record<string, Partial<UserDataMap>>;
  notifications: Record<string, AppNotification[]>;
  engine: Record<string, EngineState>;
  app: {
    ai?: AiStoredConfig;
    session?: { userId: string; token: string; expiresAt: string };
    lastTheme?: "dark" | "light";
  };
}

function emptyDb(): DBShape {
  return { version: 1, users: [], data: {}, notifications: {}, engine: {}, app: {} };
}

export class Store {
  private db: DBShape;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private files: FileStore) {
    this.db = this.load();
  }

  private load(): DBShape {
    const raw = this.files.read(DB_FILE);
    if (raw === null) return emptyDb();
    try {
      const parsed = JSON.parse(raw) as Partial<DBShape>;
      const db = { ...emptyDb(), ...parsed, app: { ...(parsed.app ?? {}) } } as DBShape;
      this.files.write(BACKUP_FILE, raw);
      return db;
    } catch {
      // Arquivo corrompido: guarda uma cópia e tenta o backup da última abertura.
      this.files.write(`investa-data.corrompido-${Date.now()}.json`, raw);
      const backup = this.files.read(BACKUP_FILE);
      if (backup) {
        try {
          return { ...emptyDb(), ...JSON.parse(backup) } as DBShape;
        } catch {
          return emptyDb();
        }
      }
      return emptyDb();
    }
  }

  get app(): DBShape["app"] {
    return this.db.app;
  }

  save(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 250);
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.files.write(DB_FILE, JSON.stringify(this.db));
  }

  // ---- usuários ----
  get users(): UserRecord[] {
    return this.db.users;
  }

  findUserByUsername(username: string): UserRecord | undefined {
    const lower = username.trim().toLowerCase();
    return this.db.users.find((u) => u.usernameLower === lower);
  }

  findUser(id: string): UserRecord | undefined {
    return this.db.users.find((u) => u.id === id);
  }

  addUser(u: UserRecord): void {
    this.db.users.push(u);
    this.db.data[u.id] = {};
    this.save();
  }

  removeUser(id: string): void {
    this.db.users = this.db.users.filter((u) => u.id !== id);
    delete this.db.data[id];
    delete this.db.notifications[id];
    delete this.db.engine[id];
    if (this.db.app.session?.userId === id) delete this.db.app.session;
    this.save();
  }

  toPublic(u: UserRecord): PublicUser {
    const profile = this.db.data[u.id]?.profile;
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      avatarHue: u.avatarHue,
      onboarded: profile?.onboarded ?? false,
    };
  }

  // ---- dados do usuário ----
  getData<K extends UserDataKey>(userId: string, key: K): UserDataMap[K] {
    const value = this.db.data[userId]?.[key];
    if (value === undefined) return defaultUserData()[key];
    if (key === "settings" || key === "profile" || key === "learning" || key === "simulator") {
      return { ...defaultUserData()[key], ...(value as object) } as UserDataMap[K];
    }
    return value as UserDataMap[K];
  }

  setData<K extends UserDataKey>(userId: string, key: K, value: UserDataMap[K]): void {
    if (!this.db.data[userId]) this.db.data[userId] = {};
    this.db.data[userId][key] = value;
    this.save();
  }

  getAllData(userId: string): UserDataMap {
    const defaults = defaultUserData();
    const out = {} as UserDataMap;
    for (const key of Object.keys(defaults) as UserDataKey[]) {
      (out as unknown as Record<string, unknown>)[key] = this.getData(userId, key);
    }
    return out;
  }

  // ---- notificações ----
  getNotifications(userId: string): AppNotification[] {
    return this.db.notifications[userId] ?? [];
  }

  setNotifications(userId: string, list: AppNotification[]): void {
    this.db.notifications[userId] = list.slice(0, 300);
    this.save();
  }

  // ---- motor de alertas ----
  engine(userId: string): EngineState {
    if (!this.db.engine[userId]) this.db.engine[userId] = { keys: {}, alertState: {} };
    return this.db.engine[userId];
  }
}
