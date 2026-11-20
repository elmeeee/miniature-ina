import { useEffect, useRef, useState } from 'react';
import { campaignNews } from '@republik/simulation';
import type { GameState } from '@republik/shared-types';
import { sceneArt } from '../services/scenes';

export function NewsDesk({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const articles = campaignNews(game);
  const breaking = articles.find(article => article.breaking);
  const [visible, setVisible] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (visible) dialog.current?.showModal();
  }, [visible]);

  return <section className={compact ? 'news-desk' : 'office-paper news-desk'} aria-label="Meja berita">
    {breaking && <button className="outline" onClick={() => setVisible(true)}>Buka siaran khusus</button>}
    {visible && breaking && <dialog ref={dialog} className="panel editor" aria-label="Siaran khusus" onClose={() => setVisible(false)}>
      <img className="news-image" alt="" src={sceneArt.press} />
      <p className="scene-kicker">{breaking.outlet} · SIARAN KHUSUS</p>
      <h2>{breaking.title}</h2><p>{breaking.summary}</p>
      <form method="dialog"><button className="outline">Tutup siaran</button></form>
    </dialog>}
    {!compact && (articles.length > 0 ? <ol className="history">{articles.map(article => <li className="panel" key={article.id}>
      <small>{article.outlet}{article.week ? ' · Minggu ' + article.week : ''}</small>
      <h3>{article.title}</h3><p>{article.summary}</p>
    </li>)}</ol> : <p>Belum ada laporan nasional.</p>)}
  </section>;
}
