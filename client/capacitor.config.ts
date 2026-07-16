import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.stablesea.moneo',
  appName: 'Moneo',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
};

export default config;
