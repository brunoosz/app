"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestedQuestions = [
  "O que e investir?",
  "Qual a diferenca entre acao e FII?",
  "O que significa P/L?",
  "Como funciona o Tesouro Direto?",
  "O que e a taxa Selic?",
  "Como montar uma carteira diversificada?",
  "O que e dividend yield?",
  "Por onde comecar a investir?",
];

const knowledgeBase: Record<string, string> = {
  investir: `**Investir** e colocar seu dinheiro para trabalhar por voce, buscando retorno financeiro.

Em vez de deixar o dinheiro parado na conta (onde ele perde valor pela inflacao), voce aplica em ativos que podem gerar rendimento.

Existem duas grandes categorias:
- **Renda Fixa**: voce empresta dinheiro e recebe juros (Tesouro Direto, CDB, LCI)
- **Renda Variavel**: voce compra participacoes em negocios (acoes, FIIs, ETFs)

A regra mais importante: **quanto maior o potencial de retorno, maior o risco**. Nao existe investimento com alto retorno e zero risco.

Antes de comecar, monte uma **reserva de emergencia** (3-6 meses de despesas) em investimentos seguros como o Tesouro Selic.`,

  "acao fii diferenca": `**Acoes** e **FIIs** sao coisas diferentes:

**Acoes:**
- Sao pedacos de empresas
- Voce se torna socio da empresa
- Pode ganhar com valorizacao e dividendos
- Exemplos: PETR4 (Petrobras), VALE3 (Vale), ITUB4 (Itau)

**FIIs (Fundos Imobiliarios):**
- Sao fundos que investem em imoveis ou titulos imobiliarios
- Voce compra cotas do fundo
- Recebe rendimentos mensais (como se fosse aluguel)
- Rendimentos sao isentos de IR para pessoa fisica
- Exemplos: HGLG11, MXRF11, KNRI11

**Acao de empresa imobiliaria** (como MRVE3 da MRV) e diferente de FII. E uma acao normal de uma empresa que atua no setor de construcao.

Na B3, codigos que terminam em 3 ou 4 sao acoes. Codigos que terminam em 11 geralmente sao FIIs ou ETFs.`,

  "p/l preco lucro": `**P/L (Preco/Lucro)** e um dos indicadores mais usados para avaliar acoes.

Ele mostra **quantos anos de lucro seriam necessarios para "pagar" o preco da acao**.

**Como calcular:**
P/L = Preco da acao / Lucro por acao

**Exemplo:**
- Acao custa R$ 20
- Lucro por acao e R$ 2 por ano
- P/L = 20 / 2 = 10

Isso significa que, mantido o lucro atual, em 10 anos o lucro acumulado iguala o preco pago.

**Como interpretar:**
- P/L baixo (< 10): pode ser barata OU o mercado espera queda no lucro
- P/L medio (10-20): faixa normal
- P/L alto (> 20): pode estar cara OU o mercado espera forte crescimento

**CUIDADO:** P/L sozinho nao diz tudo. Compare sempre com empresas do mesmo setor.`,

  "tesouro direto": `**Tesouro Direto** e o investimento mais seguro do Brasil. Voce empresta dinheiro para o governo federal.

**Tipos de titulos:**

**Tesouro Selic (LFT)**
- Rende de acordo com a taxa Selic
- Ideal para reserva de emergencia
- Pode resgatar a qualquer momento
- Risco praticamente zero

**Tesouro IPCA+ (NTN-B Principal)**
- Rende inflacao + taxa fixa
- Protege da inflacao
- Ideal para longo prazo (aposentadoria)
- Pode dar prejuizo se vender antes do vencimento

**Tesouro Prefixado (LTN)**
- Voce sabe exatamente quanto vai receber no vencimento
- Bom quando os juros vao cair

**Como investir:**
1. Abra conta em uma corretora
2. Acesse a area de Tesouro Direto
3. Escolha o titulo
4. Invista a partir de ~R$ 30

**Custos:**
- Taxa de custodia: 0,20% ao ano
- IR: de 22,5% a 15% (quanto mais tempo, menos imposto)`,

  "selic": `A **Selic** e a taxa basica de juros do Brasil.

E definida pelo Banco Central a cada 45 dias nas reunioes do **COPOM** (Comite de Politica Monetaria).

**Por que ela e tao importante?**

A Selic influencia TODOS os outros juros da economia:
- Juros de emprestimos
- Rendimento de investimentos
- Financiamentos
- Cartao de credito

**Como afeta seus investimentos:**

| Selic subindo | Selic caindo |
|---|---|
| Renda fixa rende mais | Renda fixa rende menos |
| Acoes tendem a cair | Acoes tendem a subir |
| FIIs podem cair | FIIs podem subir |
| Credito mais caro | Credito mais barato |

**Selic atual (simulada):** 10,50% ao ano

Isso significa que investimentos atrelados a Selic rendem aproximadamente 10,50% ao ano bruto.`,

  "diversificacao carteira": `**Diversificacao** e distribuir seu dinheiro entre diferentes investimentos para reduzir o risco.

"Nao coloque todos os ovos na mesma cesta."

**Exemplo de carteira para iniciante (conservador):**
- 30% Tesouro Selic (reserva de emergencia)
- 30% CDB/LCI/LCA
- 25% Tesouro IPCA+
- 15% FIIs

**Para moderado:**
- 20% Tesouro Selic
- 25% Renda fixa diversificada
- 25% Acoes (setores diferentes)
- 20% FIIs
- 10% ETFs

**Diversifique por:**
1. Classe de ativo (renda fixa + variavel)
2. Setor (bancos + energia + saude + tecnologia)
3. Prazo (curto + medio + longo)

**IMPORTANTE:** A carteira ideal depende do SEU perfil, seus objetivos e seu prazo. Nao copie carteiras de influenciadores sem entender o contexto.`,

  "dividend yield dy": `**Dividend Yield (DY)** mostra quanto uma acao ou FII paga de dividendos em relacao ao seu preco.

**Formula:**
DY = (Dividendos pagos em 12 meses / Preco da acao) x 100

**Exemplo:**
- Acao custa R$ 100
- Pagou R$ 6 de dividendos no ano
- DY = (6 / 100) x 100 = 6%

**Como interpretar:**
- DY alto (> 8%): pode ser atrativo para renda, mas verifique se e sustentavel
- DY medio (4-8%): equilibrio entre renda e crescimento
- DY baixo (< 4%): empresa pode estar reinvestindo lucros para crescer

**CUIDADOS:**
- DY alto nem sempre e bom. A empresa pode ter pago dividendos extraordinarios que nao se repetem
- DY pode subir quando a acao CAI (o preco e o divisor)
- Compare sempre com empresas do mesmo setor
- Olhe o historico de pagamentos, nao so um ano`,

  "comecar investir": `**Por onde comecar a investir:**

**Passo 1: Organize suas financas**
- Saiba quanto ganha e quanto gasta
- Elimine dividas caras (cartao, cheque especial)
- Defina quanto pode investir por mes

**Passo 2: Monte sua reserva de emergencia**
- 3 a 6 meses de despesas
- Em Tesouro Selic ou CDB com liquidez diaria
- NAO pule essa etapa!

**Passo 3: Abra conta em uma corretora**
- Muitas sao gratuitas (pesquise e compare)
- Nao precisa usar a do seu banco

**Passo 4: Comece pela renda fixa**
- Tesouro Selic para reserva
- CDB, LCI ou LCA para objetivos de medio prazo
- Tesouro IPCA+ para longo prazo

**Passo 5: Estude antes de ir para renda variavel**
- Aprenda os conceitos basicos (use o Investa!)
- Comece com pouco dinheiro
- Use o simulador para praticar

**O mais importante:** comece cedo, invista com regularidade e tenha paciencia. Investir e uma maratona, nao uma corrida de 100 metros.`,
};

function findAnswer(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("investir") && (q.includes("o que") || q.includes("comecar") || q.includes("como"))) {
    if (q.includes("comecar") || q.includes("por onde") || q.includes("inicio")) {
      return knowledgeBase["comecar investir"];
    }
    return knowledgeBase["investir"];
  }
  if (q.includes("acao") && q.includes("fii") || q.includes("diferenca") && q.includes("fii")) {
    return knowledgeBase["acao fii diferenca"];
  }
  if (q.includes("p/l") || q.includes("preco") && q.includes("lucro") || q.includes("p/l")) {
    return knowledgeBase["p/l preco lucro"];
  }
  if (q.includes("tesouro")) {
    return knowledgeBase["tesouro direto"];
  }
  if (q.includes("selic") || q.includes("juros") && q.includes("taxa")) {
    return knowledgeBase["selic"];
  }
  if (q.includes("diversific") || q.includes("carteira")) {
    return knowledgeBase["diversificacao carteira"];
  }
  if (q.includes("dividend") || q.includes("dy ") || q.includes("yield")) {
    return knowledgeBase["dividend yield dy"];
  }
  if (q.includes("fii") || q.includes("imobiliario") || q.includes("fundo")) {
    return knowledgeBase["acao fii diferenca"];
  }
  if (q.includes("acao") || q.includes("acoes") || q.includes("bolsa") || q.includes("bovespa") || q.includes("b3")) {
    return `**Acoes** sao pedacos de empresas negociados na **B3** (a bolsa brasileira, que antes se chamava Bovespa).

Quando voce compra uma acao, voce se torna socio daquela empresa.

**Como ganhar dinheiro:**
1. **Valorizacao**: comprar barato e vender mais caro
2. **Dividendos**: receber parte do lucro da empresa

**Tipos de acoes:**
- Terminam em **3** (ON - Ordinarias): dao direito a voto
- Terminam em **4** (PN - Preferenciais): tem preferencia nos dividendos

**Recomendacao para iniciantes:** estude antes, comece com pouco e so invista dinheiro que nao vai precisar nos proximos 5 anos.

Quer aprender mais? Veja o modulo "Acoes e a Bolsa de Valores" na trilha de aprendizado!`;
  }

  return `Boa pergunta! Infelizmente ainda nao tenho uma resposta completa sobre esse tema especifico na minha base de conhecimento.

**O que posso te dizer:**
- Navegue pela trilha de aprendizado para estudar os conceitos basicos
- Use o glossario para entender termos especificos
- Tente perguntar de uma forma diferente

**Perguntas que eu consigo responder bem:**
- O que e investir?
- Qual a diferenca entre acao e FII?
- O que significa P/L?
- Como funciona o Tesouro Direto?
- O que e a taxa Selic?
- Como diversificar minha carteira?
- O que e dividend yield?
- Por onde comecar a investir?

*Nota: Este professor de IA usa uma base de conhecimento educacional. Para decisoes financeiras reais, consulte um profissional certificado.*`;
}

export default function ProfessorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ola! Eu sou o professor do Investa. Estou aqui para te ajudar a entender o mundo dos investimentos de forma simples e pratica.\n\nVoce pode me perguntar qualquer coisa sobre investimentos. Se eu nao souber, vou ser honesto e indicar onde voce pode estudar.\n\nPor onde quer comecar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const question = text || input.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const answer = findAnswer(question);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-bold mt-3 mb-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith("- **")) {
        const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/);
        if (match) {
          return (
            <p key={i} className="ml-3 my-0.5 text-sm">
              <span style={{ color: "var(--emerald)" }}>•</span>{" "}
              <strong>{match[1]}</strong>{match[2] ? `: ${match[2]}` : ""}
            </p>
          );
        }
      }
      if (line.startsWith("- ")) {
        return (
          <p key={i} className="ml-3 my-0.5 text-sm">
            <span style={{ color: "var(--emerald)" }}>•</span> {line.slice(2)}
          </p>
        );
      }
      if (line.startsWith("#")) {
        return null;
      }
      if (line.startsWith("|")) {
        return null;
      }
      if (line.trim() === "") {
        return <div key={i} className="h-1.5" />;
      }

      const formatted = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      const italicFormatted = formatted.replace(/\*(.+?)\*/g, "<em>$1</em>");
      return <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: italicFormatted }} />;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen max-w-4xl mx-auto">
      <header className="p-4 md:p-8 pb-0">
        <h1 className="text-3xl font-bold mb-2">Professor IA</h1>
        <p className="opacity-60 text-sm mb-4">
          Tire duvidas sobre investimentos com explicacoes simples e praticas.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:px-8 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl ${
                msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
              }`}
              style={{
                background: msg.role === "user" ? "var(--emerald)" : "var(--navy-card)",
                border: msg.role === "assistant" ? "1px solid var(--navy-border)" : "none",
                color: msg.role === "user" ? "white" : "var(--foreground)",
              }}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2 text-xs opacity-50">
                  <span>🤖</span> Professor Investa
                </div>
              )}
              {renderContent(msg.content)}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="card rounded-bl-sm px-6 py-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--emerald)", animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--emerald)", animationDelay: "200ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--emerald)", animationDelay: "400ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 md:px-8 pb-2">
          <p className="text-xs opacity-50 mb-2">Sugestoes:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="px-3 py-1.5 rounded-full text-xs border transition-all hover:border-emerald-500"
                style={{ borderColor: "var(--navy-border)" }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 md:px-8 md:pb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte qualquer coisa sobre investimentos..."
            className="flex-1 px-4 py-3 rounded-xl border text-sm"
            style={{
              background: "var(--navy-card)",
              borderColor: "var(--navy-border)",
              color: "var(--foreground)",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="btn-primary disabled:opacity-30 px-6"
          >
            Enviar
          </button>
        </form>
        <p className="text-xs opacity-30 mt-2 text-center">
          Respostas educacionais baseadas em conhecimento financeiro geral. Nao constitui recomendacao de investimento.
        </p>
      </div>
    </div>
  );
}
