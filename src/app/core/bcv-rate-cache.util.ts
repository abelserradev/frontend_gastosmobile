const STORAGE_KEY = 'gastos_bcv_rate_v1';

export interface BcvRateSnapshot {
  vesPerUsd: number;
  date: string;
  rateDate: string;
  stale: boolean;
  savedAt: number;
}

export function readBcvRateCache(date?: string): BcvRateSnapshot | null {
  if (typeof globalThis.localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as BcvRateSnapshot;
    if (
      typeof parsed.vesPerUsd !== 'number' ||
      !parsed.date ||
      !parsed.rateDate
    ) {
      return null;
    }
    if (date && parsed.date !== date) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeBcvRateCache(snapshot: Omit<BcvRateSnapshot, 'savedAt'>): void {
  if (typeof globalThis.localStorage === 'undefined') {
    return;
  }
  const payload: BcvRateSnapshot = {
    ...snapshot,
    savedAt: Date.now(),
  };
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota o modo privado: no bloqueamos la UI.
  }
}

/** Si no hay tasa del día pedido, devuelve la última conocida (backend caído). */
export function readBcvRateCacheOrLatest(date?: string): BcvRateSnapshot | null {
  const exact = readBcvRateCache(date);
  if (exact) {
    return exact;
  }
  return readBcvRateCache();
}
