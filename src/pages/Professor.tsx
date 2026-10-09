import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const knowledgeBase: { patterns: string[]; response: string }[] = [
  {
    patterns: ["o que e", "oque e", "oq e", "acao", "acoes"],
    response:
      "Acoes sao pequenas partes de uma empresa. Quando voce compra uma acao, se torna socio daquela empresa. Se ela lucra, voce ganha; se ela perde, voce tambem perde. Na B3 (bolsa brasileira), acoes ordinarias terminam em 3 (ex: PETR3) e preferenciais em 4 (ex: PETR4). As preferenciais tem prioridade nos dividendos.",
  },
  {
    patterns: ["fii", "fundo imobiliario", "fundos imobiliarios"],
    response:
      "FIIs (Fundos de Investimento Imobiliario) sao fundos que investem em imoveis ou titulos imobiliarios. Voce compra cotas na bolsa (codigos terminam em 11, ex: HGLG11) e recebe rendimentos mensais, como se fosse um aluguel. A grande vantagem: rendimentos sao isentos de IR para pessoa fisica!",
  },
  {
    patterns: ["tesouro", "selic", "renda fixa"],
    response:
      "O Tesouro Direto e o investimento mais seguro do Brasil - voce empresta dinheiro para o governo. O Tesouro Selic acompanha a taxa basica de juros e e ideal para reserva de emergencia (pode resgatar a qualquer momento). O Tesouro IPCA+ protege da inflacao e e otimo para longo prazo. Ja o Prefixado voce sabe exatamente quanto vai receber no vencimento.",
  },
  {
    patterns: ["dividendo", "dividendos", "dividend", "dy"],
    response:
      "Dividendos sao parte do lucro que a empresa distribui aos acionistas. O Dividend Yield (DY) mostra quanto a empresa paga em relacao ao preco da acao. Por exemplo, DY de 6% = para cada R$ 100 investidos, voce recebe R$ 6/ano. Empresas como bancos e eletricas costumam pagar bons dividendos.",
  },
  {
    patterns: ["etf", "bova", "indice"],
    response:
      "ETFs (Exchange Traded Funds) sao fundos negociados na bolsa que replicam um indice. O BOVA11, por exemplo, replica o Ibovespa - comprando ele, voce investe nas principais acoes do Brasil de uma vez! E uma forma simples de diversificar. Voce paga uma pequena taxa de administracao, mas ganha praticidade.",
  },
  {
    patterns: ["reserva", "emergencia"],
    response:
      "A reserva de emergencia e OBRIGATORIA antes de qualquer investimento! Guarde de 3 a 6 meses das suas despesas mensais em um lugar seguro e com liquidez (facil de resgatar). Melhores opcoes: Tesouro Selic ou CDB com liquidez diaria de banco solido. NUNCA invista sua reserva em acoes ou FIIs!",
  },
  {
    patterns: ["comecar", "inicio", "primeiro", "iniciante", "comeco"],
    response:
      "Para comecar a investir: 1) Monte sua reserva de emergencia primeiro (3-6 meses de despesas em Tesouro Selic). 2) Abra conta em uma corretora (muitas sao gratuitas). 3) Comece pela renda fixa (Tesouro Direto, CDB). 4) Estude antes de ir para renda variavel. 5) Diversifique! Nunca coloque tudo em um unico investimento. O mais importante: comece, mesmo que com pouco!",
  },
  {
    patterns: ["p/l", "pl", "preco lucro"],
    response:
      "O P/L (Preco/Lucro) mostra quantos anos de lucro seriam necessarios para pagar o preco da acao. P/L de 10 = 10 anos. P/L baixo pode indicar acao barata (mas cuidado, pode ser empresa com problemas). Compare sempre com empresas do mesmo setor. Bancos costumam ter P/L entre 5-12, enquanto empresas de crescimento podem ter P/L acima de 30.",
  },
  {
    patterns: ["inflacao", "ipca"],
    response:
      "Inflacao e o aumento geral dos precos. No Brasil, e medida pelo IPCA. Se a inflacao e 5% ao ano, R$ 100 so compram o que R$ 95 compravam antes. Por isso investir e essencial: dinheiro parado PERDE valor! O Tesouro IPCA+ protege contra inflacao, pois rende IPCA + uma taxa fixa.",
  },
  {
    patterns: ["diversif", "carteira"],
    response:
      "Diversificar e distribuir seus investimentos para reduzir risco. Uma sugestao para iniciante: 30% Tesouro Selic (reserva), 30% Tesouro IPCA+ ou CDB, 20% Acoes (de setores diferentes), 20% FIIs. Mas isso depende do seu perfil! Conservador: mais renda fixa. Arrojado: mais renda variavel. O importante e nunca colocar tudo em um so lugar.",
  },
  {
    patterns: ["cdb", "lci", "lca"],
    response:
      "CDB e um emprestimo que voce faz ao banco. LCI e LCA sao parecidos, mas ligados ao setor imobiliario e agronegocio. A grande vantagem de LCI/LCA: sao isentos de Imposto de Renda! Um CDB que rende 100% do CDI e basicamente equivalente a taxa Selic. Procure CDBs que rendam pelo menos 100% do CDI. O FGC (Fundo Garantidor de Credito) protege ate R$ 250.000 por CPF por instituicao.",
  },
  {
    patterns: ["risco", "perfil"],
    response:
      "Existem 3 perfis: Conservador (prioriza seguranca, foco em renda fixa), Moderado (equilibra risco e retorno, mix de renda fixa e variavel), e Arrojado (aceita mais risco buscando maior retorno). Para descobrir o seu: voce venderia em panico se seu investimento caisse 20%? Precisa do dinheiro em menos de 2 anos? Se sim para ambos, comece conservador. Seu perfil pode mudar com o tempo!",
  },
];

const suggestedQuestions = [
  "O que sao acoes?",
  "Como comecar a investir?",
  "O que e reserva de emergencia?",
  "O que sao FIIs?",
  "Como funciona o Tesouro Direto?",
  "O que sao dividendos?",
  "Como diversificar minha carteira?",
  "O que e inflacao?",
];

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const item of knowledgeBase) {
    if (item.patterns.some((p) => lower.includes(p))) {
      return item.response;
    }
  }
  return "Otima pergunta! Infelizmente nao tenho uma resposta especifica para isso no meu banco de conhecimento. Tente perguntar sobre: acoes, FIIs, Tesouro Direto, dividendos, ETFs, reserva de emergencia, CDB, LCI/LCA, inflacao, diversificacao ou perfil de investidor. Estou aqui para ajudar!";
}

export default function Professor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ola! Sou o Professor IA do Investa. Estou aqui para tirar suas duvidas sobre investimentos. Pergunte qualquer coisa! Posso explicar sobre acoes, FIIs, Tesouro Direto, diversificacao e muito mais.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend(text?: string) {
    const message = text || input.trim();
    if (!message) return;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getResponse(message);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">Professor IA</h1>
        <p className="opacity-60">Tire suas duvidas sobre investimentos.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
              style={{
                background: msg.role === "user" ? "var(--emerald)" : "var(--navy-card)",
                color: "white",
                borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "var(--navy-card)" }}>
              <span className="animate-pulse">Digitando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="mb-4">
          <p className="text-xs opacity-40 mb-2">Sugestoes:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer border-none hover:opacity-100 opacity-70"
                style={{ background: "var(--navy-card)", color: "var(--foreground)" }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Digite sua pergunta..."
          className="input-field flex-1"
          disabled={isTyping}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="btn-primary px-6"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
