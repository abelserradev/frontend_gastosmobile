import {
  buildExchangeCalculatorUrl,
  resolveSafeNextPath,
} from './exchange-links.util';

describe('exchange-links.util', () => {
  describe('buildExchangeCalculatorUrl', () => {
    it('should point to /calcular and tag the origin', () => {
      expect(
        buildExchangeCalculatorUrl('https://exchangerate.buildforge.work'),
      ).toBe('https://exchangerate.buildforge.work/calcular?from=gastos');
    });

    it('should not duplicate the slash when the base ends with one', () => {
      expect(buildExchangeCalculatorUrl('https://x.test/')).toBe(
        'https://x.test/calcular?from=gastos',
      );
    });
  });

  describe('resolveSafeNextPath', () => {
    it('should accept internal paths', () => {
      expect(resolveSafeNextPath('/comparar')).toBe('/comparar');
      expect(resolveSafeNextPath('/comparar/abc-123')).toBe(
        '/comparar/abc-123',
      );
    });

    it('should reject anything that can leave the app', () => {
      for (const raw of [
        null,
        undefined,
        '',
        'comparar',
        '//evil.com',
        '/\\evil.com',
        'https://evil.com',
        'javascript:alert(1)',
        '/comparar?x=1',
      ]) {
        expect(resolveSafeNextPath(raw)).withContext(String(raw)).toBeNull();
      }
    });

    it('should never send the user back to login', () => {
      expect(resolveSafeNextPath('/login')).toBeNull();
    });
  });
});
