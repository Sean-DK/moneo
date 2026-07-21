import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.stablesea.moneo',
  appName: 'Moneo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
        smallIcon: 'ic_stat_moneo',
        iconColor: '#2FB5AA',
    },
  },
};

export default config;
