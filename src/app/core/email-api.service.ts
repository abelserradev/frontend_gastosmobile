import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Resend solo en Nest: el front dispara un envío de prueba autenticado (cookie JWT).
 */
@Injectable({
  providedIn: 'root',
})
export class EmailApiService {
  private readonly http = inject(HttpClient);

  sendResendTest(): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(
      `${environment.apiUrl}/email/test`,
      {},
    );
  }
}
