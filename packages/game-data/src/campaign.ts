import { revenueLines, spendingLines } from '@republik/shared-types';
import type { Accounts, BudgetPlan, CampaignState, Caucus, Economy } from '@republik/shared-types';

export const weeksPerYear = 52;
export const termWeeks = 260;
export const parliamentSeats = 580;
export const initialEconomy: Economy = {
  gdp: 22000, growth: 5, inflation: 3.2, unemployment: 5.3, poverty: 9.5,
  exchangeRate: 15500, interestRate: 6, debt: 8500, confidence: 57, investment: 3100,
  purchasingPower: 100, infrastructure: 48, inequality: 31, energyPrice: 100,
  foodPrice: 100, foreignInvestment: 430, humanCapital: 53,
};
export const baselinePlan: BudgetPlan = {
  taxFactor: 100,
  spending: {
    education: 470, health: 230, defense: 160, infrastructure: 320, social: 260,
    energy: 125, agriculture: 85, administration: 320, transfers: 550, contingency: 45,
  },
};

export const caucuses: Caucus[] = [
  { id: 'nusantara', name: 'Partai Nusantara', leader: 'Dimas Hartono', seats: 118, preference: 'infrastructure', discipline: 81, factions: ['Reformis', 'Nasionalis'], objective: 'Modernisasi infrastruktur' },
  { id: 'karya', name: 'Partai Karya Bersama', leader: 'Sari Maheswari', seats: 91, preference: 'health', discipline: 74, factions: ['Koperasi', 'Daerah'], objective: 'Layanan kesehatan daerah' },
  { id: 'pesisir', name: 'Persatuan Pesisir', leader: 'Karina Lazuardi', seats: 73, preference: 'transfers', discipline: 69, factions: ['Maritim', 'Otonomi'], objective: 'Otonomi anggaran' },
  { id: 'hijau', name: 'Gerakan Bumi Hijau', leader: 'Faris Samudra', seats: 65, preference: 'agriculture', discipline: 82, factions: ['Iklim', 'Pangan'], objective: 'Pertanian berkelanjutan' },
  { id: 'asas', name: 'Partai Asas Warga', leader: 'Tirta Anggara', seats: 64, preference: 'social', discipline: 65, factions: ['Pekerja', 'Komunitas'], objective: 'Perlindungan pekerja' },
  { id: 'cerah', name: 'Partai Masa Cerah', leader: 'Laras Purnama', seats: 62, preference: 'education', discipline: 72, factions: ['Guru', 'Mahasiswa'], objective: 'Pemerataan pendidikan' },
  { id: 'amanah', name: 'Forum Amanah Publik', leader: 'Yoga Narmada', seats: 56, preference: 'defense', discipline: 88, factions: ['Stabilitas', 'Audit'], objective: 'Kesiapan dan tata kelola pertahanan' },
  { id: 'merdeka', name: 'Aliansi Merdeka Madani', leader: 'Rika Sembada', seats: 51, preference: 'administration', discipline: 59, factions: ['Birokrasi', 'Kota'], objective: 'Reformasi administrasi' },
];

export function emptyAccounts(): Accounts {
  return {
    revenue: Object.fromEntries(revenueLines.map(key => [key, 0])) as Accounts['revenue'],
    spending: Object.fromEntries(spendingLines.map(key => [key, 0])) as Accounts['spending'],
    totalRevenue: 0, totalSpending: 0, primaryBalance: 0, balance: 0, financing: 0,
  };
}

export function initialCampaign(seed: number): CampaignState {
  return {
    week: 1, seed: (seed ^ 0x54a51f02) >>> 0, economy: { ...initialEconomy },
    budget: { year: 1, status: 'open', plan: structuredClone(baselinePlan), execution: structuredClone(baselinePlan), accrued: emptyAccounts() },
    blocs: Object.fromEntries(caucuses.map((party, i) => [party.id, { member: i < 2, trust: Math.max(18, 66 - i * 7) }])),
    budgetArchive: [], bills: [], quarters: [], months: [], delayed: [], legitimacy: 57, ministerReviews: [], briefings: [],
    effectiveTax: 100, delayedTax: [],
    eventHistory: [], nextEvents: [],
    regions: [
      { id: 'sumatra', name: 'Sumatra', population: 23, development: 54, support: 55 },
      { id: 'java', name: 'Jawa', population: 55, development: 72, support: 52 },
      { id: 'central', name: 'Indonesia Tengah', population: 16, development: 49, support: 49 },
      { id: 'east', name: 'Indonesia Timur', population: 6, development: 39, support: 46 },
    ],
  };
}
