export const revenueLines = ['personal', 'corporate', 'vat', 'customs', 'resources', 'nonTax', 'other'] as const;
export const spendingLines = ['education', 'health', 'defense', 'infrastructure', 'social', 'energy', 'agriculture', 'administration', 'interest', 'transfers', 'contingency'] as const;
export type RevenueLine = typeof revenueLines[number];
export type SpendingLine = typeof spendingLines[number];
export type BudgetPlan = {
  taxFactor: number;
  spending: Record<Exclude<SpendingLine, 'interest'>, number>;
};
export type Economy = {
  gdp: number; growth: number; inflation: number; unemployment: number; poverty: number;
  exchangeRate: number; interestRate: number; debt: number; confidence: number; investment: number;
  purchasingPower: number; infrastructure: number; inequality: number; energyPrice: number;
  foodPrice: number; foreignInvestment: number; humanCapital: number;
};
export type Accounts = {
  revenue: Record<RevenueLine, number>;
  spending: Record<SpendingLine, number>;
  totalRevenue: number; totalSpending: number; primaryBalance: number;
  balance: number; financing: number;
};
export type Vote = { byParty: Record<string, number>; yes: number; no: number; approved: boolean };
export type BudgetCycle = {
  year: number;
  status: 'open' | 'submitted' | 'approved' | 'rejected';
  plan: BudgetPlan;
  execution: BudgetPlan;
  accrued: Accounts;
  vote?: Vote;
  lastVoteWeek?: number;
};
export type Caucus = {
  id: string; name: string; leader: string; seats: number; preference: Exclude<SpendingLine, 'interest'>;
  discipline: number; factions: string[]; objective: string;
};
export type Bloc = { member: boolean; trust: number; deal?: string };
export type Bill = {
  id: string; title: string; focus: 'health' | 'education' | 'infrastructure' | 'social';
  stage: 'submitted' | 'committee' | 'approved' | 'rejected';
  compromise: boolean;
  vote?: Vote;
};
export type Region = { id: string; name: string; population: number; development: number; support: number };
export type CampaignState = {
  week: number;
  seed: number;
  economy: Economy;
  budget: BudgetCycle;
  budgetArchive: BudgetCycle[];
  blocs: Record<string, Bloc>;
  bills: Bill[];
  quarters: { week: number; accounts: Accounts; debt: number; tracking?: CashTracking }[];
  quarterTracking?: CashTracking;
  developments?: Development[];
  months: { week: number; gdp: number; inflation: number; unemployment: number }[];
  delayed: { week: number; field: 'humanCapital' | 'infrastructure'; amount: number }[];
  effectiveTax: number;
  delayedTax: { week: number; value: number }[];
  regions: Region[];
  legitimacy: number;
  ministerReviews: { week: number; positionId: string; holderId: string; delivery: number }[];
  briefings: { week: number; message: string }[];
  pendingEvent?: string;
  eventHistory: { week: number; eventId: string; choiceId: string }[];
  nextEvents: string[];
  election?: ElectionResult;
};

export type EventEffect =
  | { kind: 'legitimacy'; delta: number }
  | { kind: 'party'; id: string; delta: number }
  | { kind: 'region'; id: string; delta: number }
  | { kind: 'metric'; field: 'confidence' | 'purchasingPower' | 'humanCapital' | 'infrastructure'; delta: number }
  | { kind: 'capital-project'; field: 'humanCapital' | 'infrastructure'; delta: number; delay: number };

export type StoryEvent = {
  id: string; category: string; title: string; text: string; firstWeek: number; lastWeek?: number; weight: number;
  when?: (campaign: CampaignState) => boolean;
  follows?: string;
  choices: { id: string; label: string; effects: EventEffect[]; next?: string }[];
};

export type ElectionResult = {
  winnerId: string;
  votes: Record<string, number>;
  regions: { id: string; turnout: number; votes: Record<string, number> }[];
  epilogues: string[];
};

export type CashTracking = { plannedSpending: number; plannedRevenue: number; borrowing: number; redemption: number };
export type Development =
  | { week: number; kind: 'budget'; approved: boolean; yes: number }
  | { week: number; kind: 'coalition'; partyId: string; joined: boolean }
  | { week: number; kind: 'effect'; field: 'humanCapital' | 'infrastructure' | 'tax'; change: number }
  | { week: number; kind: 'region'; regionId: string; change: number }
  | { week: number; kind: 'conflict'; characterId: string; positionId: string; choice: 'heard' | 'resigned' };
