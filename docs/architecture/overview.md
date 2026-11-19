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

The simulation receives state and an explicit command and returns a new state. Event selection advances an integer PRNG stored in the save. Given identical inputs, it produces identical outputs. React owns selection and confirmation only. Zustand writes a validated versioned snapshot to local WebView storage before replacing in-memory state. Older version-zero envelopes receive an empty event log on migration. Invalid saves are preserved for export and require explicit reset. Cloud sync and cross-device restore are outside this slice.

The five navigation destinations share the same state. Negara currently reports cabinet occupancy and coalition strength. The slice does not yet model elections, the economy, provincial governance or story branching.
