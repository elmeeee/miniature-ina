import type { GameState, Mandate } from '@republik/shared-types';

export const backgrounds = {
  military: { label: 'Purnawirawan', effect: 'Amanah +7 kepercayaan · Asas Warga −5', ties: { amanah: 7, asas: -5 }, legitimacy: 0, confidence: 0 },
  governor: { label: 'Mantan gubernur', effect: 'Persatuan Pesisir +7 kepercayaan · kepercayaan konsumen −2', ties: { pesisir: 7 }, legitimacy: 0, confidence: -2 },
  entrepreneur: { label: 'Wirausahawan', effect: 'Kepercayaan konsumen +5 · Asas Warga −5', ties: { asas: -5 }, legitimacy: 0, confidence: 5 },
  academic: { label: 'Akademisi', effect: 'Masa Cerah +7 kepercayaan · Amanah −4', ties: { cerah: 7, amanah: -4 }, legitimacy: 0, confidence: 0 },
  activist: { label: 'Aktivis', effect: 'Legitimasi +4 · kepercayaan konsumen −4', ties: {}, legitimacy: 4, confidence: -4 },
};

export const difficulties = {
  relaxed: { label: 'Longgar', detail: 'Legitimasi awal +5, dukungan DPR +4 poin, gejolak harga lebih ringan.', legitimacy: 5, whip: 4, shock: 0.7 },
  standard: { label: 'Standar', detail: 'Dukungan DPR dan gejolak harga sesuai skenario dasar.', legitimacy: 0, whip: 0, shock: 1 },
  demanding: { label: 'Menantang', detail: 'Legitimasi awal −5, dukungan DPR −4 poin, gejolak harga lebih kuat.', legitimacy: -5, whip: -4, shock: 1.45 },
};

type PromiseDefinition = {
  label: string; unit: string; target: number; direction: 'min' | 'max'; measure: (state: GameState) => number;
};
export const promises = {
  food: { label: 'Kendalikan harga pangan', unit: ' indeks', target: 100, direction: 'max', measure: s => s.campaign.economy.foodPrice },
  growth: { label: 'Percepat pertumbuhan ekonomi', unit: '%', target: 5.5, direction: 'min', measure: s => s.campaign.economy.growth },
  poverty: { label: 'Kurangi kemiskinan', unit: '%', target: 7, direction: 'max', measure: s => s.campaign.economy.poverty },
  education: { label: 'Tingkatkan modal manusia', unit: ' indeks', target: 60, direction: 'min', measure: s => s.campaign.economy.humanCapital },
  healthcare: { label: 'Perkuat layanan kesehatan', unit: ' RUU disetujui', target: 2, direction: 'min', measure: s => s.campaign.bills.filter(b => b.focus === 'health' && b.stage === 'approved').length },
  infrastructure: { label: 'Bangun infrastruktur nasional', unit: ' indeks', target: 56, direction: 'min', measure: s => s.campaign.economy.infrastructure },
  jobs: { label: 'Turunkan pengangguran', unit: '%', target: 4, direction: 'max', measure: s => s.campaign.economy.unemployment },
  services: { label: 'Tingkatkan kinerja kementerian', unit: '/100', target: 80, direction: 'min', measure: s => {
    const reviews = s.campaign.ministerReviews.filter(r => r.week === s.campaign.quarters.at(-1)?.week);
    return reviews.reduce((sum, r) => sum + r.delivery, 0) / Object.keys(s.positions).length;
  } },
  regions: { label: 'Kurangi ketimpangan wilayah', unit: ' indeks', target: 27, direction: 'max', measure: s => s.campaign.economy.inequality },
  debt: { label: 'Jaga kesinambungan utang', unit: '% PDB', target: 30, direction: 'max', measure: s => s.campaign.economy.debt / s.campaign.economy.gdp * 100 },
  investment: { label: 'Tarik investasi asing', unit: ' T', target: 630, direction: 'min', measure: s => s.campaign.economy.foreignInvestment },
  reform: { label: 'Sahkan agenda reformasi', unit: ' RUU disetujui', target: 4, direction: 'min', measure: s => s.campaign.bills.filter(b => b.stage === 'approved').length },
} satisfies Record<string, PromiseDefinition>;

export function defaultMandate(): Mandate {
  return { background: 'governor', difficulty: 'standard', promises: ['food', 'poverty', 'infrastructure'] };
}

export function validMandate(m: Mandate) {
  return !!m && Object.hasOwn(backgrounds, m.background) && Object.hasOwn(difficulties, m.difficulty)
    && Array.isArray(m.promises) && m.promises.length === 3 && new Set(m.promises).size === 3
    && m.promises.every(id => Object.hasOwn(promises, id));
}

export function promiseProgress(state: GameState) {
  return state.mandate.promises.map(id => {
    const definition = promises[id];
    const value = definition.measure(state);
    return { id, ...definition, value, met: definition.direction === 'min' ? value >= definition.target : value <= definition.target };
  });
}
