import { effectiveCutoffDayForYmd } from './caracas-date';

describe('caracas-date (frontend preview)', () => {
  describe('effectiveCutoffDayForYmd', () => {
    it('usa el día configurado cuando existe en el mes', () => {
      expect(effectiveCutoffDayForYmd('2026-05-20', 31)).toBe(31);
      expect(effectiveCutoffDayForYmd('2026-04-20', 30)).toBe(30);
    });

    it('ajusta al último día del mes cuando el configurado no existe', () => {
      expect(effectiveCutoffDayForYmd('2026-04-20', 31)).toBe(30);
      expect(effectiveCutoffDayForYmd('2027-02-10', 31)).toBe(28);
      expect(effectiveCutoffDayForYmd('2028-02-10', 31)).toBe(29);
    });
  });
});
