import { HttpErrorResponse } from '@angular/common/http';

function readUnknownMessage(err: unknown): string | null {
  if (err instanceof Error) {
    const msg = err.message?.trim();
    return msg || null;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const raw = (err as { message: unknown }).message;
    if (typeof raw === 'string') {
      const msg = raw.trim();
      return msg || null;
    }
  }
  return null;
}

/** Mensaje seguro para mostrar al usuario (sin asumir forma del body). */
export function formatApiHttpError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu internet o que la app tenga acceso al API.';
    }
    const body = err.error as { message?: string | string[] } | undefined;
    if (body?.message) {
      return Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    }
    return err.message || `Error ${err.status}`;
  }
  const direct = readUnknownMessage(err);
  if (direct) {
    return direct;
  }
  return 'Error de red';
}

export function getApiErrorCode(err: unknown): string | null {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { code?: string } | undefined;
    return body?.code ?? null;
  }
  return null;
}

export function isAccountLockedError(err: unknown): boolean {
  return getApiErrorCode(err) === 'ACCOUNT_LOCKED';
}
