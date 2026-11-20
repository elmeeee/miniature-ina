import { create } from 'zustand';
import { applyCabinetAction, applyPresidencyAction, loadGame, saveGame, startPresidency, resolveCabinetConflict, transitionOpening, type OpeningAction, type CabinetAction, type PresidencyAction } from '@republik/simulation';
import { initialGame } from '@republik/game-data';
import type { GameState, Mandate, PresidentIdentity } from '@republik/shared-types';

const storageKey = 'republik.game';
function restore() {
  try {
    const raw = localStorage.getItem(storageKey);
    return { game: raw ? loadGame(raw) : initialGame(), recovery: '', creating: !raw };
  } catch {
    return { game: initialGame(), recovery: 'Simpanan tidak dapat dibaca. Ekspor data lama sebelum memulai ulang.', creating: false };
  }
}

const restored = restore();

interface GameStore {
  game: GameState;
  recovery: string;
  dispatch: (action: CabinetAction) => void;
  decide: (action: PresidencyAction) => void;
  saveSlot: (slot: number) => void;
  loadSlot: (slot: number) => void;
  exportSave: () => void;
  creating: boolean;
  openCreator: () => void;
  closeCreator: () => void;
  cabinetResponse: (positionId: string, choice: 'heard' | 'resigned') => void;
  start: (profile: PresidentIdentity, mandate: Mandate) => void;
  openingAction: (action: OpeningAction) => void;
}

export const useGame = create<GameStore>((set, get) => {
  function commit(game: GameState) {
    if (get().recovery) throw new Error('Pulihkan atau mulai ulang simpanan sebelum melanjutkan.');
    localStorage.setItem(storageKey, saveGame(game));
    set({ game });
  }

  return {
    ...restored,
    dispatch: action => commit(applyCabinetAction(get().game, action)),
    decide: action => commit(applyPresidencyAction(get().game, action)),
    saveSlot: slot => {
      if (get().recovery) throw new Error('Simpanan aktif rusak.');
      localStorage.setItem(storageKey + '.slot.' + slot, saveGame(get().game));
    },
    loadSlot: slot => {
      const raw = localStorage.getItem(storageKey + '.slot.' + slot);
      if (raw === null) throw new Error('Slot ini masih kosong.');
      const game = loadGame(raw);
      localStorage.setItem(storageKey, saveGame(game));
      set({ game, recovery: '', creating: false });
    },
    exportSave: () => {
      const raw = localStorage.getItem(storageKey) ?? saveGame(get().game);
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'republik-save.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    openCreator: () => set({ creating: true }),
    closeCreator: () => set({ creating: localStorage.getItem(storageKey) === null }),
    openingAction: action => commit(transitionOpening(get().game, action)),
    cabinetResponse: (positionId, choice) => commit(resolveCabinetConflict(get().game, positionId, choice)),
    start: (profile, mandate) => {
      const game = startPresidency(crypto.getRandomValues(new Uint32Array(1))[0], profile, mandate);
      localStorage.setItem(storageKey, saveGame(game));
      set({ game, recovery: '', creating: false });
    },
  };
});
