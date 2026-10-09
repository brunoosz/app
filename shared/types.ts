export type Role = "usuario" | "adm" | "dono";

export const ROLE_LABEL: Record<Role, string> = {
  usuario: "Usuário",
  adm: "Administrador",
  dono: "Dono",
};

export type UserStatus = "ativo" | "bloqueado";

export interface PublicUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
  avatarHue: number;
  onboarded: boolean;
}

export type RiskProfile = "conservador" | "moderado" | "arrojado";
export type Experience = "nunca" | "pouco" | "experiente";

export interface FinancialProfile {
  onboarded: boolean;
  salary: number;
  extraIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  monthlyInvest: number;
  emergencyReserve: number;
  invested: number;
  debts: number;
  riskProfile: RiskProfile;
  experience: Experience;
  mainGoal: string;
  age?: number;
  updatedAt: string;
}

export interface UserSettings {
  theme: "dark" | "light" | "system";
  desktopNotifications: boolean;
  smartAlerts: boolean;
  marketEvents: boolean;
  dailyTip: boolean;
  gainThreshold: number;
  lossThreshold: number;
  deviationThreshold: number;
  hiddenCategories: AssetCategory[];
  hiddenSymbols: string[];
  customSymbols: { symbol: string; name: string; category: AssetCategory }[];
  favorites: string[];
  runInBackground: boolean;
}

export type AssetCategory =
  | "acoes"
  | "fiis"
  | "etfs"
  | "bdrs"
  | "rendafixa"
  | "tesouro"
  | "cripto"
  | "moedas"
  | "indices"
  | "commodities"
  | "exterior";

export type FixedType =
  | "cdb"
  | "lci"
  | "lca"
  | "tesouro-selic"
  | "tesouro-ipca"
  | "tesouro-pre"
  | "poupanca"
  | "debenture"
  | "outro";

export type RateType = "cdi" | "selic" | "ipca" | "pre" | "variavel";

export interface Holding {
  id: string;
  kind: "variavel" | "fixa";
  name: string;
  category: AssetCategory;
  institution: string;
  purchaseDate: string;
  notes?: string;
  symbol?: string;
  quantity?: number;
  avgPrice?: number;
  fixedType?: FixedType;
  rateType?: Exclude<RateType, "variavel">;
  rate?: number;
  amount?: number;
}

export type AllocationType =
  | FixedType
  | "acao"
  | "fii"
  | "etf"
  | "cripto";

export interface GoalAllocation {
  id: string;
  type: AllocationType;
  asset: string;
  institution: string;
  amount: number;
  monthly: number;
  rateType: RateType;
  rate: number;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  deadline: string;
  allocations: GoalAllocation[];
  createdAt: string;
}

export type PaymentMethod = "pix" | "debito" | "credito" | "dinheiro" | "boleto" | "transferencia";

export interface Expense {
  id: string;
  type: "despesa" | "receita";
  description: string;
  amount: number;
  date: string;
  category: string;
  method: PaymentMethod;
  institution: string;
  installments: number;
  notes?: string;
}

export type AlertKind = "preco-acima" | "preco-abaixo" | "variacao-dia" | "abaixo-media" | "lembrete";

export interface PriceAlert {
  id: string;
  kind: AlertKind;
  symbol?: string;
  value?: number;
  title?: string;
  message?: string;
  remindAt?: string;
  active: boolean;
  repeat: boolean;
  createdAt: string;
}

export interface AlertRuntimeState {
  fired: boolean;
  firedAt?: string;
  lastValue?: number;
}

export type NotificationType = "mercado" | "carteira" | "alerta" | "dica" | "sistema" | "noticia";
export type Tone = "positive" | "negative" | "neutral" | "info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  symbol?: string;
  tone?: Tone;
  link?: string;
}

export interface LessonRecord {
  score: number;
  total: number;
  xp: number;
  completedAt: string;
  approved: boolean;
}

export interface LearningState {
  xp: number;
  completed: Record<string, LessonRecord>;
  streak: { count: number; lastDate: string };
  badges: string[];
}

export interface SimPosition {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currency: string;
}

export interface SimTrade {
  id: string;
  side: "compra" | "venda";
  symbol: string;
  quantity: number;
  price: number;
  date: string;
}

export interface SimulatorState {
  cash: number;
  startedAt: string;
  positions: SimPosition[];
  history: SimTrade[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  error?: boolean;
}

export interface UserDataMap {
  profile: FinancialProfile;
  settings: UserSettings;
  portfolio: Holding[];
  goals: Goal[];
  expenses: Expense[];
  alerts: PriceAlert[];
  learning: LearningState;
  simulator: SimulatorState;
  chat: ChatMessage[];
}

export type UserDataKey = keyof UserDataMap;

export const USER_DATA_KEYS: UserDataKey[] = [
  "profile",
  "settings",
  "portfolio",
  "goals",
  "expenses",
  "alerts",
  "learning",
  "simulator",
  "chat",
];

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  marketCap?: number;
  pe?: number;
  priceToBook?: number;
  dividendYield?: number;
  eps?: number;
  currency: string;
  marketState?: string;
  exchange?: string;
  delayMinutes?: number;
  time: number;
}

export type ChartRange = "1D" | "5D" | "1M" | "6M" | "1A" | "5A" | "MAX";

export interface ChartPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ChartData {
  symbol: string;
  range: ChartRange;
  currency: string;
  previousClose?: number;
  intraday: boolean;
  points: ChartPoint[];
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  category: AssetCategory;
}

export interface SeriesValue {
  value: number;
  date: string;
}

export interface Indicators {
  selic?: SeriesValue;
  cdi?: SeriesValue;
  ipcaMonth?: SeriesValue;
  ipca12m?: SeriesValue;
  dollarPtax?: SeriesValue & { change?: number };
  euroPtax?: SeriesValue;
  savingsMonth?: SeriesValue;
  tr?: SeriesValue;
  focus?: FocusExpectations;
  updatedAt: string;
}

export interface FocusExpectations {
  date: string;
  ipcaYear?: { year: number; value: number };
  selicYear?: { year: number; value: number };
  pibYear?: { year: number; value: number };
  dollarYear?: { year: number; value: number };
  nextMeeting?: { meeting: string; value: number };
}

export interface CopomMeeting {
  start: string;
  decision: string;
}

export interface CopomInfo {
  current?: number;
  lastMeeting?: {
    date: string;
    outcome: "manteve" | "elevou" | "reduziu" | "aguardando";
    from?: number;
    to?: number;
  };
  nextMeeting?: CopomMeeting;
  history: { date: string; from: number; to: number }[];
  expectation?: { meeting: string; value: number; date: string };
}

export interface TesouroTitle {
  name: string;
  kind: string;
  maturity: string;
  buyRate?: number;
  sellRate?: number;
  unitPrice?: number;
  minInvestment?: number;
  sellPrice?: number;
  indexer: "SELIC" | "IPCA" | "PRE" | "IGPM" | "OUTRO";
  canBuy: boolean;
}

export interface TesouroData {
  titles: TesouroTitle[];
  updatedAt: string;
  source: string;
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary?: string;
  image?: string;
}

export interface CreditRate {
  modality: string;
  institution: string;
  bankId?: string;
  rateMonth: number;
  rateYear: number;
  position: number;
  period: string;
}

export interface CreditRatesData {
  period?: string;
  modalities: { key: string; label: string; rates: CreditRate[] }[];
  updatedAt: string;
}

export interface BankScore {
  bankId: string;
  score: number;
  liquidYield: number;
  netYield1y: number;
  creditPercentile?: number;
  reasons: string[];
}

export interface BanksData {
  cdi?: number;
  selic?: number;
  scores: BankScore[];
  credit: CreditRatesData;
  updatedAt: string;
}

export interface AiConfigInfo {
  hasKey: boolean;
  keyPreview?: string;
  model: string;
  baseUrl: string;
  source: "app" | "arquivo" | "ambiente" | null;
}

export interface AiChatRequest {
  requestId: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export interface AiEvent {
  requestId: string;
  type: "chunk" | "done" | "error" | "context";
  data?: string;
}

export interface PortfolioHistoryPoint {
  time: number;
  value: number;
  invested: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  username: string;
  xp: number;
  completed: number;
  avatarHue: number;
  isMe: boolean;
}

export type ApiError = { code: string; message: string };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
