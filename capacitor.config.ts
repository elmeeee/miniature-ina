import type { CapacitorConfig } from '@capacitor/cli';

export default {
  appId: 'id.republik.istana',
  appName: 'REPUBLIK',
  webDir: 'apps/mobile/dist',
  android: { path: 'apps/mobile/android' },
  ios: { path: 'apps/mobile/ios' },
} satisfies CapacitorConfig;
