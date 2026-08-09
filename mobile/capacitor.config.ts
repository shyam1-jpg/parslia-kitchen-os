import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Parslia Kitchen OS — iOS shell
 *
 * Default: load the live marketing + early-access site.
 * When the full kitchen web app is hosted (e.g. https://app.parslia.app),
 * change server.url to that host and re-run `npm run sync` on a Mac.
 */
const config: CapacitorConfig = {
  appId: 'app.parslia.kitchen',
  appName: 'Parslia Kitchen OS',
  webDir: 'www',
  server: {
    // Remote shell until the kitchen SPA is production-hosted.
    // Comment out `url` to ship the local www/ bundle only.
    url: 'https://parslia.app',
    cleartext: false,
    allowNavigation: ['parslia.app', '*.parslia.app'],
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#063F32',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#063F32',
    },
  },
};

export default config;
