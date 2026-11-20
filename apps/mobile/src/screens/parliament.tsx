import { useState, type CSSProperties } from 'react';
import { caucuses, parliamentSeats, termWeeks, salutation } from '@republik/game-data';
import type { Bill, GameState, Vote } from '@republik/shared-types';
import { usePresidentialDecision } from './campaign';
import { spendingLabels } from './economy';

const focuses: Bill['focus'][] = ['health', 'education', 'infrastructure', 'social'];
const stages = { submitted: 'Diajukan', committee: 'Dalam pembahasan', approved: 'Disetujui', rejected: 'Ditolak' };

const partyColors = ['#d3ac62', '#c78170', '#8bafca', '#92ac82', '#b899c3', '#d39b69', '#b6a892', '#80b5ab'];
const chamberSeats = caucuses.flatMap((party, index) => Array.from({ length: party.seats }, () => partyColors[index]));
const rows = [40, 44, 48, 52, 56, 60, 64, 68, 72, 76];
function Chamber() {
  let offset = 0;
  return <div className="chamber" role="img" aria-label="Sebaran 580 kursi menurut partai">
    {rows.map(length => {
      const seats = chamberSeats.slice(offset, offset + length);
      offset += length;
      return <div key={length} className="chamber-row" aria-hidden="true">{seats.map((color, i) =>
        <span key={i} className="chamber-seat" style={{ '--seat': color } as CSSProperties} />,
      )}</div>;
    })}
  </div>;
}

function VoteBreakdown({ vote }: { vote: Vote }) {
  return <div className="stack">
    <div className="vote-tally" role="img" aria-label={vote.yes + ' kursi setuju dari ' + parliamentSeats}><span style={{width: (100 * vote.yes / parliamentSeats) + '%'}} /></div>
    <details><summary>{vote.yes} setuju · {vote.no} menolak</summary>
    <dl className="campaign-data">{caucuses.map(party =>
      <div key={party.id}><dt>{party.name}</dt><dd>{vote.byParty[party.id]}/{party.seats}</dd></div>,
    )}</dl>
  </details></div>;
}

export function Parliament({ game }: { game: GameState }) {
  const c = game.campaign;
  const { run, error } = usePresidentialDecision();
  const [title, setTitle] = useState('');
  const [focus, setFocus] = useState<Bill['focus']>('health');
  const active = c.week <= termWeeks;
  const coalition = caucuses.filter(party => c.blocs[party.id].member).reduce((sum, party) => sum + party.seats, 0);
  return <section className="stack">
    <article className="panel stack">
      <div><h2>Agenda DPR</h2><p>{parliamentSeats} kursi · {coalition} kursi dalam koalisi</p></div>
      <Chamber />
      <div className="coalition-seats" role="img" aria-label={coalition + ' kursi koalisi dan ' + (parliamentSeats - coalition) + ' kursi oposisi'}>
        {caucuses.map((party, index) => <span key={party.id} data-member={c.blocs[party.id].member}
          style={{ flex: party.seats, backgroundColor: partyColors[index] }} title={party.name} />)}
      </div>
      <small>Warna penuh · koalisi. Warna redup · oposisi.</small>
      <p>{salutation(game.president)} {game.president.name} · {c.budget.vote
        ? c.budget.vote.approved ? 'DPR menyetujui dokumen fiskal.' : 'Oposisi menahan rancangan dan meminta revisi.'
        : 'Komisi menunggu agenda berikutnya.'}</p>
      {error && <p className="error" role="alert">{error}</p>}
      {c.budget.vote && <div><h3>Pemungutan suara APBN</h3><VoteBreakdown vote={c.budget.vote} /></div>}
      {active && <form className="stack" onSubmit={event => {
        event.preventDefault();
        run({ type: 'submit-bill', title, focus });
      }}>
        <label>Judul RUU<input type="text" required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>Bidang<select value={focus} onChange={event => setFocus(event.target.value as Bill['focus'])}>
          {focuses.map(item => <option key={item} value={item}>{spendingLabels[item]}</option>)}
        </select></label>
        <button className="primary">Ajukan RUU</button>
      </form>}
      {c.bills.map(bill => <article className="policy-row" key={bill.id}>
        <h3>{bill.title}</h3><p>{spendingLabels[bill.focus]} · {stages[bill.stage]}</p>
        {bill.vote && <VoteBreakdown vote={bill.vote} />}
        {active && bill.stage === 'submitted' && <button className="outline" onClick={() => run({ type: 'review-bill', id: bill.id })}>Tinjau di komisi</button>}
        {active && bill.stage === 'committee' && <div className="actions">
          <button className="outline" disabled={bill.compromise} onClick={() => run({ type: 'amend-bill', id: bill.id })}>{bill.compromise ? 'Amendemen disepakati' : 'Tawarkan amendemen'}</button>
          <button className="primary" onClick={() => run({ type: 'vote-bill', id: bill.id })}>Putuskan RUU</button>
        </div>}
      </article>)}
    </article>
    <article className="panel stack">
      <h2>Negosiasi Koalisi</h2>
      {caucuses.map((party, index) => {
        const bloc = c.blocs[party.id];
        return <section className="policy-row" key={party.id}>
          <h3 style={{ color: partyColors[index] }}>{party.name}</h3>
          <p>{party.leader} · {party.seats} kursi · {bloc.member ? 'Koalisi' : 'Oposisi'}</p>
          <p>Kepercayaan {bloc.trust}/100 · Disiplin {party.discipline}/100</p>
          <p>Faksi {party.factions.join(', ')} · Prioritas {spendingLabels[party.preference]}</p>
          <p>{bloc.deal ? 'Kesepakatan: ' + bloc.deal : 'Tujuan: ' + party.objective}</p>
          {active && <button className="outline" onClick={() => run({ type: 'coalition', partyId: party.id, join: !bloc.member })}>
            {bloc.member ? 'Akhiri kerja sama' : 'Rundingkan dukungan'}
          </button>}
        </section>;
      })}
    </article>
  </section>;
}
