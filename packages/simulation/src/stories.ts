import { caucuses, initialCampaign, stories, termWeeks } from '@republik/game-data';
import type { CampaignState } from '@republik/shared-types';
import { clampMetric } from './fiscal';

const byId = new Map(stories.map(story => [story.id, story]));

export function availableStory(state: CampaignState) {
  return state.pendingEvent ? byId.get(state.pendingEvent) : undefined;
}

export function offerStory(state: CampaignState, roll: number) {
  if (state.week > termWeeks) return;
  const seen = new Set(state.eventHistory.map(entry => entry.eventId));
  const eligible = stories.filter(story => !seen.has(story.id) && state.week >= story.firstWeek
    && state.week <= (story.lastWeek ?? termWeeks) && (!story.when || story.when(state))
    && (story.follows ? state.nextEvents.includes(story.id) : state.week % 4 === 1));
  let slot = roll * eligible.reduce((total, story) => total + story.weight, 0);
  for (const story of eligible) {
    slot -= story.weight;
    if (slot < 0) {
      state.pendingEvent = story.id;
      break;
    }
  }
}

export function chooseStory(state: CampaignState, choiceId: string) {
  const story = availableStory(state);
  const choice = story?.choices.find(item => item.id === choiceId);
  if (!story || !choice) throw new Error('Pilihan peristiwa tidak tersedia.');
  for (const effect of choice.effects) switch (effect.kind) {
    case 'legitimacy':
      state.legitimacy = clampMetric(state.legitimacy + effect.delta);
      break;
    case 'party': {
      const bloc = state.blocs[effect.id];
      bloc.trust = clampMetric(bloc.trust + effect.delta);
      break;
    }
    case 'region': {
      const region = state.regions.find(item => item.id === effect.id)!;
      region.support = clampMetric(region.support + effect.delta);
      break;
    }
    case 'metric':
      state.economy[effect.field] = clampMetric(state.economy[effect.field] + effect.delta, 0, effect.field === 'purchasingPower' ? 160 : 100);
      break;
    case 'capital-project':
      state.delayed.push({ week: state.week + effect.delay, field: effect.field, amount: effect.delta });
      break;
  }
  state.eventHistory.push({ week: state.week, eventId: story.id, choiceId });
  state.nextEvents = state.nextEvents.filter(id => id !== story.id);
  if (choice.next) state.nextEvents.push(choice.next);
  delete state.pendingEvent;
}

export function validStoryCatalog() {
  const regions = initialCampaign(0).regions;
  return byId.size === stories.length && stories.every(story =>
    !!story.id && !!story.title && !!story.text && story.firstWeek >= 1 && story.firstWeek <= (story.lastWeek ?? termWeeks)
    && (story.lastWeek ?? termWeeks) <= termWeeks && story.weight > 0
    && (!story.follows || byId.get(story.follows)?.choices.some(choice => choice.next === story.id))
    && story.choices.length >= 2 && new Set(story.choices.map(choice => choice.id)).size === story.choices.length
    && story.choices.every(choice => !!choice.id && !!choice.label && choice.effects.length > 0
      && (!choice.next || (byId.get(choice.next)?.follows === story.id && byId.get(choice.next)!.firstWeek > story.firstWeek))
      && choice.effects.every(effect => Number.isFinite(effect.delta) && Math.abs(effect.delta) <= 10
        && (effect.kind !== 'party' || caucuses.some(party => party.id === effect.id))
        && (effect.kind !== 'region' || regions.some(region => region.id === effect.id))
        && (effect.kind !== 'capital-project' || Number.isInteger(effect.delay) && effect.delay >= 1 && effect.delay <= 26))));
}

export function validStoryState(state: CampaignState) {
  if (!Array.isArray(state.eventHistory) || !Array.isArray(state.nextEvents)) return false;
  const seen = new Set<string>();
  const unlocked = new Set<string>();
  let lastWeek = 0;
  for (const entry of state.eventHistory) {
    if (!entry || !Number.isInteger(entry.week) || entry.week < lastWeek || entry.week > Math.min(termWeeks, state.week)) return false;
    const story = byId.get(entry.eventId);
    const choice = story?.choices.find(item => item.id === entry.choiceId);
    if (!story || !choice || seen.has(story.id) || entry.week < story.firstWeek || entry.week > (story.lastWeek ?? termWeeks)
      || (story.follows && !unlocked.has(story.id))) return false;
    lastWeek = entry.week;
    seen.add(story.id);
    unlocked.delete(story.id);
    if (choice.next) unlocked.add(choice.next);
  }
  if (state.pendingEvent !== undefined) {
    const story = byId.get(state.pendingEvent);
    if (!story || seen.has(story.id) || state.week < story.firstWeek || state.week > (story.lastWeek ?? termWeeks)
      || (story.follows && !unlocked.has(story.id))) return false;
  }
  return unlocked.size === state.nextEvents.length && [...unlocked].every(id => state.nextEvents.includes(id));
}
