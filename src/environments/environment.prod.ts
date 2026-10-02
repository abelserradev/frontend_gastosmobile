import { gastosApiKey } from './api-key';
import { firebaseWebConfig } from './firebase-options';

export const environment = {
  appVersion: '1.5.7',
  production: true,
  apikey: gastosApiKey,
  apiUrl: 'https://api-gastos.buildforge.work/api',
  appOriginUrl: 'https://mobilegastos.buildforge.work',
  firebase: firebaseWebConfig,
};
