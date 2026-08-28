import { gastosApiKey } from './api-key';
import { firebaseWebConfig } from './firebase-options';

export const environment = {
  production: false,
  apikey: gastosApiKey,
  apiUrl: 'http://localhost:3088/api',
  appOriginUrl: 'http://localhost:4200',
  firebase: firebaseWebConfig,
};
