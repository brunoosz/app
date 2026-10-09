import { Bell, Info, Landmark, Lightbulb, Newspaper, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { AppNotification } from "@shared/types";
import { IconTile } from "@/components/ui/primitives";

export function NotificationIcon({ n, size = 36 }: { n: AppNotification; size?: number }) {
  if (n.type === "dica") return <IconTile icon={Lightbulb} color="#FBBF24" size={size} />;
  if (n.type === "noticia") return <IconTile icon={Newspaper} color="#22D3EE" size={size} />;
  if (n.type === "sistema") return <IconTile icon={Info} color="#A78BFA" size={size} />;
  if (n.type === "mercado") return <IconTile icon={Landmark} color="#4F8CFF" size={size} />;
  if (n.tone === "positive") return <IconTile icon={TrendingUp} color="#34D399" size={size} />;
  if (n.tone === "negative") return <IconTile icon={TrendingDown} color="#F87171" size={size} />;
  if (n.type === "carteira") return <IconTile icon={Wallet} color="#4F8CFF" size={size} />;
  return <IconTile icon={Bell} color="#4F8CFF" size={size} />;
}
