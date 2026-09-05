import type { InventoryItem } from './inventory-api.service';

/** Subconjunto de gasto necesario para CSV — compatible con MeExpense y ExpenseItem. */
export interface ExpenseCsvRow {
  title: string;
  amount: number;
  referenceMonth: string;
  paymentDate: string | null;
  bcvRateApplied: number | null;
}

/** BOM para que Excel (es-VE) reconozca UTF-8. */
const UTF8_BOM = '\uFEFF';

export const EXPENSE_CSV_HEADERS = [
  'gasto',
  'Monto $',
  'fecha',
  'Monto bs',
] as const;

export const INVENTORY_CSV_HEADERS = [
  'Producto',
  'codigo',
  'cantidad',
  'unidad',
  'stock_minimo',
  'alerta_stock_bajo',
] as const;

/** RFC 4180 — comillas si hay separador, salto de línea o comillas. */
export function escapeCsvCell(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function formatUsd(amount: number): string {
  return amount.toFixed(2);
}

/** Evita drift de float en montos Bs derivados de USD × tasa. */
function formatBs(amountUsd: number, rate: number | null): string {
  if (rate === null || rate === undefined) {
    return '';
  }
  return (Math.round(amountUsd * rate * 100) / 100).toFixed(2);
}

function expenseDate(expense: ExpenseCsvRow): string {
  return expense.paymentDate ?? expense.referenceMonth ?? '';
}

export function buildExpensesCsv(rows: ExpenseCsvRow[]): string {
  const header = EXPENSE_CSV_HEADERS.join(',');
  const body = rows.map((expense) =>
    [
      escapeCsvCell(expense.title),
      escapeCsvCell(formatUsd(expense.amount)),
      escapeCsvCell(expenseDate(expense)),
      escapeCsvCell(formatBs(expense.amount, expense.bcvRateApplied)),
    ].join(','),
  );
  return UTF8_BOM + [header, ...body].join('\r\n');
}

export function buildInventoryCsv(rows: InventoryItem[]): string {
  const header = INVENTORY_CSV_HEADERS.join(',');
  const body = rows.map((item) =>
    [
      escapeCsvCell(item.name),
      escapeCsvCell(item.sku ?? ''),
      escapeCsvCell(item.currentStock),
      escapeCsvCell(item.unit),
      escapeCsvCell(item.minStock),
      escapeCsvCell(item.isLowStock ? 'Si' : 'No'),
    ].join(','),
  );
  return UTF8_BOM + [header, ...body].join('\r\n');
}

export function slugForFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return slug || 'perfil';
}

export function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
