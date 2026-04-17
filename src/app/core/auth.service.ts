import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { FirebaseAuthService } from './firebase-auth.service';

const STORAGE_KEY = 'gastos_auth';

/** Solo datos no sensibles para el UI; el JWT vive en cookie HttpOnly. */
interface ClientAuthPayload {
  userId: string;
  email: string;
  name: string | null;
}

export interface AuthApiUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSessionResponse {
  user: AuthApiUser;
}

/**
 * Sesión: JWT en cookie HttpOnly (servidor). Aquí solo reflejamos usuario para el UI y guards locales.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly firebaseAuth = inject(FirebaseAuthService);

  readonly userId = signal<string | null>(null);
  readonly email = signal<string | null>(null);
  readonly displayName = signal<string | null>(null);

  constructor() {
    this.hydrateFromStorage();
  }

  hasSession(): boolean {
    return this.userId() !== null && this.userId()!.length > 0;
  }

  /**
   * Si la cookie HttpOnly sigue válida, recupera el usuario (p. ej. localStorage borrado).
   */
  tryRestoreSession(): Observable<boolean> {
    return this.http.get<AuthSessionResponse>(`${environment.apiUrl}/auth/me`).pipe(
      tap((res) => this.persistUser(res.user)),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  registerRemote(
    email: string,
    password: string,
    name: string,
  ): Observable<AuthSessionResponse> {
    return this.http
      .post<AuthSessionResponse>(`${environment.apiUrl}/auth/register`, {
        email,
        password,
        name,
      })
      .pipe(
        tap((res) => this.persistUser(res.user)),
        catchError((err) => throwError(() => err)),
      );
  }

  loginRemote(email: string, password: string): Observable<AuthSessionResponse> {
    return this.http
      .post<AuthSessionResponse>(`${environment.apiUrl}/auth/login`, {
        email,
        password,
      })
      .pipe(
        tap((res) => this.persistUser(res.user)),
        catchError((err) => throwError(() => err)),
      );
  }

  /** Intercambia ID token de Firebase (Google) por sesión JWT en cookie. */
  loginWithFirebase(idToken: string): Observable<AuthSessionResponse> {
    return this.http
      .post<AuthSessionResponse>(
        `${environment.apiUrl}/auth/firebase`,
        { idToken },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => this.persistUser(res.user)),
        catchError((err) => throwError(() => err)),
      );
  }

  /** Pide al servidor borrar la cookie y limpia el cliente. */
  logout(): Observable<void> {
    this.firebaseAuth.signOutFirebase();
    globalThis.sessionStorage.setItem('gastos_skip_restore_once', '1');
    return this.http
      .post<{ ok: boolean }>(
        `${environment.apiUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap(() => this.clearClientSession()),
        map(() => undefined),
        catchError(() => {
          this.clearClientSession();
          return of(undefined);
        }),
      );
  }

  /** Sin llamada HTTP (p. ej. tras 401). */
  clearClientSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.userId.set(null);
    this.email.set(null);
    this.displayName.set(null);
  }

  private persistUser(user: AuthApiUser): void {
    const payload: ClientAuthPayload = {
      userId: user.id,
      email: user.email,
      name: user.name?.trim() ? user.name : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    this.userId.set(payload.userId);
    this.email.set(payload.email);
    this.displayName.set(payload.name);
  }

  private hydrateFromStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const p = JSON.parse(raw) as Partial<ClientAuthPayload> & {
        accessToken?: string;
      };
      if (p.accessToken) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (p?.userId && p?.email) {
        this.userId.set(p.userId);
        this.email.set(p.email);
        this.displayName.set(p.name ?? null);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
