import { gastosApiKey } from './api-key';
import { firebaseWebConfig } from './firebase-options';

export const environment = {
  appVersion: '1.6.0',
  production: true,
  apikey: gastosApiKey,
  apiUrl: 'https://api-gastos.buildforge.work/api',
  appOriginUrl: 'https://mobilegastos.buildforge.work',
  exchangePublicUrl: 'https://exchangerate.buildforge.work',
  firebase: firebaseWebConfig,
};
