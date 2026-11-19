import { create } from 'zustand';
import { applyCabinetAction, loadGame, saveGame, type CabinetAction } from '@republik/simulation';
import { initialGame } from '@republik/game-data';
import type { GameState } from '@republik/shared-types';

const storageKey = 'republik.game';
function restore() {
  try {
    const raw = localStorage.getItem(storageKey);
    return { game: raw ? loadGame(raw) : initialGame(), recovery: '' };
  } catch {
    return { game: initialGame(), recovery: 'Simpanan tidak dapat dibaca. Ekspor data lama sebelum memulai ulang.' };
  }
}

const restored = restore();

interface GameStore {
  game: GameState;
  recovery: string;
  dispatch: (action: CabinetAction) => void;
  exportSave: () => void;
  resetSave: () => void;
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
    exportSave: () => {
      const raw = localStorage.getItem(storageKey) ?? saveGame(get().game);
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'republik-save.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    resetSave: () => {
      localStorage.removeItem(storageKey);
      set({ game: initialGame(), recovery: '' });
    },
  };
});
