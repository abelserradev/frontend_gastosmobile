import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Rutas donde un 401 es esperado y no debe limpiar sesión local. */
const AUTH_PUBLIC_SUBSTRINGS = [
  '/auth/login',
  '/auth/register',
  '/auth/firebase',
] as const;

function isPublicAuthUrl(url: string): boolean {
  return AUTH_PUBLIC_SUBSTRINGS.some((s) => url.includes(s));
}

/**
 * Credenciales (cookies) en todas las peticiones al API para enviar/recibir la cookie HttpOnly del JWT.
 */
export const apiCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl;
  if (req.url.startsWith(base)) {
    return next(req.clone({ withCredentials: true }));
  }
  return next(req);
};

/**
 * Si el token en cookie expiró o es inválido, limpia el perfil guardado en el cliente (sin secretos).
 */
export const apiUnauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !isPublicAuthUrl(req.url)
      ) {
        auth.clearClientSession();
      }
      return throwError(() => err);
    }),
  );
};

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl;
  const apikey = (environment as { apikey?: string}).apikey?.trim() ?? '';
  if (!apikey) {
    return next(req);
  }
  if (req.url.startsWith(base)) {
    return next(
      req.clone({
        setHeaders: {
          'x-api-key': apikey,
        },
      }),
    );
  }
  return next(req);
};
