# Production progress

The current build is an offline, playable 260-week presidency. The scenario uses fictional political figures and parties. Existing cabinet and character data and original artwork remain available. The ending is playable, but the full production brief is still open.

| Milestone | Status | Implemented and remaining work |
| --- | --- | --- |
| M1 — State and schemas | Implemented for this scenario | Separate weekly clock and cabinet action sequence. Save version 2 adds campaign state and migrates versions 0 and 1 without discarding cabinet history. Deterministic integer PRNG. Structural and accounting checks reject invalid saves. |
| M2 — Economics and APBN | Playable, tuning pending | 17 economic indicators, seven revenue and eleven spending lines, ministry requests, proposal, amendment, vote, carryover, execution, debt and quarterly realization. Tax policy uses a shared multiplier. Per-tax legislative instruments and richer scenario/shock configuration remain open. |
| M3 — Politics | Playable subset | Eight parties and 580 seats, approval through committee and recorded vote, negotiation and coalition exit, cabinet reshuffle and quarterly review. Leadership succession, interim appointments, timed caucus discipline or faction splinters, negotiated cabinet-seat agreements, and explicit personality memories remain open. Present caucus leaders and factions use authored profiles. |
| M4 — Weekly campaign | Playable | 260 steps, five phase labels, monthly reports, quarterly and year-end reviews, annual budgets, cabinet delivery, regional development and fixed ordering. Phase-specific agenda and election milestones are limited to current content. |
| M5 — Events | Partial | 11 authored decisions across all nine categories, eligibility, weighted selection, exclusive branches, delayed effects, history, and one chain. Every event is single-use. Target is 300. Repeatable events with scoped cooldowns, character memory effects, and larger chains remain open. |
| M6 — Election | Playable subset | Three fictional candidates, candidate eligibility and term limits, four weighted regional blocs, state-dependent turnout and votes, twelve epilogue rules. Additional campaign mechanics and independent reachability checks for each epilogue remain open. |
| M7 — Mobile UI | Playable subset | Istana weekly briefing, active decisions and results. Negara economy, regions and APBN. Politik DPR and coalitions. Existing cabinet, character profiles and archives remain accessible. More visual polish and deeper mechanics depend on domain and content work. |
| M8 — Regression and platforms | Partial | Local autosave, three manual slots, save export, new game, migration and validation. Four full seeded simulations verify completion and deterministic save/resume, with a separate full defeat scenario. A Chromium smoke test at 360 px covers APBN submission and amendment, DPR, coalition negotiation, an event decision, new game, slot save/load, reload and navigation. Web production build and Capacitor sync verified. Native device builds require Android SDK 36 and macOS with Xcode. |

## Next executable work

1. Extend the event catalog, starting with individually authored cabinet and DPR chains under `packages/game-data/src/stories.ts`. Current counts are economy 1/45, cabinet 1/40, DPR 1/40, coalition 1/40, region 1/35, social services 2/35, infrastructure 1/25, crisis 1/20, and election 2/20. The category minimums in the brief sum to **300**. Run the catalog and seeded campaigns after each content batch and track condition and branch coverage.
2. Extend the campaign schema for typed political memories, dynamic party leadership, faction pressure, and interim appointment expiry. Add choice effects that use those APIs and test migration before exposing the controls.
3. Add scenario fixtures proving every epilogue can be reached through legal commands, then tune turnout and fiscal parameters across high-deficit, low-investment, and coalition-fracture runs.
4. Confirm Android and iOS builds and test backgrounding, save-slot recovery, and a completed campaign on real devices.
