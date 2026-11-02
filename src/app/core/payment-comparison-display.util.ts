import type { ComparisonPaymentMethod } from './payment-comparison-api.service';

export function labelPaymentMethod(
  method: ComparisonPaymentMethod | null | undefined,
): string {
  switch (method) {
    case 'CASH':
      return 'Efectivo USD';
    case 'ELECTRONIC':
      return 'Electrónico USD';
    case 'BS':
      return 'Bolívares';
    default:
      return '';
  }
}

export function labelOptionId(optionId: string): string {
  switch (optionId) {
    case 'efectivo':
      return 'Efectivo';
    case 'electronico':
      return 'Electrónico';
    case 'bs':
      return 'Bolívares';
    default:
      return optionId;
  }
}

export function formatNominalSubtitle(input: {
  nominalAmount?: number | null | undefined;
  nominalCurrency?: 'BS' | 'USD' | null | undefined;
  paymentMethod?: ComparisonPaymentMethod | null | undefined;
}): string | null {
  if (input.nominalAmount == null || !input.nominalCurrency) {
    return null;
  }
  const prefix = input.nominalCurrency === 'BS' ? 'Bs ' : 'USD ';
  const formatted =
    input.nominalCurrency === 'BS'
      ? input.nominalAmount.toLocaleString('es-VE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : input.nominalAmount.toFixed(2);
  const method = labelPaymentMethod(input.paymentMethod);
  return `${prefix}${formatted}${method ? ` · ${method}` : ''}`;
}
