import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterPortrait } from '@republik/ui';
import { describe, expect, it } from 'vitest';
import { initialGame, presidentId } from '@republik/game-data';
import { applyCabinetAction, candidatePool, loadGame, realignCharacter, saveGame } from '@republik/simulation';
import { portraitUrl } from '../apps/mobile/src/services/assets';

const anindita = 'anindita_prameswari';
const surya = 'surya_wirawan';
const maya = 'maya_santoso';
const reason = 'Evaluasi kinerja';
const empty = initialGame(42);
const appoint = (state = empty, positionId = 'finance', characterId = anindita) =>
  applyCabinetAction(state, { type: 'appoint', positionId, characterId, reason });
const staffed = () => appoint();

describe('cabinet engine', () => {
  it('appoints a new minister without mutating the input', () => {
    expect(staffed().positions.finance.currentHolderId).toBe(anindita);
    expect(empty.appointments).toHaveLength(0);
    expect(staffed()).toEqual(staffed());
  });

  it('replaces a minister and closes the previous appointment', () => {
    const result = applyCabinetAction(staffed(), { type: 'replace', positionId: 'finance', characterId: maya, reason });
    expect(result.positions.finance.currentHolderId).toBe(maya);
    expect(result.appointments[0]).toMatchObject({ endTurn: result.turn, dismissalReason: reason });
  });

  it('rotates two ministers atomically in one turn', () => {
    const before = appoint(staffed(), 'foreign', surya);
    const result = applyCabinetAction(before, { type: 'rotate', positionId: 'foreign', otherPositionId: 'finance', reason });
    expect(result.positions.finance.currentHolderId).toBe(surya);
    expect(result.positions.foreign.currentHolderId).toBe(anindita);
    expect(result.turn).toBe(before.turn + 1);
    expect(result.appointments.filter(entry => entry.endTurn === result.turn)).toHaveLength(2);
  });

  it('records a resignation and preserves the character', () => {
    const result = applyCabinetAction(staffed(), { type: 'resign', positionId: 'finance', reason: 'Alasan pribadi' });
    expect(result.appointments[0].dismissalReason).toBe('Alasan pribadi');
    expect(result.positions.finance.currentHolderId).toBeUndefined();
    expect(result.characters[anindita]).toBeDefined();
  });

  it('supports a vacancy and rejects dismissing an empty office', () => {
    expect(empty.positions.health.currentHolderId).toBeUndefined();
    expect(() => applyCabinetAction(empty, { type: 'dismiss', positionId: 'health', reason })).toThrow();
  });

  it('allows reappointment and keeps prior history', () => {
    const dismissed = applyCabinetAction(staffed(), { type: 'dismiss', positionId: 'finance', reason });
    expect(candidatePool(dismissed).some(person => person.id === anindita)).toBe(true);
    expect(appoint(dismissed).appointments).toHaveLength(2);
  });

  it('changes party coalition and personal relationships', () => {
    const result = staffed();
    expect(result.parties.nusantara.coalition).toBe(empty.parties.nusantara.coalition + 4);
    expect(result.characters[anindita].relationships[presidentId]).toBe(empty.characters[anindita].relationships[presidentId] + 4);
    expect(result.events).toHaveLength(1);
    const realigned = realignCharacter(result, anindita, 'karya', 'Bergabung dengan koalisi baru');
    expect(realigned.characters[anindita].partyId).toBe('karya');
    expect(realigned.parties.karya.coalition).toBe(result.parties.karya.coalition + 2);
  });

  it('restores a reshuffle and migrates an older save', () => {
    const result = applyCabinetAction(staffed(), { type: 'replace', positionId: 'finance', characterId: surya, reason });
    expect(loadGame(saveGame(result))).toEqual(JSON.parse(JSON.stringify(result)));
    const { events, ...legacy } = result;
    expect(events).not.toHaveLength(0);
    expect(loadGame(JSON.stringify({ version: 0, state: legacy })).events).toEqual([]);
  });

  it('rejects duplicate appointments in commands and saved state', () => {
    const result = staffed();
    expect(() => appoint(result, 'health')).toThrow();
    result.appointments.push({ ...result.appointments[0], id: 'duplicate', positionId: 'health' });
    result.positions.health.currentHolderId = anindita;
    expect(() => saveGame(result)).toThrow();
  });

  it('renders an accessible initials fallback for missing artwork', () => {
    const name = 'Anindita Prameswari';
    const src = portraitUrl('unknown_character', 'thinking');
    const markup = renderToStaticMarkup(createElement(CharacterPortrait, { name, src }));
    expect(markup).toContain('aria-label="Potret pengganti untuk Anindita Prameswari"');
    expect(markup).toContain('>AP</span>');
  });
});
