import {
  buildExpensesCsv,
  buildInventoryCsv,
  escapeCsvCell,
  slugForFilename,
  EXPENSE_CSV_HEADERS,
  INVENTORY_CSV_HEADERS,
} from './csv-export.util';
import type { ExpenseCsvRow } from './csv-export.util';
import type { InventoryItem } from './inventory-api.service';

describe('csv-export.util', () => {
  describe('escapeCsvCell', () => {
    it('should escape commas and quotes', () => {
      expect(escapeCsvCell('a,b')).toBe('"a,b"');
      expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    });

    it('should return empty string for nullish', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });
  });

  describe('buildExpensesCsv', () => {
    const baseExpense: ExpenseCsvRow = {
      title: 'Supermercado',
      amount: 25.5,
      referenceMonth: '2026-05-01',
      paymentDate: '2026-05-10',
      bcvRateApplied: 40.1234,
    };

    it('should include spec headers and BOM', () => {
      const csv = buildExpensesCsv([baseExpense]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain(EXPENSE_CSV_HEADERS.join(','));
    });

    it('should use paymentDate and compute Monto bs', () => {
      const csv = buildExpensesCsv([baseExpense]);
      expect(csv).toContain('Supermercado,25.50,2026-05-10,1023.15');
    });

    it('should leave Monto bs empty when no bcv rate', () => {
      const row: ExpenseCsvRow = { ...baseExpense, bcvRateApplied: null };
      const csv = buildExpensesCsv([row]);
      expect(csv).toContain('Supermercado,25.50,2026-05-10,');
    });

    it('should escape titles with commas', () => {
      const row: ExpenseCsvRow = { ...baseExpense, title: 'Cafe, pan' };
      const csv = buildExpensesCsv([row]);
      expect(csv).toContain('"Cafe, pan"');
    });
  });

  describe('buildInventoryCsv', () => {
    const item: InventoryItem = {
      id: 'i1',
      profileId: 'p1',
      name: 'Arroz 1kg',
      sku: 'ARZ-01',
      unit: 'pieza',
      minStock: 5,
      currentStock: 12,
      isLowStock: false,
      salePrice: null,
      createdAt: '',
      updatedAt: '',
    };

    it('should include extended inventory columns', () => {
      const csv = buildInventoryCsv([item]);
      expect(csv).toContain(INVENTORY_CSV_HEADERS.join(','));
      expect(csv).toContain('Arroz 1kg,ARZ-01,12,pieza,5,No');
    });

    it('should mark low stock alert', () => {
      const low: InventoryItem = { ...item, isLowStock: true, currentStock: 2 };
      const csv = buildInventoryCsv([low]);
      expect(csv).toContain(',Si');
    });
  });

  describe('slugForFilename', () => {
    it('should slugify profile names', () => {
      expect(slugForFilename('Mi Tienda Ñ')).toBe('mi-tienda-n');
    });
  });
});
