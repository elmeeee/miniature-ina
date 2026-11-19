import { baselinePlan } from '@republik/game-data';
import { revenueLines, spendingLines } from '@republik/shared-types';
import type { Economy, BudgetPlan, Accounts } from '@republik/shared-types';

export const clampMetric = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

export function validPlan(plan: BudgetPlan): boolean {
  return !!plan && Number.isInteger(plan.taxFactor) && plan.taxFactor >= 70 && plan.taxFactor <= 140
    && spendingLines.every(key => {
      if (key === 'interest') return true;
      const value = plan.spending?.[key];
      return Number.isInteger(value) && value >= 0 && value <= baselinePlan.spending[key] * 3;
    });
}

export function balanceAccounts(revenue: Accounts['revenue'], spending: Accounts['spending']): Accounts {
  const totalRevenue = revenueLines.reduce((sum, key) => sum + revenue[key], 0);
  const totalSpending = spendingLines.reduce((sum, key) => sum + spending[key], 0);
  const balance = totalRevenue - totalSpending;
  return { revenue, spending, totalRevenue, totalSpending, balance,
    primaryBalance: balance + spending.interest, financing: Math.max(0, -balance) };
}

export function forecast(economy: Economy, plan: BudgetPlan): Accounts {
  if (!validPlan(plan)) throw new Error('Alokasi atau tarif APBN di luar batas.');
  const base = economy.gdp * plan.taxFactor / 100;
  return balanceAccounts({
    personal: base * 0.024 * (1 - economy.unemployment / 100),
    corporate: base * 0.021 * (0.8 + economy.confidence / 250),
    vat: base * 0.045 * economy.purchasingPower / 100,
    customs: economy.gdp * 0.013, resources: economy.gdp * 0.015 * economy.energyPrice / 100,
    nonTax: economy.gdp * 0.018, other: economy.gdp * 0.004,
  }, { ...plan.spending, energy: plan.spending.energy * economy.energyPrice / 100, interest: economy.debt * economy.interestRate / 100 });
}

export function accrue(total: Accounts, annual: Accounts, delivery: number): Accounts {
  const revenue = { ...total.revenue };
  const spending = { ...total.spending };
  for (const key of revenueLines) revenue[key] += annual.revenue[key] / 52;
  for (const key of spendingLines) {
    const rate = ['interest', 'energy', 'transfers'].includes(key) ? 1 : delivery;
    spending[key] += annual.spending[key] * rate / 52;
  }
  return balanceAccounts(revenue, spending);
}

export function updateEconomy(e: Economy, plan: BudgetPlan, previousTax: number, monthlyShock: number): Economy {
  const next = { ...e };
  const wagePressure = (plan.taxFactor - 100) / 100;
  const subsidy = (plan.spending.energy / baselinePlan.spending.energy - 1) * 2;
  next.energyPrice = clampMetric(e.energyPrice + (100 - e.energyPrice) * 0.012 + monthlyShock * 5, 45, 260);
  next.foodPrice = clampMetric(e.foodPrice + (100 - e.foodPrice) * 0.015 + monthlyShock * 2 - (plan.spending.agriculture - 85) / 800, 50, 220);
  const desiredInflation = 3 + (next.energyPrice - 100) / 24 + (next.foodPrice - 100) / 18 - subsidy;
  next.inflation = clampMetric(e.inflation + (desiredInflation - e.inflation) / 24, -3, 30);
  next.interestRate = clampMetric(e.interestRate + (3 + next.inflation - e.interestRate) / 35, 1, 25);
  const growthTarget = 4.6 + (e.infrastructure - 48) / 18 + (e.humanCapital - 53) / 20
    + (e.confidence - 55) / 30 - (next.interestRate - 6) * 0.4 - (previousTax - 100) / 25;
  next.growth = clampMetric(e.growth + (growthTarget - e.growth) / 20, -12, 14);
  next.gdp = e.gdp * (1 + (next.growth + next.inflation) / 5200);
  next.unemployment = clampMetric(e.unemployment + (5.3 - next.growth - e.unemployment / 3) / 52, 1, 35);
  next.poverty = clampMetric(e.poverty + (4 - next.growth - (plan.spending.social - 260) / 120) / 52, 1, 55);
  next.purchasingPower = clampMetric(e.purchasingPower + (next.growth - next.inflation - wagePressure * 8) / 52, 50, 160);
  next.confidence = clampMetric(e.confidence + (54 + next.growth * 1.5 - next.inflation * 1.7 - e.confidence) / 23);
  next.exchangeRate = clampMetric(e.exchangeRate * (1 + (next.inflation - 3 + monthlyShock) / 13000), 6000, 42000);
  next.investment = next.gdp * clampMetric(0.11 + next.confidence / 1800 - (previousTax - 100) / 900, 0.04, 0.25);
  next.foreignInvestment = next.investment * clampMetric(0.14 + (next.confidence - 55) / 400, 0.04, 0.28);
  next.inequality = clampMetric(e.inequality + (550 - plan.spending.transfers) / 21000);
  return next;
}
