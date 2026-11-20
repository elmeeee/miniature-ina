import { applyOpeningAction, validOpening, type OpeningAction } from './opening';
export { openingDialogue, openingHeadline, openingPolicies, coalitionReplies, type OpeningAction } from './opening';
import { recordDevelopment, validateCampaign } from './campaign';
export * from './campaign';
export { forecast } from './fiscal';
export * from './quarterly';
export * from './news';
import { backgrounds, characters, defaultMandate, difficulties, validMandate, defaultPresident, initialCampaign, initialGame, isPresident, positions, presidentId, termWeeks } from '@republik/game-data';
import type { GameState, Mandate, PresidentIdentity } from '@republik/shared-types';

export type CabinetAction =
  | { type: 'appoint' | 'replace'; positionId: string; characterId: string; reason: string }
  | { type: 'dismiss' | 'resign'; positionId: string; reason: string }
  | { type: 'rotate'; positionId: string; otherPositionId: string; reason: string };

const candidateRoles = new Set(['minister', 'advisor', 'regional']);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function candidatePool(state: GameState) {
  const active = new Set(Object.values(state.positions).map(position => position.currentHolderId));
  return Object.values(characters).filter(character => candidateRoles.has(character.role) && !active.has(character.id));
}

function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function validateState(state: GameState): void {
  requireValid(isRecord(state) && inRange(state.turn, 1, Number.MAX_SAFE_INTEGER) && inRange(state.seed, 0, 0xffffffff), 'Giliran atau seed tidak valid.');
  requireValid(isRecord(state.characters) && isRecord(state.parties) && isRecord(state.positions) && Array.isArray(state.appointments) && Array.isArray(state.events), 'Struktur simpanan tidak valid.');
  validateCampaign(state.campaign);
  requireValid(isPresident(state.president) && validMandate(state.mandate) && validOpening(state.opening, state), 'Profil atau adegan Presiden tidak valid.');
  const baseline = initialGame();
  requireValid(Object.keys(state.characters).length === Object.keys(characters).length && Object.keys(state.parties).length === Object.keys(baseline.parties).length, 'Daftar tokoh atau partai tidak lengkap.');
  for (const id of Object.keys(characters)) {
    const character = state.characters[id];
    requireValid(isRecord(character) && isRecord(character.relationships) && (character.partyId === undefined || Object.hasOwn(state.parties, character.partyId)), 'Status tokoh tidak valid.');
    requireValid(Object.entries(character.relationships).every(([target, value]) => Object.hasOwn(characters, target) && target !== id && inRange(value, -100, 100)), 'Relasi tokoh tidak valid.');
  }
  for (const id of Object.keys(baseline.parties)) {
    const party = state.parties[id];
    requireValid(isRecord(party) && party.id === id && typeof party.name === 'string' && Object.hasOwn(characters, party.leaderId) && inRange(party.coalition, 0, 100)
      && [party.factions, party.preferences].every(list => Array.isArray(list) && list.every(item => typeof item === 'string')), 'Status partai tidak valid.');
  }
  requireValid(Object.keys(state.positions).length === positions.length, 'Daftar jabatan tidak lengkap.');
  for (const [id, title, ministryId] of positions) {
    const position = state.positions[id];
    requireValid(isRecord(position) && position.id === id && position.title === title && position.ministryId === ministryId, 'Status jabatan tidak valid.');
  }
  const ids = new Set<string>();
  const active = new Map<string, string>();
  const intervals = new Map<string, number>();
  const history = [...state.appointments];
  requireValid(history.every(entry => isRecord(entry) && inRange(entry.startTurn, 1, state.turn)), 'Awal masa jabatan tidak valid.');
  history.sort((left, right) => left.startTurn - right.startTurn);
  for (const entry of history) {
    requireValid(typeof entry.id === 'string' && entry.id.length && !ids.has(entry.id), 'ID penunjukan ganda atau tidak valid.');
    requireValid(Object.hasOwn(state.positions, entry.positionId) && Object.hasOwn(characters, entry.characterId)
      && candidateRoles.has(characters[entry.characterId].role) && typeof entry.appointmentReason === 'string' && entry.appointmentReason.trim(), 'Riwayat kabinet tidak valid.');
    ids.add(entry.id);
    if (entry.endTurn === undefined) {
      requireValid(entry.dismissalReason === undefined, 'Alasan pemberhentian tidak sesuai.');
      active.set(entry.positionId, entry.characterId);
    } else {
      requireValid(inRange(entry.endTurn, entry.startTurn + 1, state.turn) && typeof entry.dismissalReason === 'string' && entry.dismissalReason.trim(), 'Akhir masa jabatan tidak valid.');
    }
    for (const key of ['position:' + entry.positionId, 'character:' + entry.characterId]) {
      requireValid((intervals.get(key) ?? 0) <= entry.startTurn, 'Masa jabatan tumpang tindih.');
      intervals.set(key, entry.endTurn ?? Infinity);
    }
  }
  requireValid(Object.values(state.positions).every(position => position.currentHolderId === active.get(position.id)), 'Riwayat dan pemegang jabatan tidak cocok.');
  const eventIds = new Set<string>();
  for (const event of state.events) {
    requireValid(isRecord(event) && typeof event.id === 'string' && !eventIds.has(event.id) && inRange(event.turn, 1, state.turn) && typeof event.title === 'string' && (event.week === undefined || inRange(event.week, 1, state.campaign.week))
      && ['support', 'scrutiny', 'realignment'].includes(event.kind), 'Peristiwa politik tidak valid.');
    eventIds.add(event.id);
  }
}

export function applyCabinetAction(state: GameState, action: CabinetAction): GameState {
  validateState(state);
  requireValid(state.campaign.week <= termWeeks, 'Masa jabatan telah berakhir.');
  const reason = action.reason.trim();
  requireValid(reason, 'Masukkan alasan keputusan.');
  requireValid(Object.hasOwn(state.positions, action.positionId), 'Jabatan tidak ditemukan.');
  const next = structuredClone(state);
  next.turn++;
  const position = next.positions[action.positionId];
  const incumbent = position.currentHolderId;
  const changes: { id: string; delta: number }[] = [];

  function close(positionId: string) {
    const appointment = next.appointments.find(entry => entry.positionId === positionId && entry.endTurn === undefined);
    requireValid(appointment, 'Jabatan sudah kosong.');
    appointment.endTurn = next.turn;
    appointment.dismissalReason = reason;
    delete next.positions[positionId].currentHolderId;
    changes.push({ id: appointment.characterId, delta: action.type === 'resign' ? -2 : -5 });
  }

  function open(positionId: string, characterId: string) {
    next.positions[positionId].currentHolderId = characterId;
    next.appointments.push({ id: 'appointment-' + next.turn + '-' + positionId, characterId, positionId, startTurn: next.turn, appointmentReason: reason });
    changes.push({ id: characterId, delta: 4 });
  }

  switch (action.type) {
    case 'appoint':
    case 'replace':
      requireValid(candidatePool(state).some(candidate => candidate.id === action.characterId), 'Kandidat tidak tersedia atau sudah menjabat.');
      requireValid(action.type === 'replace' ? incumbent : !incumbent, 'Jenis keputusan tidak sesuai dengan status jabatan.');
      if (incumbent) close(position.id);
      open(position.id, action.characterId);
      break;
    case 'dismiss':
    case 'resign':
      close(position.id);
      break;
    case 'rotate': {
      requireValid(action.otherPositionId !== position.id && Object.hasOwn(next.positions, action.otherPositionId), 'Pilih jabatan lain.');
      const other = next.positions[action.otherPositionId];
      requireValid(incumbent && other.currentHolderId, 'Kedua jabatan harus terisi.');
      const otherHolder = other.currentHolderId;
      close(position.id);
      close(other.id);
      open(position.id, otherHolder);
      open(other.id, incumbent);
      break;
    }
  }

  for (const { id, delta } of changes) {
    const character = next.characters[id];
    adjustRelationship(next, id, presidentId, delta);
    adjustRelationship(next, presidentId, id, delta);
    if (character.partyId) {
      const party = next.parties[character.partyId];
      party.coalition = clamp(party.coalition + delta, 0, 100);
      const bloc = next.campaign.blocs[party.id];
      bloc.trust = clamp(bloc.trust + delta, 0, 100);
    }
  }
  next.seed = (Math.imul(next.seed, 1664525) + 1013904223) >>> 0;
  const scrutiny = next.seed / 0x100000000 < 0.4;
  next.events.push({ id: 'cabinet-' + next.turn, turn: next.turn, kind: scrutiny ? 'scrutiny' : 'support', week: next.campaign.week,
    title: action.type === 'resign' ? characters[incumbent!].fullName + ' mengundurkan diri dari kabinet' : scrutiny ? 'DPR meminta penjelasan atas keputusan kabinet' : 'Koalisi menanggapi keputusan kabinet' });
  validateState(next);
  return next;
}

function adjustRelationship(state: GameState, from: string, to: string, delta: number) {
  const relationships = state.characters[from].relationships;
  relationships[to] = clamp((relationships[to] ?? 0) + delta, -100, 100);
}

export function realignCharacter(state: GameState, characterId: string, partyId: string, reason: string): GameState {
  validateState(state);
  requireValid(state.campaign.week <= termWeeks, 'Masa jabatan telah berakhir.');
  requireValid(Object.hasOwn(state.characters, characterId) && Object.hasOwn(state.parties, partyId) && reason.trim(), 'Perpindahan partai tidak valid.');
  const previous = state.characters[characterId].partyId;
  requireValid(previous !== partyId && !Object.values(state.parties).some(party => party.leaderId === characterId), 'Tokoh tidak dapat berpindah partai.');
  const next = structuredClone(state);
  next.turn++;
  next.characters[characterId].partyId = partyId;
  if (previous) {
    const oldParty = next.parties[previous];
    oldParty.coalition = clamp(oldParty.coalition - 2, 0, 100);
    adjustRelationship(next, oldParty.leaderId, characterId, -5);
  }
  adjustRelationship(next, next.parties[partyId].leaderId, characterId, 5);
  next.parties[partyId].coalition = clamp(next.parties[partyId].coalition + 2, 0, 100);
  next.events.push({ id: 'realignment-' + next.turn, turn: next.turn, kind: 'realignment', week: next.campaign.week, title: reason.trim() });
  validateState(next);
  return next;
}

export function saveGame(state: GameState): string {
  validateState(state);
  return JSON.stringify({ version: 4, state });
}

export function loadGame(raw: string): GameState {
  const envelope = JSON.parse(raw);
  requireValid(isRecord(envelope) && isRecord(envelope.state), 'Simpanan tidak valid.');
  if (envelope.version === 0) envelope.state.events ??= [];
  if (envelope.version === 0 || envelope.version === 1) {
    requireValid(inRange(envelope.state.seed, 0, 0xffffffff), 'Seed simpanan tidak valid.');
    envelope.state.campaign = initialCampaign(envelope.state.seed);
  } else requireValid(envelope.version === 2 || envelope.version === 3 || envelope.version === 4, 'Versi simpanan tidak didukung.');
  if (envelope.version === 0 || envelope.version === 1 || envelope.version === 2) envelope.state.president = { ...defaultPresident };
  if (envelope.version !== 4) envelope.state.mandate = defaultMandate();
  const state = envelope.state as unknown as GameState;
  validateState(state);
  return state;
}

export function startPresidency(seed: number, president: PresidentIdentity, mandate: Mandate = defaultMandate()): GameState {
  requireValid(isPresident(president), 'Profil Presiden tidak valid.');
  requireValid(validMandate(mandate), 'Pilih tepat tiga janji kampanye yang berbeda.');
  let state: GameState = { ...initialGame(seed), president: { ...president }, mandate: structuredClone(mandate) };
  const background = backgrounds[mandate.background];
  const difficulty = difficulties[mandate.difficulty];
  state.campaign.legitimacy += background.legitimacy + difficulty.legitimacy;
  state.campaign.economy.confidence += background.confidence;
  for (const [party, delta] of Object.entries(background.ties)) state.campaign.blocs[party].trust += delta;
  for (const [positionId, characterId] of [
    ['finance', 'anindita_prameswari'], ['foreign', 'surya_wirawan'], ['health', 'maya_santoso'],
  ]) {
    state = applyCabinetAction(state, { type: 'appoint', positionId, characterId, reason: 'Pembentukan kabinet awal' });
  }
  return { ...state, opening: { stage: 'inauguration' } };
}

export function transitionOpening(state: GameState, action: OpeningAction): GameState {
  validateState(state);
  const next = applyOpeningAction(state, action);
  validateState(next);
  return next;
}

export function cabinetConflict(game: GameState, positionId: string) {
  if (game.campaign.week < 5 || game.campaign.week > termWeeks || !Object.hasOwn(game.positions, positionId)) return undefined;
  const id = game.positions[positionId].currentHolderId;
  if (!id) return undefined;
  if (game.campaign.developments?.some(entry => entry.kind === 'conflict' && entry.positionId === positionId
    && game.campaign.week - entry.week < 13)) return undefined;
  const relationship = game.characters[id].relationships[presidentId] ?? 0;
  const lastReview = game.campaign.ministerReviews.filter(r => r.positionId === positionId && r.holderId === id).at(-1);
  const funding = positionId === 'health' ? game.campaign.budget.execution.spending.health : undefined;
  if (relationship > -12 && (lastReview?.delivery ?? 100) >= 74 && (funding ?? 230) >= 180) return undefined;
  return { id, relationship, issue: funding !== undefined && funding < 180
    ? 'Pagu kesehatan membatasi layanan. Saya meminta pembahasan sebelum target diperketat.'
    : 'Kami berbeda pandangan soal pelaksanaan agenda. Saya perlu kejelasan mandat sebelum melanjutkan.' };
}

export function resolveCabinetConflict(state: GameState, positionId: string, choice: 'heard' | 'resigned') {
  validateState(state);
  const conflict = cabinetConflict(state, positionId);
  requireValid(conflict && (choice === 'heard' || choice === 'resigned'), 'Tidak ada konflik kabinet aktif.');
  const next = choice === 'resigned'
    ? applyCabinetAction(state, { type: 'resign', positionId, reason: 'Pengunduran diri setelah pembahasan konflik kabinet' })
    : structuredClone(state);
  if (choice === 'heard') {
    adjustRelationship(next, conflict.id, presidentId, 7);
    adjustRelationship(next, presidentId, conflict.id, 4);
  }
  recordDevelopment(next.campaign, { week: next.campaign.week, kind: 'conflict', characterId: conflict.id, positionId, choice });
  validateState(next);
  return next;
}
