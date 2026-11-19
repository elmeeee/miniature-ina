import { useState } from 'react';
import { characters, presidentId } from '@republik/game-data';
import type { GameState } from '@republik/shared-types';
import { CharacterProfile } from '@republik/ui';
import { portraitUrl } from '../services/assets';

export function PoliticalRelationshipGraph({ game, focus }: { game: GameState; focus: string }) {
  const relations = Object.entries(game.characters[focus].relationships).sort(([, a], [, b]) => b - a);
  return <section className="panel relationships">
    <h2>Relasi politik</h2>
    {relations.length === 0 && <p>Belum ada relasi tercatat.</p>}
    {relations.map(([id, value]) => <div className="relation" key={id}>
      <span>{characters[id].fullName}</span>
      <span className="relation-track" aria-hidden="true"><i className={value < 0 ? 'negative' : 'positive'} style={{ width: Math.abs(value) / 2 + '%' }} /></span>
      <strong>{value > 0 ? '+' : ''}{value}</strong>
    </div>)}
  </section>;
}

export function Politics({ game }: { game: GameState }) {
  const [focus, setFocus] = useState<string>(presidentId);
  const selected = characters[focus];
  const partyId = game.characters[focus].partyId;
  return <div className="stack">
    <section className="roster">{Object.values(game.parties).map(party => <article className="panel" key={party.id}>
      <div className="card-heading"><h3>{party.name}</h3><strong>{party.coalition}/100</strong></div>
      <p>Ketua · {characters[party.leaderId].fullName}</p><p>Faksi · {party.factions.join(', ')}</p><p>Kebijakan · {party.preferences.join(', ')}</p>
    </article>)}</section>
    <label>Tokoh politik<select value={focus} onChange={event => setFocus(event.target.value)}>
      {Object.values(characters).map(person => <option value={person.id} key={person.id}>{person.fullName}</option>)}
    </select></label>
    <div className="split">
      <CharacterProfile character={selected} src={portraitUrl(selected.portraitAssetId)} party={partyId ? game.parties[partyId].name : undefined} />
      <PoliticalRelationshipGraph game={game} focus={focus} />
    </div>
  </div>;
}
