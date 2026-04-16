/** Fecha calendario en Venezuela (alineado con tasa BCV del backend). */
export function todayYmdCaracas(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
