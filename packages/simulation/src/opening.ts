import { characters, presidentId, salutation } from '@republik/game-data';
import type { CoalitionReply, GameState, OpeningPolicy, OpeningState } from '@republik/shared-types';
import { clampMetric } from './fiscal';

export const openingPolicies = {
  relief: { title: 'Lindungi daya beli sekarang', detail: 'Alihkan Rp60 T dari cadangan dan administrasi ke bantuan sosial. Legitimasi naik, tetapi ruang cadangan menyusut.' },
  logistics: { title: 'Perbaiki jalur distribusi', detail: 'Alihkan Rp60 T dari administrasi ke infrastruktur. Dukungan koalisi dan pembangunan menguat, namun manfaat proyek tertunda.' },
};
export const coalitionReplies = {
  oversight: { title: 'Publikasikan audit belanja', detail: 'Legitimasi naik 2 poin. Ketua koalisi menerima pengawasan dengan kenaikan kepercayaan 1 poin.' },
  autonomy: { title: 'Libatkan daerah dalam pelaksanaan', detail: 'Kepercayaan Karya naik 5 poin dan dukungan Indonesia Timur naik 2 poin.' },
};
export type OpeningAction =
  | { type: 'inaugurate' }
  | { type: 'opening-policy'; policy: OpeningPolicy }
  | { type: 'opening-reply'; reply: CoalitionReply }
  | { type: 'acknowledge-opening' };

export function openingDialogue(game: GameState) {
  const { economy } = game.campaign;
  const address = salutation(game.president);
  const lead = address === 'Presiden' ? 'Presiden ' + game.president.name : address + ' ' + game.president.name;
  const inflation = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(economy.inflation);
  return `${lead}, inflasi berada di ${inflation}%. Kita punya dua cara menanggapi tekanan harga dengan pagu yang sama. Apakah kita membantu rumah tangga sekarang atau memperkuat distribusi?`;
}

export function openingHeadline(game: GameState) {
  if (!game.opening || !('policy' in game.opening)) return undefined;
  return 'Presiden ' + game.president.name + (game.opening.policy === 'relief'
    ? ' alihkan Rp60 T untuk perlindungan sosial'
    : ' arahkan Rp60 T ke perbaikan distribusi');
}

export function validOpening(state: OpeningState | undefined, game: GameState) {
  if (state === undefined) return true;
  if (state?.stage === 'inauguration' || state?.stage === 'briefing') return game.campaign.week === 1;
  if (!state || !('policy' in state) || !Object.hasOwn(openingPolicies, state.policy) || !Object.hasOwn(characters, state.adviserId) || state.adviserId === presidentId) return false;
  if (state.stage === 'negotiation') return game.campaign.week === 1;
  return (state.stage === 'results' || state.stage === 'complete') && (state.stage === 'complete' || game.campaign.week === 1)
    && Object.hasOwn(coalitionReplies, state.reply) && !!state.effects
    && ['legitimacy', 'trust', 'relationship'].every(key => {
      const number = state.effects[key as keyof typeof state.effects];
      return Number.isFinite(number) && Math.abs(number) <= 20;
    });
}

export function applyOpeningAction(state: GameState, action: OpeningAction): GameState {
  const next = structuredClone(state);
  const opening = next.opening;
  const campaign = next.campaign;
  if (opening?.stage === 'inauguration' && action.type === 'inaugurate') {
    next.opening = { stage: 'briefing' };
  } else if (opening?.stage === 'briefing' && action.type === 'opening-policy' && Object.hasOwn(openingPolicies, action.policy)) {
    const adviserId = next.positions.finance.currentHolderId ?? 'anindita_prameswari';
    const relief = action.policy === 'relief';
    const spending = campaign.budget.execution.spending;
    if (relief) {
      spending.contingency -= 30;
      spending.administration -= 30;
      spending.social += 60;
    } else {
      spending.administration -= 60;
      spending.infrastructure += 60;
      campaign.delayed.push({ week: 14, field: 'infrastructure', amount: 1.5 });
    }
    campaign.budget.plan = structuredClone(campaign.budget.execution);
    campaign.legitimacy = clampMetric(campaign.legitimacy + (relief ? 3 : 1));
    campaign.blocs.karya.trust = clampMetric(campaign.blocs.karya.trust + (relief ? -2 : 4));
    const relationship = next.characters[adviserId].relationships;
    relationship[presidentId] = clampMetric((relationship[presidentId] ?? 0) + (relief ? 2 : 4), -100, 100);
    next.opening = { stage: 'negotiation', policy: action.policy, adviserId };
  } else if (opening?.stage === 'negotiation' && action.type === 'opening-reply' && Object.hasOwn(coalitionReplies, action.reply)) {
    const oversight = action.reply === 'oversight';
    campaign.legitimacy = clampMetric(campaign.legitimacy + (oversight ? 2 : 0));
    campaign.blocs.karya.trust = clampMetric(campaign.blocs.karya.trust + (oversight ? 1 : 5));
    if (!oversight) {
      const east = campaign.regions.find(region => region.id === 'east')!;
      east.support = clampMetric(east.support + 2);
    }
    const relief = opening.policy === 'relief';
    next.opening = { ...opening, stage: 'results', reply: action.reply, effects: {
      legitimacy: (relief ? 3 : 1) + (oversight ? 2 : 0),
      trust: (relief ? -2 : 4) + (oversight ? 1 : 5),
      relationship: relief ? 2 : 4,
    } };
  } else if (opening?.stage === 'results' && action.type === 'acknowledge-opening') {
    next.opening = { ...opening, stage: 'complete' };
  } else {
    throw new Error('Adegan ini tidak tersedia.');
  }
  return next;
}
