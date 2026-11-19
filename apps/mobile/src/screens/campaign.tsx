import { useState } from 'react';
import { caucuses, stories, termWeeks } from '@republik/game-data';
import { availableStory, candidates, epilogues, type PresidencyAction } from '@republik/simulation';
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

export function WeeklyBriefing({ game }: { game: GameState }) {
  const c = game.campaign;
  const event = availableStory(c);
  const { run, error } = usePresidentialDecision();
  const phases = ['Konsolidasi', 'Reformasi', 'Tekanan', 'Penataan Aliansi', 'Warisan'];
  return <section className="stack">
    <article className="panel stack">
      <div><h2>{c.election ? 'Masa Jabatan Selesai' : 'Briefing Mingguan'}</h2>
        <p>Tahun {c.budget.year} · {phases[c.budget.year - 1]} · Minggu {Math.min(c.week, termWeeks)}/{termWeeks}</p>
        <p>Legitimasi {number.format(c.legitimacy)}/100</p>
        {c.briefings.length > 0 && <p>{c.briefings.at(-1)?.message}</p>}</div>
      {!c.election && !event && <button className="primary" onClick={() => run({ type: 'week' })}>Selesaikan minggu {c.week}</button>}
      {error && <p className="error" role="alert">{error}</p>}
    </article>
    {event && <article className="panel stack">
      <div><h2>{event.title}</h2><p>{event.text}</p></div>
      {event.choices.map(choice => <div key={choice.id} className="stack choice">
        <button className="outline" onClick={() => run({ type: 'choose-story', choiceId: choice.id })}>{choice.label}</button>
        <small>{choice.effects.map(effect => effectText(effect, game)).join(' · ')}</small>
      </div>)}
    </article>}
    {c.election && <article className="panel stack">
      <h2>Hasil Pemilu</h2>
      <p>Pemenang: {candidates.find(candidate => candidate.id === c.election?.winnerId)?.name}</p>
      <dl className="campaign-data">{candidates.filter(candidate => c.election?.votes[candidate.id] !== undefined).map(candidate =>
        <div key={candidate.id}><dt>{candidate.name}<small>{candidate.platform}</small></dt><dd>{number.format(c.election!.votes[candidate.id])} suara</dd></div>,
      )}</dl>
      <details><summary>Partisipasi wilayah</summary>{c.election.regions.map(region =>
        <p key={region.id}>{c.regions.find(item => item.id === region.id)?.name} · {number.format(region.turnout)} pemilih</p>,
      )}</details>
      <h3>Epilog</h3>
      <ul>{c.election.epilogues.map(id => <li key={id}>{epilogues[id]}</li>)}</ul>
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

export function SaveSlots() {
  const { saveSlot, loadSlot, resetSave, exportSave } = useGame();
  const [status, setStatus] = useState('');
  const [slot, setSlot] = useState(1);
  function perform(action: () => void, message: string) {
    try { action(); setStatus(message); } catch (cause) { setStatus((cause as Error).message); }
  }
  return <details className="panel">
    <summary>Simpanan kampanye</summary>
    <div className="stack">
      <label>Slot<select value={slot} onChange={event => { setSlot(Number(event.target.value)); setStatus(''); }}>
        {[1, 2, 3].map(id => <option key={id} value={id}>Slot {id}</option>)}
      </select></label>
      <div className="actions">
        <button className="outline" onClick={() => {
          if (window.confirm('Tulis kampanye aktif ke slot ini?')) perform(() => saveSlot(slot), 'Slot disimpan.');
        }}>Simpan ke slot</button>
        <button className="outline" onClick={() => {
          if (window.confirm('Ganti kampanye aktif dengan isi slot ini?')) perform(() => loadSlot(slot), 'Slot dimuat.');
        }}>Muat slot</button>
        <button className="outline" onClick={() => perform(exportSave, 'Ekspor dimulai.')}>Ekspor</button>
        <button className="outline" onClick={() => {
          if (window.confirm('Mulai kampanye baru dan ganti simpanan otomatis?')) perform(resetSave, 'Kampanye baru dimulai.');
        }}>Kampanye baru</button>
      </div>
      {status && <p role="status">{status}</p>}
    </div>
  </details>;
}
