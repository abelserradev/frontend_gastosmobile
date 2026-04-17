import type { FirebaseOptions } from 'firebase/app';
import { firebaseWebConfig } from './firebase-options';

export const environment = {
  production: true,
  apikey: 'OpPvE+U+HA+2e0MURoF+9Z0RoJLTg4/ofvFOgDY9CpA=',
  apiUrl: 'https://api-gastos.buildforge.work/api',
  appOriginUrl: 'https://mobilegastos.buildforge.work',
  firebase: firebaseWebConfig as FirebaseOptions,
};
