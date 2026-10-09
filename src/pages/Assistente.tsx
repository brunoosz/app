import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Brain, Globe, Mic, ChartLine, Check, CircleHelp, Copy, Trash2, X, GraduationCap, KeyRound, MessageCircle, RotateCcw, ShoppingCart, Sparkles, Square, SquarePen, Wallet, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { AiEvent, AiMode, ChatMessage } from "@shared/types";
import { AI_MODES, ASSISTANT_NAME, modeInfo, splitMemory } from "@shared/ai";
import { api, uid } from "@/lib/api";
import { timeBR } from "@/lib/format";
import { isOwner, useSession, useUserData } from "@/store/session";
import { useAssistant } from "@/store/assistant";
import { useUi } from "@/store/ui";
import { useAsync } from "@/hooks/useAsync";
import { Avatar, Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/Logo";

const MODE_ICONS: Record<string, LucideIcon> = {
  message: MessageCircle,
  graduation: GraduationCap,
  wallet: Wallet,
  chart: ChartLine,
  cart: ShoppingCart,
  help: CircleHelp,
};

const MODE_KEY = "investa-assistente-modo";

function savedMode(): AiMode {
  try {
    const m = localStorage.getItem(MODE_KEY) as AiMode | null;
    if (m && AI_MODES.some((x) => x.id === m)) return m;
  } catch {
    // armazenamento indisponível
  }
  return "mercado";
}

/** Mensagens antigas, sem modo, eram do analista de mercado. */
const modeOf = (m: ChatMessage): AiMode => m.mode ?? "mercado";

const ACTION = "h-7 px-2 rounded-lg text-[12px] text-muted hover:text-fg hover:bg-line/10 inline-flex items-center gap-1";

function Message({ m, streaming, status, onRetry, onDelete }: { m: ChatMessage; streaming?: boolean; status?: string; onRetry?: () => void; onDelete?: () => void }) {
  const user = useSession((s) => s.user)!;
  const update = useSession((s) => s.update);
  const toast = useUi((s) => s.toast);
  if (m.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end gap-3 group">
        <div className="flex flex-col items-end max-w-[78%]">
          <div className="rounded-[22px] rounded-br-md bg-brand text-white px-4 py-2.5 text-[15px] whitespace-pre-wrap shadow-glow">{m.content}</div>
          {onDelete && (
            <button className={clsx(ACTION, "mt-1 opacity-0 group-hover:opacity-100 max-sm:opacity-60 transition")} onClick={onDelete} aria-label="Apagar mensagem">
              <Trash2 size={13} /> Apagar
            </button>
          )}
        </div>
        <Avatar name={user.name} hue={user.avatarHue} size={32} className="mt-0.5" />
      </motion.div>
    );
  }
  const { text, items } = splitMemory(m.content);
  const saveMemory = () => {
    const now = new Date().toISOString();
    update("memory", (list) => [...list, ...items.filter((t) => !list.some((x) => x.text.toLowerCase() === t.toLowerCase())).map((t) => ({ id: uid(), text: t, createdAt: now }))]);
    update("chat", (list) => list.map((x) => (x.id === m.id ? { ...x, memoryHandled: true } : x)));
    toast({ title: "Guardado na memória", message: "Dá para ver, editar ou apagar em Configurações.", tone: "success" });
  };
  const dismissMemory = () => update("chat", (list) => list.map((x) => (x.id === m.id ? { ...x, memoryHandled: true } : x)));
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group">
      <div className="h-8 w-8 rounded-full bg-surface border border-line/15 flex items-center justify-center shrink-0 mt-0.5">
        <LogoMark size={18} />
      </div>
      <div className="min-w-0 flex-1 max-w-[86%]">
        <div className={clsx("rounded-[22px] rounded-tl-md px-4 py-3", m.error ? "bg-danger/10 border border-danger/25 text-danger" : "surface")}>
          {m.content ? (
            <div className={clsx("prose-investa", streaming && "caret")}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (href) void api.openExternal(href);
                      }}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 py-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-2 w-2 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
              ))}
              <span className="text-[13px] text-muted ml-2">{status ?? "Pensando…"}</span>
            </div>
          )}
        </div>
        {!streaming && items.length > 0 && !m.memoryHandled && (
          <div className="mt-2 rounded-2xl border border-secondary/25 bg-secondary/[0.07] px-3.5 py-2.5 text-[13.5px]">
            <div className="flex items-center gap-1.5 font-medium">
              <Brain size={15} className="text-secondary" /> Guardar na memória?
            </div>
            <ul className="mt-1 text-muted list-disc pl-5">
              {items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="flex gap-2 mt-2">
              <Button size="sm" icon={Check} onClick={saveMemory}>
                Guardar
              </Button>
              <Button size="sm" variant="ghost" icon={X} onClick={dismissMemory}>
                Agora não
              </Button>
            </div>
          </div>
        )}
        {!streaming && m.content && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 max-sm:opacity-60 transition">
            <span className="text-[11.5px] text-muted mr-1">{timeBR(m.createdAt)}</span>
            <button
              className="h-7 px-2 rounded-lg text-[12px] text-muted hover:text-fg hover:bg-line/10 inline-flex items-center gap-1"
              onClick={() => {
                void navigator.clipboard.writeText(text);
                toast({ title: "Resposta copiada", tone: "success" });
              }}
            >
              <Copy size={13} /> Copiar
            </button>
            {onRetry && (
              <button className={ACTION} onClick={onRetry}>
                <RotateCcw size={13} /> Tentar de novo
              </button>
            )}
            {onDelete && (
              <button className={ACTION} onClick={onDelete} aria-label="Apagar resposta">
                <Trash2 size={13} /> Apagar
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Assistente() {
  const user = useSession((s) => s.user)!;
  const allChat = useUserData("chat");
  const update = useSession((s) => s.update);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const info = useAsync("ai-info", () => api.ai.info(), { staleMs: 5_000 });
  const [mode, setModeState] = useState<AiMode>(() => (params.get("modo") as AiMode) || savedMode());
  const [input, setInput] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | undefined>();
  const [listening, setListening] = useState(false);
  const toastVoice = useUi((s) => s.toast);
  // Ditado: no celular o Android devolve o texto; no Windows, a digitação por voz escreve direto na caixa.
  const dictate = async () => {
    inputRef.current?.focus();
    setListening(true);
    try {
      const r = await api.voice();
      if (r.mode === "text") {
        if (r.text) setInput((v) => (v ? `${v.trimEnd()} ${r.text}` : r.text!));
      } else {
        toastVoice({ title: "Pode falar", message: "A digitação por voz do Windows vai escrever na caixa de mensagem. Clique de novo no microfone dela para parar.", tone: "info" });
      }
    } catch (err) {
      toastVoice({ title: "Ditado por voz indisponível", message: (err as Error).message, tone: "error" });
    } finally {
      setListening(false);
      inputRef.current?.focus();
    }
  };
  const [web, setWebState] = useState(() => {
    try {
      return localStorage.getItem("investa-assistente-web") === "1";
    } catch {
      return false;
    }
  });
  const setWeb = (v: boolean) => {
    setWebState(v);
    try {
      localStorage.setItem("investa-assistente-web", v ? "1" : "0");
    } catch {
      // armazenamento indisponível
    }
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<{ requestId: string; messageId: string } | null>(null);
  const bufferRef = useRef("");
  const owner = isOwner(user);
  const current = modeInfo(mode);
  const chat = allChat.filter((m) => modeOf(m) === mode);

  const setMode = (m: AiMode) => {
    if (streamingId) return;
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // armazenamento indisponível
    }
    inputRef.current?.focus();
  };

  const scrollDown = useCallback((smooth = true) => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" }));
  }, []);

  useEffect(() => scrollDown(false), [scrollDown, mode]);

  useEffect(() => {
    return api.on<AiEvent>("ai:event", (ev) => {
      const req = requestRef.current;
      if (!req || ev.requestId !== req.requestId) return;
      if (ev.type === "context") {
        if (ev.data?.endsWith("…")) setStatus(ev.data);
        return;
      }
      if (ev.type === "chunk" && ev.data) {
        bufferRef.current += ev.data;
        const content = bufferRef.current;
        update("chat", (list) => list.map((m) => (m.id === req.messageId ? { ...m, content } : m)));
        scrollDown();
        return;
      }
      if (ev.type === "error") {
        update("chat", (list) => list.map((m) => (m.id === req.messageId ? { ...m, content: ev.data ?? "O Assistente não respondeu. Tente de novo.", error: true } : m)));
      }
      if (ev.type === "done" || ev.type === "error") {
        requestRef.current = null;
        setStreamingId(null);
        update("chat", (list) => list.map((m) => (m.id === req.messageId && !m.content ? { ...m, content: "Não recebi resposta. Tente novamente.", error: true } : m)).slice(-160));
      }
    });
  }, [update, scrollDown]);

  const send = useCallback(
    async (text: string, opts: { mode?: AiMode; history?: ChatMessage[]; attachment?: string } = {}) => {
      const content = text.trim();
      const m = opts.mode ?? mode;
      if (!content || streamingId) return;
      const all = useSession.getState().data.chat;
      const base = opts.history ?? all.filter((x) => modeOf(x) === m);
      const userMsg: ChatMessage = { id: uid(), role: "user", content, createdAt: new Date().toISOString(), mode: m };
      const aiMsg: ChatMessage = { id: uid(), role: "assistant", content: "", createdAt: new Date().toISOString(), mode: m };
      const keep = opts.history ? all.filter((x) => modeOf(x) !== m || opts.history!.includes(x)) : all;
      update("chat", [...keep, userMsg, aiMsg]);
      setInput("");
      setStreamingId(aiMsg.id);
      bufferRef.current = "";
      const requestId = uid();
      requestRef.current = { requestId, messageId: aiMsg.id };
      scrollDown();
      const messages = [...base.filter((x) => !x.error), userMsg]
        .map((x) => ({ role: x.role, content: x.role === "assistant" ? splitMemory(x.content).text : x.content }))
        .slice(-12);
      try {
        setStatus(undefined);
        await api.ai.chat(requestId, messages, m, opts.attachment, web && !!info.data?.hasSearch);
      } catch (err) {
        requestRef.current = null;
        setStreamingId(null);
        update("chat", (list) => list.map((x) => (x.id === aiMsg.id ? { ...x, content: (err as Error).message, error: true } : x)));
        void info.reload();
      }
    },
    [streamingId, update, scrollDown, info, mode, web]
  );

  // Pergunta vinda de outra tela (?q= ou rascunho com dados anexados).
  useEffect(() => {
    if (!info.data) return;
    const draft = useAssistant.getState().take();
    const q = params.get("q");
    const m = (params.get("modo") as AiMode) || draft?.mode;
    if (params.has("q") || params.has("modo")) setParams({}, { replace: true });
    if (m) setModeState(m);
    const question = draft?.question ?? q;
    if (!question) return;
    if (info.data.hasKey) void send(question, { mode: m ?? mode, attachment: draft?.attachment });
    else setInput(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.data]);

  // Parar antes da resposta começar apaga a pergunta e a bolha "Pensando…" e devolve o texto para a caixa.
  const stop = () => {
    const req = requestRef.current;
    if (req) void api.ai.cancel(req.requestId);
    requestRef.current = null;
    setStreamingId(null);
    if (!req) return;
    const list = useSession.getState().data.chat;
    const reply = list.find((m) => m.id === req.messageId);
    if (reply && !reply.content.trim()) {
      const idx = list.findIndex((m) => m.id === req.messageId);
      const question = idx > 0 && list[idx - 1].role === "user" ? list[idx - 1] : null;
      update("chat", (l) => l.filter((m) => m.id !== req.messageId && m.id !== question?.id));
      if (question) setInput(question.content);
    }
  };

  const retryLast = () => {
    const lastUserIndex = chat.map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    void send(chat[lastUserIndex].content, { history: chat.slice(0, lastUserIndex) });
  };

  const hasKey = info.data?.hasKey;

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)] max-sm:h-[calc(100dvh-140px)] -mb-16 -mt-1">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-brand flex items-center justify-center shadow-glow">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight leading-tight">{ASSISTANT_NAME}</h1>
            <div className="text-[12.5px] text-muted flex items-center gap-2">
              {owner && hasKey ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-success" /> {info.data?.choice === "auto" ? "Automático" : "Modelo fixo"} · {info.data?.modelLabel}
                </>
              ) : owner && !info.loading && !hasKey ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-warning" /> IA não configurada
                </>
              ) : (
                current.description
              )}
            </div>
          </div>
        </div>
        {chat.length > 0 && (
          <Button variant="secondary" icon={SquarePen} onClick={() => update("chat", (list) => list.filter((m) => modeOf(m) !== mode))} disabled={!!streamingId}>
            Nova conversa
          </Button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1">
        {AI_MODES.map((m) => {
          const Icon = MODE_ICONS[m.icon] ?? MessageCircle;
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              disabled={!!streamingId && !active}
              title={m.description}
              className={clsx(
                "shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13.5px] font-medium border transition disabled:opacity-50",
                active ? "bg-primary text-white border-transparent shadow-glow" : "border-line/12 bg-surface/60 text-muted hover:text-fg hover:border-primary/30"
              )}
            >
              <Icon size={15} /> {m.label}
            </button>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-2 px-2">
        {!hasKey && !info.loading && (
          <Card className="mb-4 border-warning/30">
            <div className="flex gap-4 items-start">
              <div className="h-11 w-11 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                <KeyRound size={22} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{owner ? "Conecte a inteligência artificial" : "O Assistente ainda não foi ativado"}</div>
                <p className="text-[14px] text-muted mt-1">
                  {owner
                    ? "O Assistente usa modelos da NVIDIA. Cole sua chave da API (começa com nvapi-) nas configurações."
                    : "Peça ao Dono do aplicativo para ativar o Assistente."}
                </p>
                {owner && (
                  <Button className="mt-3" icon={KeyRound} onClick={() => navigate("/configuracoes?secao=ia")}>
                    Configurar agora
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {chat.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-4 pb-10">
            <motion.div key={mode} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }} className="h-20 w-20 rounded-[26px] bg-surface border border-line/15 flex items-center justify-center shadow-2xl">
              <LogoMark size={44} animated />
            </motion.div>
            <h2 className="text-[24px] font-bold tracking-tight mt-5">
              {current.label}
            </h2>
            <p className="text-muted mt-2 max-w-lg">{current.description}</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-2xl">
              {current.suggestions.map((s) => (
                <button
                  key={s}
                  disabled={!hasKey}
                  onClick={() => void send(s)}
                  className="text-left rounded-2xl border border-line/10 bg-surface/60 hover:bg-line/[0.06] hover:border-primary/30 px-4 py-3 text-[14px] font-medium transition disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-6 max-w-3xl mx-auto">
            {chat.map((m, i) => (
              <Message
                key={m.id}
                m={m}
                streaming={m.id === streamingId}
                status={m.id === streamingId ? status : undefined}
                onRetry={m.role === "assistant" && i === chat.length - 1 && !streamingId ? retryLast : undefined}
                onDelete={streamingId ? undefined : () => update("chat", (list) => list.filter((x) => x.id !== m.id))}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 pb-5">
        <div className="max-w-3xl mx-auto">
          <div className="surface flex items-end gap-2 p-2 pl-4 focus-within:border-primary/40 focus-within:shadow-ring transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              disabled={!hasKey}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(180, e.target.scrollHeight)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder={hasKey ? `Mensagem para o ${ASSISTANT_NAME} (${current.short})` : "O Assistente ainda não foi ativado"}
              className="flex-1 resize-none bg-transparent outline-none text-[15px] py-2 max-h-[180px] placeholder:text-muted/70"
            />
            {hasKey && (
              <button
                type="button"
                onClick={() => void dictate()}
                disabled={listening}
                title="Falar em vez de digitar"
                aria-label="Gravar voz"
                className={clsx("h-10 w-10 rounded-xl inline-flex items-center justify-center transition shrink-0", listening ? "bg-danger/15 text-danger animate-pulse" : "text-muted hover:text-fg hover:bg-line/10")}
              >
                <Mic size={18} />
              </button>
            )}
            {info.data?.hasSearch && (
              <button
                type="button"
                onClick={() => setWeb(!web)}
                title={web ? "Pesquisa na internet ligada" : "Pesquisar na internet antes de responder"}
                aria-pressed={web}
                className={clsx("h-10 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-[12.5px] font-medium transition shrink-0", web ? "bg-primary/15 text-primary" : "text-muted hover:text-fg hover:bg-line/10")}
              >
                <Globe size={17} />
                <span className="hidden sm:inline">Internet</span>
              </button>
            )}
            <AnimatePresence mode="wait" initial={false}>
              {streamingId ? (
                <motion.div key="stop" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                  <Button size="icon" variant="secondary" onClick={stop} aria-label="Parar">
                    <Square size={14} fill="currentColor" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="send" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                  <Button size="icon" disabled={!input.trim() || !hasKey} onClick={() => void send(input)} aria-label="Enviar">
                    <ArrowUp size={18} strokeWidth={2.6} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {mode !== "geral" && mode !== "app" && (
            <div className="text-[11.5px] text-muted text-center mt-2">
              <Badge className="mr-1">Educacional</Badge> As respostas usam dados reais do momento, mas não são recomendação individual. Confira antes de decidir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
