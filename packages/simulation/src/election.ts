import { caucuses, initialEconomy, termWeeks } from '@republik/game-data';
import type { CampaignState, ElectionResult } from '@republik/shared-types';
import { clampMetric } from './fiscal';

export const electionRules = { incumbentTerms: 1, termLimit: 2, minimumAge: 35, votersPerPopulationUnit: 100000 };

export const candidates = [
  { id: 'bima', name: 'Bima Aditya Pratama', age: 54, incumbent: true, platform: 'Kelanjutan pembangunan dan reformasi APBN', alliances: ['nusantara', 'karya'] },
  { id: 'karina', name: 'Karina Lazuardi', age: 49, incumbent: false, platform: 'Otonomi daerah dan ekonomi maritim', alliances: ['pesisir', 'hijau', 'cerah'] },
  { id: 'tirta', name: 'Tirta Anggara', age: 50, incumbent: false, platform: 'Perlindungan pekerja dan audit belanja', alliances: ['asas', 'amanah', 'merdeka'] },
] as const;

function eligibleCandidates() {
  return candidates.filter(candidate => candidate.age >= electionRules.minimumAge &&
    (!candidate.incumbent || electionRules.incumbentTerms < electionRules.termLimit));
}

export const epilogues: Record<string, string> = {
  continuity: 'Mandat Baru: pemilih memberi kesempatan melanjutkan kebijakan.',
  transition: 'Serah Terima: mandat berpindah melalui transisi kepresidenan.',
  fracture: 'Koalisi Retak: pemerintahan berakhir dengan dukungan parlemen yang tipis.',
  recovery: 'Pemulihan Ekonomi: pertumbuhan dan daya beli menopang catatan pemerintah.',
  fiscal: 'Beban Fiskal: pemerintahan berikutnya mewarisi ruang anggaran yang sempit.',
  infrastructure: 'Jalur Baru: proyek infrastruktur menaikkan kapasitas nasional.',
  services: 'Investasi Manusia: pendidikan dan layanan publik meninggalkan hasil yang bertahan.',
  regions: 'Daerah Mengejar: wilayah dengan kondisi awal terlemah mencatat kemajuan.',
  institutions: 'Reformasi Lembaga: beberapa agenda legislatif bertahan melampaui masa jabatan.',
  unfinished: 'Agenda Tertunda: pekerjaan legislatif utama masih menunggu.',
  reconciliation: 'Rekonsiliasi: dukungan lintas partai tumbuh pada akhir masa jabatan.',
  contested: 'Warisan Diperdebatkan: hasil pemilu ketat atau kepercayaan publik rendah.',
};

function endings(c: CampaignState, winnerId: string, votes: ElectionResult['votes']) {
  const e = c.economy;
  const approved = c.bills.filter(bill => bill.stage === 'approved').length;
  const coalition = caucuses.filter(party => c.blocs[party.id].member);
  const rankings = Object.values(votes).sort((a, b) => b - a);
  const margin = (rankings[0] - rankings[1]) / rankings.reduce((a, b) => a + b, 0);
  return [
    winnerId === 'bima' ? 'continuity' : 'transition',
    ...(coalition.reduce((sum, party) => sum + party.seats, 0) < 220 ? ['fracture'] : []),
    ...(e.growth > initialEconomy.growth && e.purchasingPower > 101 ? ['recovery'] : []),
    ...(e.debt / e.gdp >= 0.46 ? ['fiscal'] : []),
    ...(e.infrastructure >= 55 ? ['infrastructure'] : []),
    ...(e.humanCapital >= 60 && e.poverty < initialEconomy.poverty ? ['services'] : []),
    ...(c.regions.every(region => region.development >= 53) ? ['regions'] : []),
    ...(approved >= 3 ? ['institutions'] : ['unfinished']),
    ...(coalition.length >= 5 && c.legitimacy >= 55 ? ['reconciliation'] : []),
    ...(margin < 0.04 || c.legitimacy < 45 ? ['contested'] : []),
  ];
}

export function countElection(c: CampaignState, random: () => number): ElectionResult {
  if (c.week !== termWeeks + 1) throw new Error('Pemilu dijadwalkan setelah minggu ke-260.');
  const field = eligibleCandidates();
  const votes: ElectionResult['votes'] = Object.fromEntries(field.map(candidate => [candidate.id, 0]));
  const regions = c.regions.map(region => {
    const turnout = Math.round(region.population * electionRules.votersPerPopulationUnit *
      clampMetric(0.61 + c.legitimacy / 500 + (random() - 0.5) * 0.08, 0.45, 0.9));
    const scores = field.map(candidate => {
      const backing = candidate.alliances.reduce((sum, id) => sum +
        (c.blocs[id].member === candidate.incumbent ? c.blocs[id].trust / 24 : -1), 0);
      const record = candidate.incumbent
        ? (region.support - 50) / 3 + (c.legitimacy - 50) / 5 + c.economy.growth - c.economy.inflation
        : candidate.id === 'karina' ? (65 - region.development) / 4 : (100 - c.economy.purchasingPower) / 4;
      return Math.max(1, 28 + backing + record + (random() - 0.5) * 10);
    });
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const shares = scores.map(score => turnout * score / totalScore);
    const totals = shares.map(Math.floor);
    const leftover = turnout - totals.reduce((a, b) => a + b, 0);
    const order = shares.map((share, index) => ({ index, fraction: share - totals[index] })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
    for (const { index } of order.slice(0, leftover)) totals[index]++;
    const regionalVotes = Object.fromEntries(field.map((candidate, index) => {
      votes[candidate.id] += totals[index];
      return [candidate.id, totals[index]];
    }));
    return { id: region.id, turnout, votes: regionalVotes };
  });
  const winnerId = Object.keys(votes).sort((a, b) => votes[b] - votes[a] || a.localeCompare(b))[0];
  return { winnerId, votes, regions, epilogues: endings(c, winnerId, votes) };
}

export function validElection(c: CampaignState) {
  const result = c.election;
  if (c.week <= termWeeks) return result === undefined;
  const expectedIds = eligibleCandidates().map(candidate => candidate.id);
  const validVotes = (votes: Record<string, number>) => votes && Object.keys(votes).length === expectedIds.length
    && expectedIds.every(id => Number.isSafeInteger(votes[id]) && votes[id] >= 0);
  if (!result || !validVotes(result.votes) || !expectedIds.includes(result.winnerId as typeof expectedIds[number])
    || !Array.isArray(result.regions) || result.regions.length !== c.regions.length) return false;
  if (!result.regions.every((r, i) => r && r.id === c.regions[i].id && validVotes(r.votes) && r.turnout > 0
    && r.turnout === Object.values(r.votes).reduce((sum, n) => sum + n, 0) && r.turnout <= c.regions[i].population * electionRules.votersPerPopulationUnit)) return false;
  const winner = [...expectedIds].sort((a, b) => result.votes[b] - result.votes[a] || a.localeCompare(b))[0];
  return expectedIds.every(id => result.votes[id] === result.regions.reduce((sum, r) => sum + r.votes[id], 0)) && result.winnerId === winner
    && JSON.stringify(result.epilogues) === JSON.stringify(endings(c, winner, result.votes));
}
