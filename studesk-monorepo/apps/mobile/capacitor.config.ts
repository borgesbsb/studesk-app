import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studesk.mobile',
  appName: 'Studesk',
  webDir: 'out', // Diretório do build estático do Next.js
  server: {
    androidScheme: 'https', // Usar HTTPS para app compilado
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
