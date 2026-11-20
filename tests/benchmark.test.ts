import { describe, expect, it } from 'vitest';
import { backgrounds, defaultMandate, difficulties, initialGame, promiseProgress, promises } from '@republik/game-data';
import { applyPresidencyAction, availableStory, cabinetConflict, campaignNews, loadGame, quarterlyReports, resolveCabinetConflict, saveGame, startPresidency, startingTreasury } from '@republik/simulation';
import type { Background, Difficulty, GameState } from '@republik/shared-types';

const baseline = initialGame(41);
function advance(state: GameState, to: number) {
  while (state.campaign.week < to) {
    const story = availableStory(state.campaign);
    state = story ? applyPresidencyAction(state, { type: 'choose-story', choiceId: story.choices[0].id })
      : applyPresidencyAction(state, { type: 'week' });
  }
  return state;
}

describe('presidential mandate', () => {
  it.each(Object.keys(backgrounds) as Background[])('applies visible, bounded tradeoffs for %s', background => {
    const governor = startPresidency(41, baseline.president);
    const state = startPresidency(41, baseline.president, { ...defaultMandate(), background });
    const preset = backgrounds[background];
    expect(state.campaign.legitimacy).toBe(baseline.campaign.legitimacy + preset.legitimacy);
    expect(state.campaign.economy.confidence).toBe(baseline.campaign.economy.confidence + preset.confidence);
    expect(Object.values(state.positions).every(position => position.currentHolderId)).toBe(true);
    const governorTies: Record<string, number> = backgrounds.governor.ties;
    for (const [id, delta] of Object.entries(preset.ties)) {
      expect(state.campaign.blocs[id].trust).toBe(governor.campaign.blocs[id].trust - (governorTies[id] ?? 0) + delta);
    }
    expect(Math.abs(preset.legitimacy) + Math.abs(preset.confidence) +
      Object.values(preset.ties).reduce((n, value) => n + Math.abs(value), 0)).toBeLessThanOrEqual(12);
  });

  it('keeps difficulty presets deterministic and orders shocks and vote support', () => {
    const run = (difficulty: Difficulty) => {
      const state = startPresidency(41, baseline.president, { ...defaultMandate(), difficulty });
      expect(state.campaign.legitimacy).toBe(baseline.campaign.legitimacy + difficulties[difficulty].legitimacy);
      const { campaign } = advance({ ...state, opening: undefined }, 5);
      const plan = campaign.budget.plan;
      const submitted = applyPresidencyAction({ ...state, opening: undefined }, { type: 'submit-budget', plan });
      const voted = applyPresidencyAction(submitted, { type: 'vote-budget' });
      return { shock: Math.abs(campaign.economy.energyPrice - 100), votes: voted.campaign.budget.vote!.yes };
    };
    const [relaxed, standard, demanding] = (['relaxed', 'standard', 'demanding'] as const).map(run);
    expect(relaxed.shock).toBeLessThan(standard.shock);
    expect(standard.shock).toBeLessThan(demanding.shock);
    expect(relaxed.votes).toBeGreaterThanOrEqual(standard.votes);
    expect(standard.votes).toBeGreaterThanOrEqual(demanding.votes);
  });

  it('requires three distinct promises, tracks progress and evaluates the saved ending', () => {
    expect(Object.keys(promises)).toHaveLength(12);
    expect(() => startPresidency(41, baseline.president, { ...defaultMandate(), promises: ['food', 'food', 'debt'] })).toThrow();
    const state = initialGame(41);
    Object.assign(state.mandate, { promises: ['jobs', 'regional', 'growth'] });
    expect(() => saveGame(state)).toThrow();
    state.mandate.promises = ['jobs', 'debt', 'growth'];
    const finished = advance(state, 261);
    const progress = promiseProgress(loadGame(saveGame(finished)));
    expect(finished.campaign.election).toBeDefined();
    expect(progress).toHaveLength(3);
    expect(progress[0].met).toBe(finished.campaign.economy.unemployment <= 4);
    expect(progress[1].value).toBeCloseTo(finished.campaign.economy.debt / finished.campaign.economy.gdp * 100);
    expect(progress[2].value).toBe(finished.campaign.economy.growth);
  });
});

describe('treasury, news and cabinet', () => {
  it('reconciles quarterly revenue, cash, gross debt flows and variances across a fiscal rollover', () => {
    const state = advance(initialGame(41), 66);
    const reports = quarterlyReports(state.campaign);
    expect(reports.map(r => r.week)).toEqual([13, 26, 39, 52, 65]);
    expect(reports[0].openingCash).toBe(startingTreasury);
    for (const [index, report] of reports.entries()) {
      expect(report.openingCash).toBe(index === 0 ? startingTreasury : reports[index - 1].endingCash);
      expect(report.endingCash).toBeCloseTo(report.openingCash + report.revenue - report.expenditure + report.netFinancing);
      expect(report.mandatorySpending + report.discretionarySpending).toBeCloseTo(report.expenditure);
      expect(report.borrowing! - report.redemption!).toBeCloseTo(report.netFinancing);
      expect(report.revenueVariance! - report.spendingVariance!).toBeCloseTo(report.budgetVariance!);
    }
    expect(reports[4].revenue).toBe(state.campaign.quarters[4].accounts.totalRevenue);
    expect(quarterlyReports(loadGame(saveGame(state)).campaign)).toEqual(reports);
  });

  it('records gross borrowing and pauses a routine skip at the fiscal briefing', () => {
    const start = initialGame(41);
    start.campaign.budget.execution.taxFactor = 70;
    start.campaign.budget.execution.spending.infrastructure = 960;
    start.campaign.budget.execution.spending.education = 1410;
    const ready = advance(start, 13);
    const next = applyPresidencyAction(ready, { type: 'routine' });
    expect(next.campaign.week).toBe(14);
    const report = quarterlyReports(next.campaign)[0];
    expect(report.balance).toBeLessThan(0);
    expect(report.borrowing).toBeGreaterThan(0);
    expect(report.netFinancing).toBeCloseTo(-report.balance);
    expect(report.endingCash).toBeCloseTo(startingTreasury);
  });

  it('reports only real simulation developments and delayed effects', () => {
    const state = initialGame(41);
    const negotiated = applyPresidencyAction(state, { type: 'coalition', partyId: 'pesisir', join: true });
    expect(campaignNews(negotiated)[0]).toMatchObject({ week: 1, breaking: true, title: 'Persatuan Pesisir masuk koalisi' });
    const played = advance(negotiated, 28);
    const news = campaignNews(loadGame(saveGame(played)));
    expect(news.some(article => article.outlet === 'Warta Nasional')).toBe(true);
    expect(news.some(article => article.outlet === 'Kabar Daerah')).toBe(true);
    expect(news.some(article => article.title === 'Dampak kebijakan jatuh tempo')).toBe(true);
    expect(new Set(news.map(article => article.id)).size).toBe(news.length);
  });

  it('records cabinet memory or a real vacancy when a minister disputes funding', () => {
    const game = startPresidency(41, baseline.president);
    game.opening = undefined;
    game.campaign.budget.execution.spending.health = 100;
    const state = advance(game, 5);
    expect(cabinetConflict(state, 'health')?.id).toBe('maya_santoso');
    const heard = resolveCabinetConflict(state, 'health', 'heard');
    expect(heard.characters.maya_santoso.relationships.bima_aditya_pratama).toBe(
      state.characters.maya_santoso.relationships.bima_aditya_pratama + 7,
    );
    expect(cabinetConflict(loadGame(saveGame(heard)), 'health')).toBeUndefined();
    const resignation = resolveCabinetConflict(state, 'health', 'resigned');
    expect(resignation.positions.health.currentHolderId).toBeUndefined();
    expect(resignation.appointments.find(item => item.positionId === 'health')?.endTurn).toBeDefined();
    expect(campaignNews(resignation).some(article => article.title.includes('Maya Santoso melepas jabatan'))).toBe(true);
  });

  it('migrates a legacy campaign and keeps unrecorded gross finance fields unavailable', () => {
    const state = advance(initialGame(41), 14);
    const legacy = structuredClone(state) as Partial<GameState>;
    delete legacy.mandate;
    delete legacy.campaign?.quarters[0].tracking;
    const migrated = loadGame(JSON.stringify({ version: 3, state: legacy }));
    expect(migrated.mandate).toEqual(defaultMandate());
    expect(quarterlyReports(migrated.campaign)[0].borrowing).toBeUndefined();
    expect(migrated.campaign.week).toBe(14);
  });
});
