export interface StockData {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  sector: string;
  type: "acao" | "fii" | "etf";
  description: string;
  pl?: number;
  dy?: number;
  history: { date: string; close: number }[];
}

function generateHistory(
  basePrice: number,
  days: number,
  volatility: number
): { date: string; close: number }[] {
  const history: { date: string; close: number }[] = [];
  let price = basePrice * (1 - volatility * 0.5);

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * volatility * price;
    price = Math.max(price + change, price * 0.5);
    history.push({
      date: date.toISOString().split("T")[0],
      close: Math.round(price * 100) / 100,
    });
  }

  return history;
}

export const stocks: StockData[] = [
  {
    ticker: "PETR4",
    name: "Petrobras PN",
    price: 38.72,
    change: 0.85,
    changePercent: 2.24,
    volume: 45_200_000,
    sector: "Petroleo e Gas",
    type: "acao",
    description:
      "Petroleo Brasileiro S.A. - maior empresa de energia do Brasil",
    pl: 4.2,
    dy: 14.5,
    history: generateHistory(38.72, 30, 0.03),
  },
  {
    ticker: "VALE3",
    name: "Vale ON",
    price: 62.15,
    change: -1.23,
    changePercent: -1.94,
    volume: 32_100_000,
    sector: "Mineracao",
    type: "acao",
    description: "Vale S.A. - uma das maiores mineradoras do mundo",
    pl: 6.8,
    dy: 8.2,
    history: generateHistory(62.15, 30, 0.025),
  },
  {
    ticker: "ITUB4",
    name: "Itau Unibanco PN",
    price: 32.45,
    change: 0.42,
    changePercent: 1.31,
    volume: 28_400_000,
    sector: "Bancos",
    type: "acao",
    description: "Itau Unibanco - maior banco privado do Brasil",
    pl: 8.5,
    dy: 5.1,
    history: generateHistory(32.45, 30, 0.02),
  },
  {
    ticker: "WEGE3",
    name: "WEG ON",
    price: 44.8,
    change: 1.15,
    changePercent: 2.63,
    volume: 12_300_000,
    sector: "Bens Industriais",
    type: "acao",
    description:
      "WEG S.A. - fabricante de motores e equipamentos eletricos",
    pl: 35.2,
    dy: 1.2,
    history: generateHistory(44.8, 30, 0.02),
  },
  {
    ticker: "BBDC4",
    name: "Bradesco PN",
    price: 14.92,
    change: -0.18,
    changePercent: -1.19,
    volume: 22_500_000,
    sector: "Bancos",
    type: "acao",
    description: "Banco Bradesco S.A.",
    pl: 10.3,
    dy: 4.8,
    history: generateHistory(14.92, 30, 0.025),
  },
  {
    ticker: "ABEV3",
    name: "Ambev ON",
    price: 13.25,
    change: 0.08,
    changePercent: 0.61,
    volume: 18_700_000,
    sector: "Bebidas",
    type: "acao",
    description: "Ambev S.A. - maior cervejaria da America Latina",
    pl: 15.7,
    dy: 4.2,
    history: generateHistory(13.25, 30, 0.015),
  },
  {
    ticker: "MRVE3",
    name: "MRV ON",
    price: 8.45,
    change: -0.32,
    changePercent: -3.65,
    volume: 8_900_000,
    sector: "Construcao Civil",
    type: "acao",
    description:
      "MRV Engenharia - construtora focada em habitacao popular",
    pl: 12.1,
    dy: 2.1,
    history: generateHistory(8.45, 30, 0.04),
  },
  {
    ticker: "HGLG11",
    name: "CSHG Logistica",
    price: 162.5,
    change: 0.75,
    changePercent: 0.46,
    volume: 3_200_000,
    sector: "Logistico",
    type: "fii",
    description: "Fundo de galpoes logisticos",
    dy: 7.8,
    history: generateHistory(162.5, 30, 0.01),
  },
  {
    ticker: "MXRF11",
    name: "Maxi Renda",
    price: 10.35,
    change: -0.05,
    changePercent: -0.48,
    volume: 5_400_000,
    sector: "Papel",
    type: "fii",
    description: "Fundo de recebíveis imobiliarios (CRI)",
    dy: 11.2,
    history: generateHistory(10.35, 30, 0.008),
  },
  {
    ticker: "KNRI11",
    name: "Kinea Renda Imobiliaria",
    price: 135.2,
    change: 1.1,
    changePercent: 0.82,
    volume: 2_100_000,
    sector: "Hibrido",
    type: "fii",
    description: "Fundo hibrido - escritorios e galpoes",
    dy: 6.5,
    history: generateHistory(135.2, 30, 0.012),
  },
  {
    ticker: "BOVA11",
    name: "iShares Ibovespa",
    price: 118.9,
    change: 0.65,
    changePercent: 0.55,
    volume: 15_600_000,
    sector: "Indice",
    type: "etf",
    description:
      "ETF que replica o Ibovespa - ideal para diversificar com um unico ativo",
    history: generateHistory(118.9, 30, 0.018),
  },
];

export function getStockByTicker(ticker: string): StockData | undefined {
  return stocks.find((s) => s.ticker === ticker);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
