import { backgrounds, difficulties, promiseProgress } from '@republik/game-data';
import type { GameState } from '@republik/shared-types';

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

export function MandateProgress({ game }: { game: GameState }) {
  const progress = promiseProgress(game);
  const finished = !!game.campaign.election;
  return <details className="office-paper" open={finished || undefined}>
    <summary>{finished ? 'Evaluasi janji akhir masa jabatan' : 'Janji kampanye'} · {progress.filter(p => p.met).length}/3 sesuai target</summary>
    <p>{backgrounds[game.mandate.background].label} · {difficulties[game.mandate.difficulty].label}</p>
    <dl className="campaign-data">{progress.map(p => <div key={p.id}>
      <dt>{p.label}<small>Target {p.direction === 'min' ? '≥' : '≤'} {number.format(p.target)}{p.unit}</small></dt>
      <dd>{number.format(p.value)}{p.unit}<small>{p.met ? 'Tercapai' : 'Belum tercapai'}</small></dd>
    </div>)}</dl>
  </details>;
}
