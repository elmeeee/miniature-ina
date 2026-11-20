import { baselinePlan, caucuses, chapterNumber, chapters, characters, presidentId } from '@republik/game-data';
import type { CampaignState, ChapterRun, GameState } from '@republik/shared-types';
import { clampMetric } from './fiscal';

export const chapterRun = (entered: number, scenario: ChapterRun['scenario'] = 'standard'): ChapterRun =>
  ({ entered, acknowledged: entered - 1, choices: [], finaleSeen: false, scenario });

export function chapterAgenda(game: GameState) {
  const c = game.campaign;
  const id = chapterNumber(game);
  const chapter = chapters[id - 1];
  const choices = c.chapters?.choices.filter(row => row.chapter === id) ?? [];
  const decision = choices.length;
  const party = caucuses.find(p => p.id === chapter.party)!;
  const spending = c.budget.execution.spending;
  const transfer = Math.min(15, spending.administration, baselinePlan.spending[chapter.focus] * 3 - spending[chapter.focus]);
  const partnerTrust = c.blocs[chapter.party].trust;
  const previous = c.chapters?.choices.filter(row => row.chapter < id && chapters[row.chapter - 1].ministry === chapter.ministry).at(-1);
  const speaker = game.positions[chapter.ministry].currentHolderId ?? 'nala_wibowo';
  return { id, chapter, decision, party, transfer, partnerTrust, previous, speaker,
    options: decision === 0 ? [
      { title: 'Danai ' + chapter.project, detail: 'Alokasi ulang Rp' + transfer + ' T dari administrasi, kepercayaan fraksi +4. Berlaku pada pagu berjalan.', disabled: transfer <= 0 },
      { title: 'Pertahankan pagu dan lakukan peninjauan', detail: 'Dana administrasi dipertahankan, legitimasi +2. Fraksi menurunkan kepercayaan 2 poin.' },
    ] : [
      { title: 'Buka ' + chapter.partner, detail: 'Legitimasi +2 dan relasi dengan pembawa briefing +3. Tidak ada konsesi kepada fraksi.' },
      { title: 'Rundingkan dukungan ' + party.name, detail: 'Kepercayaan fraksi +5 dan legitimasi −1. Pembawa briefing mencatat kompromi.' },
    ],
  };
}

export function chooseChapter(game: GameState, option: 0 | 1) {
  const c = game.campaign;
  const run = c.chapters;
  const agenda = chapterAgenda(game);
  if (!run || c.week > 260 || c.pendingEvent || chapterSummary(c) || agenda.decision > 1
    || ![0, 1].includes(option) || agenda.options[option].disabled) throw new Error('Keputusan bab ini tidak tersedia.');
  const { chapter, speaker } = agenda;
  const bloc = c.blocs[chapter.party];
  const relation = game.characters[speaker].relationships;
  if (agenda.decision === 0) {
    if (option === 0) {
      c.budget.execution.spending.administration -= agenda.transfer;
      c.budget.execution.spending[chapter.focus] += agenda.transfer;
      if (c.budget.status === 'open') c.budget.plan = structuredClone(c.budget.execution);
    }
    bloc.trust = clampMetric(bloc.trust + (option === 0 ? 4 : -2));
    if (option === 1) c.legitimacy = clampMetric(c.legitimacy + 2);
  } else if (option === 0) {
    c.legitimacy = clampMetric(c.legitimacy + 2);
    relation[presidentId] = clampMetric((relation[presidentId] ?? 0) + 3, -100, 100);
  } else {
    c.legitimacy = clampMetric(c.legitimacy - 1);
    bloc.trust = clampMetric(bloc.trust + 5);
    relation[presidentId] = clampMetric((relation[presidentId] ?? 0) - 2, -100, 100);
  }
  run.choices.push({ chapter: agenda.id, decision: agenda.decision as 0 | 1, option, week: c.week, characterId: speaker });
}

export function chapterSummary(c: CampaignState) {
  const closed = Math.floor((c.week - 1) / 13);
  return c.chapters && closed > c.chapters.acknowledged ? closed : undefined;
}

export function validChapters(c: CampaignState) {
  const run = c.chapters;
  if (run === undefined) return true;
  const closed = Math.floor((c.week - 1) / 13);
  const validInteger = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  return !!run && validInteger(run.entered, 1, Math.min(20, closed + 1))
    && validInteger(run.acknowledged, Math.max(run.entered - 1, closed - 1), closed)
    && ['standard', 'recovery'].includes(run.scenario) && typeof run.finaleSeen === 'boolean'
    && (!run.finaleSeen || (!!c.election && run.acknowledged === 20))
    && Array.isArray(run.choices) && run.choices.every((row, index) => {
      const previous = run.choices[index - 1];
      return row && validInteger(row.chapter, run.entered, Math.min(20, closed + 1))
        && validInteger(row.week, (row.chapter - 1) * 13 + 1, Math.min(c.week, row.chapter * 13))
        && [0, 1].includes(row.decision) && [0, 1].includes(row.option) && Object.hasOwn(characters, row.characterId)
        && (previous?.chapter === row.chapter ? row.decision === 1 && previous.decision === 0 : row.decision === 0)
        && (!previous || row.week >= previous.week);
    })
    && run.choices.filter(d => d.chapter <= closed).length === Math.max(0, closed - run.entered + 1) * 2;
}

export function chapterDecisionLabel(chapter: number, decision: 0 | 1, option: 0 | 1) {
  const data = chapters[chapter - 1];
  if (decision === 0) return option === 0 ? 'Danai ' + data.project : 'Tinjau ' + data.project;
  return option === 0 ? 'Buka ' + data.partner : 'Rundingkan dukungan ' + caucuses.find(p => p.id === data.party)!.name;
}
