export interface Lesson {
  id: string;
  title: string;
  duration: string;
  content: string;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  lessons: Lesson[];
  difficulty: "iniciante" | "intermediario" | "avancado";
}

export const courses: CourseModule[] = [
  {
    id: "fundamentos",
    title: "Fundamentos do Investimento",
    description:
      "Entenda o que e investir, por que o dinheiro perde valor e como fazer ele trabalhar para voce.",
    icon: "📚",
    difficulty: "iniciante",
    lessons: [
      {
        id: "o-que-e-investir",
        title: "O que e investir?",
        duration: "5 min",
        content: `# O que e investir?

Investir e colocar seu dinheiro para trabalhar por voce. Em vez de deixar o dinheiro parado na conta corrente (onde ele perde valor com o tempo por causa da inflacao), voce aplica em algo que tem potencial de gerar retorno.

## Por que investir?

Imagine que voce tem R$ 1.000 guardados. Se a inflacao do ano for 5%, no final do ano seus R$ 1.000 so compram o que R$ 950 compravam antes. Ou seja, **dinheiro parado e dinheiro perdendo valor**.

Quando voce investe, voce busca fazer esse dinheiro crescer acima da inflacao, para que no futuro voce tenha mais poder de compra.

## Tipos basicos de investimento

Existem duas grandes categorias:

### Renda Fixa
Voce empresta dinheiro e recebe juros por isso. Exemplos:
- **Tesouro Direto** - voce empresta para o governo
- **CDB** - voce empresta para um banco
- **LCI/LCA** - emprestimos ligados ao setor imobiliario e agronegocio

### Renda Variavel
Voce compra uma participacao em algo. O retorno depende do desempenho. Exemplos:
- **Acoes** - pedacos de empresas
- **FIIs** - fundos imobiliarios
- **ETFs** - fundos que seguem indices

## Conceito importante: Risco x Retorno

Quanto maior o potencial de retorno, maior o risco. Nao existe investimento com alto retorno e zero risco. Se alguem prometer isso, desconfie.`,
        quiz: {
          question:
            "Por que dinheiro parado na conta corrente perde valor com o tempo?",
          options: [
            "Porque o banco cobra taxas escondidas",
            "Por causa da inflacao, que faz os precos subirem",
            "Porque o governo tira dinheiro da sua conta",
            "Dinheiro parado nao perde valor",
          ],
          correctIndex: 1,
          explanation:
            "A inflacao faz os precos dos produtos e servicos subirem ao longo do tempo. Se seu dinheiro nao rende pelo menos a inflacao, ele perde poder de compra.",
        },
      },
      {
        id: "inflacao-e-juros",
        title: "Inflacao e Taxa de Juros",
        duration: "7 min",
        content: `# Inflacao e Taxa de Juros

Dois conceitos que voce vai ouvir TODOS os dias no mundo dos investimentos.

## O que e a Inflacao?

Inflacao e o aumento geral dos precos. Se a inflacao esta em 5% ao ano, significa que, em media, as coisas ficaram 5% mais caras em relacao ao ano anterior.

No Brasil, o principal indice de inflacao e o **IPCA** (Indice de Precos ao Consumidor Amplo), medido pelo IBGE.

### Exemplo pratico
Se um kg de arroz custava R$ 5,00 e a inflacao foi de 10%, agora ele custa R$ 5,50. Seus R$ 100 compravam 20 kg. Agora compram ~18 kg.

## O que e a Taxa Selic?

A **Selic** e a taxa basica de juros do Brasil. Ela e definida pelo Banco Central a cada 45 dias (nas reunioes do COPOM).

### Por que ela importa?

- **Selic alta** → investimentos de renda fixa rendem mais, emprestimos ficam mais caros, economia desacelera
- **Selic baixa** → renda fixa rende menos, credito fica mais barato, economia tende a aquecer

### Como isso afeta seus investimentos?

| Cenario | Renda Fixa | Acoes | FIIs |
|---------|-----------|-------|------|
| Selic subindo | Rendem mais | Tendem a cair | Podem cair |
| Selic caindo | Rendem menos | Tendem a subir | Podem subir |

Essa relacao nao e uma regra absoluta, mas e uma tendencia geral que ajuda a entender o mercado.`,
        quiz: {
          question: "O que acontece com investimentos de renda fixa quando a Selic sobe?",
          options: [
            "Eles perdem todo o valor",
            "Nada muda",
            "Eles tendem a render mais",
            "Eles sao cancelados pelo governo",
          ],
          correctIndex: 2,
          explanation:
            "Quando a Selic sobe, os novos titulos de renda fixa passam a oferecer juros maiores, tornando-os mais atrativos.",
        },
      },
      {
        id: "risco-e-perfil",
        title: "Risco e Perfil de Investidor",
        duration: "6 min",
        content: `# Risco e Perfil de Investidor

Antes de investir, voce precisa entender quanto risco voce aguenta.

## Os tres perfis

### Conservador
- Prioriza seguranca
- Aceita retornos menores para nao correr riscos
- Foco em renda fixa
- Ideal para quem esta comecando ou tem objetivos de curto prazo

### Moderado
- Equilibra seguranca e rentabilidade
- Aceita alguma variacao para buscar retornos melhores
- Mix de renda fixa e variavel
- Ideal para objetivos de medio prazo

### Arrojado (ou Agressivo)
- Busca maiores retornos
- Aceita oscilacoes fortes
- Maior parte em renda variavel
- Ideal para objetivos de longo prazo (5+ anos)

## Como descobrir seu perfil?

Pergunte a si mesmo:
1. Se meu investimento caisse 20% em um mes, eu venderia tudo em panico?
2. Preciso desse dinheiro nos proximos 2 anos?
3. Tenho uma reserva de emergencia?

Se respondeu "sim" para 1 e 2, comece mais conservador. E **nunca** invista sem ter uma reserva de emergencia primeiro.

## Reserva de Emergencia

Antes de qualquer investimento, guarde de 3 a 6 meses de despesas em um lugar seguro e com liquidez (facil de resgatar). Tesouro Selic ou CDB com liquidez diaria sao boas opcoes.`,
        quiz: {
          question: "Qual e a primeira coisa que voce deveria fazer antes de comecar a investir?",
          options: [
            "Comprar acoes da Petrobras",
            "Montar uma reserva de emergencia",
            "Abrir conta em 5 corretoras diferentes",
            "Investir tudo em criptomoedas",
          ],
          correctIndex: 1,
          explanation:
            "A reserva de emergencia garante que voce nao precisara vender seus investimentos em um momento ruim por causa de um imprevisto.",
        },
      },
    ],
  },
  {
    id: "renda-fixa",
    title: "Renda Fixa na Pratica",
    description:
      "Aprenda sobre Tesouro Direto, CDB, LCI, LCA e como escolher o melhor para voce.",
    icon: "🏦",
    difficulty: "iniciante",
    lessons: [
      {
        id: "tesouro-direto",
        title: "Tesouro Direto",
        duration: "8 min",
        content: `# Tesouro Direto

O Tesouro Direto e o investimento mais seguro do Brasil. Voce esta emprestando dinheiro para o governo federal.

## Tipos de titulos

### Tesouro Selic (LFT)
- Rende de acordo com a taxa Selic
- Ideal para reserva de emergencia
- Pode resgatar a qualquer momento sem perder dinheiro
- Risco praticamente zero

### Tesouro IPCA+ (NTN-B Principal)
- Rende a inflacao + uma taxa fixa
- Protege seu dinheiro da inflacao
- Ideal para aposentadoria e objetivos de longo prazo
- Se vender antes do vencimento, pode ter prejuizo

### Tesouro Prefixado (LTN)
- Voce sabe exatamente quanto vai receber no vencimento
- Bom quando voce acredita que os juros vao cair
- Tambem pode dar prejuizo se vender antes

## Como investir?

1. Abra conta em uma corretora (muitas sao gratuitas)
2. Acesse a area de Tesouro Direto
3. Escolha o titulo
4. Invista a partir de ~R$ 30

## Custos
- **Taxa de custodia da B3**: 0,20% ao ano (isenta para Tesouro Selic ate R$ 10.000)
- **IR**: de 22,5% a 15%, dependendo do prazo (so paga no resgate)`,
        quiz: {
          question: "Qual titulo do Tesouro Direto e mais indicado para reserva de emergencia?",
          options: [
            "Tesouro IPCA+",
            "Tesouro Prefixado",
            "Tesouro Selic",
            "Todos sao iguais",
          ],
          correctIndex: 2,
          explanation:
            "O Tesouro Selic tem liquidez diaria e nao sofre perdas significativas se resgatado antes do vencimento, sendo ideal para emergencias.",
        },
      },
    ],
  },
  {
    id: "acoes",
    title: "Acoes e a Bolsa de Valores",
    description:
      "Entenda como funciona a B3, o que sao acoes e como analisar empresas.",
    icon: "📈",
    difficulty: "intermediario",
    lessons: [
      {
        id: "o-que-sao-acoes",
        title: "O que sao acoes?",
        duration: "6 min",
        content: `# O que sao acoes?

Quando voce compra uma acao, voce esta comprando um pedacinho de uma empresa. Se a empresa vai bem, sua acao tende a valorizar. Se vai mal, ela pode cair.

## A B3 - Bolsa de Valores Brasileira

A B3 (Brasil, Bolsa, Balcao) e onde as acoes sao negociadas no Brasil. O antigo nome era "Bovespa", que seu amigo mencionou.

### Ibovespa
O Ibovespa e o principal indice da bolsa. Ele mede o desempenho das acoes mais negociadas. Quando alguem diz "a bolsa subiu", geralmente esta falando do Ibovespa.

## Tipos de acoes

### Ordinarias (ON) - terminam em 3
- Exemplo: PETR3 (Petrobras ON)
- Dao direito a voto nas assembleias
- Tag along (protecao caso a empresa seja vendida)

### Preferenciais (PN) - terminam em 4
- Exemplo: PETR4 (Petrobras PN)
- Tem preferencia no recebimento de dividendos
- Geralmente nao dao direito a voto

## Como ganhar dinheiro com acoes?

1. **Valorizacao**: comprar por R$ 10 e vender por R$ 15
2. **Dividendos**: parte do lucro que a empresa distribui aos acionistas

## Riscos
- O preco pode cair (e voce perder dinheiro)
- A empresa pode ir a falencia
- O mercado oscila muito no curto prazo

**Regra de ouro**: so invista em acoes dinheiro que voce nao vai precisar nos proximos 5 anos.`,
        quiz: {
          question: "O que significa PETR4?",
          options: [
            "Petrobras, acao preferencial",
            "Petrobras, 4a emissao de acoes",
            "Petrobras, acao do tipo 4",
            "Petroleo brasileiro, lote 4",
          ],
          correctIndex: 0,
          explanation:
            "O codigo termina em 4, indicando acao preferencial (PN). PETR e o codigo da Petrobras na B3.",
        },
      },
      {
        id: "como-analisar-empresas",
        title: "Como analisar uma empresa",
        duration: "10 min",
        content: `# Como analisar uma empresa

Antes de comprar uma acao, voce precisa entender se a empresa e boa. Existem dois metodos principais.

## Analise Fundamentalista

Olha para os numeros e a saude da empresa.

### Indicadores principais

**P/L (Preco/Lucro)**
- Quantos anos levaria para o lucro da empresa pagar o preco da acao
- P/L de 10 = 10 anos para "pagar" o investimento com o lucro
- P/L baixo pode indicar acao barata (ou empresa com problemas)

**Dividend Yield (DY)**
- Quanto a empresa paga de dividendos em relacao ao preco da acao
- DY de 6% = para cada R$ 100 investidos, voce recebe R$ 6/ano
- Bom para quem quer renda passiva

**ROE (Retorno sobre Patrimonio)**
- Mede a eficiencia da empresa em gerar lucro
- ROE de 20% = para cada R$ 100 de patrimonio, gera R$ 20 de lucro
- Quanto maior, melhor (comparado com empresas do mesmo setor)

**Divida Liquida / EBITDA**
- Mostra quantos anos a empresa levaria para pagar sua divida
- Acima de 3x pode ser preocupante
- Empresa muito endividada tem mais risco

## Analise Tecnica

Olha para graficos e padroes de preco para tentar prever movimentos. E mais usada por traders (que compram e vendem no curto prazo).

Para quem esta comecando, recomendo focar na analise fundamentalista.`,
        quiz: {
          question: "O que o indicador P/L (Preco/Lucro) mede?",
          options: [
            "O preco maximo que a acao pode chegar",
            "Quantos anos de lucro seriam necessarios para pagar o preco da acao",
            "O lucro total da empresa no ano",
            "A porcentagem de lucro do investidor",
          ],
          correctIndex: 1,
          explanation:
            "O P/L mostra a relacao entre o preco da acao e o lucro por acao. Um P/L de 10 indica que, mantido o lucro atual, levaria 10 anos para o lucro acumulado igualar o preco pago.",
        },
      },
    ],
  },
  {
    id: "fiis",
    title: "Fundos Imobiliarios (FIIs)",
    description:
      "Entenda o que seu amigo quis dizer sobre acoes imobiliarias e como funcionam os FIIs.",
    icon: "🏢",
    difficulty: "intermediario",
    lessons: [
      {
        id: "o-que-sao-fiis",
        title: "O que sao FIIs?",
        duration: "7 min",
        content: `# Fundos Imobiliarios (FIIs)

Lembra que seu amigo falou sobre "acoes imobiliarias"? Provavelmente ele estava falando de FIIs ou de acoes de empresas do setor imobiliario. Vamos entender a diferenca.

## FII vs Acao Imobiliaria

### FII (Fundo de Investimento Imobiliario)
- E um fundo que investe em imoveis ou titulos imobiliarios
- Voce compra cotas do fundo na bolsa
- Recebe rendimentos mensais (como se fosse um aluguel)
- Rendimentos sao isentos de IR para pessoa fisica (com algumas regras)
- Codigos terminam em 11: HGLG11, MXRF11, KNRI11

### Acao de empresa imobiliaria
- E uma acao normal de uma empresa que atua no setor imobiliario
- Construtoras: MRV (MRVE3), Cyrela (CYRE3), EZTec (EZTC3)
- Nao pagam rendimentos mensais como FIIs
- Seguem as regras normais de acoes

## Tipos de FIIs

### Fundos de Tijolo
- Possuem imoveis fisicos (shoppings, galpoes, escritorios)
- Renda vem dos alugueis
- Exemplo: HGLG11 (galpoes logisticos)

### Fundos de Papel
- Investem em titulos ligados ao setor imobiliario (CRI, LCI)
- Renda vem dos juros desses titulos
- Exemplo: MXRF11

### Fundos de Fundos (FOFs)
- Investem em outros FIIs
- Boa diversificacao para quem ta comecando
- Exemplo: BCFF11

## Vantagens
- Renda mensal
- Diversificacao no setor imobiliario com pouco dinheiro
- Isentos de IR nos rendimentos

## Riscos
- Vacancia (imoveis sem inquilino)
- Inadimplencia dos inquilinos
- Cota pode desvalorizar
- Juros altos prejudicam FIIs`,
        quiz: {
          question: "Qual e a principal diferenca entre um FII e uma acao de construtora?",
          options: [
            "Nao tem diferenca, sao a mesma coisa",
            "FIIs sao fundos que distribuem rendimentos mensais; acoes de construtoras sao participacoes em empresas",
            "Acoes de construtoras sao mais seguras",
            "FIIs nao podem ser comprados na bolsa",
          ],
          correctIndex: 1,
          explanation:
            "FIIs sao fundos que investem em imoveis ou titulos imobiliarios e distribuem rendimentos mensais. Acoes de construtoras sao participacoes em empresas do setor, com logica de valorizacao e dividendos diferente.",
        },
      },
    ],
  },
  {
    id: "diversificacao",
    title: "Diversificacao e Estrategia",
    description:
      "Aprenda a montar uma carteira equilibrada e a nao colocar todos os ovos na mesma cesta.",
    icon: "🎯",
    difficulty: "avancado",
    lessons: [
      {
        id: "por-que-diversificar",
        title: "Por que diversificar?",
        duration: "6 min",
        content: `# Por que diversificar?

"Nao coloque todos os ovos na mesma cesta" e o conselho mais importante do mundo dos investimentos.

## O que e diversificacao?

E distribuir seu dinheiro entre diferentes tipos de investimentos para reduzir o risco. Se um investimento vai mal, os outros podem compensar.

## Exemplo pratico

### Carteira concentrada (arriscada)
- 100% em acoes da Petrobras
- Se o petroleo cai, voce perde muito

### Carteira diversificada
- 40% Renda Fixa (Tesouro Direto, CDB)
- 30% Acoes (de setores diferentes)
- 20% FIIs
- 10% Reserva de emergencia (Tesouro Selic)

## Como diversificar na pratica

### Por classe de ativo
Renda fixa + acoes + FIIs + outros

### Por setor
Bancos + energia + tecnologia + saude + varejo

### Por prazo
Curto prazo + medio prazo + longo prazo

## Modelos de carteira por perfil

### Conservador
| Ativo | Percentual |
|-------|-----------|
| Tesouro Selic | 30% |
| CDB/LCI/LCA | 40% |
| Tesouro IPCA+ | 20% |
| FIIs | 10% |

### Moderado
| Ativo | Percentual |
|-------|-----------|
| Renda Fixa | 50% |
| Acoes | 25% |
| FIIs | 15% |
| ETFs | 10% |

### Arrojado
| Ativo | Percentual |
|-------|-----------|
| Renda Fixa | 25% |
| Acoes | 40% |
| FIIs | 20% |
| ETFs/Outros | 15% |

Esses sao apenas exemplos. A carteira ideal depende dos seus objetivos, prazo e tolerancia ao risco.`,
      },
    ],
  },
];

export function getCourseById(id: string): CourseModule | undefined {
  return courses.find((c) => c.id === id);
}

export function getLessonById(
  courseId: string,
  lessonId: string
): Lesson | undefined {
  const course = getCourseById(courseId);
  return course?.lessons.find((l) => l.id === lessonId);
}
