import type { StoryEvent } from '@republik/shared-types';

export const stories: StoryEvent[] = [
  {
    id: 'fuel-prices', category: 'economy', title: 'Harga BBM di jalur distribusi',
    text: 'Kenaikan biaya angkut menekan pedagang pasar. Delegasi DPR meminta jaminan bahwa bantuan sampai ke rumah tangga sebelum perubahan harga berlaku.',
    firstWeek: 9, weight: 5, when: c => c.economy.energyPrice > 101 || c.economy.inflation > 3.5,
    choices: [
      { id: 'aid', label: 'Prioritaskan bantuan rumah tangga', effects: [{ kind: 'metric', field: 'purchasingPower', delta: 2 }, { kind: 'party', id: 'asas', delta: 5 }, { kind: 'metric', field: 'confidence', delta: -1 }], next: 'aid-audit' },
      { id: 'logistics', label: 'Buka negosiasi biaya logistik', effects: [{ kind: 'metric', field: 'confidence', delta: 2 }, { kind: 'party', id: 'pesisir', delta: 5 }, { kind: 'legitimacy', delta: -1 }] },
    ],
  },
  {
    id: 'aid-audit', category: 'legislature', title: 'Audit bantuan rumah tangga',
    text: 'Komisi anggaran menemukan selisih daftar penerima antara kabupaten. Auditor meminta waktu memeriksa data sebelum tahap berikutnya.',
    firstWeek: 10, weight: 10, follows: 'fuel-prices',
    choices: [
      { id: 'publish', label: 'Terbitkan audit dan koreksi daftar', effects: [{ kind: 'legitimacy', delta: 3 }, { kind: 'party', id: 'amanah', delta: 5 }] },
      { id: 'district', label: 'Delegasikan verifikasi kepada daerah', effects: [{ kind: 'region', id: 'east', delta: 4 }, { kind: 'party', id: 'pesisir', delta: 2 }, { kind: 'legitimacy', delta: -1 }] },
    ],
  },
  {
    id: 'nursing-service', category: 'public-services', title: 'Penempatan perawat kepulauan',
    text: 'Sejumlah puskesmas kepulauan bergiliran tutup karena kekurangan tenaga. Asosiasi perawat menawarkan pelatihan lokal jika pemerintah memberi kepastian penempatan.',
    firstWeek: 5, weight: 4, when: c => c.regions[3].development < 55,
    choices: [
      { id: 'train', label: 'Biayai pelatihan tenaga lokal', effects: [{ kind: 'capital-project', field: 'humanCapital', delta: 2, delay: 13 }, { kind: 'region', id: 'east', delta: 3 }] },
      { id: 'rotate', label: 'Negosiasikan rotasi tenaga kesehatan', effects: [{ kind: 'legitimacy', delta: 2 }, { kind: 'party', id: 'karya', delta: -3 }] },
    ],
  },
  {
    id: 'port-audit', category: 'infrastructure', title: 'Tata ulang jadwal pelabuhan',
    text: 'Kontraktor menemukan risiko sedimentasi pada jalur pengerukan. Pemerintah daerah perlu memilih antara pembukaan dermaga bertahap dan penundaan untuk desain baru.',
    firstWeek: 35, weight: 5,
    choices: [
      { id: 'redesign', label: 'Revisi desain dan jadwal', effects: [{ kind: 'capital-project', field: 'infrastructure', delta: 3, delay: 26 }, { kind: 'legitimacy', delta: -1 }] },
      { id: 'stages', label: 'Buka dermaga yang sudah siap', effects: [{ kind: 'metric', field: 'infrastructure', delta: 1 }, { kind: 'region', id: 'central', delta: 2 }] },
    ],
  },
  {
    id: 'term-platform', category: 'election', title: 'Platform untuk debat nasional',
    text: 'Tim kampanye meminta Presiden memilih isu utama. Mitra koalisi ingin melindungi agenda investasi, sementara advokat konsumen menuntut perhatian pada biaya hidup.',
    firstWeek: 220, lastWeek: 248, weight: 10,
    choices: [
      { id: 'invest', label: 'Tekankan kepastian investasi', effects: [{ kind: 'metric', field: 'confidence', delta: 3 }, { kind: 'party', id: 'nusantara', delta: 5 }] },
      { id: 'households', label: 'Dahulukan biaya hidup rumah tangga', effects: [{ kind: 'legitimacy', delta: 4 }, { kind: 'metric', field: 'purchasingPower', delta: 1 }] },
    ],
  },
  {
    id: 'procurement-records', category: 'cabinet', title: 'Berkas tender tidak lengkap',
    text: 'Laporan evaluasi kabinet menemukan dua dinas menggunakan daftar penyedia yang sudah kedaluwarsa. Sekretariat kementerian meminta waktu memperbaiki pencatatan sebelum kontrak diperbarui.',
    firstWeek: 54, weight: 6, when: c => c.ministerReviews.some(review => review.delivery < 74),
    choices: [
      { id: 'pause', label: 'Tunda kontrak sampai audit selesai', effects: [{ kind: 'legitimacy', delta: 3 }, { kind: 'metric', field: 'confidence', delta: -1 }, { kind: 'party', id: 'amanah', delta: 4 }] },
      { id: 'review', label: 'Lanjutkan layanan dengan pengawasan independen', effects: [{ kind: 'metric', field: 'confidence', delta: 1 }, { kind: 'party', id: 'amanah', delta: -3 }, { kind: 'party', id: 'karya', delta: 2 }] },
    ],
  },
  {
    id: 'faction-caucus', category: 'coalition', title: 'Faksi daerah meminta forum anggaran',
    text: 'Anggota faksi otonomi mengaku baru menerima rancangan kebijakan setelah dibahas para ketua partai. Mereka menawarkan forum bersama jika pemerintah bersedia membuka agenda anggaran.',
    firstWeek: 75, weight: 5, when: c => c.blocs.pesisir.member,
    choices: [
      { id: 'open', label: 'Buka forum bersama dengan perwakilan daerah', effects: [{ kind: 'party', id: 'pesisir', delta: 8 }, { kind: 'party', id: 'amanah', delta: -2 }, { kind: 'region', id: 'east', delta: 4 }] },
      { id: 'internal', label: 'Pertahankan pembahasan anggaran di komisi', effects: [{ kind: 'party', id: 'amanah', delta: 4 }, { kind: 'party', id: 'pesisir', delta: -6 }, { kind: 'legitimacy', delta: -1 }] },
    ],
  },
  {
    id: 'fish-market', category: 'regional', title: 'Rantai dingin pasar ikan',
    text: 'Nelayan di Indonesia Timur kehilangan hasil tangkapan karena pendingin komunal rusak. Koperasi bersedia mengelola pengganti jika daerah mendapat pendampingan teknis.',
    firstWeek: 47, weight: 4, when: c => c.regions[3].development < 58,
    choices: [
      { id: 'cooperative', label: 'Latih teknisi koperasi setempat', effects: [{ kind: 'region', id: 'east', delta: 4 }, { kind: 'capital-project', field: 'infrastructure', delta: 1, delay: 16 }] },
      { id: 'lease', label: 'Sewa pendingin bergerak untuk musim ini', effects: [{ kind: 'region', id: 'east', delta: 2 }, { kind: 'party', id: 'pesisir', delta: 3 }, { kind: 'legitimacy', delta: 1 }] },
    ],
  },
  {
    id: 'flood-access', category: 'crisis', title: 'Banjir memutus jalur layanan',
    text: 'Banjir menutup dua penghubung antarkecamatan. Tim daerah meminta bantuan untuk menjangkau warga yang terisolasi dan memulihkan akses ke klinik.',
    firstWeek: 109, lastWeek: 155, weight: 8,
    choices: [
      { id: 'access', label: 'Dahulukan layanan darurat dan akses klinik', effects: [{ kind: 'region', id: 'java', delta: 5 }, { kind: 'legitimacy', delta: 3 }, { kind: 'metric', field: 'confidence', delta: -1 }] },
      { id: 'rebuild', label: 'Buka layanan sementara dan perkuat jalur permanen', effects: [{ kind: 'region', id: 'java', delta: 2 }, { kind: 'capital-project', field: 'infrastructure', delta: 2, delay: 20 }, { kind: 'party', id: 'hijau', delta: 4 }] },
    ],
  },
  {
    id: 'classroom-attendance', category: 'public-services', title: 'Siswa absen setelah masa panen',
    text: 'Sekolah desa mencatat absensi berkepanjangan. Guru mengusulkan jadwal pemulihan belajar, sedangkan keluarga meminta bantuan untuk biaya perjalanan.',
    firstWeek: 140, weight: 4, when: c => c.economy.humanCapital < 64,
    choices: [
      { id: 'class', label: 'Buka kelas pemulihan dengan guru daerah', effects: [{ kind: 'capital-project', field: 'humanCapital', delta: 2, delay: 16 }, { kind: 'party', id: 'cerah', delta: 4 }] },
      { id: 'travel', label: 'Prioritaskan akses transportasi siswa', effects: [{ kind: 'region', id: 'central', delta: 4 }, { kind: 'metric', field: 'purchasingPower', delta: 1 }, { kind: 'party', id: 'asas', delta: 2 }] },
    ],
  },
  {
    id: 'transition-files', category: 'election', title: 'Berkas transisi pemerintahan',
    text: 'Sekretaris negara mengusulkan publikasi ringkasan kontrak dan program lintas tahun. Tim kampanye khawatir ringkasan itu akan diperdebatkan sebelum pemungutan suara.',
    firstWeek: 249, weight: 12,
    choices: [
      { id: 'publish', label: 'Terbitkan catatan yang sudah diverifikasi', effects: [{ kind: 'legitimacy', delta: 3 }, { kind: 'party', id: 'amanah', delta: 4 }, { kind: 'party', id: 'nusantara', delta: -2 }] },
      { id: 'handover', label: 'Siapkan serah terima bersama auditor', effects: [{ kind: 'metric', field: 'confidence', delta: 2 }, { kind: 'party', id: 'nusantara', delta: 3 }, { kind: 'legitimacy', delta: -1 }] },
    ],
  },
];
