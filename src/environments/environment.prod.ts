import type { FirebaseOptions } from 'firebase/app';
import { firebaseWebConfig } from './firebase-options';

export const environment = {
  production: true,
  apiUrl: 'https://api-gastos.buildforge.work/api',
  appOriginUrl: 'https://mobilegastos.buildforge.work',
  firebase: firebaseWebConfig as FirebaseOptions,
};
