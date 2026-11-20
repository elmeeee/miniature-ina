import { chapterSummary, loadGame, saveGame } from '@republik/simulation';
import type { GameState } from '@republik/shared-types';

export const campaignTabs = ['Istana', 'Kabinet', 'Negara', 'Politik', 'Berita'] as const;
export type CampaignTab = typeof campaignTabs[number];

export type Phase = 'main_menu' | 'president_creation' | 'inauguration' | 'playing' | 'paused' | 'chapter_summary' | 'campaign_finale' | 'post_game' | 'legacy_view';

export function resumePhase(game: GameState): Phase {
  if (game.opening?.stage === 'inauguration') return 'inauguration';
  if (chapterSummary(game.campaign)) return 'chapter_summary';
  if (game.campaign.election) return game.campaign.chapters && !game.campaign.chapters.finaleSeen ? 'campaign_finale' : 'post_game';
  return 'playing';
}

const routes: Record<Phase, Phase[]> = {
  main_menu: ['president_creation', 'inauguration', 'playing', 'chapter_summary', 'campaign_finale', 'post_game', 'legacy_view'],
  president_creation: ['main_menu', 'inauguration'],
  inauguration: ['playing', 'paused', 'main_menu'],
  playing: ['chapter_summary', 'paused', 'main_menu'],
  paused: ['main_menu', 'president_creation', 'playing', 'inauguration', 'chapter_summary', 'campaign_finale', 'post_game'],
  chapter_summary: ['playing', 'campaign_finale', 'paused', 'main_menu'],
  campaign_finale: ['post_game', 'paused', 'main_menu'],
  post_game: ['legacy_view', 'main_menu', 'president_creation'],
  legacy_view: ['main_menu', 'post_game'],
};

export function movePhase(from: Phase, to: Phase) {
  if (from !== to && !routes[from].includes(to)) throw new Error('Perpindahan layar tidak tersedia.');
  return to;
}

export type SaveEntry = { id: string; raw: string; label: string; updated: number; runId: string; tab?: CampaignTab };
export type Saves = { auto?: SaveEntry; entries: SaveEntry[] };
export const slotIds = ['slot-1', 'slot-2', 'slot-3'];

export function readSaves(storage: Pick<Storage, 'getItem'>): Saves {
  const current = storage.getItem('republik.saves');
  if (current !== null) {
    const value: Saves = JSON.parse(current);
    if (!value || !Array.isArray(value.entries)) throw new Error('Daftar simpanan rusak.');
    const items = [...value.entries, ...(value.auto === undefined ? [] : [value.auto])];
    if (new Set(items.map(entry => entry?.id)).size !== items.length || items.some(entry => !entry || typeof entry.id !== 'string' || typeof entry.raw !== 'string'
      || typeof entry.label !== 'string' || typeof entry.runId !== 'string' || !Number.isFinite(entry.updated) || (entry.tab !== undefined && !campaignTabs.includes(entry.tab)))) {
      throw new Error('Metadata simpanan rusak.');
    }
    return value;
  }
  function legacy(key: string, id: string): SaveEntry | undefined {
    const raw = storage.getItem(key);
    return raw === null ? undefined : { id, raw, label: '', updated: 0, runId: 'legacy-' + id };
  }
  const auto = legacy('republik.game', 'auto');
  return { auto, entries: slotIds.flatMap((id, index) => {
    const entry = legacy('republik.game.slot.' + (index + 1), id);
    return entry ? [entry] : [];
  }) };
}

export function saveState(saves: Saves, game: GameState, runId: string, time: number, tab: CampaignTab = 'Istana'): Saves {
  const raw = saveGame(game);
  const auto: SaveEntry = { id: 'auto', raw, label: '', updated: time, runId, tab };
  const entries = [...saves.entries];
  if (game.campaign.election) {
    const id = 'history-' + runId;
    const index = entries.findIndex(entry => entry.id === id);
    const history = { ...auto, id };
    if (index < 0) entries.push(history);
    else if (game.campaign.chapters?.finaleSeen && resumePhase(readEntry(entries[index]) ?? game) !== 'post_game') entries[index] = history;
  }
  return { auto, entries };
}

export function preserveActive(saves: Saves, nextRun?: string): Saves {
  const entry = saves.auto;
  if (!entry || entry.runId === nextRun) return saves;
  const game = readEntry(entry);
  const id = (game?.campaign.election ? 'history-' : 'resume-') + entry.runId;
  if (game?.campaign.election && saves.entries.some(item => item.id === id)) return { entries: saves.entries };
  const entries = saves.entries.filter(item => item.id !== id);
  return { entries: [...entries, { ...entry, id }] };
}

export function writeSlot(saves: Saves, slot: number, overwrite = false): Saves {
  const id = slotIds[slot - 1];
  if (!id || !saves.auto || !readEntry(saves.auto)) throw new Error('Simpanan aktif tidak tersedia.');
  const old = saves.entries.find(entry => entry.id === id);
  if (old && !overwrite) throw new Error('Konfirmasi penimpaan diperlukan.');
  return { ...saves, entries: [...saves.entries.filter(entry => entry.id !== id), { ...saves.auto, id, label: old?.label ?? '' }] };
}

export function readEntry(entry: SaveEntry): GameState | undefined {
  try { return loadGame(entry.raw); } catch { return undefined; }
}

export function latestUnfinished(saves: Saves) {
  return [saves.auto, ...saves.entries].filter((entry): entry is SaveEntry => !!entry)
    .sort((a, b) => b.updated - a.updated)
    .find(entry => { const game = readEntry(entry); return !!game && resumePhase(game) !== 'post_game'; });
}

export function updateSlot(saves: Saves, id: string, change: { label: string } | { confirmed: boolean }): Saves {
  if (!slotIds.includes(id) && !id.startsWith('resume-')) throw new Error('Arsip pemerintahan dilindungi.');
  if (!saves.entries.some(entry => entry.id === id)) throw new Error('Slot kosong.');
  if ('label' in change) {
    const label = change.label.trim();
    if (!label || [...label].length > 40) throw new Error('Nama simpanan harus terdiri dari 1–40 karakter.');
    return { ...saves, entries: saves.entries.map(entry => entry.id === id ? { ...entry, label } : entry) };
  }
  if (!change.confirmed) throw new Error('Konfirmasi penghapusan diperlukan.');
  return { ...saves, entries: saves.entries.filter(entry => entry.id !== id) };
}
