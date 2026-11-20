import { create } from 'zustand';
import { applyCabinetAction, applyPresidencyAction, enableChapters, startChapterCampaign, resolveCabinetConflict, transitionOpening, type OpeningAction, type CabinetAction, type PresidencyAction } from '@republik/simulation';
import { initialGame } from '@republik/game-data';
import type { ChapterRun, GameState, Mandate, PresidentIdentity } from '@republik/shared-types';
import { movePhase, preserveActive, readEntry, readSaves, resumePhase, saveState, updateSlot, writeSlot, type CampaignTab, type Phase, type SaveEntry, type Saves } from '../services/game-flow';

const storageKey = 'republik.saves';
const newRunId = () => Array.from(crypto.getRandomValues(new Uint32Array(3)), num => num.toString(16)).join('-');

function restore() {
  try { return { saves: readSaves(localStorage), recovery: '' }; }
  catch { return { saves: { entries: [] }, recovery: 'Daftar simpanan tidak dapat dibaca.' }; }
}

interface GameStore {
  game: GameState;
  saves: Saves;
  recovery: string;
  phase: Phase;
  legacy?: GameState;
  legacyReturn: 'main_menu' | 'post_game';
  scenario: ChapterRun['scenario'];
  tab: CampaignTab;
  navigate: (tab: CampaignTab) => void;
  dispatch: (action: CabinetAction) => void;
  decide: (action: PresidencyAction) => void;
  saveSlot: (slot: number, overwrite: boolean) => void;
  load: (entry: SaveEntry) => void;
  rename: (id: string, label: string) => void;
  remove: (id: string, confirmed: boolean) => void;
  main: () => void;
  pause: () => void;
  resume: () => void;
  viewLegacy: (game: GameState) => void;
  closeLegacy: () => void;
  openCreator: (scenario?: ChapterRun['scenario']) => void;
  closeCreator: () => void;
  cabinetResponse: (positionId: string, choice: 'heard' | 'resigned') => void;
  start: (profile: PresidentIdentity, mandate: Mandate) => void;
  openingAction: (action: OpeningAction) => void;
}

export const useGame = create<GameStore>((set, get) => {
  function go(to: Phase) {
    set({ phase: movePhase(get().phase, to) });
  }

  function persist(saves: Saves) {
    localStorage.setItem(storageKey, JSON.stringify(saves));
  }

  function persistCollection(saves: Saves) {
    persist(saves);
    set({ saves });
  }

  function apply(game: GameState, saves: Saves, runId: string, tab: CampaignTab) {
    const phase = movePhase(get().phase, resumePhase(game));
    const next = saveState(saves, game, runId, Date.now(), tab);
    persist(next);
    set({ game, saves: next, phase, tab, recovery: '' });
  }

  function commit(game: GameState) {
    const { saves } = get();
    if (!saves.auto) throw new Error('Kampanye aktif tidak tersedia.');
    apply(game, saves, saves.auto.runId, get().tab);
  }

  return {
    ...restore(), game: initialGame(), phase: 'main_menu', tab: 'Istana', scenario: 'standard', legacyReturn: 'main_menu',
    dispatch: action => commit(applyCabinetAction(get().game, action)),
    decide: action => commit(applyPresidencyAction(get().game, action)),
    saveSlot: (slot, overwrite) => persistCollection(writeSlot(get().saves, slot, overwrite)),
    load: entry => {
      const game = readEntry(entry);
      if (!game) throw new Error('Simpanan ini rusak atau versinya tidak didukung.');
      const { saves } = get();
      const older = saves.auto?.runId === entry.runId && saves.auto.updated > entry.updated;
      const completed = saves.entries.some(item => item.id === 'history-' + entry.runId);
      const runId = !game.campaign.election && (older || completed) ? newRunId() : entry.runId;
      apply(enableChapters(game), preserveActive(saves, runId), runId, entry.tab ?? 'Istana');
    },
    rename: (id, label) => persistCollection(updateSlot(get().saves, id, { label })),
    remove: (id, confirmed) => persistCollection(updateSlot(get().saves, id, { confirmed })),
    navigate: tab => {
      const { saves } = get();
      if (!saves.auto) return;
      persistCollection({ ...saves, auto: { ...saves.auto, tab } });
      set({ tab });
    },
    main: () => go('main_menu'),
    pause: () => go('paused'),
    resume: () => go(resumePhase(get().game)),
    viewLegacy: game => {
      const from = get().phase;
      const phase = movePhase(from, 'legacy_view');
      set({ phase, legacy: game, legacyReturn: from === 'post_game' ? 'post_game' : 'main_menu' });
    },
    closeLegacy: () => go(get().legacyReturn),
    openCreator: (scenario = 'standard') => {
      go('president_creation');
      set({ scenario });
    },
    closeCreator: () => go('main_menu'),
    openingAction: action => commit(transitionOpening(get().game, action)),
    cabinetResponse: (positionId, choice) => commit(resolveCabinetConflict(get().game, positionId, choice)),
    start: (profile, mandate) => {
      if (get().recovery) throw new Error('Daftar simpanan rusak. Pulihkan penyimpanan sebelum membuat kampanye baru.');
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const runId = newRunId();
      apply(startChapterCampaign(seed, profile, mandate, get().scenario), preserveActive(get().saves), runId, 'Istana');
    },
  };
});
