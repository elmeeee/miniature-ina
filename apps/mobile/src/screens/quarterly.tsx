import { useState } from 'react';
import { effectNames, quarterlyReports } from '@republik/simulation';
import type { CampaignState } from '@republik/shared-types';

const fmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const rupiah = (value: number) => 'Rp' + fmt.format(Math.abs(value)) + ' T';
const amount = (value?: number) => value === undefined ? 'Tidak tercatat' : (value < 0 ? '−' : '') + rupiah(value);
const labels = {
  education: 'Pendidikan', health: 'Kesehatan', defense: 'Pertahanan', infrastructure: 'Infrastruktur',
  social: 'Perlindungan sosial', energy: 'Subsidi energi', agriculture: 'Pertanian', administration: 'Administrasi',
  interest: 'Bunga utang', transfers: 'Transfer daerah', contingency: 'Cadangan',
};

export function QuarterlyBriefing({ campaign }: { campaign: CampaignState }) {
  const [selected, select] = useState<number>();
  const reports = quarterlyReports(campaign);
  const report = reports.find(q => q.week === selected) ?? reports.at(-1);
  if (!report) return <div><h2>Laporan kas triwulan</h2><p>Laporan pertama tersedia setelah minggu ke-13.</p></div>;
  return <div className="stack">
    <div><p className="scene-kicker">BRIEFING ANGGARAN</p><h2>Laporan kas triwulan</h2></div>
    <label>Periode<select value={report.week} onChange={event => select(Number(event.target.value))}>
      {[...reports].reverse().map(q => <option key={q.week} value={q.week}>Tahun {Math.ceil(q.week / 52)} · Triwulan {((q.week / 13 - 1) % 4) + 1}</option>)}
    </select></label>
    <div className="treasury-lead">
      <div><small>Saldo kas akhir</small><strong>{amount(report.endingCash)}</strong></div>
      <div><small>{report.balance < 0 ? 'Defisit' : 'Surplus'} triwulan</small><strong>{rupiah(report.balance)}</strong></div>
      <div><small>Utang akhir</small><strong>{amount(report.debt)}</strong></div>
    </div>
    <details><summary>Arus kas dan varians anggaran</summary>
      <dl className="campaign-data">
        {([
          ['Saldo kas awal', report.openingCash], ['Pendapatan', report.revenue],
          ['Belanja wajib', report.mandatorySpending], ['Belanja diskresioner', report.discretionarySpending],
          ['Penerbitan utang', report.borrowing], ['Pembayaran pokok utang', report.redemption],
          ['Pembiayaan bersih', report.netFinancing], ['Saldo kas akhir', report.endingCash],
          ['Proyeksi belanja awal triwulan', report.plannedSpending], ['Varians belanja (realisasi − proyeksi)', report.spendingVariance],
          ['Varians pendapatan', report.revenueVariance], ['Varians saldo anggaran', report.budgetVariance],
        ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{amount(value)}</dd></div>)}
      </dl>
      <p>Belanja wajib dalam simulasi meliputi bunga, transfer daerah, dan subsidi energi. Pokok utang masuk pembiayaan.</p>
    </details>
    <details><summary>Rincian belanja dan dampak kebijakan</summary>
      <dl className="campaign-data">{report.spending.map(line => <div key={line.key}><dt>{labels[line.key]}</dt><dd>{amount(line.amount)}</dd></div>)}</dl>
      {report.policyEffects.length ? <ul>{report.policyEffects.map((effect, i) => effect.kind === 'effect' &&
        <li key={i}>Minggu {effect.week} · {effectNames[effect.field]} {effect.change > 0 ? '+' : ''}{fmt.format(effect.change)}</li>,
      )}</ul> : <p>Belum ada dampak tertunda yang tercatat pada periode ini.</p>}
    </details>
  </div>;
}
