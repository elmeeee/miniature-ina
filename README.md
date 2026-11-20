# REPUBLIK — Di Balik Istana

A fictional Indonesian political simulation and interactive drama. Play an offline 260-week presidency with cabinet management, fiscal policy, parliament, branching decisions, and an election.

```sh
npm ci
npm run dev
```

Use Node.js 24 (see `.node-version`). A fresh start opens President creation and a skippable inauguration, followed by a fiscal decision in the presidential office. Existing saves migrate on load. In **Kabinet**, fill an office, review a candidate and confirm the decision. **Riwayat** shows earlier appointments, and **Politik** and **Berita** show the political effects. Advance the campaign through 20 chapters in **Istana**, propose a budget in **Negara**, and negotiate coalition backing or legislation in **Politik**. Progress autosaves after each decision, and the pause menu includes three manual save slots.

```sh
npm run lint
npm test
npm run build
npm run assets:validate
npm run mobile:sync
```

After syncing, open `apps/mobile/android` in Android Studio with JDK 21 and Android SDK 36. On macOS, open `apps/mobile/ios/App/App.xcodeproj` with Xcode and resolve the Swift package dependencies. Both native shells use Capacitor's starter icons and splash screens.

- [Architecture and simulation rules](docs/architecture/overview.md)
- [Character extraction report](docs/production/character-extraction.md)
- [Production milestones and remaining work](docs/production/PROGRESS.md)

- [Cinematic revamp audit](docs/production/REVAMP_AUDIT.md)
- [Cinematic revamp progress](docs/production/REVAMP_PROGRESS.md)
- [Benchmark gameplay, accounting and test notes](docs/production/BENCHMARK_PROGRESS.md)
- [Chapter campaign and replay notes](docs/production/CAMPAIGN_PROGRESS.md)
