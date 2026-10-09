import fs from "node:fs";
import path from "node:path";
import type { AlertRuntimeState, AppNotification, PublicUser, Role, UserDataKey, UserDataMap, UserStatus } from "@shared/types";
import { defaultUserData } from "@shared/defaults";

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
  model?: string;
  baseUrl?: string;
  apiKeyEnc?: string;
  keyMode?: "safe" | "plain";
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
  private readonly file: string;
  private timer: NodeJS.Timeout | null = null;

  constructor(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "investa-data.json");
    this.db = this.load();
  }

  private load(): DBShape {
    if (!fs.existsSync(this.file)) return emptyDb();
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf8")) as Partial<DBShape>;
      const db = { ...emptyDb(), ...parsed, app: { ...(parsed.app ?? {}) } } as DBShape;
      fs.copyFileSync(this.file, this.file.replace(/\.json$/, ".bak.json"));
      return db;
    } catch {
      const backup = this.file.replace(/\.json$/, ".bak.json");
      fs.renameSync(this.file, this.file.replace(/\.json$/, `.corrompido-${Date.now()}.json`));
      if (fs.existsSync(backup)) {
        try {
          return { ...emptyDb(), ...JSON.parse(fs.readFileSync(backup, "utf8")) } as DBShape;
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
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db), "utf8");
    fs.renameSync(tmp, this.file);
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
