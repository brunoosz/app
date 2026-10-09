import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Bell, ChartLine, GraduationCap, Target } from "lucide-react";
import clsx from "clsx";
import { platform } from "@/lib/api";
import { AppIcon } from "@/components/Logo";
import { Toaster } from "@/components/ui/Toaster";

const FEATURES = [
  { icon: GraduationCap, title: "Educação", text: "Aprenda do zero ao avançado, com aulas e pontos." },
  { icon: ChartLine, title: "Mercado", text: "Acompanhe cotações e indicadores reais." },
  { icon: Target, title: "Planejamento", text: "Defina metas e simule cenários." },
  { icon: Bell, title: "Alertas", text: "Seja avisado sobre o que realmente importa." },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full flex overflow-hidden">
      <div className="hidden lg:flex relative w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-[#0B0F1A] text-[#F8FAFC] p-12">
        <div className="drag absolute inset-x-0 top-0 h-12" />
        <div className="absolute -top-40 -left-20 h-[520px] w-[520px] rounded-full bg-[#4F8CFF]/25 blur-[120px]" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[520px] w-[520px] rounded-full bg-[#A78BFA]/20 blur-[120px]" />
        <svg className="absolute bottom-0 inset-x-0 w-full opacity-60" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4F8CFF" stopOpacity="0.25" />
              <stop offset="1" stopColor="#0B0F1A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 220 L0 150 L80 110 L140 140 L230 60 L300 120 L360 90 L430 140 L520 70 L600 120 L600 220 Z" fill="url(#mtn)" />
          <path d="M0 220 L0 180 L120 150 L200 175 L310 120 L400 165 L480 135 L600 170 L600 220 Z" fill="#0B0F1A" opacity="0.8" />
        </svg>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative flex items-center gap-4 mt-6">
          <AppIcon size={64} />
          <div>
            <div className="text-[38px] font-bold tracking-tight leading-none">Investa</div>
            <div className="text-[11px] tracking-[0.32em] text-[#94A3B8] mt-2 font-semibold">APRENDA · INVISTA · EVOLUA</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
          <div className="text-[12px] tracking-[0.2em] text-[#94A3B8] font-semibold mb-4 border-l-2 border-[#4F8CFF] pl-3">NOSSO PROPÓSITO</div>
          <h2 className="text-[34px] leading-[1.15] font-semibold tracking-tight">
            Tornar o mundo dos investimentos
            <br />
            <span className="bg-gradient-to-r from-[#4F8CFF] to-[#A78BFA] bg-clip-text text-transparent">mais acessível para todos.</span>
          </h2>
          <p className="text-[#94A3B8] mt-4 max-w-md text-[15px] leading-relaxed">
            Conhecimento é o primeiro passo para a liberdade financeira. O Investa existe para ensinar, orientar e acompanhar você em cada decisão.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 backdrop-blur"
            >
              <div className="h-9 w-9 rounded-xl bg-[#4F8CFF]/15 text-[#7FAEFF] flex items-center justify-center mb-3">
                <f.icon size={18} />
              </div>
              <div className="font-semibold text-[14px]">{f.title}</div>
              <div className="text-[12.5px] text-[#94A3B8] mt-0.5">{f.text}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative flex flex-col overflow-y-auto">
        <div className={clsx("drag h-12 shrink-0", (platform === "win32" || platform === "linux") && "mr-[150px]")} />
        <div className="pointer-events-none absolute -top-32 right-0 h-[380px] w-[520px] rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-[420px] relative">{children}</div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
