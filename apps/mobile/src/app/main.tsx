import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { characters, presidentId } from '@republik/game-data';
import { CharacterExpression } from '@republik/ui';
import { CabinetHistory, CabinetRoster, ReshufflePanel } from '../screens/cabinet';
import { Politics } from '../screens/politics';
import { portraitUrl } from '../services/assets';
import { useGame } from '../stores/game';
import './style.css';

const tabs = ['Istana', 'Kabinet', 'Negara', 'Politik', 'Berita'] as const;
type Tab = typeof tabs[number];

const copy: Record<Tab, [string, string]> = {
  Istana: ['Di Balik Istana', 'Kantor Presiden Republik Indonesia'],
  Kabinet: ['Kabinet', 'Kelola jabatan, tinjau kandidat, dan catat keputusan pemerintahan.'],
  Negara: ['Negara', 'Pantau keterisian jabatan dan kekuatan koalisi.'],
  Politik: ['Politik', 'Jelajahi partai dan hubungan antartokoh.'],
  Berita: ['Berita', 'Perkembangan politik setelah keputusan Anda.'],
};

function App() {
  const [tab, setTab] = useState<Tab>('Kabinet');
  const [positionId, setPositionId] = useState<string>();
  const [history, setHistory] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { game, recovery, resetSave, exportSave } = useGame();
  const positions = Object.values(game.positions);
  const staffed = positions.filter(position => position.currentHolderId).length;

  function handleRecovery(action: () => void) {
    try { action(); setSaveError(''); } catch (cause) { setSaveError((cause as Error).message); }
  }

  return <>
    <header className="top"><div className="shell masthead">
      <span className="brand-mark" aria-hidden="true">R</span><div><strong>REPUBLIK</strong><small>DI BALIK ISTANA</small></div>
      <span className="turn">GILIRAN <b>{String(game.turn).padStart(2, '0')}</b></span>
    </div></header>
    <main className="shell layout">
      <div className="hero"><div><h1>{copy[tab][0]}</h1><p>{copy[tab][1]}</p></div>
        {tab === 'Kabinet' && <div className="count"><b>{staffed}<sup> / {positions.length}</sup></b><small>JABATAN TERISI</small></div>}
      </div>
      {recovery && <section className="panel"><p role="alert">{recovery}</p>
        <div className="actions"><button className="outline" onClick={() => handleRecovery(exportSave)}>Ekspor simpanan</button>
          <button className="outline" onClick={() => {
            if (window.confirm('Hapus simpanan yang tidak dapat dibaca?')) handleRecovery(resetSave);
          }}>Mulai ulang</button></div>{saveError && <p role="alert">{saveError}</p>}</section>}
      {tab === 'Kabinet' && <>
        <div className="view-switch" aria-label="Tampilan kabinet">
          <button aria-pressed={!history} onClick={() => { setHistory(false); setPositionId(undefined); }}>Susunan kabinet</button>
          <button aria-pressed={history} onClick={() => { setHistory(true); setPositionId(undefined); }}>Riwayat</button>
        </div>
        {history ? <CabinetHistory game={game} /> : <CabinetRoster game={game} select={setPositionId} />}
        {positionId && <ReshufflePanel key={positionId} position={game.positions[positionId]} game={game} close={() => setPositionId(undefined)} />}
      </>}
      {tab === 'Istana' && <section className="panel president">
        <CharacterExpression name={characters[presidentId].fullName} src={portraitUrl(presidentId, 'serious')} fallbackSrc={portraitUrl(presidentId)} />
        <div><small>Presiden</small><h2>{characters[presidentId].fullName}</h2><button className="primary" onClick={() => setTab('Kabinet')}>Buka kabinet</button></div>
      </section>}
      {tab === 'Negara' && <section className="roster">
        <article className="panel"><h2>{staffed} dari {positions.length}</h2><p>Jabatan kabinet terisi</p></article>
        {Object.values(game.parties).map(party => <article className="panel" key={party.id}><h2>{party.coalition}/100</h2><p>Dukungan {party.name}</p></article>)}
      </section>}
      {tab === 'Politik' && <Politics game={game} />}
      {tab === 'Berita' && (game.events.length ? <ol className="history">{[...game.events].reverse().map(event => <li className="panel" key={event.id}>
        <small>Giliran {event.turn}</small><h3>{event.title}</h3>
      </li>)}</ol> : <p className="panel empty">Belum ada perkembangan politik yang tercatat.</p>)}
    </main>
    <footer><nav className="shell navigation" aria-label="Navigasi utama">{tabs.map(item =>
      <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => { setTab(item); setPositionId(undefined); }}>{item}</button>,
    )}</nav></footer>
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
