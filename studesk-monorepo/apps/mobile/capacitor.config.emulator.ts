import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studesk.mobile',
  appName: 'Studesk',
  webDir: '.next',
  server: {
    url: 'http://10.0.2.2:3031', // Emulador usa 10.0.2.2 para acessar o host
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
