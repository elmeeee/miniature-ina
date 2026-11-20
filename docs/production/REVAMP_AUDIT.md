# Revamp audit

The project uses React/Vite and Zustand in a Capacitor shell. State transitions, fiscal accounting, DPR voting, stories and elections live in pure TypeScript packages. A 260-week campaign and three manual save slots already work. Save envelopes through version 2 predate player identity.

| Area | Existing behavior |
| --- | --- |
| Istana | Static Bima portrait, weekly briefing, event choices, saved results |
| Kabinet | Three modeled ministries start vacant. Candidate comparison, rotation, replacement, dismissal, resignation and history work. |
| Negara | APBN starts with a valid operating plan and supports amendment, DPR voting and realization. Region data consists of four aggregate blocs. |
| Politik | Eight caucuses hold 580 seats. Committee review, voting, coalition decisions and character relationships work. |
| Berita | Cabinet event summaries and the campaign archive work. Cinematic presentation and an authored opening were absent. |
| Economy and campaign | Macro indicators, delayed effects, seeded weekly progression, 11 branch events and election epilogues work. |
| Setup | The old game opened a default identity immediately. Staffing the cabinet required three manual appointments. Budget and other world data were already supplied. |

The asset manifest contains 35 portraits and eight male presidential expressions. The female presidential portrait on the sheet is labelled Laras Prameswari and can serve as an explicitly selectable **player avatar**. It remains separate from the scenario's Vice President, Ratna Kusuma. Only Bima and Anindita had art linked to active characters. Other crop identities remain separate. The environment sheet has discrete palace, office, cabinet, DPR and press tiles. Strategy and UI references are composite sheets. The game has no standalone provincial map or licensed audio files in use. Native shells carry Capacitor starter icon and splash art.

The implementation sequence is to preserve the engine and history, create a staffed campaign and versioned profile, extract scene backgrounds, wire creation and the office to actual state transitions, restyle management screens, then validate the opening and migrations.
