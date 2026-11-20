# Benchmark-driven gameplay progress

The repository contained the cinematic onboarding and a working 260-week simulation before this update. No competitor screenshots were attached to this request. The written benchmark informed the interaction flow. The new regional map uses the project's own strategy sheet.

## What plays now

- Creation keeps a custom name, gender, preview, and salutation. Five backgrounds change the starting political and public balance with visible tradeoffs. Three difficulty levels change starting legitimacy, the recurring DPR whip modifier, and commodity shock amplitude. All settings have defaults and the existing cabinet, budget, legislature and regional data initialize automatically.
- Twelve campaign promises offer fixed numeric targets. Players keep exactly three. The desk shows the current measurement and reevaluates them after the final election. The evaluation is separate from the election winner and the existing epilogue selection. Legacy saves receive the default mandate without reapplying starting modifiers.
- The office gives direct access to decisions, minister calls, regional map, fiscal reports, DPR negotiations, cabinet disputes and national news. DPR negotiations and cabinet appointments continue to use the existing systems. The map shows four simulated aggregate regions.
- Adoption and rejection of APBN, coalition changes, story decisions, applied policy changes, regional deltas, and cabinet outcomes produce news from saved simulation records. A dismissible press overlay is available from TV and the news archive. Minister disputes can be addressed through a hearing or an accepted resignation. The hearing alters the relationship and is remembered in relevant later calls. An accepted resignation uses the real cabinet transition and frees the office for appointment.
- Weekly advancement still stops for unresolved stories. Fast-forward is limited to four weeks and also stops at each quarterly report and fiscal rollover.

## Fiscal reconciliation

The initial cash reserve is Rp120 T. Each report subtracts the previous quarter's cumulative fiscal entries from the current quarter, except the first quarter of each fiscal year, which starts from zero for year-to-date accounts. Beginning cash carries across years. Ending cash equals opening cash plus revenue minus expenditure plus net financing. Net financing equals the change in outstanding debt in this model. Financing covers deficits and surplus redeems existing debt before increasing cash. Debt principal goes through financing. Interest, statutory transfers, and energy subsidies are classified as mandatory in this model. Other expenditure lines are discretionary.

At quarter opening, the engine snapshots a quarter of the annualized operating forecast as the variance baseline. New reports include gross issuance and redemption and measured revenue, spending and balance variances. Prior saves can reconstruct income, expenditure, net financing and cash from the quarterly fiscal records. Missing gross flows and forecast baselines remain marked unavailable in those reports.

## Verification and gaps

Automated tests check all backgrounds, difficulty behavior, mandate validation and evaluation, fiscal reconciliation including rollover and deficit financing, news provenance, weekly interruption, cabinet conflict and resignation, and migration. The wider suite still checks the full campaign and earlier cabinet and save flows. Chromium at 320 and 390 px verified custom setup, save reload, map selection, breaking news, routine advancement, and the quarterly detail panel without horizontal overflow.

The event catalog remains at 11 and character memories cover the opening and resolved disputes. The indexed map is regional rather than provincial. Further promise and difficulty calibration would benefit from broader playtesting. Native platform compilation and device validation remain open.
