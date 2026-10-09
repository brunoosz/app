import {
  Bell,
  ChartCandlestick,
  Gamepad2,
  GraduationCap,
  House,
  Landmark,
  Receipt,
  Settings,
  Sparkles,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  managerOnly?: boolean;
}

export const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: "/", label: "Início", icon: House },
      { to: "/carteira", label: "Carteira", icon: Wallet },
      { to: "/mercado", label: "Mercado", icon: ChartCandlestick },
      { to: "/aulas", label: "Aulas", icon: GraduationCap },
      { to: "/assistente", label: "Professor IA", icon: Sparkles },
    ],
  },
  {
    title: "Planejamento",
    items: [
      { to: "/objetivos", label: "Objetivos", icon: Target },
      { to: "/gastos", label: "Gastos", icon: Receipt },
      { to: "/bancos", label: "Bancos", icon: Landmark },
      { to: "/simulador", label: "Simulador", icon: Gamepad2 },
      { to: "/alertas", label: "Alertas", icon: Bell },
    ],
  },
  {
    title: "Administração",
    items: [{ to: "/usuarios", label: "Usuários", icon: Users, managerOnly: true }],
  },
];

export const SETTINGS_ITEM: NavItem = { to: "/configuracoes", label: "Configurações", icon: Settings };

export const ALL_NAV: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

export function isActive(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}
