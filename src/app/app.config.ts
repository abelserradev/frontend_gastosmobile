import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  apiCredentialsInterceptor,
  apiUnauthorizedInterceptor,
  apiKeyInterceptor,
  nativeAuthInterceptor,
} from './core/http.interceptors';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        nativeAuthInterceptor,
        apiKeyInterceptor,
        apiCredentialsInterceptor,
        apiUnauthorizedInterceptor,
      ]),
    ),
    provideClientHydration(withEventReplay()),
  ],
};
