import { useState } from 'react';
import type { Character } from '@republik/shared-types';

type PortraitProps = { name: string; src?: string; fallbackSrc?: string };
export function CharacterPortrait({ name, src, fallbackSrc }: PortraitProps) {
  const [failed, setFailed] = useState<string[]>([]);
  const image = [src, fallbackSrc].find(url => url && !failed.includes(url));
  const initials = name.split(' ').slice(0, 2).map(word => word[0]).join('');
  return image
    ? <img className="portrait" src={image} alt={name} onError={() => setFailed(previous => [...previous, image])} />
    : <span className="portrait portrait-fallback" role="img" aria-label={'Potret pengganti untuk ' + name}>{initials}</span>;
}

export function CharacterExpression({ name, src, fallbackSrc }: PortraitProps) {
  return <CharacterPortrait name={name} src={src} fallbackSrc={fallbackSrc} />;
}

export function CharacterCard({ character, src }: { character: Character; src?: string }) {
  return <div className="character">
    <CharacterPortrait name={character.fullName} src={src} />
    <div><strong>{character.fullName}</strong><small>{character.background}</small></div>
  </div>;
}

const traitLabels = { competence: 'Kompetensi', integrity: 'Integritas', loyalty: 'Loyalitas', ambition: 'Ambisi', communication: 'Komunikasi', leadership: 'Kepemimpinan' };

export function CharacterProfile({ character, src, party }: { character: Character; src?: string; party?: string }) {
  return <article className="panel profile">
    <CharacterCard character={character} src={src} />
    <p>{character.age} tahun · {party ?? 'Independen'}</p>
    <dl className="traits">{Object.entries(character.traits).map(([key, score]) =>
      <div key={key}><dt>{traitLabels[key as keyof typeof traitLabels]}</dt><dd>{score}</dd></div>,
    )}</dl>
  </article>;
}
