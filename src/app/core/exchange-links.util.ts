// Only plain app paths survive: no query, no scheme, no protocol-relative `//host`
// or `/\host` (browsers normalize the backslash into a second slash).
const SAFE_NEXT_PATH = /^\/(?![/\\])[A-Za-z0-9\-_/]*$/;

/** The public Exchange calculator is a secondary tool; `/comparar` stays the only flow that saves an expense. */
export function buildExchangeCalculatorUrl(exchangePublicUrl: string): string {
  const base = exchangePublicUrl.replace(/\/+$/, '');
  return `${base}/calcular?from=gastos`;
}

/** `?next=` arrives from external links (Exchange web), so it is untrusted input. */
export function resolveSafeNextPath(
  raw: string | null | undefined,
): string | null {
  if (!raw || !SAFE_NEXT_PATH.test(raw)) {
    return null;
  }
  return raw.startsWith('/login') ? null : raw;
}
