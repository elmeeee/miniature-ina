import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { chapterNumber } from '@republik/game-data';
import { CabinetHistory, CabinetRoster, ReshufflePanel } from '../screens/cabinet';
import { PresidencyHistory } from '../screens/campaign';
import { Inauguration, PresidentCreator, PresidentialOffice } from '../screens/office';
import { chapterSummary } from '@republik/simulation';
import { campaignTabs, resumePhase, type CampaignTab } from '../services/game-flow';
import { GameMenu } from '../screens/menu';
import { ChapterSummary, Finale, LegacyReport, PostGame } from '../screens/finale';
import { NewsDesk } from '../screens/news';
import { sceneArt } from '../services/scenes';
import './cinematic.css';
import { NationalEconomy } from '../screens/economy';
import { Parliament } from '../screens/parliament';
import { Politics } from '../screens/politics';
import { useGame } from '../stores/game';
import './style.css';

const copy: Record<CampaignTab, [string, string]> = {
  Istana: ['Di Balik Istana', 'Kantor Presiden Republik Indonesia'],
  Kabinet: ['Kabinet', 'Kelola jabatan, tinjau kandidat, dan catat keputusan pemerintahan.'],
  Negara: ['Negara', 'Tinjau ekonomi, pembangunan wilayah, dan realisasi APBN.'],
  Politik: ['Politik', 'Kelola agenda DPR dan koalisi, serta tinjau hubungan antartokoh.'],
  Berita: ['Berita', 'Perkembangan politik setelah keputusan Anda.'],
};

function App() {
  const [positionId, setPositionId] = useState<string>();
  const [history, setHistory] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { game, tab, navigate, phase, legacy, closeCreator, openingAction, decide, pause } = useGame();
  const positions = Object.values(game.positions);
  const staffed = positions.filter(position => position.currentHolderId).length;

  function handleRecovery(action: () => void) {
    try { action(); setSaveError(''); } catch (cause) { setSaveError((cause as Error).message); }
  }

  const paused = phase === 'paused';
  const scene = paused ? resumePhase(game) : phase;
  const wrap = (element: React.ReactNode) => <>
    <div inert={paused}>{element}</div>
    {paused && <GameMenu paused />}
    {saveError && <p className="error standalone-error" role="alert">{saveError}</p>}
  </>;
  if (scene === 'main_menu') return <GameMenu />;
  if (scene === 'president_creation') return <PresidentCreator onClose={closeCreator} />;
  if (scene === 'inauguration') return wrap(<Inauguration game={game}
    enter={() => { handleRecovery(() => openingAction({ type: 'inaugurate' })); navigate('Istana'); }} pause={pause} />);
  if (scene === 'chapter_summary') return wrap(<ChapterSummary game={game} chapter={chapterSummary(game.campaign)!}
    pause={pause} next={() => handleRecovery(() => decide({ type: 'close-chapter' }))} />);
  if (scene === 'campaign_finale') return wrap(<Finale game={game} pause={pause}
    next={() => handleRecovery(() => decide({ type: 'view-finale' }))} />);
  if (scene === 'post_game') return <PostGame game={game} />;
  if (scene === 'legacy_view' && legacy) return <LegacyReport game={legacy} />;

  const cover = { Istana: sceneArt.office, Kabinet: sceneArt.cabinet, Negara: sceneArt.palace, Politik: sceneArt.parliament, Berita: sceneArt.press };

  return wrap(<div className="playing-shell">
    <header className="top"><div className="shell masthead">
      <span className="brand-mark" aria-hidden="true">R</span><div><strong>REPUBLIK</strong><small>DI BALIK ISTANA</small></div>
      <span className="turn">BAB <b>{chapterNumber(game)}/20</b></span><button className="outline" onClick={pause}>Menu Jeda</button>
    </div></header>
    <main className="shell layout cinematic-layout">
      {tab !== 'Istana' && <div className="hero chapter-cover" style={{ backgroundImage: 'linear-gradient(90deg, #101c30 6%, #101c30a6 58%, #101c3059), url(' + cover[tab] + ')' }}><div><h1>{copy[tab][0]}</h1><p>{copy[tab][1]}</p></div>
        {tab === 'Kabinet' && <div className="count"><b>{staffed}<sup> / {positions.length}</sup></b><small>JABATAN TERISI</small></div>}
      </div>}
      {tab === 'Kabinet' && <>
        <div className="view-switch" aria-label="Tampilan kabinet">
          <button aria-pressed={!history} onClick={() => { setHistory(false); setPositionId(undefined); }}>Susunan kabinet</button>
          <button aria-pressed={history} onClick={() => { setHistory(true); setPositionId(undefined); }}>Riwayat</button>
        </div>
        {history ? <CabinetHistory game={game} /> : <CabinetRoster game={game} select={setPositionId} />}
        {positionId && <ReshufflePanel key={positionId} position={game.positions[positionId]} game={game} close={() => setPositionId(undefined)} />}
      </>}
      {tab === 'Istana' && <PresidentialOffice key={game.president.name} game={game} navigate={navigate} />}
      {tab === 'Negara' && <NationalEconomy game={game} />}
      {tab === 'Politik' && <><Parliament game={game} /><Politics game={game} /></>}
      {tab === 'Berita' && <><NewsDesk game={game} /><PresidencyHistory game={game} /></>}
    </main>
    <footer><nav className="shell navigation" aria-label="Navigasi utama">{campaignTabs.map(item =>
      <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => { navigate(item); setPositionId(undefined); }}>{item}</button>,
    )}</nav></footer>
  </div>);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
