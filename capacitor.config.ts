import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración base de Capacitor para Spend$ave (SpendSave).
 *
 * Para desarrollo con live reload (carga desde dev server):
 * 1. Reemplazar este archivo temporalmente con capacitor.config.live.ts
 * 2. O agregar server: { url: 'http://TU_IP:4200', cleartext: true }
 *
 * Ver SDD-mobile-capacitor en obsidian-vault para flujo completo.
 */
const config: CapacitorConfig = {
  appId: 'com.gastos.mobile',
  appName: 'Spend$ave',
  webDir: 'dist/web/browser',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
      authDomain: 'gastos-2b187.firebaseapp.com',
    },
  },
};

export default config;
