import { useId } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { LOGO_BARS, LOGO_SKEW } from "@shared/brand";

export function LogoMark({ size = 32, animated = false, className }: { size?: number; animated?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`lg-${id}`} x1="6" y1="60" x2="58" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5AB0FF" />
          <stop offset="0.45" stopColor="#4F8CFF" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <g transform={`skewY(${LOGO_SKEW})`} fill={`url(#lg-${id})`}>
        {LOGO_BARS.map((b, i) =>
          animated ? (
            <motion.rect
              key={i}
              x={b.x}
              width={b.w}
              rx={3.6}
              initial={{ y: b.y + b.h, height: 0 }}
              animate={{ y: b.y, height: b.h }}
              transition={{ delay: 0.12 * i, type: "spring", stiffness: 160, damping: 16 }}
            />
          ) : (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={3.6} />
          )
        )}
      </g>
    </svg>
  );
}

export function Logo({ size = 32, showTagline = false, className, textClassName }: { size?: number; showTagline?: boolean; className?: string; textClassName?: string }) {
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <div className="leading-none">
        <div className={clsx("font-bold tracking-tight", textClassName)} style={{ fontSize: size * 0.72 }}>
          Investa
        </div>
        {showTagline && <div className="text-[9px] tracking-[0.28em] text-muted mt-1.5 font-medium">APRENDA · INVISTA · EVOLUA</div>}
      </div>
    </div>
  );
}

export function AppIcon({ size = 64 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center shadow-2xl"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.23,
        background: "radial-gradient(circle at 50% 42%, rgba(79,140,255,0.28), transparent 62%), linear-gradient(135deg, #232B45, #0B0F1A)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 50px -12px rgba(79,140,255,0.45)",
      }}
    >
      <LogoMark size={size * 0.64} />
    </div>
  );
}
