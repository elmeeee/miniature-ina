import { countElection, validElection } from './election';
export { candidates, epilogues } from './election';
import { chooseStory, offerStory, validStoryState } from './stories';
export { availableStory, validStoryCatalog } from './stories';
import { baselinePlan, caucuses, characters, difficulties, emptyAccounts, initialCampaign, initialEconomy, parliamentSeats, termWeeks, weeksPerYear } from '@republik/game-data';
import { revenueLines, spendingLines } from '@republik/shared-types';
import type { CashTracking, Development, Accounts, Bill, BudgetPlan, CampaignState, GameState, Vote } from '@republik/shared-types';
import { accrue, balanceAccounts, clampMetric, forecast, updateEconomy, validPlan } from './fiscal';

export type PresidencyAction =
  | { type: 'week' | 'routine' }
  | { type: 'choose-story'; choiceId: string }
  | { type: 'submit-budget' | 'amend-budget'; plan: BudgetPlan }
  | { type: 'vote-budget' }
  | { type: 'coalition'; partyId: string; join: boolean }
  | { type: 'submit-bill'; title: string; focus: Bill['focus'] }
  | { type: 'review-bill' | 'amend-bill' | 'vote-bill'; id: string };

const billFields = ['health', 'education', 'infrastructure', 'social'];
const seats = caucuses.reduce((sum, party) => sum + party.seats, 0);
const forecastPlan = (campaign: CampaignState) => forecast(campaign.economy, campaign.budget.plan);
export const debtRatio = (campaign: CampaignState) => campaign.economy.debt / campaign.economy.gdp * 100;

function assert(condition: unknown, message = 'Status kampanye tidak valid.'): asserts condition {
  if (!condition) throw new Error(message);
}

function random(campaign: CampaignState) {
  campaign.seed = (Math.imul(campaign.seed, 1664525) + 1013904223) >>> 0;
  return campaign.seed / 0x100000000;
}

export function ministryRequests(campaign: CampaignState): BudgetPlan['spending'] {
  const economy = campaign.economy;
  return {
    ...baselinePlan.spending,
    education: Math.round(470 + (65 - economy.humanCapital) * 4),
    infrastructure: Math.round(320 + (65 - economy.infrastructure) * 4),
    energy: Math.round(125 * economy.energyPrice / 100),
    social: Math.round(260 + (economy.poverty - 9.5) * 13),
    transfers: Math.round(550 + (economy.inequality - 25) * 8),
  };
}

function vote(campaign: CampaignState, whipModifier: number, support: (party: typeof caucuses[number]) => number): Vote {
  const byParty: Vote['byParty'] = {};
  let yes = 0;
  for (const party of caucuses) {
    const bloc = campaign.blocs[party.id];
    const preference = support(party);
    const whip = clampMetric(bloc.trust + preference + whipModifier + (bloc.member ? 22 : -6));
    const probability = (whip * party.discipline + clampMetric(45 + preference) * (100 - party.discipline)) / 10000;
    let tally = 0;
    for (let member = 0; member < party.seats; member++) if (random(campaign) < probability) tally++;
    yes += tally;
    byParty[party.id] = tally;
  }
  return { byParty, yes, no: seats - yes, approved: yes > seats / 2 };
}

function delivery(state: GameState) {
  const positions = Object.values(state.positions);
  const competence = positions.reduce((sum, position) => sum + (position.currentHolderId ? characters[position.currentHolderId].traits.competence : 45), 0) / positions.length;
  return 0.57 + competence / 220;
}

function advance(state: GameState) {
  const c = state.campaign;
  const week = c.week;
  const plan = c.budget.execution;
  if (week % 13 === 1) {
    const planAtOpening = forecast(c.economy, plan);
    c.quarterTracking = { plannedSpending: planAtOpening.totalSpending / 4, plannedRevenue: planAtOpening.totalRevenue / 4, borrowing: 0, redemption: 0 };
  }
  const shock = week % 4 === 0 ? 2 * difficulties[state.mandate.difficulty].shock * (random(c) - 0.5) : 0;
  const planBeforeLag = c.delayedTax.find(entry => entry.week === week);
  if (planBeforeLag) {
    const change = planBeforeLag.value - c.effectiveTax;
    if (change) recordDevelopment(c, { week, kind: 'effect', field: 'tax', change });
    c.effectiveTax = planBeforeLag.value;
    c.delayedTax = c.delayedTax.filter(entry => entry.week > week);
  }
  c.economy = updateEconomy(c.economy, plan, c.effectiveTax, shock);
  for (const effect of c.delayed.filter(item => item.week <= week)) {
    const before = c.economy[effect.field];
    c.economy[effect.field] = clampMetric(before + effect.amount);
    const change = c.economy[effect.field] - before;
    if (change) recordDevelopment(c, { week, kind: 'effect', field: effect.field, change });
  }
  c.delayed = c.delayed.filter(item => item.week > week);
  const nextAccounts = accrue(c.budget.accrued, forecast(c.economy, plan), delivery(state));
  const weeklyBalance = nextAccounts.balance - c.budget.accrued.balance;
  const debtBefore = c.economy.debt;
  c.economy.debt = Math.max(0, debtBefore - weeklyBalance);
  if (c.quarterTracking) {
    c.quarterTracking.borrowing += Math.max(0, c.economy.debt - debtBefore);
    c.quarterTracking.redemption += Math.max(0, debtBefore - c.economy.debt);
  }
  c.budget.accrued = nextAccounts;
  if (week % 4 === 0) {
    const { gdp, inflation, unemployment } = c.economy;
    c.months.push({ week, gdp, inflation, unemployment });
    c.legitimacy = clampMetric(c.legitimacy + (c.economy.growth - inflation - 1) / 6);
  }
  if (week % 13 === 0) {
    c.quarters.push({ week, accounts: nextAccounts, debt: c.economy.debt,
      ...(c.quarterTracking && { tracking: c.quarterTracking }) });
    delete c.quarterTracking;
    c.delayed.push(
      { week: week + 26, field: 'humanCapital', amount: (plan.spending.education - 360) / 260 },
      { week: week + 13, field: 'infrastructure', amount: (plan.spending.infrastructure - 230) / 190 },
    );
    for (const position of Object.values(state.positions)) {
      if (!position.currentHolderId) continue;
      const holderId = position.currentHolderId;
      const score = Math.round(delivery(state) * characters[holderId].traits.competence);
      c.ministerReviews.push({ week, positionId: position.id, holderId, delivery: score });
    }
    for (const region of c.regions) {
      const gap = Math.max(0, 65 - region.development);
      const before = region.development;
      region.development = clampMetric(region.development + (plan.spending.transfers - 430) * (1 + gap / 40) / 400);
      const change = region.development - before;
      if (Math.abs(change) >= 0.1) recordDevelopment(c, { week, kind: 'region', regionId: region.id, change });
      region.support = clampMetric(region.support + (region.development - 50) / 40 + (c.legitimacy - 50) / 30);
    }
  }
  c.briefings.push({ week, message: week % 52 === 0 ? 'Tahun anggaran ditutup.' : week % 13 === 0 ? 'Realisasi APBN triwulan dan evaluasi kabinet tersedia.' : week % 4 === 0 ? 'Laporan ekonomi bulanan tersedia.' : 'Pemutakhiran mingguan dicatat.' });
  c.week++;
  if (week % weeksPerYear === 0 && week < termWeeks) {
    c.budgetArchive.push(c.budget);
    c.budget = { year: week / weeksPerYear + 1, status: 'open', plan: structuredClone(plan), execution: plan, accrued: emptyAccounts() };
  }
}

export function recordDevelopment(c: CampaignState, dispatch: Development) {
  (c.developments ??= []).push(dispatch);
}

export function applyPresidencyAction(state: GameState, action: PresidencyAction): GameState {
  validateCampaign(state.campaign);
  assert(!state.opening || state.opening.stage === 'complete', 'Selesaikan agenda perdana sebelum melanjutkan pemerintahan.');
  assert(state.campaign.week <= termWeeks, 'Masa jabatan telah berakhir.');
  const next = structuredClone(state);
  const c = next.campaign;
  const b = c.budget;
  switch (action.type) {
    case 'week':
    case 'routine':
      assert(!c.pendingEvent, 'Putuskan peristiwa yang aktif sebelum lanjut.');
      for (let i = 0; i < (action.type === 'routine' ? 4 : 1); i++) {
        const year = c.budget.year;
        advance(next);
        if (c.week <= termWeeks) offerStory(c, random(c));
        else c.election = countElection(c, () => random(c));
        if (c.pendingEvent || c.election || c.budget.year !== year || (c.week - 1) % 13 === 0) break;
      }
      break;
    case 'choose-story':
      chooseStory(c, action.choiceId);
      break;
    case 'submit-budget':
    case 'amend-budget': {
      assert(validPlan(action.plan), 'Alokasi atau tarif APBN di luar batas.');
      assert(action.type === 'submit-budget' ? ['open', 'rejected'].includes(b.status) : b.status === 'submitted', 'APBN tidak dapat diajukan atau diubah pada tahap ini.');
      b.plan = structuredClone(action.plan);
      b.status = 'submitted';
      delete b.vote;
      break;
    }
    case 'vote-budget': {
      assert(b.status === 'submitted', 'Ajukan APBN sebelum pemungutan suara.');
      assert(b.lastVoteWeek !== c.week, 'DPR hanya dapat memutuskan APBN sekali per minggu.');
      b.lastVoteWeek = c.week;
      const forecast = forecastPlan(c);
      b.vote = vote(c, difficulties[next.mandate.difficulty].whip, party => {
        const demand = baselinePlan.spending[party.preference];
        return clampMetric((b.plan.spending[party.preference] / demand - 1) * 30, -30, 20) - forecast.financing / c.economy.gdp * 370;
      });
      recordDevelopment(c, { week: c.week, kind: 'budget', approved: b.vote.approved, yes: b.vote.yes });
      b.status = b.vote.approved ? 'approved' : 'rejected';
      if (b.vote.approved) {
        b.execution = structuredClone(b.plan);
        c.delayedTax = [{ week: c.week + 13, value: b.plan.taxFactor }];
      }
      c.legitimacy = clampMetric(c.legitimacy + (b.vote.approved ? 2 : -3));
      break;
    }
    case 'coalition': {
      const party = caucuses.find(entry => entry.id === action.partyId);
      assert(party, 'Partai tidak ditemukan.');
      const bloc = c.blocs[party.id];
      assert(bloc.member !== action.join, 'Status partai sudah sesuai.');
      if (action.join) {
        const demand = baselinePlan.spending[party.preference];
        assert(bloc.trust >= 32 || (b.status !== 'open' && b.plan.spending[party.preference] >= demand * 1.12 && bloc.trust >= 15), 'Ajukan anggaran yang memenuhi permintaan partai.');
        bloc.trust = clampMetric(bloc.trust + 7);
        bloc.deal = party.objective;
      } else {
        bloc.trust = clampMetric(bloc.trust - 12);
        delete bloc.deal;
      }
      bloc.member = action.join;
      recordDevelopment(c, { week: c.week, kind: 'coalition', partyId: party.id, joined: action.join });
      break;
    }
    case 'submit-bill': {
      assert(billFields.includes(action.focus) && action.title.trim().length > 0 && action.title.trim().length <= 100, 'Judul atau fokus RUU tidak valid.');
      assert(!c.bills.some(bill => bill.title.toLowerCase() === action.title.trim().toLowerCase()), 'Judul RUU sudah digunakan.');
      c.bills.push({ id: 'bill-' + (c.bills.length + 1), title: action.title.trim(), focus: action.focus, stage: 'submitted', compromise: false });
      break;
    }
    default: {
      const bill = c.bills.find(item => item.id === action.id);
      assert(bill, 'RUU tidak ditemukan.');
      if (action.type === 'review-bill') {
        assert(bill.stage === 'submitted', 'RUU sudah ditinjau.');
        bill.stage = 'committee';
        break;
      }
      assert(bill.stage === 'committee', 'RUU belum masuk pembahasan atau sudah diputus.');
      if (action.type === 'amend-bill') {
        bill.compromise = true;
        break;
      }
      bill.vote = vote(c, difficulties[next.mandate.difficulty].whip, party => (party.preference === bill.focus ? 24 : -5) + (bill.compromise ? 10 : 0));
      bill.stage = bill.vote.approved ? 'approved' : 'rejected';
      if (bill.vote.approved && (bill.focus === 'education' || bill.focus === 'infrastructure')) {
        c.delayed.push({ week: c.week + 26, field: bill.focus === 'education' ? 'humanCapital' : 'infrastructure', amount: bill.compromise ? 1 : 2 });
      }
      if (bill.vote.approved && bill.focus === 'health') {
        c.delayed.push({ week: c.week + 13, field: 'humanCapital', amount: bill.compromise ? 0.5 : 1 });
      }
      if (bill.vote.approved && bill.focus === 'social') {
        for (const region of c.regions) region.support = clampMetric(region.support + (region.development < 60 ? 2 : 1));
      }
      c.legitimacy = clampMetric(c.legitimacy + (bill.vote.approved ? 2 : -1));
    }
  }
  validateCampaign(c);
  return next;
}

const range = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const integer = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isInteger(n) && range(n, min, max);

function validAccounts(a: Accounts) {
  if (!a || !revenueLines.every(key => range(a.revenue?.[key], 0, Infinity)) || !spendingLines.every(key => range(a.spending?.[key], 0, Infinity))) return false;
  const expected = balanceAccounts(a.revenue, a.spending);
  return (['totalRevenue', 'totalSpending', 'balance', 'primaryBalance', 'financing'] as const).every(key => a[key] === expected[key]);
}

function validVote(v: Vote) {
  return v && !!v.byParty && Object.keys(v.byParty).length === caucuses.length
    && caucuses.every(party => integer(v.byParty[party.id], 0, party.seats))
    && v.yes === Object.values(v.byParty).reduce((sum, value) => sum + value, 0)
    && v.no === seats - v.yes && v.approved === (v.yes > seats / 2);
}

function validBudget(b: CampaignState['budget'], year: number, throughWeek: number) {
  return b?.year === year && validPlan(b.plan) && validPlan(b.execution) && validAccounts(b.accrued)
    && ['open', 'submitted', 'approved', 'rejected'].includes(b.status)
    && (b.lastVoteWeek === undefined || integer(b.lastVoteWeek, (year - 1) * weeksPerYear + 1, throughWeek))
    && (['open', 'submitted'].includes(b.status) ? b.vote === undefined :
      b.lastVoteWeek !== undefined && !!b.vote && validVote(b.vote) && b.vote.approved === (b.status === 'approved'));
}

function validTracking(tracking: CashTracking) {
  return !!tracking && [tracking.plannedSpending, tracking.plannedRevenue, tracking.borrowing, tracking.redemption].every(n => range(n, 0, Infinity));
}

export function validateCampaign(c: CampaignState) {
  assert(c && validStoryState(c) && integer(c.week, 1, termWeeks + 1) && integer(c.seed, 0, 0xffffffff) && range(c.legitimacy, 0, 100));
  assert(c.economy && (Object.keys(initialEconomy) as (keyof typeof initialEconomy)[]).every(key =>
    range(c.economy[key], key === 'growth' || key === 'inflation' ? -100 : 0, Infinity)) && c.economy.gdp > 0 && c.economy.exchangeRate > 0);
  const year = Math.ceil(Math.min(c.week, termWeeks) / weeksPerYear);
  assert(validBudget(c.budget, year, c.week) && Array.isArray(c.budgetArchive) && c.budgetArchive.length === year - 1
    && c.budgetArchive.every((budget, index) => validBudget(budget, index + 1, (index + 1) * weeksPerYear)));
  assert(seats === parliamentSeats && c.blocs && Object.keys(c.blocs).length === caucuses.length && caucuses.every(({ id }) => {
    const bloc = c.blocs[id];
    return bloc && typeof bloc.member === 'boolean' && range(bloc.trust, 0, 100) && (bloc.deal === undefined || typeof bloc.deal === 'string');
  }));
  assert(Array.isArray(c.bills) && c.bills.every((b, index) => b && b.id === 'bill-' + (index + 1)
    && typeof b.title === 'string' && b.title.trim() && billFields.includes(b.focus) && typeof b.compromise === 'boolean'
    && ['submitted', 'committee', 'approved', 'rejected'].includes(b.stage)
    && (['submitted', 'committee'].includes(b.stage) ? b.vote === undefined : !!b.vote && validVote(b.vote) && b.vote.approved === (b.stage === 'approved'))));
  assert(integer(c.effectiveTax, 70, 140) && Array.isArray(c.delayedTax) && c.delayedTax.every(entry =>
    entry && integer(entry.week, c.week, termWeeks + 13) && integer(entry.value, 70, 140)));
  assert(Array.isArray(c.delayed) && c.delayed.every(d => d && integer(d.week, c.week, termWeeks + 26)
    && ['infrastructure', 'humanCapital'].includes(d.field) && range(d.amount, -10, 10)));
  const expectedRegions = initialCampaign(0).regions;
  assert(Array.isArray(c.regions) && c.regions.length === expectedRegions.length && c.regions.every((r, index) => r
    && r.id === expectedRegions[index].id && r.name === expectedRegions[index].name
    && r.population === expectedRegions[index].population && range(r.support, 0, 100) && range(r.development, 0, 100)));
  assert(Array.isArray(c.months) && c.months.length === Math.floor((c.week - 1) / 4)
    && c.months.every((m, i) => m && m.week === (i + 1) * 4 && range(m.gdp, 0, Infinity)
      && range(m.inflation, -3, 30) && range(m.unemployment, 1, 35)));
  assert(Array.isArray(c.quarters) && c.quarters.length === Math.floor((c.week - 1) / 13)
    && c.quarters.every((q, i) => q && q.week === (i + 1) * 13 && validAccounts(q.accounts) && range(q.debt, 0, Infinity)));
  assert(c.quarterTracking === undefined || ((c.week - 1) % 13 !== 0 && validTracking(c.quarterTracking)));
  assert(c.quarters.every((q, index) => {
    if (!q.tracking) return q.tracking === undefined;
    const openingDebt = index ? c.quarters[index - 1].debt : initialEconomy.debt;
    return validTracking(q.tracking) && Math.abs(q.debt - openingDebt - q.tracking.borrowing + q.tracking.redemption) < 0.000001;
  }));
  assert(c.developments === undefined || (Array.isArray(c.developments) && c.developments.every((item, index) => {
    if (!item || !integer(item.week, c.developments?.[index - 1]?.week ?? 1, Math.min(c.week, termWeeks))) return false;
    switch (item.kind) {
      case 'budget': return integer(item.yes, 0, parliamentSeats) && item.approved === (item.yes > parliamentSeats / 2);
      case 'coalition': return Object.hasOwn(c.blocs, item.partyId) && typeof item.joined === 'boolean';
      case 'effect': return ['humanCapital','infrastructure','tax'].includes(item.field) && range(item.change, -70, 70);
      case 'region': return c.regions.some(region => region.id === item.regionId) && range(item.change, -100, 100);
      case 'conflict': return Object.hasOwn(characters, item.characterId) && typeof item.positionId === 'string' && ['heard','resigned'].includes(item.choice);
      default: return false;
    }
  })));
  assert(Array.isArray(c.briefings) && c.briefings.length === c.week - 1
    && c.briefings.every((b, i) => b && b.week === i + 1 && typeof b.message === 'string'));
  assert(validElection(c));
  assert(Array.isArray(c.ministerReviews) && c.ministerReviews.every(r => r && integer(r.week, 1, c.week - 1)
    && r.week % 13 === 0 && typeof r.positionId === 'string' && Object.hasOwn(characters, r.holderId) && range(r.delivery, 0, 100)));
}
