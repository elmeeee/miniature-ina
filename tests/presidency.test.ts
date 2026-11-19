import { describe, expect, it } from 'vitest';
import { baselinePlan, caucuses, initialGame, parliamentSeats, termWeeks } from '@republik/game-data';
import {
  applyCabinetAction, applyPresidencyAction, availableStory, epilogues,
  forecast, loadGame, saveGame, validStoryCatalog, type PresidencyAction,
} from '@republik/simulation';
import type { GameState } from '@republik/shared-types';

const command = applyPresidencyAction;

function advance(state: GameState, to: number, choice = 0): GameState {
  while (state.campaign.week < to) {
    const story = availableStory(state.campaign);
    state = story ? command(state, { type: 'choose-story', choiceId: story.choices[choice].id }) :
      command(state, { type: 'week' });
  }
  return state;
}

function assembleMajority(state: GameState) {
  for (const id of ['pesisir', 'hijau', 'asas']) state = command(state, { type: 'coalition', partyId: id, join: true });
  return state;
}

describe('presidency and APBN', () => {
  it('reconciles revenue, expenditure, primary balance, financing, interest and weekly debt', () => {
    const initial = initialGame(42);
    const accounts = forecast(initial.campaign.economy, baselinePlan);
    expect(accounts.totalRevenue).toBeCloseTo(Object.values(accounts.revenue).reduce((a, b) => a + b));
    expect(accounts.totalSpending).toBeCloseTo(Object.values(accounts.spending).reduce((a, b) => a + b));
    expect(accounts.spending.interest).toBeCloseTo(initial.campaign.economy.debt * initial.campaign.economy.interestRate / 100);
    expect(accounts.primaryBalance).toBeCloseTo(accounts.balance + accounts.spending.interest);
    expect(accounts.financing).toBe(Math.max(0, -accounts.balance));
    const { campaign: next } = command(initial, { type: 'week' });
    expect(next.economy.debt).toBeCloseTo(initial.campaign.economy.debt - next.budget.accrued.balance);
    expect(next.economy.gdp).toBeGreaterThan(initial.campaign.economy.gdp);
  });

  it('supports amendments and runs an approved budget with delayed investment effects', () => {
    const state = assembleMajority(initialGame(23));
    const proposed = { ...baselinePlan, taxFactor: 140 };
    const amended = { ...proposed, spending: { ...baselinePlan.spending, education: 550 } };
    const submitted = command(state, { type: 'submit-budget', plan: proposed });
    expect(submitted.campaign.budget.execution).toEqual(baselinePlan);
    const vote = command(command(submitted, { type: 'amend-budget', plan: amended }), { type: 'vote-budget' });
    expect(vote.campaign.budget.status).toBe('approved');
    expect(vote.campaign.budget.execution).toEqual(amended);
    expect(vote.campaign.effectiveTax).toBe(100);
    const before = advance(vote, 14);
    expect(before.campaign.effectiveTax).toBe(100);
    const after = advance(before, 15);
    expect(after.campaign.effectiveTax).toBe(140);
    const beforeProject = advance(after, 26, 1);
    expect(beforeProject.campaign.economy.infrastructure).toBe(state.campaign.economy.infrastructure);
    expect(advance(beforeProject, 27).campaign.economy.infrastructure).toBeGreaterThan(state.campaign.economy.infrastructure);
  });

  it('leaves execution on carryover if a high-deficit proposal fails', () => {
    const initial = initialGame(42);
    const oversized = structuredClone(baselinePlan);
    oversized.taxFactor = 70;
    for (const key of Object.keys(oversized.spending) as (keyof typeof oversized.spending)[]) oversized.spending[key] *= 3;
    const voted = command(command(initial, { type: 'submit-budget', plan: oversized }), { type: 'vote-budget' });
    expect(voted.campaign.budget.status).toBe('rejected');
    expect(voted.campaign.budget.execution).toEqual(baselinePlan);
    const resubmitted = command(voted, { type: 'submit-budget', plan: baselinePlan });
    expect(() => command(resubmitted, { type: 'vote-budget' })).toThrow('sekali per minggu');
    expect(command(command(resubmitted, { type: 'week' }), { type: 'vote-budget' }).campaign.budget.lastVoteWeek).toBe(2);
  });

  it('opens a new annual budget and archives fiscal and economic reports', () => {
    const state = advance(initialGame(), 53);
    expect(state.campaign.budget).toMatchObject({ year: 2, status: 'open', accrued: { balance: 0 } });
    expect(state.campaign.quarters.map(record => record.week)).toEqual([13, 26, 39, 52]);
    expect(state.campaign.months).toHaveLength(13);
    expect(state.campaign.budgetArchive).toHaveLength(1);
    expect(state.campaign.budgetArchive[0].accrued).toEqual(state.campaign.quarters[3].accounts);
  });

  it('counts all DPR seats and applies coalition membership and cabinet relations', () => {
    const initial = initialGame();
    const agenda: PresidencyAction[] = [
      { type: 'submit-bill', title: 'Rujukan Kesehatan', focus: 'health' },
      { type: 'review-bill', id: 'bill-1' },
      { type: 'amend-bill', id: 'bill-1' },
      { type: 'vote-bill', id: 'bill-1' },
    ];
    const baseline = agenda.reduce(command, initial);
    const negotiated = assembleMajority(initial);
    expect(negotiated.campaign.blocs.hijau.member).toBe(true);
    const result = agenda.reduce(command, negotiated).campaign.bills[0].vote!;
    expect(result.yes).toBeGreaterThan(baseline.campaign.bills[0].vote!.yes);
    expect(result.yes + result.no).toBe(parliamentSeats);
    expect(result.yes).toBe(Object.values(result.byParty).reduce((a, b) => a + b));
    expect(caucuses.every(party => result.byParty[party.id] <= party.seats)).toBe(true);
    const withdrawn = command(negotiated, { type: 'coalition', partyId: 'hijau', join: false });
    expect(withdrawn.campaign.blocs.hijau.member).toBe(false);
    expect(withdrawn.campaign.blocs.hijau.deal).toBeUndefined();
    const appointed = applyCabinetAction(withdrawn, { type: 'appoint', positionId: 'finance', characterId: 'anindita_prameswari', reason: 'Mandat fiskal' });
    expect(appointed.campaign.blocs.nusantara.trust).toBe(withdrawn.campaign.blocs.nusantara.trust + 4);
    expect(appointed.campaign.week).toBe(withdrawn.campaign.week);
    expect(advance(appointed, 14).campaign.ministerReviews[0].holderId).toBe('anindita_prameswari');
  });

  it('validates the story graph and makes branching consequences exclusive', () => {
    expect(validStoryCatalog()).toBe(true);
    const initial = initialGame(42);
    const early = advance(initial, 5);
    expect(availableStory(early.campaign)?.id).toBe('nursing-service');
    expect(() => command(early, { type: 'week' })).toThrow();
    const training = command(early, { type: 'choose-story', choiceId: 'train' });
    expect(training.campaign.delayed).toContainEqual({ week: 18, field: 'humanCapital', amount: 2 });
    const rotation = command(early, { type: 'choose-story', choiceId: 'rotate' });
    expect(rotation.campaign.delayed).toHaveLength(0);
    expect(rotation.campaign.legitimacy).toBeGreaterThan(early.campaign.legitimacy);

    const warm = structuredClone(initial);
    warm.campaign.economy.energyPrice = 170;
    const debate = advance(warm, 9);
    expect(availableStory(debate.campaign)?.id).toBe('fuel-prices');
    const audit = advance(command(debate, { type: 'choose-story', choiceId: 'aid' }), 10);
    expect(availableStory(audit.campaign)?.id).toBe('aid-audit');
    expect(advance(command(debate, { type: 'choose-story', choiceId: 'logistics' }), 10).campaign.pendingEvent).toBeUndefined();
  });

  it('migrates the cabinet-only save and rejects a tampered total', () => {
    const initial = initialGame(9);
    const { campaign, ...legacy } = initial;
    const migrated = loadGame(JSON.stringify({ version: 1, state: legacy }));
    expect(migrated.campaign).toEqual(campaign);
    const broken = JSON.parse(saveGame(initial));
    broken.state.campaign.budget.accrued.balance = 19;
    expect(() => loadGame(JSON.stringify(broken))).toThrow();
  });

  it('can produce an electoral defeat following failed budgets and coalition withdrawal', () => {
    let state = advance(initialGame(42), 225);
    for (const partyId of ['nusantara', 'karya']) state = command(state, { type: 'coalition', partyId, join: false });
    const unfunded = structuredClone(baselinePlan);
    unfunded.taxFactor = 70;
    for (const key of Object.keys(unfunded.spending) as (keyof typeof unfunded.spending)[]) unfunded.spending[key] *= 3;
    while (state.campaign.week <= termWeeks) {
      const week = state.campaign.week;
      state = command(state, { type: 'submit-budget', plan: unfunded });
      state = command(state, { type: 'vote-budget' });
      expect(state.campaign.budget.status).toBe('rejected');
      state = advance(state, week + 1, 0);
    }
    expect(state.campaign.election?.winnerId).not.toBe('bima');
    expect(state.campaign.election?.epilogues).toEqual(expect.arrayContaining(['transition', 'fracture', 'contested']));
  });

  it.each([42, 7, 12345, 395])('completes 260 weeks without deadlock (seed %s)', seed => {
    const scenario = assembleMajority(initialGame(seed));
    const checkpoint = advance(scenario, 130, seed % 2);
    const restored = loadGame(saveGame(checkpoint));
    const ending = advance(restored, termWeeks + 1, seed % 2);
    expect(saveGame(ending)).toBe(saveGame(advance(scenario, termWeeks + 1, seed % 2)));
    expect(ending.campaign.briefings).toHaveLength(260);
    expect(ending.campaign.quarters).toHaveLength(20);
    expect(ending.campaign.budgetArchive).toHaveLength(4);
    expect(Object.values(ending.campaign.economy).every(Number.isFinite)).toBe(true);
    const election = ending.campaign.election!;
    expect(election.votes[election.winnerId]).toBe(Math.max(...Object.values(election.votes)));
    expect(Object.values(election.votes).reduce((a, b) => a + b)).toBe(election.regions.reduce((sum, r) => sum + r.turnout, 0));
    if (seed === 42) expect(election.winnerId).toBe('bima');
    expect(election.epilogues.every(id => Object.hasOwn(epilogues, id))).toBe(true);
    expect(election.epilogues).toContain(election.winnerId === 'bima' ? 'continuity' : 'transition');
    expect(() => command(ending, { type: 'week' })).toThrow();
  });
});
