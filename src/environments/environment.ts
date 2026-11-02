import { gastosApiKey } from './api-key';
import { firebaseWebConfig } from './firebase-options';

export const environment = {
  appVersion: '1.6.0',
  production: false,
  apikey: gastosApiKey,
  apiUrl: 'http://localhost:3088/api',
  appOriginUrl: 'http://localhost:4200',
  exchangePublicUrl: 'http://localhost:3000',
  firebase: firebaseWebConfig,
};
