import type { GameState, SpendingLine } from '@republik/shared-types';

type Focus = Exclude<SpendingLine, 'interest' | 'administration' | 'contingency'>;
type Chapter = {
  title: string; brief: string; ministry: 'finance' | 'health' | 'foreign'; focus: Focus;
  party: string; project: string; partner: string;
};

export const chapterYears = ['Awal Kekuasaan', 'Membangun Negara', 'Tahun Gejolak', 'Perebutan Pengaruh', 'Tahun Penentuan'];
export const chapters: Chapter[] = [
  { title: 'Mandat Pertama', brief: 'Kementerian membawa permintaan awal ke Istana. Kapasitas pengadaan belum merata.', ministry: 'finance', focus: 'infrastructure', party: 'nusantara', project: 'rehabilitasi jalur distribusi', partner: 'pengawasan kontrak' },
  { title: 'Harga di Pasar', brief: 'Pasar grosir meminta kepastian pasokan menjelang musim paceklik.', ministry: 'finance', focus: 'agriculture', party: 'hijau', project: 'penyimpanan pangan lokal', partner: 'akses koperasi' },
  { title: 'Layanan Kepulauan', brief: 'Kabupaten kepulauan mengusulkan pelayanan kesehatan keliling.', ministry: 'health', focus: 'health', party: 'karya', project: 'klinik keliling', partner: 'penempatan tenaga daerah' },
  { title: 'Banjir dan Cadangan', brief: 'Pemerintah daerah perlu membuka kembali akses pasar setelah banjir.', ministry: 'finance', focus: 'transfers', party: 'pesisir', project: 'pemulihan layanan daerah', partner: 'audit tanggap darurat' },
  { title: 'Anggaran Tahun Kedua', brief: 'DPR meminta bukti bahwa investasi publik tahun lalu menurunkan biaya logistik.', ministry: 'finance', focus: 'infrastructure', party: 'nusantara', project: 'sambungan jalan pelabuhan', partner: 'publikasi biaya logistik' },
  { title: 'Guru di Perbatasan', brief: 'Pemerintah kabupaten kekurangan guru tetap untuk sekolah kecil.', ministry: 'health', focus: 'education', party: 'cerah', project: 'penguatan sekolah perbatasan', partner: 'pendampingan guru lokal' },
  { title: 'Koperasi Pangan', brief: 'Koperasi desa mengajukan jaminan agar pemasok kecil dapat masuk rantai distribusi.', ministry: 'finance', focus: 'agriculture', party: 'hijau', project: 'pengadaan benih daerah', partner: 'pengawasan harga panen' },
  { title: 'Jaringan Rujukan', brief: 'Rumah sakit rujukan meminta interoperabilitas data dan tambahan tenaga.', ministry: 'health', focus: 'health', party: 'karya', project: 'jaringan rujukan antardaerah', partner: 'akses pasien daerah' },
  { title: 'Kenaikan Harga Energi', brief: 'Pelaku usaha meminta kepastian biaya saat harga energi berubah.', ministry: 'finance', focus: 'energy', party: 'asas', project: 'penyangga energi rumah tangga', partner: 'batas penerima subsidi' },
  { title: 'Pemeriksaan Pengadaan', brief: 'Komisi menanyakan mengapa sebagian pengadaan tertunda setelah pemeriksaan.', ministry: 'foreign', focus: 'defense', party: 'amanah', project: 'pembaruan peralatan tanggap bencana', partner: 'verifikasi independen' },
  { title: 'Unjuk Rasa dan Dialog', brief: 'Perwakilan pekerja meminta perlindungan bagi keluarga dengan pendapatan tidak tetap.', ministry: 'finance', focus: 'social', party: 'asas', project: 'jaring pengaman pekerja', partner: 'dialog asosiasi pekerja' },
  { title: 'Mandat yang Diperdebatkan', brief: 'Evaluasi kabinet memunculkan tuntutan baru tentang pembagian tanggung jawab.', ministry: 'health', focus: 'health', party: 'karya', project: 'layanan dasar berisiko tertunda', partner: 'target layanan terbuka' },
  { title: 'Aliansi Daerah', brief: 'Pimpinan daerah meminta peran dalam agenda investasi sebelum menentukan dukungan.', ministry: 'foreign', focus: 'transfers', party: 'pesisir', project: 'kemitraan pembangunan wilayah', partner: 'perwakilan daerah di komisi' },
  { title: 'Emisi dan Ekspor', brief: 'Pembeli luar negeri menanyakan jejak produksi pemasok domestik.', ministry: 'foreign', focus: 'agriculture', party: 'hijau', project: 'peralihan praktik produksi', partner: 'standar mutu pemasok' },
  { title: 'Anak yang Tertinggal', brief: 'Kepala sekolah melaporkan kesenjangan hasil belajar setelah mobilitas pekerja meningkat.', ministry: 'health', focus: 'education', party: 'cerah', project: 'pemulihan pembelajaran', partner: 'pelaporan kehadiran sekolah' },
  { title: 'Dukungan Bersyarat', brief: 'Fraksi ingin mengunci proyek daerah sebelum masa kampanye berikutnya.', ministry: 'finance', focus: 'infrastructure', party: 'nusantara', project: 'penyelesaian konektivitas lintas pulau', partner: 'uji kemajuan proyek' },
  { title: 'Janji Tahun Terakhir', brief: 'Kementerian harus memutuskan program mana yang akan diselesaikan sebelum pemilu.', ministry: 'health', focus: 'health', party: 'karya', project: 'penyelesaian layanan kesehatan dasar', partner: 'verifikasi target kampanye' },
  { title: 'Jaring Pengaman Terakhir', brief: 'Agenda perlindungan masyarakat bersaing dengan ruang fiskal yang tersisa.', ministry: 'finance', focus: 'social', party: 'asas', project: 'perlindungan rumah tangga miskin', partner: 'evaluasi daftar penerima' },
  { title: 'Persiapan Serah Terima', brief: 'Tim transisi meminta kejelasan tentang kewajiban yang akan diwariskan.', ministry: 'foreign', focus: 'transfers', party: 'pesisir', project: 'penuntasan kontrak layanan daerah', partner: 'arsip kewajiban terbuka' },
  { title: 'Bab Penentuan', brief: 'Komisi pemilu memasuki tahap akhir. Kabinet masih harus memutuskan prioritas terakhir.', ministry: 'finance', focus: 'education', party: 'cerah', project: 'perlindungan program sekolah lintas tahun', partner: 'kesepakatan transisi' },
];

export function chapterNumber(game: GameState) {
  return Math.ceil(Math.min(260, game.campaign.week) / 13);
}
