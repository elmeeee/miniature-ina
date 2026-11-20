import { useState, type CSSProperties } from 'react';
import { chapterNumber, difficulties } from '@republik/game-data';
import { chapterSummary } from '@republik/simulation';
import { CharacterPortrait } from '@republik/ui';
import { latestUnfinished, readEntry, slotIds, type SaveEntry } from '../services/game-flow';
import { portraitUrl } from '../services/assets';
import { sceneArt } from '../services/scenes';
import { useGame } from '../stores/game';

type MenuView = 'actions' | 'load' | 'save' | 'history' | 'settings';

function Settings() {
  const [sound, setSound] = useState(() => localStorage.getItem('republik.sound') === 'on');
  return <div className="stack"><h2>Pengaturan</h2><label className="check-label">
    <input type="checkbox" checked={sound} onChange={event => {
      setSound(event.target.checked);
      localStorage.setItem('republik.sound', event.target.checked ? 'on' : 'off');
    }} /> Efek suara</label>
    <p>Animasi mengikuti preferensi pengurangan gerakan di perangkat.</p>
  </div>;
}

function download(raw: string, name: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SaveCard({ entry, children }: { entry: SaveEntry; children: React.ReactNode }) {
  const game = readEntry(entry);
  const chapter = game ? chapterSummary(game.campaign) ?? chapterNumber(game) : 1;
  const date = entry.updated === 0 ? 'Tanggal tidak tercatat' : new Date(entry.updated).toLocaleString('id-ID');
  return <article className="panel stack">
    {game ? <div className="saved-president">
      <CharacterPortrait name={game.president.name} src={portraitUrl(game.president.portrait)} />
      <div><h3>{entry.label || game.president.name}</h3>
        {entry.label && <p>{game.president.name}</p>}
        <p>{difficulties[game.mandate.difficulty].label} · Tahun {Math.ceil(chapter / 4)} · Bab {chapter} · {game.campaign.election ? 'Selesai' : 'Berlangsung'}</p>
        <small>{date}</small></div>
    </div> : <p role="status">Simpanan rusak atau versinya tidak didukung.</p>}
    {children}
  </article>;
}

export function GameMenu({ paused = false }: { paused?: boolean }) {
  const store = useGame();
  const [view, setView] = useState<MenuView>('actions');
  const [message, setMessage] = useState('');
  const [editing, setEdit] = useState<string>();
  const [label, setLabel] = useState('');
  const latest = latestUnfinished(store.saves);
  const history = store.saves.entries.filter(entry => entry.id.startsWith('history-'));
  for (const entry of [store.saves.auto, ...store.saves.entries]) {
    if (entry && !history.some(item => item.runId === entry.runId) && readEntry(entry)?.campaign.election) history.push(entry);
  }
  const list = view === 'history' ? history : [
    ...(view === 'load' && store.saves.auto ? [store.saves.auto] : []),
    ...store.saves.entries.filter(entry => !entry.id.startsWith('history-') && (view === 'load' || slotIds.includes(entry.id))),
  ];

  function run(action: () => void, success = '') {
    try { action(); setMessage(success); } catch (error) { setMessage((error as Error).message); }
  }

  function switchView(target: MenuView) {
    setView(target); setMessage(''); setEdit(undefined);
  }

  function slots() {
    return <div className="stack">
      {view === 'save' && slotIds.map((id, index) => {
        const entry = list.find(item => item.id === id);
        const button = <button className="outline" onClick={() => {
          if (entry && !window.confirm('Timpa Slot ' + (index + 1) + '?')) return;
          run(() => store.saveSlot(index + 1, !!entry), 'Slot ' + (index + 1) + ' disimpan.');
        }}>Simpan ke Slot {index + 1}</button>;
        return entry ? <SaveCard key={id} entry={entry}>{button}</SaveCard> : <div key={id} className="panel"><p>Slot {index + 1} kosong</p>{button}</div>;
      })}
      {view !== 'save' && list.map(entry => {
        const game = readEntry(entry);
        const manageable = slotIds.includes(entry.id) || entry.id.startsWith('resume-');
        return <SaveCard key={entry.id} entry={entry}>
          <small>{entry.id === 'auto' ? 'Autosave' : slotIds.includes(entry.id) ? 'Slot ' + (slotIds.indexOf(entry.id) + 1) : entry.id.startsWith('resume-') ? 'Kampanye tersimpan' : 'Arsip'}</small>
          <div className="actions">
            {view === 'history' ? game && <button className="outline" onClick={() => run(() => store.viewLegacy(game))}>Lihat warisan</button>
              : <button className="outline" disabled={!game} onClick={() => {
                if (paused && !window.confirm('Muat simpanan ini? Kampanye aktif tetap tersimpan.')) return;
                run(() => store.load(entry));
              }}>Muat simpanan</button>}
            {view === 'load' && <button className="outline" onClick={() => run(() => download(entry.raw, 'republik-save.json'))}>Ekspor</button>}
            {view === 'load' && manageable && <>
              <button className="outline" onClick={() => { setEdit(entry.id); setLabel(entry.label || game?.president.name || ''); }}>Ubah nama</button>
              <button className="outline" onClick={() => {
                if (window.confirm('Hapus simpanan ini?')) run(() => store.remove(entry.id, true), 'Simpanan dihapus.');
              }}>Hapus</button>
            </>}
          </div>
          {editing === entry.id && <form className="stack" onSubmit={event => {
            event.preventDefault();
            run(() => { store.rename(entry.id, label); setEdit(undefined); }, 'Nama simpanan diperbarui.');
          }}>
            <label>Nama simpanan<input value={label} maxLength={40} onChange={event => setLabel(event.target.value)} /></label>
            <button className="primary">Simpan nama</button>
          </form>}
        </SaveCard>;
      })}
      {view !== 'save' && list.length === 0 && <p>{view === 'history' ? 'Arsip muncul setelah pemilihan akhir.' : 'Belum ada simpanan.'}</p>}
    </div>;
  }

  return <main className={paused ? 'pause-surface scene' : 'creation scene'} style={{ '--scene-image': 'url(' + sceneArt.palace + ')' } as CSSProperties}>
    <div className="creation-inner game-menu">
      <div><p className="scene-kicker">DI BALIK ISTANA</p><h1>{paused ? 'Permainan Dijeda' : 'REPUBLIK'}</h1></div>
      {store.recovery && <div className="stack">
        <p role="alert">{store.recovery}</p>
        <button className="outline" onClick={() => run(() => {
          const raw = localStorage.getItem('republik.saves');
          if (raw === null) throw new Error('Tidak ada data mentah untuk diekspor.');
          download(raw, 'republik-simpanan-mentah.json');
        })}>Ekspor data pemulihan</button>
      </div>}
      {view === 'actions' ? <div className="stack">
        {paused ? <>
          <button className="primary" onClick={store.resume}>Lanjut Bermain</button>
          <button className="outline" onClick={() => switchView('save')}>Simpan Permainan</button>
          <button className="outline" onClick={() => switchView('load')}>Muat Permainan</button>
          <button className="outline" onClick={() => switchView('settings')}>Pengaturan</button>
          <button className="outline" onClick={store.main}>Kembali ke Menu Utama</button>
        </> : <>
          <button className="primary" onClick={() => store.openCreator()}>Mulai Game Baru</button>
          <button className="outline" disabled={!latest} onClick={() => latest && run(() => store.load(latest))}>Lanjutkan Permainan</button>
          {!latest && <small>{store.saves.auto || store.saves.entries.length ? 'Tidak ada kampanye aktif yang valid. Periksa Pilih Save atau Riwayat Pemerintahan.' : 'Mulai kampanye untuk mengaktifkan Lanjutkan Permainan.'}</small>}
          <button className="outline" onClick={() => switchView('load')}>Pilih Save</button>
          <button className="outline" onClick={() => switchView('history')}>Riwayat Pemerintahan</button>
          <button className="outline" onClick={() => switchView('settings')}>Pengaturan</button>
        </>}
        {paused && <button className="outline" onClick={() => store.openCreator()}>Mulai Game Baru</button>}
      </div> : <>
        <button className="outline" onClick={() => switchView('actions')}>Kembali</button>
        {view === 'settings' ? <Settings /> : slots()}
      </>}
      {message && <p role="status">{message}</p>}
    </div>
  </main>;
}
