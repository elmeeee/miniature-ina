import { useEffect, useRef, useState } from 'react';
import { characters, presidentId, salutation, termWeeks } from '@republik/game-data';
import { candidatePool, type CabinetAction } from '@republik/simulation';
import type { Character, GameState, GovernmentPosition } from '@republik/shared-types';
import { CharacterCard } from '@republik/ui';
import { portraitUrl } from '../services/assets';
import { useGame } from '../stores/game';

export function MinisterPerformance({ character }: { character: Character }) {
  return <div className="performance"><span>Kompetensi <b>{character.traits.competence}</b></span><span>Integritas <b>{character.traits.integrity}</b></span></div>;
}

export function CabinetRoster({ game, select }: { game: GameState; select: (id: string) => void }) {
  return <div className="roster">{Object.values(game.positions).map(position => {
    const holder = position.currentHolderId ? characters[position.currentHolderId] : undefined;
    return <article className="panel ministry" key={position.id + (holder?.id ?? 'vacant')}>
      <div className="card-heading"><h3>{position.title}</h3><span className={holder ? 'status filled' : 'status'}>{holder ? 'Terisi' : 'Kosong'}</span></div>
      {holder ? <><CharacterCard character={holder} src={portraitUrl(holder.portraitAssetId)} /><MinisterPerformance character={holder} /><small>Relasi dengan {salutation(game.president)} · {game.characters[holder.id].relationships[presidentId] ?? 0}</small></>
        : <p>Belum ada menteri yang menjabat.</p>}
      {game.campaign.week <= termWeeks && <button className="outline" onClick={() => select(position.id)}>{holder ? 'Kelola jabatan' : 'Pilih kandidat'} <span aria-hidden="true">→</span></button>}
    </article>;
  })}</div>;
}

export function CabinetHistory({ game }: { game: GameState }) {
  if (!game.appointments.length && !game.campaign.ministerReviews.length) return <p className="panel empty">Riwayat akan muncul setelah keputusan kabinet pertama.</p>;
  return <div className="stack">
    {game.campaign.ministerReviews.length > 0 && <details className="panel">
      <summary>Evaluasi kinerja triwulan</summary>
      {[...game.campaign.ministerReviews].reverse().map(review =>
        <p key={review.week + '-' + review.positionId}>Minggu {review.week} · {characters[review.holderId].fullName} · {review.delivery}/100</p>,
      )}
    </details>}
    <ol className="history">{[...game.appointments].reverse().map(entry =>
    <li className="panel" key={entry.id}>
      <small>Giliran {entry.startTurn}{entry.endTurn ? '–' + entry.endTurn : ' · Masih menjabat'}</small>
      <h3>{characters[entry.characterId].fullName}</h3>
      <p>{game.positions[entry.positionId].title} · {entry.appointmentReason}</p>
      {entry.dismissalReason && <p>Akhir masa jabatan · {entry.dismissalReason}</p>}
    </li>,
  )}</ol></div>;
}

export function CandidateSelector({ candidates, value, onChange }: { candidates: Character[]; value: string; onChange: (id: string) => void }) {
  return <label>Kandidat<select required value={value} onChange={event => onChange(event.target.value)}>
    <option value="">Pilih kandidat</option>
    {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.fullName}</option>)}
  </select></label>;
}

export function CandidateComparison({ incumbent, candidate }: { incumbent?: Character; candidate?: Character }) {
  if (!candidate) return null;
  return <div className="comparison">{[incumbent, candidate].map((person, index) => person && <div key={person.id}>
    <small>{index ? 'Kandidat' : 'Petahana'}</small>
    <CharacterCard character={person} src={portraitUrl(person.portraitAssetId)} />
    <MinisterPerformance character={person} />
  </div>)}</div>;
}

const actionLabels = { appoint: 'Tunjuk menteri', replace: 'Ganti menteri', rotate: 'Rotasi menteri', dismiss: 'Berhentikan menteri', resign: 'Catat pengunduran diri' };

export function AppointmentConfirmation({ action, position, game, commit, back }: { action: CabinetAction; position: GovernmentPosition; game: GameState; commit: () => void; back: () => void }) {
  const target = 'characterId' in action ? characters[action.characterId]?.fullName
    : 'otherPositionId' in action ? game.positions[action.otherPositionId]?.title : undefined;
  return <div className="confirmation">
    <p>{actionLabels[action.type]} · {position.title}{target ? ' · ' + target : ''}</p>
    <p>{action.reason}</p>
    <div className="actions"><button type="button" className="outline" onClick={back}>Kembali</button><button type="button" className="primary" onClick={commit}>Konfirmasi keputusan</button></div>
  </div>;
}

export function ReshufflePanel({ position, game, close }: { position: GovernmentPosition; game: GameState; close: () => void }) {
  const incumbent = position.currentHolderId ? characters[position.currentHolderId] : undefined;
  const others = Object.values(game.positions).filter(item => item.id !== position.id && item.currentHolderId);
  const candidates = candidatePool(game);
  const [type, setType] = useState<CabinetAction['type']>(incumbent ? 'replace' : 'appoint');
  const [candidate, setCandidate] = useState('');
  const [other, setOther] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<CabinetAction>();
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const dispatch = useGame(store => store.dispatch);
  const options: CabinetAction['type'][] = incumbent ? ['replace', 'dismiss', 'resign', ...(others.length ? ['rotate' as const] : [])] : ['appoint'];
  return <dialog ref={dialog} className="panel editor" aria-labelledby="reshuffle-title" onCancel={event => {
    event.preventDefault();
    close();
  }}>
    <div className="card-heading"><h2 id="reshuffle-title">{position.title}</h2><button className="outline" onClick={close}>Tutup</button></div>
    {pending ? <AppointmentConfirmation action={pending} position={position} game={game} back={() => setPending(undefined)} commit={() => {
      try { dispatch(pending); close(); } catch (cause) { setError((cause as Error).message); }
    }} /> : <form onSubmit={event => {
      event.preventDefault();
      const base = { positionId: position.id, reason: reason.trim() };
      if (!base.reason) { setError('Masukkan alasan keputusan.'); return; }
      setError('');
      if (type === 'appoint' || type === 'replace') setPending({ ...base, type, characterId: candidate });
      else if (type === 'rotate') setPending({ ...base, type, otherPositionId: other });
      else setPending({ ...base, type });
    }}>
      <label>Keputusan<select value={type} onChange={event => setType(event.target.value as CabinetAction['type'])}>
        {options.map(option => <option key={option} value={option}>{actionLabels[option]}</option>)}
      </select></label>
      {(type === 'appoint' || type === 'replace') && <>
        <CandidateSelector candidates={candidates} value={candidate} onChange={setCandidate} />
        <CandidateComparison incumbent={incumbent} candidate={candidate ? characters[candidate] : undefined} />
      </>}
      {type === 'rotate' && <label>Jabatan tujuan<select required value={other} onChange={event => setOther(event.target.value)}>
        <option value="">Pilih jabatan</option>{others.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>}
      <label>Alasan<textarea required maxLength={240} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <button className="primary">Tinjau keputusan</button>
    </form>}
    {error && <p role="alert" className="error">{error}</p>}
  </dialog>;
}
