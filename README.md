# REPUBLIK — Di Balik Istana

A fictional Indonesian political simulation and interactive drama. The first playable workflow is cabinet management.

```sh
npm ci
npm run dev
```

Use Node.js 24 (see `.node-version`). In **Kabinet**, fill an office, review a candidate and confirm the decision. **Riwayat** shows earlier appointments, and **Politik** and **Berita** show the political effects. Progress saves locally after each accepted decision.

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
