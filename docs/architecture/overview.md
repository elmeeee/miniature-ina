# Architecture

| Path | Responsibility |
| --- | --- |
| `apps/mobile` | React and Zustand UI, save adapter, Vite entry point and Capacitor projects |
| `packages/shared-types` | Character, office, party, appointment and event contracts |
| `packages/game-data` | Fictional identities, office catalog and initial political state |
| `packages/simulation` | Deterministic decisions, eligibility, history, event generation and save validation |
| `packages/ui` | Reusable character portraits, cards and profiles |
| `assets` and `scripts/characters.ts` | Original art input, reviewed crop plan, portrait manifest and validator |

The scenario begins with three vacant cabinet posts. Each accepted action advances one turn and updates the event log. Candidate eligibility comes from character role and current office occupancy. Replacement and rotation close previous appointments and open new ones at the same turn. Intervals are half-open. Vacancies have no active appointment, and a character can return after a previous term ends. Appointment history and offices are checked together before and after every decision.

Social ties and affiliations are mutable game state. Starting ties to the president vary across the cast. Cabinet actions affect both the personal relationship and the character's party coalition score. A separate realignment command changes affiliation and adjusts party leaders' relationships, coalition scores and the news log. The current mobile scenario exposes cabinet actions. Future narrative events can call the realignment command.

The simulation receives state and an explicit command and returns a new state. Event selection advances an integer PRNG stored in the save. Given identical inputs, it produces identical outputs. React owns selection and confirmation only. Zustand writes a validated versioned snapshot to local WebView storage before replacing in-memory state. Version-zero envelopes receive an empty cabinet event log. Versions zero and one acquire a new campaign at week one while retaining their cabinet history. Invalid saves are preserved for export and require explicit reset. Cloud sync and cross-device restore are outside this slice.

The five navigation destinations share the same state. Negara now reports economic indicators, regional development, and projected and realized budget figures. The active campaign and regional model are described below.

## Presidency simulation

The campaign clock starts at week 1. Cabinet decisions retain their own historical sequence and do not consume a campaign week. At week completion the engine applies due tax effects and updates macro indicators using a seeded four-week commodity shock. It then applies due project effects, accrues the operating budget, changes debt, adds reports and updates regions and delivery records. The next week opens a weighted event draw or, after week 260, triggers the election. A pending choice blocks further time advancement. Budget and bill votes consume the persisted campaign seed in party and seat order. The cabinet still uses its existing separate seed for reshuffle news.

Monetary amounts are in trillion rupiah, macro rates in percent, and price and purchasing-power measures in index points. The exchange rate is rupiah per US dollar. The tax index starts at 100. Personal, corporate and VAT bases scale with the index and are adjusted by employment, confidence or purchasing power. Customs, resource and other receipts use explicit GDP shares in `packages/simulation/src/fiscal.ts`. Resource receipts and energy subsidies both respond to commodity prices. Nominal GDP changes by one fifty-second of the combined annual real growth and inflation rates.

Revenue minus expenditure gives the fiscal balance. Add interest back to get the primary balance. Financing equals the positive part of the deficit. Interest is the current debt stock times the annual interest rate, prorated per week. Each week's deficit adds to the debt stock and surpluses retire debt up to the outstanding amount. Cash reserves beyond complete repayment are outside this model. Transfers are a single APBN outflow. Regional development responds to the transfer allocation without charging it again. Spending on interest, energy and transfers is booked at the policy rate. Other programs use cabinet delivery as a realization factor. The previous operating plan continues to execute until DPR approves a replacement, even after rejection or year rollover. Four quarterly snapshots per year are cumulative within that fiscal year.

An approved tax change affects collections and purchasing power on execution. The growth and investment feedback uses the tax index from 13 weeks earlier. Quarterly infrastructure and education effects mature after 13 and 26 weeks respectively. The ministry request values are advisory. Realization reports show actual modeled collections and spending, while proposals show annualized estimates at current indicator levels.

Election scoring combines regional conditions, alliance backing, the incumbent's macro record and legitimacy, turnout, and a seeded swing. The highest national vote total wins under the fictional plurality rule. Largest-remainder rounding ensures that candidate tallies equal regional turnout. Election victory and policy epilogues are scored independently. See the [production progress report](../production/PROGRESS.md) for coverage and current limitations.
