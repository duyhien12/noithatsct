import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kientrucsct.erp',
  appName: 'SCT ERP',
  webDir: 'out',
  server: {
    url: 'https://admin.kientrucsct.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
