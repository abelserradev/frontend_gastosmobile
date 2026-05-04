import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { MeApiService } from './me-api.service';
import { routePathForMeState } from './me-route.util';

/** Rutas que exigen sesión y contraseña de aplicación (no solo Google pendiente). */
export const requiresPasswordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.hasSession()) {
    return router.createUrlTree(['/login']);
  }
  if (!auth.hasPassword()) {
    return router.createUrlTree(['/setup-password']);
  }
  return true;
};

/**
 * Pantalla crear contraseña: solo si hay JWT y aún no hay hash en servidor.
 * Si ya tiene contraseña, manda al mismo destino que tras login.
 */
export const setupPasswordFlowGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const meApi = inject(MeApiService);
  if (!auth.hasSession()) {
    return router.createUrlTree(['/login']);
  }
  if (!auth.hasPassword()) {
    return true;
  }
  return meApi.getState().pipe(
    map((s) => router.createUrlTree([routePathForMeState(s)])),
    catchError(() => of(router.createUrlTree(['/setup']))),
  );
};
