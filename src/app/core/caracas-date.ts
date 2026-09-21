/** Fecha calendario en Venezuela (alineado con tasa BCV del backend). */
export function todayYmdCaracas(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function lastDayOfMonthFromYmd(ymd: string): number {
  const [y, m] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0, 12, 0, 0)).getUTCDate();
}

export function effectiveCutoffDayForYmd(
  referenceYmd: string,
  cutoffDay: number,
): number {
  const last = lastDayOfMonthFromYmd(referenceYmd);
  return Math.min(cutoffDay, last);
}