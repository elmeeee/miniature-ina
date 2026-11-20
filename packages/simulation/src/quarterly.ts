import { emptyAccounts, initialEconomy } from '@republik/game-data';
import { spendingLines } from '@republik/shared-types';
import type { CampaignState } from '@republik/shared-types';

export const startingTreasury = 120;
const mandatory = ['interest', 'transfers', 'energy'] as const;

export function quarterlyReports(c: CampaignState) {
  let cash = startingTreasury;
  let debt = initialEconomy.debt;
  return c.quarters.map((quarter, i) => {
    const previous = i % 4 === 0 ? emptyAccounts() : c.quarters[i - 1].accounts;
    const revenue = quarter.accounts.totalRevenue - previous.totalRevenue;
    const expenditure = quarter.accounts.totalSpending - previous.totalSpending;
    const mandatorySpending = mandatory.reduce((sum, key) => sum + quarter.accounts.spending[key] - previous.spending[key], 0);
    const netFinancing = quarter.debt - debt;
    const balance = revenue - expenditure;
    const endingCash = cash + balance + netFinancing;
    const report = {
      week: quarter.week, openingCash: cash, revenue, expenditure, mandatorySpending,
      discretionarySpending: expenditure - mandatorySpending, netFinancing, debt: quarter.debt,
      borrowing: quarter.tracking?.borrowing, redemption: quarter.tracking?.redemption,
      balance, endingCash, plannedSpending: quarter.tracking?.plannedSpending,
      revenueVariance: quarter.tracking ? revenue - quarter.tracking.plannedRevenue : undefined,
      budgetVariance: quarter.tracking ? balance - (quarter.tracking.plannedRevenue - quarter.tracking.plannedSpending) : undefined,
      spendingVariance: quarter.tracking ? expenditure - quarter.tracking.plannedSpending : undefined,
      spending: spendingLines.map(key => ({ key, amount: quarter.accounts.spending[key] - previous.spending[key] })),
      policyEffects: (c.developments ?? []).filter(d => d.kind === 'effect' && d.week <= quarter.week && d.week > quarter.week - 13),
    };
    cash = endingCash;
    debt = quarter.debt;
    return report;
  });
}
