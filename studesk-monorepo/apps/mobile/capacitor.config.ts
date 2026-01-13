import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studesk.mobile',
  appName: 'Studesk',
  webDir: '.next', // Build standalone do Next.js
  server: {
    url: 'http://localhost:3031', // Dev server via ADB reverse
    cleartext: true,
    androidScheme: 'http',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
};

export default config;
