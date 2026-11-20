import { chapterYears, chapters, characters, promiseProgress } from '@republik/game-data';
import { campaignNews, candidates, chapterDecisionLabel, epilogues, quarterlyReports } from '@republik/simulation';
import type { GameState } from '@republik/shared-types';
import { CharacterPortrait } from '@republik/ui';
import { portraitUrl } from '../services/assets';
import { sceneArt } from '../services/scenes';
import { useGame } from '../stores/game';
import { PresidencyHistory } from './campaign';
import { QuarterlyBriefing } from './quarterly';

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const display = (n: number) => number.format(n);
const scene = (url: string) => ({ '--scene-image': 'url(' + url + ')' }) as React.CSSProperties;

function Identity({ game }: { game: GameState }) {
  return <div className="creation-preview">
    <CharacterPortrait name={game.president.name} src={portraitUrl(game.president.portrait)} />
    <div><small>Presiden Republik Indonesia</small><h2>{game.president.name}</h2></div>
  </div>;
}

export function ChapterSummary({ game, chapter, next, pause }: { game: GameState; chapter: number; next: () => void; pause: () => void }) {
  const report = quarterlyReports(game.campaign)[chapter - 1];
  const choices = game.campaign.chapters?.choices.filter(choice => choice.chapter === chapter) ?? [];
  const article = campaignNews(game).find(entry => entry.week <= chapter * 13 && entry.week > (chapter - 1) * 13 && entry.breaking);
  return <main className="creation scene" style={scene(sceneArt.cabinet)}><section className="creation-inner end-summary">
    <p className="scene-kicker">BAB {chapter} DARI 20 · {chapterYears[Math.ceil(chapter / 4) - 1]}</p>
    <h1>{chapters[chapter - 1].title}</h1>
    <p>Ringkasan triwulan · Minggu {chapter * 13}</p>
    <ul>{choices.map(choice => <li key={choice.decision}>{chapterDecisionLabel(chapter, choice.decision, choice.option)}</li>)}</ul>
    <dl className="campaign-data">
      <div><dt>Pertumbuhan akhir bab</dt><dd>{display(game.campaign.economy.growth)}%</dd></div>
      <div><dt>Saldo anggaran triwulan</dt><dd>Rp{display(report.balance)} T</dd></div>
      <div><dt>Utang akhir bab</dt><dd>Rp{display(report.debt)} T</dd></div>
      <div><dt>Dampak kebijakan yang tercatat</dt><dd>{report.policyEffects.length}</dd></div>
    </dl>
    {article && <div><small>{article.outlet}</small><p>{article.title}</p></div>}
    <button className="primary" onClick={next}>{chapter === 20 ? 'Buka Malam Pemilu' : 'Masuk Bab ' + (chapter + 1)}</button>
    <button className="outline" onClick={pause}>Menu Jeda</button>
  </section></main>;
}

function Election({ game }: { game: GameState }) {
  const election = game.campaign.election;
  if (!election) return null;
  const winner = candidates.find(item => item.id === election.winnerId);
  return <div className="stack">
    <h2>{winner?.incumbent ? game.president.name : winner?.name} memenangi pemilihan</h2>
    <dl className="campaign-data">{candidates.filter(item => Object.hasOwn(election.votes, item.id)).map(item => <div key={item.id}>
      <dt>{item.incumbent ? game.president.name : item.name}<small>{item.platform}</small></dt><dd>{display(election.votes[item.id])} suara</dd>
    </div>)}</dl>
    <details><summary>Partisipasi pemilih per wilayah</summary>{election.regions.map(region => <p key={region.id}>
      {game.campaign.regions.find(item => item.id === region.id)?.name} · {display(region.turnout)} pemilih
    </p>)}</details>
  </div>;
}

function Epilogues({ game }: { game: GameState }) {
  return <ul>{game.campaign.election?.epilogues.map(id => <li key={id}>{epilogues[id]}</li>)}</ul>;
}

export function Finale({ game, next, pause }: { game: GameState; next: () => void; pause: () => void }) {
  const goals = promiseProgress(game);
  const winner = game.campaign.election?.winnerId === 'bima';
  const lastCabinet = game.appointments.filter(item => item.endTurn === undefined);
  return <main className="creation scene" style={scene(sceneArt.press)}><section className="creation-inner end-summary">
    <p className="scene-kicker">MALAM PEMILU</p><Identity game={game} /><Election game={game} />
    <p>{winner ? 'Istana menerima mandat baru. Kabinet menunggu arah agenda berikutnya.' : 'Istana menyiapkan serah terima setelah hasil pemilihan diumumkan.'}</p>
    <p>{lastCabinet.length} jabatan kabinet terisi saat pemilu · {goals.filter(goal => goal.met).length}/3 janji tercapai.</p>
    <Epilogues game={game} />
    <button className="primary" onClick={next}>Tutup Malam Pemilu</button>
    <button className="outline" onClick={pause}>Menu Jeda</button>
  </section></main>;
}

export function PostGame({ game }: { game: GameState }) {
  const { main, openCreator, viewLegacy } = useGame();
  const goals = promiseProgress(game);
  return <main className="creation scene" style={scene(sceneArt.palace)}><section className="creation-inner end-summary">
    <p className="scene-kicker">AKHIR MASA JABATAN</p><Identity game={game} />
    <h1>{game.campaign.election?.winnerId === 'bima' ? 'Mandat dari Pemilih' : 'Serah Terima Kekuasaan'}</h1>
    <p>Lima tahun pemerintahan · {goals.filter(goal => goal.met).length}/3 janji tercapai · Pertumbuhan akhir {display(game.campaign.economy.growth)}%</p>
    <Epilogues game={game} />
    <button className="primary" onClick={() => viewLegacy(game)}>Lihat Warisan Pemerintahan</button>
    <button className="outline" onClick={() => openCreator()}>Main Lagi — Game Baru</button>
    <button className="outline" onClick={() => openCreator('recovery')}>New Game+ · Pemulihan Nasional</button>
    <button className="outline" onClick={main}>Menu Utama</button>
  </section></main>;
}

export function LegacyReport({ game }: { game: GameState }) {
  const close = useGame(store => store.closeLegacy);
  const c = game.campaign;
  return <main className="shell layout legacy-report">
    <button className="outline" onClick={close}>Tutup laporan</button>
    <header className="office-paper"><p className="scene-kicker">ARSIP PEMERINTAHAN</p><h1>Warisan Pemerintahan</h1><Identity game={game} />
      <p>Masa jabatan · Tahun 1–{c.budget.year} · {c.briefings.length} minggu tercatat</p><Epilogues game={game} /></header>
    <section className="office-paper"><Election game={game} /></section>
    <section className="office-paper"><h2>Evaluasi janji</h2><dl className="campaign-data">{promiseProgress(game).map(goal =>
      <div key={goal.id}><dt>{goal.label}<small>Target {goal.direction === 'min' ? '≥' : '≤'} {display(goal.target)}{goal.unit}</small></dt>
        <dd>{display(goal.value)}{goal.unit}<small>{goal.met ? 'Tercapai' : 'Tidak tercapai'}</small></dd></div>,
    )}</dl></section>
    <section className="office-paper"><QuarterlyBriefing campaign={c} />
      <details><summary>Riwayat ekonomi</summary>{c.months.map(month => <p key={month.week}>Minggu {month.week} · PDB Rp{display(month.gdp)} T · Inflasi {display(month.inflation)}% · Pengangguran {display(month.unemployment)}%</p>)}</details></section>
    <section className="office-paper">
      <h2>Kabinet dan DPR</h2>
      <details><summary>Jabatan kabinet</summary>{game.appointments.map(appointment => <p key={appointment.id}>
        {game.positions[appointment.positionId].title} · {characters[appointment.characterId].fullName} · {appointment.appointmentReason}
        {appointment.dismissalReason ? ' · ' + appointment.dismissalReason : ' · Menjabat sampai akhir'}
      </p>)}</details>
      <details><summary>Legislasi dan pergeseran koalisi</summary>
        {c.bills.map(bill => <p key={bill.id}>{bill.title} · {bill.stage === 'approved' ? 'Disahkan' : bill.stage === 'rejected' ? 'Ditolak' : 'Belum disahkan'}</p>)}
        {(c.developments ?? []).filter(item => item.kind === 'coalition').map((item, index) =>
          <p key={index}>Minggu {item.week} · {item.partyId} {item.joined ? 'bergabung' : 'keluar dari koalisi'}</p>)}
        {c.bills.length === 0 && !(c.developments ?? []).some(item => item.kind === 'coalition') && <p>Belum ada catatan legislatif atau perubahan koalisi.</p>}
      </details>
    </section>
    <section className="office-paper"><h2>Keputusan dan hubungan</h2>
      <details><summary>Agenda bab</summary>{(c.chapters?.choices ?? []).map(choice => <p key={choice.chapter + '-' + choice.decision}>
        Bab {choice.chapter} · {chapterDecisionLabel(choice.chapter, choice.decision, choice.option)}
      </p>)}</details>
      <details><summary>Dampak proyek dan program</summary>
        {(c.developments ?? []).filter(item => item.kind === 'effect').map((item, index) => <p key={index}>Minggu {item.week} · {item.field === 'infrastructure' ? 'Infrastruktur' : item.field === 'humanCapital' ? 'Modal manusia' : 'Indeks pajak efektif'} {display(item.change)}</p>)}
        {c.delayed.length > 0 && <p>{c.delayed.length} dampak proyek dijadwalkan setelah akhir masa jabatan.</p>}
      </details>
      <details><summary>Relasi akhir tokoh</summary>
        {Object.entries(game.characters.bima_aditya_pratama.relationships).map(([id, n]) => <p key={id}>
          {characters[id].fullName} · {n > 0 ? '+' : ''}{n} · {n > 10 ? 'Hubungan baik' : n < -10 ? 'Hubungan tegang' : 'Hubungan netral'}
        </p>)}</details>
    </section>
    <PresidencyHistory game={game} />
  </main>;
}
