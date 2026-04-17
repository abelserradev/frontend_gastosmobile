import type { FirebaseOptions } from 'firebase/app';
import { firebaseWebConfig } from './firebase-options';

export const environment = {
  production: false,
  apikey: 'OpPvE+U+HA+2e0MURoF+9Z0RoJLTg4/ofvFOgDY9CpA=',
  /** Misma base que `PORT` del backend + prefijo global `api`. */
  apiUrl: 'http://localhost:3088/api',
  /** Origen del SPA (enlaces en correos y CORS del back vía FRONTEND_URL en prod). */
  appOriginUrl: 'http://localhost:4300',
  firebase: firebaseWebConfig as FirebaseOptions,
};
