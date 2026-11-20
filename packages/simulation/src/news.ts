import { caucuses, characters, stories } from '@republik/game-data';
import type { GameState } from '@republik/shared-types';
import { openingHeadline } from './opening';

export const effectNames = { tax: 'Indeks pajak efektif', infrastructure: 'Infrastruktur', humanCapital: 'Modal manusia' };
const fmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
type Article = { id: string; week: number; outlet: string; title: string; summary: string; breaking: boolean };

export function campaignNews(game: GameState): Article[] {
  const articles: Article[] = [];
  const c = game.campaign;
  const headline = openingHeadline(game);
  if (headline && game.opening && 'reply' in game.opening) articles.push({
    id: 'opening', week: 1, outlet: 'Suara Istana', title: headline,
    summary: 'Pemerintah menuntaskan pembahasan awal dengan Karya Bersama.', breaking: true,
  });
  for (const event of game.events) {
    if (event.turn <= 4 && game.opening && game.appointments.some(item => item.startTurn === event.turn && item.appointmentReason === 'Pembentukan kabinet awal')) continue;
    articles.push({ id: event.id, week: event.week ?? 0, outlet: 'Suara Istana', title: event.title,
      summary: 'Catatan kabinet · Keputusan ' + event.turn, breaking: event.week === c.week });
  }
  for (const entry of c.eventHistory) {
    const story = stories.find(item => item.id === entry.eventId);
    const choice = story?.choices.find(item => item.id === entry.choiceId);
    if (!story || !choice) continue;
    articles.push({ id: 'story-' + entry.eventId, week: entry.week, outlet: 'Warta Nasional',
      title: story.title, summary: 'Keputusan ' + game.president.name + ' · ' + choice.label, breaking: true });
  }
  for (const [index, entry] of (c.developments ?? []).entries()) {
    const base = { id: 'development-' + index, week: entry.week };
    switch (entry.kind) {
      case 'budget': articles.push({ ...base, outlet: 'Neraca Publik', title: 'DPR ' + (entry.approved ? 'menyetujui APBN' : 'menolak APBN'),
        summary: entry.yes + ' suara setuju pada sidang anggaran.', breaking: true }); break;
      case 'coalition': articles.push({ ...base, outlet: 'Parlemen Hari Ini', title: caucuses.find(p => p.id === entry.partyId)?.name + (entry.joined ? ' masuk koalisi' : ' keluar dari koalisi'),
        summary: 'Peta dukungan berubah setelah negosiasi fraksi.', breaking: true }); break;
      case 'effect': articles.push({ ...base, outlet: 'Neraca Publik', title: 'Dampak kebijakan jatuh tempo',
        summary: effectNames[entry.field] + ' berubah ' + fmt.format(entry.change) + ' poin.', breaking: false }); break;
      case 'region': articles.push({ ...base, outlet: 'Kabar Daerah', title: 'Laporan pembangunan ' + c.regions.find(r => r.id === entry.regionId)?.name,
        summary: 'Indeks pembangunan triwulan berubah ' + fmt.format(entry.change) + ' poin.', breaking: false }); break;
      case 'conflict': articles.push({ ...base, outlet: 'Suara Istana', title: characters[entry.characterId].fullName + (entry.choice === 'heard' ? ' temui Presiden untuk membahas mandat' : ' melepas jabatan'),
        summary: entry.choice === 'heard' ? 'Keberatan dicatat setelah pertemuan kabinet.' : 'Posisi kementerian dibuka untuk pengganti.', breaking: true }); break;
    }
  }
  return articles.reverse().sort((a, b) => b.week - a.week);
}
