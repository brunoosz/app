import { create } from "zustand";
import type { AppNotification, PublicUser, UserDataKey, UserDataMap } from "@shared/types";
import { defaultUserData } from "@shared/defaults";
import { api } from "@/lib/api";
import { toastError, useUi } from "./ui";

type Updater<K extends UserDataKey> = UserDataMap[K] | ((prev: UserDataMap[K]) => UserDataMap[K]);

interface SessionState {
  ready: boolean;
  user: PublicUser | null;
  data: UserDataMap;
  loaded: boolean;
  notifications: AppNotification[];
  boot: () => Promise<void>;
  signIn: (user: PublicUser) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: PublicUser) => void;
  update: <K extends UserDataKey>(key: K, updater: Updater<K>) => void;
  refreshNotifications: () => Promise<void>;
  setNotifications: (list: AppNotification[]) => void;
}

const pending = new Map<UserDataKey, ReturnType<typeof setTimeout>>();

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  user: null,
  data: defaultUserData(),
  loaded: false,
  notifications: [],

  boot: async () => {
    try {
      const user = await api.session();
      if (user) await get().signIn(user);
    } catch {
      // sem sessão salva
    } finally {
      set({ ready: true });
    }
  },

  signIn: async (user) => {
    set({ user, loaded: false });
    const [data, notifications] = await Promise.all([api.data.getAll(), api.notifications.list().catch(() => [])]);
    set({ data, notifications, loaded: true });
    useUi.getState().applyTheme(data.settings.theme);
  },

  signOut: async () => {
    await api.logout().catch(() => undefined);
    for (const t of pending.values()) clearTimeout(t);
    pending.clear();
    set({ user: null, data: defaultUserData(), loaded: false, notifications: [] });
  },

  setUser: (user) => set({ user }),

  update: (key, updater) => {
    const prev = get().data[key];
    const next = typeof updater === "function" ? (updater as (p: typeof prev) => typeof prev)(prev) : updater;
    set((s) => ({ data: { ...s.data, [key]: next } }));
    const t = pending.get(key);
    if (t) clearTimeout(t);
    pending.set(
      key,
      setTimeout(() => {
        pending.delete(key);
        api.data.set(key, get().data[key]).catch((err) => toastError(err, "Não foi possível salvar"));
      }, 250)
    );
  },

  refreshNotifications: async () => {
    const list = await api.notifications.list().catch(() => null);
    if (list) set({ notifications: list });
  },

  setNotifications: (list) => set({ notifications: list }),
}));

export function useUserData<K extends UserDataKey>(key: K): UserDataMap[K] {
  return useSession((s) => s.data[key]);
}

export function isManager(user: PublicUser | null): boolean {
  return user?.role === "dono" || user?.role === "adm";
}

export function isOwner(user: PublicUser | null): boolean {
  return user?.role === "dono";
}

/**
 * Aplica dados que vieram de outro aparelho sem desfazer o que a pessoa acabou
 * de mudar aqui: as partes com gravação pendente ficam com o valor local.
 */
export function applyRemoteData(user: PublicUser, data: UserDataMap): void {
  const s = useSession.getState();
  if (!s.user || s.user.id !== user.id) return;
  const merged = { ...data } as UserDataMap;
  for (const key of pending.keys()) (merged as unknown as Record<string, unknown>)[key] = s.data[key];
  useSession.setState({ user: { ...s.user, ...user }, data: merged });
}
