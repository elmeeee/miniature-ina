# Campaign overhaul progress

## Audit

The existing game had a stateful inauguration and fiscal opening, a cinematic office, a weekly simulation with optional four-week skips, three raw local save slots, quarter accounting, eleven eligible events, and seeded election and epilogue logic. The earlier election result lived inside the office and had no independent history, main menu or replay flow. The overhaul keeps the simulation and portrays its output in a chapter and menu structure.

## Delivered

- Twenty chapters cover five years. A chapter presents two distinct agenda decisions tied to its ministry and policy issue. The first reallocates the operating budget or retains it for review. The second changes political support or relationships. The office retains optional management between decisions.
- After decisions, the engine processes real weeks until an eligible pending event, quarterly summary or election interrupts. It retains the existing event flags, exhaustion rules, delayed effects, development ledger and month/quarter calculations. Briefings note relevant prior decisions and current economic and party conditions. Launching a continuation from a legacy save starts chapter tracking at the current quarter, with prior history preserved.
- The main menu, pause menu, three manual slots, automatic save, rename, confirmed deletion/overwrite and government archive use a separate local save collection. Completed governments are archived automatically. Beginning a fresh run preserves the previous active run. Save version 5 embeds chapter tracking; versions 0–4 continue to load.
- Completing Chapter 20 generates the existing seeded election once. A chapter summary leads to election night, the ending and post-game actions. The legacy report reads recorded promise, economic, fiscal, political, cabinet and event history. The twelve existing epilogue rules remain active.
- Post-game replay supports a fresh standard world and New Game+ with a different opening economy, coalition membership and political relationships. Cabinet, promises and the rest of the runtime initialize from a fresh seeded world.

## Remaining scope

- The event catalog still contains eleven conditional stories. The forty authored chapter prompts use two shared decision frameworks. A measured 2–4 hour playtime, a larger adaptive story pool and independent playability fixtures for all twelve epilogues remain open.
- Policy effects due after week 260 are listed as remaining commitments. The election uses actual results to date. Separate sandbox and second-term modes are intentionally absent from the menu.
- Storage is local to the device. Automatic archival consumes local storage as campaigns accumulate. Native builds and device checks require Android/iOS tooling.

## Verification

The Vitest suite contains 46 tests, including two full 20-chapter runs, interruption and save/resume, deferred effects, exactly-once finale presentation, overwrite protection, and independent replay. Chromium covered the full 20-chapter flow on portrait widths of 320 and 360 px, including pause and resume, manual save, continue from a saved management tab, election night, legacy access, and New Game+. Production web build, lint, and both Capacitor sync targets passed.
