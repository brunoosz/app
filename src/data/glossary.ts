export interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
  relatedTerms?: string[];
}

export const glossary: GlossaryTerm[] = [
  {
    term: "Acao",
    definition:
      "Menor parcela do capital social de uma empresa. Quem compra uma acao se torna socio daquela empresa.",
    example: "Comprar PETR4 e comprar uma pequena parte da Petrobras.",
    relatedTerms: ["Dividendo", "B3", "Ibovespa"],
  },
  {
    term: "B3",
    definition:
      "Brasil, Bolsa, Balcao. E a bolsa de valores brasileira, onde acoes, FIIs, ETFs e outros ativos sao negociados.",
    relatedTerms: ["Ibovespa", "Acao"],
  },
  {
    term: "CDB",
    definition:
      "Certificado de Deposito Bancario. Voce empresta dinheiro ao banco e recebe juros em troca.",
    example:
      "Um CDB que rende 100% do CDI paga aproximadamente a mesma taxa que a Selic.",
    relatedTerms: ["CDI", "Renda Fixa"],
  },
  {
    term: "CDI",
    definition:
      "Certificado de Deposito Interbancario. Taxa de referencia para investimentos de renda fixa. Anda muito proxima da Selic.",
    relatedTerms: ["Selic", "CDB"],
  },
  {
    term: "COPOM",
    definition:
      "Comite de Politica Monetaria do Banco Central. Se reune a cada 45 dias para definir a taxa Selic.",
    relatedTerms: ["Selic", "Banco Central"],
  },
  {
    term: "Dividendo",
    definition:
      "Parte do lucro da empresa distribuida aos acionistas. E como receber um 'aluguel' por ser dono de acoes.",
    example:
      "Se uma empresa paga R$ 1,00 de dividendo por acao e voce tem 100 acoes, recebe R$ 100.",
    relatedTerms: ["Dividend Yield", "Acao"],
  },
  {
    term: "Dividend Yield (DY)",
    definition:
      "Indicador que mostra quanto uma acao ou FII paga de dividendos em relacao ao seu preco.",
    example:
      "DY de 6% = se a acao custa R$ 100, ela pagou R$ 6 de dividendos no periodo.",
    relatedTerms: ["Dividendo", "P/L"],
  },
  {
    term: "ETF",
    definition:
      "Exchange Traded Fund. Fundo que replica um indice e e negociado na bolsa como uma acao.",
    example:
      "BOVA11 replica o Ibovespa. Comprando BOVA11, voce investe nas principais acoes do Brasil de uma vez.",
    relatedTerms: ["Ibovespa", "Diversificacao"],
  },
  {
    term: "FII",
    definition:
      "Fundo de Investimento Imobiliario. Fundo que investe em imoveis ou titulos imobiliarios e distribui rendimentos.",
    example:
      "HGLG11 e um FII que possui galpoes logisticos e distribui alugueis mensalmente.",
    relatedTerms: ["Dividendo", "CRI"],
  },
  {
    term: "Ibovespa",
    definition:
      "Principal indice da bolsa brasileira. Mede o desempenho das acoes mais negociadas na B3.",
    relatedTerms: ["B3", "ETF"],
  },
  {
    term: "Inflacao",
    definition:
      "Aumento geral dos precos ao longo do tempo. Medida pelo IPCA no Brasil.",
    example:
      "Se a inflacao e 5% ao ano, algo que custava R$ 100 passa a custar R$ 105.",
    relatedTerms: ["IPCA", "Selic"],
  },
  {
    term: "IPCA",
    definition:
      "Indice de Precos ao Consumidor Amplo. Principal medida oficial de inflacao no Brasil, calculada pelo IBGE.",
    relatedTerms: ["Inflacao", "Tesouro IPCA+"],
  },
  {
    term: "Liquidez",
    definition:
      "Facilidade de transformar um investimento em dinheiro. Maior liquidez = mais facil de vender/resgatar.",
    example:
      "Tesouro Selic tem alta liquidez (resgata em D+1). Um imovel tem baixa liquidez.",
    relatedTerms: ["Reserva de Emergencia"],
  },
  {
    term: "P/L (Preco/Lucro)",
    definition:
      "Indicador que mostra quantos anos de lucro seriam necessarios para pagar o preco da acao.",
    example:
      "P/L de 10 = se a empresa mantiver o lucro atual, em 10 anos o lucro acumulado iguala o preco.",
    relatedTerms: ["Dividend Yield", "ROE"],
  },
  {
    term: "Renda Fixa",
    definition:
      "Investimentos em que voce empresta dinheiro e recebe juros. O retorno e previsivel.",
    example: "Tesouro Direto, CDB, LCI, LCA e debentures.",
    relatedTerms: ["CDB", "Tesouro Direto", "Selic"],
  },
  {
    term: "Renda Variavel",
    definition:
      "Investimentos cujo retorno nao e previsivel. Inclui acoes, FIIs e ETFs.",
    relatedTerms: ["Acao", "FII", "ETF"],
  },
  {
    term: "Reserva de Emergencia",
    definition:
      "Dinheiro guardado para imprevistos, equivalente a 3-6 meses de despesas. Deve estar em investimento seguro e com liquidez.",
    example:
      "Se voce gasta R$ 3.000/mes, sua reserva deveria ser de R$ 9.000 a R$ 18.000 em Tesouro Selic.",
    relatedTerms: ["Liquidez", "Tesouro Selic"],
  },
  {
    term: "ROE (Retorno sobre Patrimonio)",
    definition:
      "Mede a eficiencia da empresa em gerar lucro a partir do patrimonio dos acionistas.",
    example:
      "ROE de 20% = para cada R$ 100 de patrimonio, a empresa gera R$ 20 de lucro.",
    relatedTerms: ["P/L", "Dividend Yield"],
  },
  {
    term: "Selic",
    definition:
      "Taxa basica de juros da economia brasileira, definida pelo COPOM. Influencia todos os outros juros.",
    relatedTerms: ["COPOM", "CDI", "Renda Fixa"],
  },
  {
    term: "Tesouro Direto",
    definition:
      "Programa do governo que permite comprar titulos publicos. E o investimento mais seguro do Brasil.",
    example:
      "Tesouro Selic, Tesouro IPCA+ e Tesouro Prefixado sao tipos de titulos.",
    relatedTerms: ["Selic", "Renda Fixa", "IPCA"],
  },
];
