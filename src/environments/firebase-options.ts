import type { FirebaseOptions } from 'firebase/app';
import { firebaseWebApiKey } from './firebase-api-key';
import { firebasePublicOptions } from './firebase-options.public';

/** Configuración Web de Firebase; apiKey sale de firebase-api-key.ts (local o generado en CI). */
export const firebaseWebConfig: FirebaseOptions = {
  ...firebasePublicOptions,
  apiKey: firebaseWebApiKey,
};
