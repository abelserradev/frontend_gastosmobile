/** Serie de 7 días para el micro-gráfico del panel de gastos. */
export function buildLastSevenDaySpending(
  expenses: ReadonlyArray<{
    amount: number;
    isPaid: boolean;
    paymentDate?: string | null;
    bcvRateDate?: string | null;
  }>,
): number[] {
  const paid = expenses.filter((e) => e.isPaid);
  const buckets: number[] = [];
  const anchor = new Date();
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(anchor);
    day.setDate(day.getDate() - offset);
    const ymd = day.toISOString().slice(0, 10);
    const total = paid
      .filter((e) => {
        const ref = (e.paymentDate ?? e.bcvRateDate ?? '').slice(0, 10);
        return ref === ymd;
      })
      .reduce((sum, e) => sum + e.amount, 0);
    buckets.push(total);
  }
  return buckets;
}

export function sparklinePolyline(
  values: readonly number[],
  width = 88,
  height = 32,
): string {
  if (values.length === 0) {
    return '';
  }
  const peak = Math.max(...values, 0.01);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * step : width / 2;
      const y = height - (v / peak) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
