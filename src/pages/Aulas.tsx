import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Check, Crown, Flame, Lock, Medal, Play, Search, Star, Trophy, Zap } from "lucide-react";
import clsx from "clsx";
import { COURSES } from "@shared/courses";
import { GLOSSARY } from "@shared/glossary";
import { BADGES, isApproved, isUnlocked, levelFor, LEVELS, moduleProgress, nextLesson, TOTAL_LESSONS } from "@shared/learning";
import { api } from "@/lib/api";
import { num } from "@/lib/format";
import { iconFor } from "@/lib/icons";
import { useUserData } from "@/store/session";
import { useAsync } from "@/hooks/useAsync";
import { Avatar, Badge, Card, PageHeader, ProgressBar, ProgressRing, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/form";

type Tab = "trilha" | "conquistas" | "ranking" | "glossario";

const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

function Trail() {
  const learning = useUserData("learning");
  const navigate = useNavigate();
  const next = nextLesson(learning);
  let globalIndex = 0;
  return (
    <div className="space-y-6">
      {COURSES.map((m) => {
        const Icon = iconFor(m.icon);
        const progress = moduleProgress(learning, m.id);
        const unlocked = isUnlocked(learning, m.lessons[0].id);
        return (
          <Card key={m.id} padded={false} className={clsx("overflow-hidden", !unlocked && "opacity-70")}>
            <div className="flex items-center gap-4 p-5" style={{ background: `linear-gradient(135deg, ${m.color}26, transparent 70%)` }}>
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: m.color, boxShadow: `0 10px 24px -10px ${m.color}` }}>
                <Icon size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[17px] font-semibold">{m.title}</h3>
                  <Badge tone={m.level === "Iniciante" ? "success" : m.level === "Intermediário" ? "primary" : "secondary"}>{m.level}</Badge>
                  {progress === 1 && <Badge tone="success" icon={Check}>Concluído</Badge>}
                </div>
                <p className="text-[13.5px] text-muted mt-0.5">{m.description}</p>
              </div>
              <ProgressRing value={progress} size={52} stroke={5} color={m.color}>
                <span className="text-[12px] font-bold">{Math.round(progress * 100)}%</span>
              </ProgressRing>
            </div>
            <div className="flex flex-col items-center py-6 gap-5">
              {m.lessons.map((l) => {
                const offset = OFFSETS[globalIndex++ % OFFSETS.length];
                const done = isApproved(learning, l.id);
                const open = isUnlocked(learning, l.id);
                const current = next?.lesson.id === l.id;
                const rec = learning.completed[l.id];
                return (
                  <div key={l.id} className="flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                    <motion.button
                      whileHover={open ? { scale: 1.06 } : undefined}
                      whileTap={open ? { scale: 0.94 } : undefined}
                      disabled={!open}
                      onClick={() => navigate(`/aula/${l.id}`)}
                      className={clsx("relative h-[68px] w-[68px] rounded-full flex items-center justify-center transition", !open && "cursor-not-allowed")}
                      style={{
                        background: done ? `linear-gradient(135deg, ${m.color}, #A78BFA)` : open ? m.color : "rgb(var(--line) / 0.14)",
                        boxShadow: open ? `0 6px 0 0 ${done ? "#6D5BD0" : `${m.color}99`}, 0 16px 30px -12px ${m.color}` : "0 6px 0 0 rgb(var(--line) / 0.12)",
                      }}
                      aria-label={l.title}
                    >
                      {current && <span className="absolute inset-[-8px] rounded-full border-[3px] animate-pulse" style={{ borderColor: `${m.color}88` }} />}
                      {done ? <Check size={30} strokeWidth={3} className="text-white" /> : open ? <Play size={26} fill="white" className="text-white ml-1" /> : <Lock size={24} className="text-muted" />}
                      {done && rec && rec.score === rec.total && (
                        <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-warning flex items-center justify-center ring-4 ring-surface">
                          <Star size={12} fill="white" className="text-white" />
                        </span>
                      )}
                    </motion.button>
                    <div className="mt-3 text-center max-w-[200px]">
                      <div className={clsx("text-[13.5px] font-semibold", !open && "text-muted")}>{l.title}</div>
                      <div className="text-[12px] text-muted">
                        {l.minutes} min · {l.quiz.length} questões{rec ? ` · ${rec.score}/${rec.total}` : ""}
                      </div>
                      {current && (
                        <Button size="sm" className="mt-2" onClick={() => navigate(`/aula/${l.id}`)}>
                          {rec ? "Tentar de novo" : "Começar"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Achievements() {
  const learning = useUserData("learning");
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {BADGES.map((b) => {
        const earned = learning.badges.includes(b.id);
        const Icon = iconFor(b.icon);
        return (
          <Card key={b.id} className={clsx(!earned && "opacity-60")}>
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0"
                style={earned ? { background: "linear-gradient(135deg, #FBBF24, #F97316)", boxShadow: "0 10px 24px -10px #F97316" } : { background: "rgb(var(--line) / 0.12)" }}
              >
                {earned ? <Icon size={26} className="text-white" /> : <Lock size={22} className="text-muted" />}
              </div>
              <div>
                <div className="font-semibold">{b.name}</div>
                <div className="text-[13px] text-muted">{b.description}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Ranking() {
  const { data, loading } = useAsync("leaderboard", () => api.leaderboard(), { staleMs: 10_000 });
  return (
    <Card padded={false}>
      <div className="px-5 pt-5 pb-2">
        <div className="font-semibold">Ranking de XP</div>
        <div className="text-[13px] text-muted">Quem mais aprendeu entre os usuários deste aplicativo.</div>
      </div>
      {loading && !data ? (
        <div className="p-5 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <div className="pb-2">
          {data?.map((e, i) => (
            <div key={e.userId} className={clsx("flex items-center gap-3 px-5 py-3", e.isMe && "bg-primary/[0.08]")}>
              <div className={clsx("w-8 text-center font-bold tabular", i === 0 ? "text-warning" : i === 1 ? "text-muted" : i === 2 ? "text-[#CD7F32]" : "text-muted/70")}>
                {i < 3 ? <Crown size={18} className="mx-auto" /> : i + 1}
              </div>
              <Avatar name={e.name} hue={e.avatarHue} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {e.name} {e.isMe && <span className="text-primary text-[12px]">(você)</span>}
                </div>
                <div className="text-[12.5px] text-muted">
                  {levelFor(e.xp).current.name} · {e.completed}/{TOTAL_LESSONS} aulas
                </div>
              </div>
              <div className="font-bold tabular">{num(e.xp, 0)} XP</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Glossary() {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return GLOSSARY.filter((g) => !t || g.term.toLowerCase().includes(t) || g.definition.toLowerCase().includes(t));
  }, [q]);
  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field pl-10" placeholder="Buscar termo…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((g) => (
          <Card key={g.term}>
            <div className="font-semibold text-primary">{g.term}</div>
            <p className="text-[14px] mt-1">{g.definition}</p>
            {g.example && <p className="text-[13px] text-muted mt-2">Exemplo: {g.example}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Aulas() {
  const learning = useUserData("learning");
  const [tab, setTab] = useState<Tab>("trilha");
  const navigate = useNavigate();
  const lvl = levelFor(learning.xp);
  const done = Object.values(learning.completed).filter((c) => c.approved).length;
  const next = nextLesson(learning);

  return (
    <div>
      <PageHeader
        title="Aulas"
        subtitle="Uma trilha do zero ao avançado. Passe nas aulas, ganhe XP, suba de nível e desbloqueie conquistas."
        actions={
          next && (
            <Button icon={Play} onClick={() => navigate(`/aula/${next.lesson.id}`)}>
              {done ? "Continuar trilha" : "Começar agora"}
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Card className="sm:col-span-2">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-brand flex items-center justify-center shadow-glow">
              <Trophy size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-muted">Nível {lvl.index + 1} de {LEVELS.length}</div>
              <div className="text-[20px] font-bold">{lvl.current.name}</div>
              <ProgressBar value={lvl.progress} className="mt-2" />
              <div className="text-[12px] text-muted mt-1">{lvl.next ? `${num(learning.xp, 0)} / ${num(lvl.next.xp, 0)} XP para ${lvl.next.name}` : "Nível máximo alcançado!"}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-warning/15 text-warning flex items-center justify-center">
              <Flame size={22} />
            </div>
            <div>
              <div className="text-[22px] font-bold tabular">{learning.streak.count}</div>
              <div className="text-[13px] text-muted">dias seguidos</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-success/15 text-success flex items-center justify-center">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="text-[22px] font-bold tabular">
                {done}/{TOTAL_LESSONS}
              </div>
              <div className="text-[13px] text-muted">aulas aprovadas</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "trilha", label: "Trilha", icon: Zap },
            { value: "conquistas", label: "Conquistas", icon: Medal },
            { value: "ranking", label: "Ranking", icon: Crown },
            { value: "glossario", label: "Glossário", icon: BookOpen },
          ]}
        />
        <div className="text-[13px] text-muted">
          {learning.badges.length}/{BADGES.length} conquistas
        </div>
      </div>

      {tab === "trilha" && <Trail />}
      {tab === "conquistas" && <Achievements />}
      {tab === "ranking" && <Ranking />}
      {tab === "glossario" && <Glossary />}
    </div>
  );
}
