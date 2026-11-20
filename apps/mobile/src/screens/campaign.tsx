import { useState } from 'react';
import { CharacterExpression } from '@republik/ui';
import { portraitUrl } from '../services/assets';
import { caucuses, chapterYears, chapters, characters, salutation, stories } from '@republik/game-data';
import { availableStory, chapterAgenda, type PresidencyAction } from '@republik/simulation';
import type { EventEffect, GameState } from '@republik/shared-types';
import { useGame } from '../stores/game';

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const effectNames = {
  confidence: 'Kepercayaan konsumen', purchasingPower: 'Daya beli',
  humanCapital: 'Modal manusia', infrastructure: 'Kualitas infrastruktur',
};

function effectText(effect: EventEffect, game: GameState) {
  const delta = (effect.delta > 0 ? '+' : '') + effect.delta;
  switch (effect.kind) {
    case 'party': return caucuses.find(party => party.id === effect.id)?.name + ' ' + delta;
    case 'region': return 'Dukungan ' + game.campaign.regions.find(region => region.id === effect.id)?.name + ' ' + delta;
    case 'legitimacy': return 'Legitimasi ' + delta;
    case 'metric': return effectNames[effect.field] + ' ' + delta;
    case 'capital-project': return effectNames[effect.field] + ' ' + delta + ' dalam ' + effect.delay + ' minggu';
  }
}

export function usePresidentialDecision() {
  const decide = useGame(store => store.decide);
  const [error, setError] = useState('');
  function run(action: PresidencyAction) {
    try { decide(action); setError(''); } catch (cause) { setError((cause as Error).message); }
  }
  return { error, run };
}

export function ChapterBriefing({ game }: { game: GameState }) {
  const c = game.campaign;
  const agenda = chapterAgenda(game);
  const event = availableStory(c);
  const { run, error } = usePresidentialDecision();
  const year = Math.ceil(agenda.id / 4);
  return <section className="stack">
    <article className="office-paper stack">
      <div><p className="scene-kicker">BAB {agenda.id} DARI 20 · {chapterYears[year - 1]}</p><h2>{agenda.chapter.title}</h2>
        <p>{agenda.chapter.brief}</p>
        <p>Pertumbuhan {number.format(c.economy.growth)}% · Inflasi {number.format(c.economy.inflation)}% · Legitimasi {number.format(c.legitimacy)}/100</p>
        {agenda.previous && <p>Catatan kabinet mengaitkan agenda ini dengan keputusan Bab {agenda.previous.chapter} · {chapters[agenda.previous.chapter - 1].title}.</p>}
        {c.delayed.length > 0 && <p>Dampak proyek terdekat dijadwalkan minggu {Math.min(...c.delayed.map(item => item.week))}.</p>}
      </div>
      {!event && <>
        {agenda.decision < 2 ? <>
          <div className="scene-dialogue"><CharacterExpression name={characters[agenda.speaker].fullName}
            src={portraitUrl(characters[agenda.speaker].portraitAssetId)} />
            <p><strong>{characters[agenda.speaker].fullName}</strong> · “{salutation(game.president)}, {agenda.party.name} mencatat kepercayaan {agenda.partnerTrust}/100. {c.economy.inflation > 5 ? 'Biaya hidup sedang menekan publik.' : 'Kita masih punya ruang untuk menentukan prioritas.'}”</p></div>
          <p>Keputusan {agenda.decision + 1} dari 2</p>
          <div className="scene-choices">{agenda.options.map((option, index) =>
            <button key={option.title} className="scene-option" disabled={option.disabled} onClick={() => run({ type: 'chapter-choice', option: index as 0 | 1 })}>
              <strong>{option.title}</strong><span>{option.detail}</span>
            </button>,
          )}</div>
        </> : <>
          <p>Agenda utama sudah diputuskan. Kelola kabinet, APBN, atau DPR sebelum melanjutkan jika perlu.</p>
          <button className="primary" onClick={() => run({ type: 'advance-chapter' })}>Jalankan sisa Bab {agenda.id}</button>
        </>}
      </>}
      {error && <p className="error" role="alert">{error}</p>}
    </article>
    {event && <article className="office-paper stack">
      <div><h2>{event.title}</h2><p>{event.text}</p></div>
      {event.choices.map(choice => <div key={choice.id} className="stack choice">
        <button className="outline" onClick={() => run({ type: 'choose-story', choiceId: choice.id })}>{choice.label}</button>
        <small>{choice.effects.map(effect => effectText(effect, game)).join(' · ')}</small>
      </div>)}
    </article>}
  </section>;
}

export function PresidencyHistory({ game }: { game: GameState }) {
  const c = game.campaign;
  if (c.briefings.length === 0 && c.eventHistory.length === 0) return null;
  return <section className="panel">
    <h2>Catatan Kepresidenan</h2>
    {c.eventHistory.length > 0 && <details open><summary>Keputusan peristiwa</summary>
      {[...c.eventHistory].reverse().map(entry => {
        const event = stories.find(story => story.id === entry.eventId);
        return <p key={entry.eventId}>Minggu {entry.week} · {event?.title} · {event?.choices.find(choice => choice.id === entry.choiceId)?.label}</p>;
      })}
    </details>}
    <details><summary>Arsip laporan mingguan</summary>
      {[...c.briefings].reverse().map(entry => <p key={entry.week}>Minggu {entry.week} · {entry.message}</p>)}
    </details>
  </section>;
}
