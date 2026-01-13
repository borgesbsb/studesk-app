import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studesk.mobile',
  appName: 'Studesk',
  webDir: '.next',
  server: {
    url: 'http://localhost:3031', // Via ADB reverse
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
