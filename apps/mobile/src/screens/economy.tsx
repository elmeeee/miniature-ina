import { useState } from 'react';
import { baselinePlan, termWeeks } from '@republik/game-data';
import { debtRatio, forecast, ministryRequests } from '@republik/simulation';
import { revenueLines, spendingLines } from '@republik/shared-types';
import type { Accounts, BudgetPlan, Economy, GameState } from '@republik/shared-types';
import { usePresidentialDecision } from './campaign';

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const fiscal = (value: number) => number.format(value) + ' T';
const indicators: Record<keyof Economy, [string, string]> = {
  gdp: ['PDB nominal', ' T'], growth: ['Pertumbuhan riil', '%'], inflation: ['Inflasi', '%'],
  unemployment: ['Pengangguran', '%'], poverty: ['Kemiskinan', '%'], exchangeRate: ['Kurs rupiah per USD', ''],
  interestRate: ['Suku bunga', '%'], debt: ['Utang negara', ' T'], confidence: ['Kepercayaan konsumen', ''],
  investment: ['Investasi bisnis', ' T'], purchasingPower: ['Daya beli', ''], infrastructure: ['Infrastruktur', ''],
  inequality: ['Ketimpangan wilayah', ''], energyPrice: ['Harga energi', ''], foodPrice: ['Harga pangan', ''],
  foreignInvestment: ['Investasi asing', ' T'], humanCapital: ['Modal manusia', ''],
};
const revenueLabels = { personal: 'PPh orang pribadi', corporate: 'PPh badan', vat: 'PPN', customs: 'Bea dan cukai', resources: 'Sumber daya alam', nonTax: 'PNBP lainnya', other: 'Pendapatan lain' };
export const spendingLabels = {
  education: 'Pendidikan', health: 'Kesehatan', defense: 'Pertahanan', infrastructure: 'Infrastruktur',
  social: 'Perlindungan sosial', energy: 'Subsidi energi', agriculture: 'Pertanian',
  administration: 'Administrasi', interest: 'Bunga utang', transfers: 'Transfer daerah', contingency: 'Cadangan',
};
const budgetStatus = { open: 'Terbuka', submitted: 'Diajukan', approved: 'Disetujui', rejected: 'Ditolak' };

function FiscalSummary({ accounts }: { accounts: Accounts }) {
  return <dl className="campaign-data">
    <div><dt>Pendapatan</dt><dd>{fiscal(accounts.totalRevenue)}</dd></div>
    <div><dt>Belanja</dt><dd>{fiscal(accounts.totalSpending)}</dd></div>
    <div><dt>Saldo primer</dt><dd>{fiscal(accounts.primaryBalance)}</dd></div>
    <div><dt>Saldo APBN</dt><dd>{fiscal(accounts.balance)}</dd></div>
    <div><dt>Kebutuhan pembiayaan</dt><dd>{fiscal(accounts.financing)}</dd></div>
  </dl>;
}

function BudgetEditor({ game }: { game: GameState }) {
  const c = game.campaign;
  const { run, error } = usePresidentialDecision();
  const [draft, setDraft] = useState<BudgetPlan>(() => structuredClone(c.budget.plan));
  const requests = ministryRequests(c);
  const projection = forecast(c.economy, draft);
  const editable = c.week <= termWeeks && c.budget.status !== 'approved';
  return <article className="panel stack">
    <div><h2>APBN Tahun {c.budget.year}</h2><p>Status DPR · {budgetStatus[c.budget.status]}</p>
      {c.budget.vote && <p>{c.budget.vote.yes} setuju · {c.budget.vote.no} menolak</p>}</div>
    <form className="stack" onSubmit={event => {
      event.preventDefault();
      run({ type: c.budget.status === 'submitted' ? 'amend-budget' : 'submit-budget', plan: draft });
    }}>
      <label>Indeks tarif pajak · {draft.taxFactor}
        <input type="range" min="70" max="140" value={draft.taxFactor} disabled={!editable}
          onChange={event => {
            const value = event.target.valueAsNumber;
            if (Number.isInteger(value) && value >= 70 && value <= 140) setDraft({ ...draft, taxFactor: value });
          }} />
      </label>
      <details>
        <summary>Alokasi belanja dan permintaan kementerian</summary>
        <div className="budget-grid">{spendingLines.filter(key => key !== 'interest').map(key =>
          <label key={key}>{spendingLabels[key]} <small>Permintaan {fiscal(requests[key])}</small>
            <input type="number" min="0" max={baselinePlan.spending[key] * 3} value={draft.spending[key]} disabled={!editable}
              onChange={event => {
                const value = event.target.valueAsNumber;
                if (Number.isInteger(value) && value >= 0 && value <= baselinePlan.spending[key] * 3) setDraft({ ...draft, spending: { ...draft.spending, [key]: value } });
              }} />
          </label>,
        )}</div>
      </details>
      <div><h3>Proyeksi Rancangan</h3><FiscalSummary accounts={projection} /></div>
      <details><summary>Rincian pendapatan dan belanja</summary>
        <dl className="campaign-data">{revenueLines.map(key => <div key={key}><dt>{revenueLabels[key]}</dt><dd>{fiscal(projection.revenue[key])}</dd></div>)}
          {spendingLines.map(key => <div key={key}><dt>{spendingLabels[key]}</dt><dd>{fiscal(projection.spending[key])}</dd></div>)}</dl>
      </details>
      <p>Pendidikan dan infrastruktur berpengaruh setelah proyek berjalan. Subsidi memengaruhi inflasi lebih cepat; pengaruh pajak pada investasi tertunda.</p>
      <div className="actions">
        {editable && <button className="primary">{c.budget.status === 'submitted' ? 'Ajukan amendemen' : 'Ajukan ke DPR'}</button>}
        {c.budget.status === 'submitted' && editable && <button type="button" className="outline" disabled={c.budget.lastVoteWeek === c.week} onClick={() => run({ type: 'vote-budget' })}>Putuskan di DPR</button>}
      </div>
    </form>
    {error && <p role="alert" className="error">{error}</p>}
  </article>;
}

export function NationalEconomy({ game }: { game: GameState }) {
  const c = game.campaign;
  return <div className="stack">
    <article className="panel"><h2>Indikator Ekonomi</h2><dl className="campaign-data">
      {(Object.keys(indicators) as (keyof Economy)[]).map(key =>
        <div key={key}><dt>{indicators[key][0]}</dt><dd>{number.format(c.economy[key])}{indicators[key][1]}</dd></div>,
      )}
      <div><dt>Utang terhadap PDB</dt><dd>{number.format(debtRatio(c))}%</dd></div>
    </dl></article>
    <BudgetEditor key={c.budget.year} game={game} />
    <article className="panel"><h2>Realisasi APBN</h2>
      <FiscalSummary accounts={c.budget.accrued} />
      {c.budgetArchive.length > 0 && <details><summary>Arsip APBN tahunan</summary>
        {[...c.budgetArchive].reverse().map(budget => <p key={budget.year}>
          Tahun {budget.year} · {budgetStatus[budget.status]} · Saldo {fiscal(budget.accrued.balance)}
          {budget.vote ? ' · ' + budget.vote.yes + ' setuju / ' + budget.vote.no + ' menolak' : ''}
        </p>)}
      </details>}
      {c.quarters.length > 0 && <details><summary>Arsip kumulatif setiap triwulan</summary>
        {[...c.quarters].reverse().map(q => <p key={q.week}>Minggu {q.week} · Saldo {fiscal(q.accounts.balance)} · Utang {fiscal(q.debt)}</p>)}
      </details>}
      {c.months.length > 0 && <details><summary>Laporan ekonomi bulanan</summary>
        {[...c.months].reverse().map(m => <p key={m.week}>Minggu {m.week} · PDB {fiscal(m.gdp)} · Inflasi {number.format(m.inflation)}% · Pengangguran {number.format(m.unemployment)}%</p>)}
      </details>}
    </article>
    <article className="panel"><h2>Pembangunan Wilayah</h2><dl className="campaign-data">{c.regions.map(region =>
      <div key={region.id}><dt>{region.name}</dt><dd>Indeks {number.format(region.development)} · Dukungan {number.format(region.support)}</dd></div>,
    )}</dl></article>
  </div>;
}
