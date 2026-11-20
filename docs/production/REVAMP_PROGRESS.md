# Cinematic revamp progress

The primary playable route is creation, inauguration, office, fiscal briefing, first decision, coalition call, news and impact review, followed by the existing 260-week simulation.

| Phase | Delivered | Open |
| --- | --- | --- |
| Audit | Screen and asset inventory in [REVAMP_AUDIT](REVAMP_AUDIT.md) | |
| Automatic world | All three modeled ministries staffed, vice president introduced, scenario parties, coalition, operating APBN and regions initialized from bundled data | Additional ministries and province-level data |
| Creation | Unicode names, random picks, two avatars, preview, neutral or gendered address | Additional face and outfit options require suitable art |
| Inauguration and office | Skippable arrival, five scene backgrounds reused across screens, office desk, calls, TV, cabinet and regional views | Spatially anchored hotspots, separately layered office props, a literal geographic map |
| Character drama | State-driven fiscal and coalition dialogue, branching opening policy, relationship changes, and memory of the opening policy in later calls | Broader character memory, individualized conversations and more speaker portraits |
| Management | Illustrated covers, cabinet relationships and transitions, fiscal allocation sliders, inflation trend, party seat chamber and vote animation | Multi-round budget negotiations, full coalition network diagram and deeper policy charts |
| Opening and persistence | Personalized news and results, reduced motion, optional confirmation tone, routine-week fast-forward, version 3 saves with migration through version 2 | More distinct narrative scenes across the first 15 minutes, optional ambient soundtrack |
| QA | 26 Vitest tests, production build, Capacitor sync, and Chromium at 320 and 390 px. The first decision was available in about one second in a scripted run with immediate dismissal of the inauguration. | Native Android/iOS build and device checks |

## Assets

The five runtime WebP backgrounds in `assets/environments` use reviewed rectangular tiles from `assets/source/environment-sheet.png`. The palace, office and cabinet crops use y=0 and x=0/388/772 respectively, with widths of 380/376/376 and height of 237. DPR and press use y=244 and x=0/388, widths 380/376 and height 220. The source sheets and portrait manifest remain intact. The female player avatar uses the Laras Prameswari crop. Ratna Kusuma remains the scenario's separate Vice President and keeps her fallback portrait.

The simulation still has 11 authored weekly events. Later story expansion and prior production gaps are listed in [PROGRESS](PROGRESS.md).
