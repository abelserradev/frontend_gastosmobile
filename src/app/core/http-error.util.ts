import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje seguro para mostrar al usuario (sin asumir forma del body). */
export function formatApiHttpError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string | string[] } | undefined;
    if (body?.message) {
      return Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    }
    return err.message || `Error ${err.status}`;
  }
  return 'Error de red';
}
