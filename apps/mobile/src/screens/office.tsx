import { useState, type CSSProperties } from 'react';
import { characters, newPresident, presidentName, salutation, stories, presidentId } from '@republik/game-data';
import { availableStory, openingDialogue, openingHeadline, openingPolicies, coalitionReplies, forecast, type OpeningAction } from '@republik/simulation';
import type { GameState, PresidentGender, PresidentIdentity } from '@republik/shared-types';
import { CharacterExpression } from '@republik/ui';
import { portraitUrl } from '../services/assets';
import { sceneArt } from '../services/scenes';
import { useGame } from '../stores/game';
import { SaveSlots, WeeklyBriefing } from './campaign';

const sceneStyle = (src: string) => ({ '--scene-image': 'url(' + src + ')' }) as CSSProperties;
const idNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

function PresidentPortrait({ profile, expression }: { profile: PresidentIdentity; expression?: 'serious' | 'optimistic' }) {
  return <CharacterExpression name={profile.name} src={portraitUrl(profile.portrait, expression)} fallbackSrc={portraitUrl(profile.portrait)} />;
}

export function PresidentCreator({ onClose }: { onClose?: () => void }) {
  const start = useGame(store => store.start);
  const [gender, setGender] = useState<PresidentGender>('male');
  const [name, setName] = useState(presidentName('male'));
  const [neutral, setNeutral] = useState(false);
  const [error, setError] = useState('');
  const preview: PresidentIdentity = { name: name.trim() || presidentName(gender), gender, address: neutral ? 'neutral' : 'standard', portrait: gender === 'male' ? 'bima_aditya_pratama' : 'laras_prameswari' };

  function selectGender(next: PresidentGender) {
    if (name === presidentName(gender)) setName(presidentName(next));
    setGender(next);
  }

  return <main className="creation scene" style={sceneStyle(sceneArt.palace)}>
    <div className="creation-inner">
      <p className="scene-kicker">REPUBLIK / DI BALIK ISTANA</p>
      <section className="creation-preview" aria-label="Pratinjau Presiden"><PresidentPortrait profile={preview} /><div>
        <p>{salutation(preview)}</p><h1>{preview.name}</h1>
      </div></section>
      <form className="creation-form" onSubmit={event => {
        event.preventDefault();
        try { start(newPresident(name, gender, preview.address)); } catch (cause) { setError((cause as Error).message); }
      }}>
        <label htmlFor="president-name">Nama Presiden</label>
        <div className="name-field">
          <input id="president-name" autoComplete="off" value={name} onChange={event => setName(event.target.value)} />
          <button className="outline" type="button" onClick={() => {
            const options = [0, 1, 2, 3].map(index => presidentName(gender, index)).filter(item => item !== name);
            setName(options[crypto.getRandomValues(new Uint32Array(1))[0] % options.length]);
          }}>Acak nama</button>
        </div>
        <div className="gender-options" aria-label="Gender Presiden">
          <button type="button" aria-pressed={gender === 'male'} onClick={() => selectGender('male')}>Laki-laki</button>
          <button type="button" aria-pressed={gender === 'female'} onClick={() => selectGender('female')}>Perempuan</button>
        </div>
        <label className="check-label"><input type="checkbox" checked={neutral} onChange={event => setNeutral(event.target.checked)} /> Sapaan netral “Presiden”</label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary">Mulai Pemerintahan</button>
        {onClose && <button type="button" className="outline" onClick={onClose}>Kembali ke simpanan</button>}
      </form>
    </div>
  </main>;
}

export function Inauguration({ game, enter }: { game: GameState; enter: () => void }) {
  return <main className="inauguration scene" style={sceneStyle(sceneArt.palace)}>
    <div className="inauguration-inner">
      <p className="scene-kicker">PELANTIKAN PRESIDEN</p>
      <PresidentPortrait profile={game.president} expression="optimistic" />
      <h1>{game.president.name}</h1>
      <p>“Saya akan menjalankan amanat rakyat dan menjaga pemerintahan untuk semua.”</p>
      <p>Wakil Presiden {characters.ratna_kusuma.fullName} mendampingi Anda dalam pembentukan agenda pertama.</p>
      <div className="actions">
        <button className="primary" onClick={enter}>Masuk Istana</button>
        <button className="outline" onClick={enter}>Lewati pelantikan</button>
      </div>
    </div>
  </main>;
}

export function SceneDialogue({ speakerId, role, text }: { speakerId: string; role: string; text: string }) {
  const person = characters[speakerId];
  return <div className="scene-dialogue" key={speakerId}>
    <CharacterExpression name={person.fullName} src={portraitUrl(person.portraitAssetId)} />
    <div><small>{role}</small><h3>{person.fullName}</h3><p>“{text}”</p></div>
  </div>;
}

function confirmSound() {
  try {
    if (localStorage.getItem('republik.sound') !== 'on' || typeof AudioContext === 'undefined') return;
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.setValueAtTime(396, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(594, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.onended = () => { void audio.close(); };
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.2);
  } catch {
    // Audio is optional on devices without Web Audio.
  }
}

type DeskView = 'desk' | 'phone' | 'tv' | 'cabinet' | 'map';
const controls: Record<DeskView, [string, string]> = {
  desk: ['Meja Presiden', 'Keputusan dan dokumen'],
  phone: ['Telepon', 'Percakapan dan relasi'],
  tv: ['Siaran', 'Berita nasional'],
  cabinet: ['Undangan kabinet', 'Menteri dan evaluasi'],
  map: ['Peta nasional', 'Pembangunan wilayah'],
};

export function PresidentialOffice({ game, navigate }: { game: GameState; navigate: (tab: 'Kabinet' | 'Negara' | 'Politik' | 'Berita') => void }) {
  const [view, setView] = useState<DeskView>('desk');
  const [error, setError] = useState('');
  const [caller, setCaller] = useState<'finance' | 'party' | 'advisor'>('finance');
  const [sound, setSound] = useState(() => localStorage.getItem('republik.sound') === 'on');
  const openingAction = useGame(store => store.openingAction);
  const opening = game.opening;
  const activeIntro = opening && opening.stage !== 'complete';
  const c = game.campaign;
  const accounts = forecast(c.economy, c.budget.execution);
  const opposition = Object.values(c.blocs).filter(bloc => bloc.member).length <= 1;
  const crisis = availableStory(c)?.category === 'crisis';
  const tone = crisis ? 'Rapat darurat' : c.week >= 220 ? 'Masa pemilu' : accounts.balance < -c.economy.gdp * 0.035 ? 'Tekanan fiskal' : opposition ? 'Koalisi rapuh' : c.pendingEvent ? 'Keputusan menunggu' : 'Agenda kepresidenan';
  const finance = game.positions.finance.currentHolderId ?? 'anindita_prameswari';
  const headline = openingHeadline(game);
  const lastStory = c.eventHistory.at(-1);
  const latestNews = lastStory
    ? stories.find(story => story.id === lastStory.eventId)?.title
    : c.week > 1 ? (game.events.at(-1)?.title ?? headline) : (headline ?? game.events.at(-1)?.title);
  const address = salutation(game.president);
  function run(action: OpeningAction, nextView?: DeskView) {
    try {
      openingAction(action);
      confirmSound();
      setError('');
      if (nextView) setView(nextView);
    } catch (cause) { setError((cause as Error).message); }
  }

  return <div className="office-flow">
    <section className="office-scene scene" style={sceneStyle(sceneArt.office)} aria-label="Ruang kerja Presiden">
      <div className="office-heading"><p className="scene-kicker">{tone}</p><h1>Ruang Presiden</h1></div>
      <div className="office-lead"><PresidentPortrait profile={game.president} expression={opposition ? 'serious' : undefined} />
        <div><small>{address}</small><h2>{game.president.name}</h2></div></div>
      <nav className="office-tools" aria-label="Perlengkapan ruang kerja">
        {(Object.keys(controls) as DeskView[]).map(key => <button key={key} type="button" aria-pressed={view === key}
          onClick={() => setView(key)}><strong>{controls[key][0]}</strong><small>{controls[key][1]}</small></button>)}
      </nav>
    </section>

    {activeIntro && <section className="office-paper" aria-label="Agenda perdana">
      {opening.stage === 'briefing' && <>
        <p className="scene-kicker">RAPAT KABINET PERDANA</p><h2>Keputusan pertama</h2>
        <SceneDialogue speakerId={finance} role={game.positions.finance.currentHolderId ? 'Menteri Keuangan' : 'Penasihat fiskal'} text={openingDialogue(game)} />
        <div className="scene-choices">
          {Object.entries(openingPolicies).map(([key, policy]) => <button key={key} className="scene-option" onClick={() => run({ type: 'opening-policy', policy: key as keyof typeof openingPolicies }, 'phone')}>
            <strong>{policy.title}</strong><span>{policy.detail}</span></button>)}
        </div>
      </>}
      {opening.stage === 'negotiation' && <>
        <p className="scene-kicker">PANGGILAN KOALISI</p><h2>Syarat dukungan Karya</h2>
        <SceneDialogue speakerId="sari_maheswari" role="Ketua Partai Karya Bersama"
          text={`${address} ${game.president.name}, kami mencatat pilihan Anda. ${opening.policy === 'relief' ? 'Bantuan harus bisa dilacak sampai rumah tangga.' : 'Daerah ingin ikut menentukan rute dan pengawasan.'} Apa yang bisa Anda janjikan?`} />
        <div className="scene-choices">
          {Object.entries(coalitionReplies).map(([key, response]) => <button key={key} className="scene-option" onClick={() => run({ type: 'opening-reply', reply: key as keyof typeof coalitionReplies }, 'tv')}>
            <strong>{response.title}</strong><span>{response.detail}</span></button>)}
        </div>
      </>}
      {opening.stage === 'results' && <div className="stack">
        <div className="breaking scene" style={sceneStyle(sceneArt.press)}><p className="scene-kicker">SIARAN KHUSUS</p><h2>{headline}</h2></div>
        <div><h3>Dampak agenda perdana</h3><dl className="campaign-data">
          <div><dt>Perubahan legitimasi</dt><dd>{opening.effects.legitimacy}</dd></div>
          <div><dt>Perubahan kepercayaan Karya</dt><dd>{opening.effects.trust}</dd></div>
          <div><dt>Perubahan relasi · {characters[opening.adviserId].fullName}</dt><dd>{opening.effects.relationship}</dd></div>
          <div><dt>Proyeksi saldo APBN</dt><dd>Rp{idNumber.format(accounts.balance)} T</dd></div>
        </dl></div>
        <button className="primary" onClick={() => run({ type: 'acknowledge-opening' }, 'desk')}>Lanjut ke agenda mingguan</button>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>}

    {view === 'desk' && !activeIntro && <>
      <WeeklyBriefing game={game} />
      <section className="office-paper"><h2>Dokumen {game.president.name}</h2><p>APBN Tahun {c.budget.year} · Proyeksi saldo Rp{idNumber.format(accounts.balance)} T</p>
        <button className="outline" onClick={() => navigate('Negara')}>Tinjau dokumen APBN</button></section>
    </>}
    {view === 'phone' && <section className="office-paper"><h2>Saluran telepon Istana</h2>
      <div className="actions caller-options" aria-label="Pilih lawan bicara">
        <button className="outline" aria-pressed={caller === 'finance'} onClick={() => setCaller('finance')}>Keuangan</button>
        <button className="outline" aria-pressed={caller === 'party'} onClick={() => setCaller('party')}>Koalisi</button>
        <button className="outline" aria-pressed={caller === 'advisor'} onClick={() => setCaller('advisor')}>Penasihat</button>
      </div>
      {caller === 'finance' && <SceneDialogue speakerId={finance} role="Briefing fiskal" text={`${address} ${game.president.name}, utang mencapai Rp${idNumber.format(c.economy.debt)} T dan inflasi ${idNumber.format(c.economy.inflation)}%. ${opening && 'policy' in opening ? 'Arahan perdana Anda tentang ' + (opening.policy === 'relief' ? 'daya beli masih tercatat dalam prioritas kerja.' : 'distribusi masih tercatat dalam prioritas kerja.') : 'Kita bisa meninjau pembiayaan bersama komisi anggaran.'}`} />}
      {caller === 'party' && <SceneDialogue speakerId="sari_maheswari" role="Ketua Karya Bersama" text={`${address} ${game.president.name}, ${c.blocs.karya.member ? 'kami masih berada di koalisi.' : 'kami menilai kebijakan ini dari luar koalisi.'} ${c.blocs.karya.trust < 50 ? 'Fraksi meminta jaminan sebelum mendukung agenda.' : 'Kesehatan daerah tetap menjadi prioritas kami di komisi.'}`} />}
      {caller === 'advisor' && <SceneDialogue speakerId="nala_wibowo" role="Penasihat kebijakan publik" text={`${address} ${game.president.name}, ${c.delayed.length ? 'ada ' + c.delayed.length + ' dampak kebijakan terjadwal yang belum jatuh tempo.' : 'belum ada dampak proyek yang menunggu.'} Hubungan kerja kita tercatat ${game.characters.nala_wibowo.relationships[presidentId] ?? 0} poin.`} />}
      <button className="outline" onClick={() => navigate('Politik')}>Buka agenda politik</button>
    </section>}
    {view === 'tv' && <section className="office-paper"><div className="breaking scene" style={sceneStyle(sceneArt.press)}>
      <p className="scene-kicker">SIARAN NASIONAL</p><h2>{latestNews ?? 'Istana menyiapkan agenda mingguan'}</h2>
      </div><button className="outline" onClick={() => navigate('Berita')}>Buka arsip berita</button></section>}
    {view === 'cabinet' && <section className="office-paper"><div className="breaking scene" style={sceneStyle(sceneArt.cabinet)}>
      <p className="scene-kicker">RAPAT KABINET</p><h2>Evaluasi kementerian</h2></div>
      <p>{Object.values(game.positions).filter(position => position.currentHolderId).length} jabatan terisi · {c.ministerReviews.length} catatan evaluasi</p>
      <button className="outline" onClick={() => navigate('Kabinet')}>Masuk ruang kabinet</button></section>}
    {view === 'map' && <section className="office-paper"><h2>Pembangunan wilayah</h2>
      <div className="region-grid">{c.regions.map(region => <div key={region.id}>{region.name}<meter min={0} max={100} value={region.development} aria-label={'Pembangunan ' + region.name} /><small>{idNumber.format(region.development)}/100</small></div>)}</div>
      <button className="outline" onClick={() => navigate('Negara')}>Buka laporan wilayah</button></section>}
    <SaveSlots />
    <label className="check-label sound-control"><input type="checkbox" checked={sound} onChange={event => {
      setSound(event.target.checked);
      localStorage.setItem('republik.sound', event.target.checked ? 'on' : 'off');
      if (event.target.checked) confirmSound();
    }} /> Efek suara</label>
  </div>;
}
