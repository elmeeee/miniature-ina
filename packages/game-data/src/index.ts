import { defaultPresident } from './president';
export * from './president';
import { initialCampaign } from './campaign';
export * from './campaign';
import type { Character, GameState } from '@republik/shared-types';

const bios = [
  ['bima_aditya_pratama', 'Bima Aditya Pratama', 54, 'Presiden', 'president', 'nusantara', 90, 75],
  ['ratna_kusuma', 'Ratna Kusuma', 52, 'Wakil Presiden', 'vice_president', 'karya', 85, 58],
  ['anindita_prameswari', 'Anindita Prameswari', 48, 'Ekonom dan mantan kepala badan fiskal', 'minister', 'nusantara', 93, 68],
  ['surya_wirawan', 'Surya Wirawan', 55, 'Diplomat dan negosiator perdagangan', 'minister', 'karya', 85, 48],
  ['maya_santoso', 'Maya Santoso', 44, 'Dokter dan pengelola program kesehatan daerah', 'minister', undefined, 89, 43],
  ['dimas_hartono', 'Dimas Hartono', 51, 'Ketua partai dan mantan gubernur', 'party_leader', 'nusantara', 76, 65],
  ['sari_maheswari', 'Sari Maheswari', 49, 'Ketua partai dan penggerak koperasi', 'party_leader', 'karya', 78, 34],
  ['reza_firmansyah', 'Reza Firmansyah', 42, 'Anggota DPR dan ahli anggaran', 'dpr', 'karya', 82, 33],
  ['nala_wibowo', 'Nala Wibowo', 39, 'Penasihat kebijakan publik', 'advisor', undefined, 88, 77],
  ['putri_rahman', 'Putri Rahman', 37, 'Jurnalis politik', 'journalist', undefined, 86, 19],
  ['ardi_nugraha', 'Ardi Nugraha', 47, 'Pemimpin daerah dan perencana kota', 'regional', 'nusantara', 80, 59],
  ['dewi_lestari', 'Dewi Lestari', 40, 'Aktivis layanan publik', 'civil_society', undefined, 81, 27],
] as const;

const politicalTies: Record<string, Record<string, number>> = {
  ratna_kusuma: { sari_maheswari: 37, reza_firmansyah: 12 },
  anindita_prameswari: { nala_wibowo: 26, reza_firmansyah: -16 },
  dimas_hartono: { sari_maheswari: -31, ardi_nugraha: 35 },
  sari_maheswari: { ratna_kusuma: 41, dewi_lestari: 17 },
  reza_firmansyah: { anindita_prameswari: -20 },
  nala_wibowo: { putri_rahman: -10 },
  putri_rahman: { nala_wibowo: -14, dewi_lestari: 30 },
  ardi_nugraha: { dimas_hartono: 24, maya_santoso: 19 },
  dewi_lestari: { putri_rahman: 23, maya_santoso: 28 },
};

export const presidentId = bios[0][0];
export const characters: Record<string, Character> = Object.fromEntries(bios.map(
  ([id, fullName, age, background, role, partyId, competence, loyalty], index) => [id, {
    id, fullName, age, background, role, partyId, portraitAssetId: id,
    traits: { competence, loyalty, integrity: 67 + index % 6 * 5, ambition: 40 + index * 4, communication: 65 + index % 4 * 8, leadership: 62 + index % 5 * 7 },
    relationships: index === 0
      ? Object.fromEntries(bios.slice(1).map(row => [row[0], row[7] - 50]))
      : { [presidentId]: loyalty - 50, ...politicalTies[id] },
  }],
));

export const positions = [
  ['finance', 'Menteri Keuangan', 'keuangan'],
  ['foreign', 'Menteri Luar Negeri', 'luar_negeri'],
  ['health', 'Menteri Kesehatan', 'kesehatan'],
] as const;

export function initialGame(seed = 20261119): GameState {
  return {
    turn: 1, seed: seed >>> 0,
    campaign: initialCampaign(seed),
    president: { ...defaultPresident },
    positions: Object.fromEntries(positions.map(([id, title, ministryId]) => [id, { id, title, ministryId }])),
    characters: Object.fromEntries(Object.values(characters).map(
      ({ id, partyId, relationships }) => [id, { partyId, relationships: { ...relationships } }],
    )),
    parties: {
      nusantara: { id: 'nusantara', name: 'Partai Nusantara', leaderId: 'dimas_hartono', factions: ['Reformis', 'Nasionalis'], preferences: ['Investasi publik', 'Stabilitas fiskal'], coalition: 59 },
      karya: { id: 'karya', name: 'Partai Karya Bersama', leaderId: 'sari_maheswari', factions: ['Koperasi', 'Daerah'], preferences: ['Desentralisasi', 'Kesehatan'], coalition: 46 },
    },
    appointments: [],
    events: [],
  };
}

export * from './stories';

export function currentCharacter(game: GameState, id: string): Character {
  const character = characters[id];
  return id === presidentId
    ? { ...character, fullName: game.president.name, portraitAssetId: game.president.portrait }
    : character;
}
