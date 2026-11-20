import { describe, expect, it } from 'vitest';
import { chapters, defaultMandate, newPresident } from '@republik/game-data';
import { applyPresidencyAction, availableStory, chapterAgenda, chapterSummary, enableChapters, loadGame, saveGame, startChapterCampaign, transitionOpening } from '@republik/simulation';
import type { GameState } from '@republik/shared-types';
import { latestUnfinished, movePhase, preserveActive, readEntry, readSaves, resumePhase, saveState, updateSlot, writeSlot } from '../apps/mobile/src/services/game-flow';

const president = newPresident('Ayu Sasmita', 'female', 'standard');
const create = (scenario: 'standard' | 'recovery' = 'standard') => startChapterCampaign(42, president, defaultMandate(), scenario);
const step = applyPresidencyAction;

function introduction(game: GameState) {
  game = transitionOpening(game, { type: 'inaugurate' });
  game = transitionOpening(game, { type: 'opening-policy', policy: 'logistics' });
  game = transitionOpening(game, { type: 'opening-reply', reply: 'oversight' });
  return transitionOpening(game, { type: 'acknowledge-opening' });
}

function closeChapter(game: GameState, select: 0 | 1) {
  for (let i = 0; i < 20; i++) {
    if (chapterSummary(game.campaign)) return game;
    const event = availableStory(game.campaign);
    const decision = game.campaign.chapters!.choices.filter(c => c.chapter === Math.ceil(game.campaign.week / 13)).length;
    game = event ? step(game, { type: 'choose-story', choiceId: event.choices[select].id })
      : decision < 2 ? step(game, { type: 'chapter-choice', option: chapterAgenda(game).options[select].disabled ? 1 : select })
        : step(game, { type: 'advance-chapter' });
  }
  throw new Error('Bab tidak selesai.');
}

describe('chapter campaign', () => {
  it('creates a full cabinet and allows choices only after the opening', () => {
    const game = create();
    expect(resumePhase(game)).toBe('inauguration');
    expect(game.president).toEqual(president);
    expect(Object.values(game.positions).every(p => p.currentHolderId)).toBe(true);
    expect(() => step(game, { type: 'chapter-choice', option: 1 })).toThrow();
    expect(() => step(introduction(game), { type: 'advance-chapter' })).toThrow();
    expect(() => step(introduction(game), { type: 'routine' })).toThrow();
  });

  it('stops internal time for a branch, restores it, and reconciles the quarterly report', () => {
    let game = introduction(create());
    game = step(step(game, { type: 'chapter-choice', option: 0 }), { type: 'chapter-choice', option: 1 });
    const branched = step(game, { type: 'advance-chapter' });
    expect(branched.campaign.week).toBe(5);
    expect(branched.campaign.pendingEvent).toBeDefined();
    expect(branched.campaign.briefings).toHaveLength(4);
    const resumed = loadGame(saveGame(branched));
    const summary = closeChapter(resumed, 1);
    expect(chapterSummary(summary.campaign)).toBe(1);
    expect(summary.campaign.quarters[0].week).toBe(13);
    expect(summary.campaign.quarters[0].accounts.totalRevenue).toBeGreaterThan(0);
    expect(() => step(summary, { type: 'advance-chapter' })).toThrow();
    const next = step(loadGame(saveGame(summary)), { type: 'close-chapter' });
    expect(resumePhase(next)).toBe('playing');
    expect(next.campaign.week).toBe(14);
    const second = closeChapter(next, 1);
    expect(second.campaign.developments?.some(effect => effect.kind === 'effect' && effect.field === 'infrastructure' && effect.week === 14)).toBe(true);
  });

  it.each([0, 1] as const)('completes all 20 chapters and computes exactly one seeded finale (branch %s)', choice => {
    let game = introduction(create());
    expect(chapters).toHaveLength(20);
    for (let chapter = 1; chapter <= 20; chapter++) {
      game = closeChapter(game, choice);
      expect(chapterSummary(game.campaign)).toBe(chapter);
      expect(resumePhase(loadGame(saveGame(game)))).toBe('chapter_summary');
      game = step(game, { type: 'close-chapter' });
    }
    expect(game.campaign.briefings).toHaveLength(260);
    expect(game.campaign.quarters).toHaveLength(20);
    expect(game.campaign.chapters?.choices).toHaveLength(40);
    expect(game.campaign.election?.winnerId).toBeDefined();
    expect(resumePhase(game)).toBe('campaign_finale');
    const finished = step(game, { type: 'view-finale' });
    expect(resumePhase(finished)).toBe('post_game');
    expect(finished.campaign.election).toEqual(game.campaign.election);
    expect(() => step(finished, { type: 'view-finale' })).toThrow();
    expect(() => step(finished, { type: 'advance-chapter' })).toThrow();
    const history = saveState({ entries: [] }, finished, 'complete', 100);
    const replay = create('recovery');
    const restarted = saveState(preserveActive(history), replay, 'replay', 110);
    expect(readEntry(restarted.entries.find(entry => entry.id === 'history-complete')!)?.campaign.election).toEqual(finished.campaign.election);
    expect(replay.campaign.election).toBeUndefined();
    expect(replay.campaign.week).toBe(1);
    expect(replay.campaign.economy.foodPrice).toBeGreaterThan(create().campaign.economy.foodPrice);
    expect(replay.campaign.blocs.karya.member).not.toBe(create().campaign.blocs.karya.member);
  });

  it('migrates an earlier save at its actual week', () => {
    let legacy = introduction(create());
    delete legacy.campaign.chapters;
    legacy = step(legacy, { type: 'routine' });
    const migrated = enableChapters(loadGame(JSON.stringify({ state: legacy, version: 4 })));
    expect(migrated.campaign.week).toBe(legacy.campaign.week);
    expect(migrated.campaign.pendingEvent).toBe(legacy.campaign.pendingEvent);
    expect(migrated.campaign.quarters).toEqual(legacy.campaign.quarters);
  });
});

describe('save library and navigation', () => {
  it('keeps paused state inert and rejects bypassing the finale', () => {
    const playing = introduction(create());
    const pause = movePhase('playing', 'paused');
    expect(movePhase(pause, resumePhase(playing))).toBe('playing');
    expect(movePhase(pause, 'main_menu')).toBe('main_menu');
    expect(() => movePhase('playing', 'post_game')).toThrow();
    expect(() => movePhase('chapter_summary', 'legacy_view')).toThrow();
  });

  it('preserves the active run and enforces overwrite and delete confirmations', () => {
    const game = introduction(create());
    const first = saveState({ entries: [] }, game, 'first', 100, 'Politik');
    let saves = writeSlot(first, 1);
    expect(() => writeSlot(saves, 1)).toThrow();
    saves = updateSlot(saves, 'slot-1', { label: 'Sebelum sidang' });
    expect(saves.entries[0].label).toBe('Sebelum sidang');
    expect(saves.entries[0].tab).toBe('Politik');
    expect(() => updateSlot(saves, 'slot-1', { confirmed: false })).toThrow();
    saves = updateSlot(saves, 'slot-1', { confirmed: true });
    const next = saveState(preserveActive(saves), create('recovery'), 'new', 200);
    expect(readEntry(next.entries.find(entry => entry.id === 'resume-first')!)?.opening?.stage).toBe('complete');
    expect(latestUnfinished(next)?.runId).toBe('new');
    const corrupted = { ...next, auto: { ...next.auto!, raw: 'broken' } };
    expect(latestUnfinished(corrupted)?.runId).toBe('first');
  });

  it('reads the old autosave and three manual positions', () => {
    const raw = saveGame(create());
    const entries = new Map([['republik.game', raw], ['republik.game.slot.3', raw]]);
    const migrated = readSaves({ getItem: key => entries.get(key) ?? null });
    expect(migrated.auto?.id).toBe('auto');
    expect(migrated.entries.map(item => item.id)).toEqual(['slot-3']);
  });
});
