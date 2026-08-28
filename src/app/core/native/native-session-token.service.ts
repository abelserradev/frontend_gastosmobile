import { Injectable } from '@angular/core';

const STORAGE_KEY = 'gastos_native_access_token';

/**
 * JWT de respaldo en APK: el WebView de Capacitor no mantiene cookies HttpOnly
 * cross-origin (https://localhost → api remota).
 */
@Injectable({ providedIn: 'root' })
export class NativeSessionTokenService {
  save(token: string): void {
    const trimmed = token.trim();
    if (!trimmed) {
      return;
    }
    globalThis.sessionStorage.setItem(STORAGE_KEY, trimmed);
  }

  read(): string | null {
    const raw = globalThis.sessionStorage.getItem(STORAGE_KEY);
    return raw?.trim() ? raw.trim() : null;
  }

  hasToken(): boolean {
    return this.read() !== null;
  }

  clear(): void {
    globalThis.sessionStorage.removeItem(STORAGE_KEY);
  }
}
