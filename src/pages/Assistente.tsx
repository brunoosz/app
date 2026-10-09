import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Copy, KeyRound, RotateCcw, Sparkles, Square, SquarePen } from "lucide-react";
import clsx from "clsx";
import type { AiEvent, ChatMessage } from "@shared/types";
import { api, uid } from "@/lib/api";
import { timeBR } from "@/lib/format";
import { isManager, useSession, useUserData } from "@/store/session";
import { useUi } from "@/store/ui";
import { useAsync } from "@/hooks/useAsync";
import { Avatar, Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/Logo";

const SUGGESTIONS = [
  "Por onde eu começo a investir?",
  "Quais são as melhores ações hoje?",
  "Monte um plano de investimentos para mim",
  "Quanto rende R$ 1.000 em um CDB hoje?",
  "Como está a Selic e o que o último Copom decidiu?",
  "Analise minha carteira",
  "Como estão meus gastos este mês?",
  "Vale a pena investir em fundos imobiliários agora?",
];

function Message({ m, streaming, onRetry }: { m: ChatMessage; streaming?: boolean; onRetry?: () => void }) {
  const user = useSession((s) => s.user)!;
  const toast = useUi((s) => s.toast);
  if (m.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end gap-3">
        <div className="max-w-[78%] rounded-[22px] rounded-br-md bg-brand text-white px-4 py-2.5 text-[15px] whitespace-pre-wrap shadow-glow">{m.content}</div>
        <Avatar name={user.name} hue={user.avatarHue} size={32} className="mt-0.5" />
      </motion.div>
    );
  }
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
                {m.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 py-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-2 w-2 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
              ))}
              <span className="text-[13px] text-muted ml-2">Analisando dados em tempo real…</span>
            </div>
          )}
        </div>
        {!streaming && m.content && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
            <span className="text-[11.5px] text-muted mr-1">{timeBR(m.createdAt)}</span>
            <button
              className="h-7 px-2 rounded-lg text-[12px] text-muted hover:text-fg hover:bg-line/10 inline-flex items-center gap-1"
              onClick={() => {
                void navigator.clipboard.writeText(m.content);
                toast({ title: "Resposta copiada", tone: "success" });
              }}
            >
              <Copy size={13} /> Copiar
            </button>
            {onRetry && (
              <button className="h-7 px-2 rounded-lg text-[12px] text-muted hover:text-fg hover:bg-line/10 inline-flex items-center gap-1" onClick={onRetry}>
                <RotateCcw size={13} /> Tentar de novo
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
  const chat = useUserData("chat");
  const update = useSession((s) => s.update);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const info = useAsync("ai-info", () => api.ai.info(), { staleMs: 5_000 });
  const [input, setInput] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [contextAt, setContextAt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<{ requestId: string; messageId: string } | null>(null);
  const bufferRef = useRef("");

  const scrollDown = useCallback((smooth = true) => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" }));
  }, []);

  useEffect(() => scrollDown(false), [scrollDown]);

  useEffect(() => {
    return api.on<AiEvent>("ai:event", (ev) => {
      const req = requestRef.current;
      if (!req || ev.requestId !== req.requestId) return;
      if (ev.type === "context") {
        setContextAt(ev.data ?? null);
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
        update("chat", (list) => list.map((m) => (m.id === req.messageId ? { ...m, content: ev.data ?? "Erro ao falar com a IA.", error: true } : m)));
      }
      if (ev.type === "done" || ev.type === "error") {
        requestRef.current = null;
        setStreamingId(null);
        update("chat", (list) => list.map((m) => (m.id === req.messageId && !m.content ? { ...m, content: "Não recebi resposta. Tente novamente.", error: true } : m)).slice(-80));
      }
    });
  }, [update, scrollDown]);

  const send = useCallback(
    async (text: string, history?: ChatMessage[]) => {
      const content = text.trim();
      if (!content || streamingId) return;
      const base = history ?? useSession.getState().data.chat;
      const userMsg: ChatMessage = { id: uid(), role: "user", content, createdAt: new Date().toISOString() };
      const aiMsg: ChatMessage = { id: uid(), role: "assistant", content: "", createdAt: new Date().toISOString() };
      const next = [...base, userMsg, aiMsg];
      update("chat", next);
      setInput("");
      setStreamingId(aiMsg.id);
      bufferRef.current = "";
      const requestId = uid();
      requestRef.current = { requestId, messageId: aiMsg.id };
      scrollDown();
      const messages = [...base.filter((m) => !m.error), userMsg].map((m) => ({ role: m.role, content: m.content })).slice(-12);
      try {
        await api.ai.chat(requestId, messages);
      } catch (err) {
        requestRef.current = null;
        setStreamingId(null);
        update("chat", (list) => list.map((m) => (m.id === aiMsg.id ? { ...m, content: (err as Error).message, error: true } : m)));
        void info.reload();
      }
    },
    [streamingId, update, scrollDown, info]
  );

  useEffect(() => {
    const q = params.get("q");
    if (q && info.data?.hasKey) {
      setParams({}, { replace: true });
      void send(q);
    } else if (q && info.data && !info.data.hasKey) {
      setInput(q);
      setParams({}, { replace: true });
    }
  }, [params, info.data, send, setParams]);

  const stop = () => {
    const req = requestRef.current;
    if (req) void api.ai.cancel(req.requestId);
    requestRef.current = null;
    setStreamingId(null);
  };

  const retryLast = () => {
    const lastUserIndex = [...chat].map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    const text = chat[lastUserIndex].content;
    void send(text, chat.slice(0, lastUserIndex));
  };

  const hasKey = info.data?.hasKey;
  const model = info.data?.model?.split("/").pop();

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] -mb-16 -mt-1">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-brand flex items-center justify-center shadow-glow">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight leading-tight">Professor IA</h1>
            <div className="text-[12.5px] text-muted flex items-center gap-2">
              {hasKey ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-success" /> Conectado · {model}
                  {contextAt && <span>· dados de {timeBR(contextAt)}</span>}
                </>
              ) : info.loading ? (
                "Verificando…"
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-warning" /> IA não configurada
                </>
              )}
            </div>
          </div>
        </div>
        {chat.length > 0 && (
          <Button variant="secondary" icon={SquarePen} onClick={() => update("chat", [])} disabled={!!streamingId}>
            Nova conversa
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-2 px-2">
        {!hasKey && !info.loading && (
          <Card className="mb-4 border-warning/30">
            <div className="flex gap-4 items-start">
              <div className="h-11 w-11 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                <KeyRound size={22} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Conecte a inteligência artificial</div>
                <p className="text-[14px] text-muted mt-1">
                  O Professor IA usa modelos da NVIDIA para responder com base nos seus dados e no mercado em tempo real.{" "}
                  {isManager(user) ? "Cole sua chave da API da NVIDIA (começa com nvapi-) nas configurações." : "Peça ao Dono do aplicativo para configurar a chave da API."}
                </p>
                {isManager(user) && (
                  <Button className="mt-3" icon={KeyRound} onClick={() => navigate("/configuracoes?secao=ia")}>
                    Configurar agora
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {chat.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-6 pb-10">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }} className="h-20 w-20 rounded-[26px] bg-surface border border-line/15 flex items-center justify-center shadow-2xl">
              <LogoMark size={44} animated />
            </motion.div>
            <h2 className="text-[26px] font-bold tracking-tight mt-5">Como posso ajudar, {user.name.split(" ")[0]}?</h2>
            <p className="text-muted mt-2 max-w-lg">
              Pergunte qualquer coisa: por onde começar, quais ativos estão em destaque hoje, como montar sua carteira ou organizar seus gastos. Eu uso o mercado em tempo real e as suas informações para personalizar as respostas.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-7 w-full max-w-2xl">
              {SUGGESTIONS.map((s) => (
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
              <Message key={m.id} m={m} streaming={m.id === streamingId} onRetry={m.role === "assistant" && i === chat.length - 1 && !streamingId ? retryLast : undefined} />
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
              placeholder={hasKey ? "Pergunte ao Professor IA…" : "Configure a IA para conversar"}
              className="flex-1 resize-none bg-transparent outline-none text-[15px] py-2 max-h-[180px] placeholder:text-muted/70"
            />
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
          <div className="text-[11.5px] text-muted text-center mt-2">
            <Badge className="mr-1">Educacional</Badge> As respostas usam dados reais do momento, mas não são recomendação individual de investimento. Confira antes de decidir.
          </div>
        </div>
      </div>
    </div>
  );
}
