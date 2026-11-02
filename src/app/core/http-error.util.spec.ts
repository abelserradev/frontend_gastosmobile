import { HttpErrorResponse } from '@angular/common/http';
import { formatApiHttpError } from './http-error.util';

describe('formatApiHttpError', () => {
  it('should surface Firebase/native Error messages instead of a generic network label', () => {
    expect(
      formatApiHttpError(
        new Error(
          'Firebase no devolvió idToken tras Google. Verifica SHA-1, google-services.json y Google habilitado.',
        ),
      ),
    ).toContain('google-services.json');
  });

  it('should explain HTTP status 0 as connectivity', () => {
    const err = new HttpErrorResponse({
      status: 0,
      statusText: 'Unknown Error',
      url: 'https://api-gastos.buildforge.work/api/auth/login',
    });
    expect(formatApiHttpError(err)).toContain('conectar');
  });

  it('should prefer API message body on HttpErrorResponse', () => {
    const err = new HttpErrorResponse({
      status: 401,
      error: { message: 'Credenciales inválidas' },
    });
    expect(formatApiHttpError(err)).toBe('Credenciales inválidas');
  });
});
