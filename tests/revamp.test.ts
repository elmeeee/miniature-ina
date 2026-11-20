import { describe, expect, it } from 'vitest';
import { caucuses, currentCharacter, initialGame, newPresident, parliamentSeats, presidentId, salutation } from '@republik/game-data';
import { applyPresidencyAction, forecast, loadGame, openingDialogue, openingHeadline, saveGame, startPresidency, transitionOpening } from '@republik/simulation';
import { portraitUrl } from '../apps/mobile/src/services/assets';

describe('cinematic presidency', () => {
  it('validates normalized Unicode names and offers both visual identities', () => {
    const profile = newPresident('  Inez   Sekar Amélia  ', 'female', 'standard');
    expect(profile.name).toBe('Inez Sekar Amélia');
    expect(salutation(profile)).toBe('Ibu Presiden');
    expect(portraitUrl(profile.portrait)).toMatch(/laras_prameswari\/portrait\.png$/);
    const male = newPresident('Rangga Wijaya', 'male', 'standard');
    expect(salutation(male)).toBe('Bapak Presiden');
    expect(portraitUrl(male.portrait, 'serious')).toContain('bima_aditya_pratama');
    expect(salutation(newPresident('Dara Ayu', 'female', 'neutral'))).toBe('Presiden');
    expect(() => newPresident('  ', 'male', 'neutral')).toThrow();
    expect(() => newPresident('A'.repeat(49), 'male', 'standard')).toThrow();
  });

  it('starts a valid staffed scenario without requesting world data', () => {
    const identity = newPresident('Inez Sekar Amélia', 'female', 'standard');
    const state = startPresidency(44, identity);
    expect(state).toEqual(startPresidency(44, identity));
    expect(state.opening?.stage).toBe('inauguration');
    expect(state.campaign.week).toBe(1);
    expect(new Set(Object.values(state.positions).map(p => p.currentHolderId)).size).toBe(3);
    expect(state.appointments).toHaveLength(3);
    expect(caucuses.reduce((sum, party) => sum + party.seats, 0)).toBe(parliamentSeats);
    const account = forecast(state.campaign.economy, state.campaign.budget.execution);
    expect(account.balance).toBeCloseTo(account.totalRevenue - account.totalSpending);
    expect(currentCharacter(state, presidentId).fullName).toBe(identity.name);
    expect(currentCharacter(state, 'ratna_kusuma').fullName).toBe('Ratna Kusuma');
  });

  it('personalizes dialogue and headline, records a decision and resumes after reload', () => {
    const created = startPresidency(29, newPresident('Nia Permatasari', 'female', 'standard'));
    expect(() => applyPresidencyAction(created, { type: 'week' })).toThrow();
    const briefing = transitionOpening(created, { type: 'inaugurate' });
    expect(openingDialogue(briefing)).toContain('Ibu Presiden Nia Permatasari');
    const relief = transitionOpening(briefing, { type: 'opening-policy', policy: 'relief' });
    const logistics = transitionOpening(briefing, { type: 'opening-policy', policy: 'logistics' });
    const a = forecast(relief.campaign.economy, relief.campaign.budget.execution);
    const b = forecast(logistics.campaign.economy, logistics.campaign.budget.execution);
    expect(a.totalSpending).toBeCloseTo(b.totalSpending);
    expect(openingHeadline(relief)).toContain('Nia Permatasari');
    expect(relief.campaign.budget.execution.spending.social).toBe(briefing.campaign.budget.execution.spending.social + 60);
    expect(logistics.campaign.delayed).toContainEqual({ week: 14, field: 'infrastructure', amount: 1.5 });
    const restored = loadGame(saveGame(logistics));
    const response = transitionOpening(restored, { type: 'opening-reply', reply: 'autonomy' });
    expect(response.campaign.blocs.karya.trust).toBe(restored.campaign.blocs.karya.trust + 5);
    expect(response.characters.anindita_prameswari.relationships[presidentId]).toBe(
      briefing.characters.anindita_prameswari.relationships[presidentId] + 4,
    );
    const complete = transitionOpening(response, { type: 'acknowledge-opening' });
    const advanced = applyPresidencyAction(complete, { type: 'routine' });
    expect(advanced.campaign.week).toBe(5);
    expect(advanced.campaign.pendingEvent).toBe('nursing-service');
    expect(() => transitionOpening(complete, { type: 'opening-reply', reply: 'autonomy' })).toThrow();
    expect(loadGame(saveGame(advanced)).president).toEqual(created.president);
  });

  it('migrates version 2 with its campaign and cabinet history intact', () => {
    const game = applyPresidencyAction(initialGame(42), { type: 'week' });
    const { president, ...legacy } = game;
    const restored = loadGame(JSON.stringify({ version: 2, state: legacy }));
    expect(restored.president).toEqual(president);
    expect(restored.opening).toBeUndefined();
    expect(restored.campaign).toEqual(game.campaign);
    expect(restored.appointments).toEqual(game.appointments);
  });
});
