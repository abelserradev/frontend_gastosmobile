import type { MeState } from './me-api.service';

/** Post-login / post-password: ingreso del mes vigente primero; luego perfiles → gastos. */
export function routePathForMeState(s: MeState): string {
  if (s.needsMonthlyIncomeSetup) {
    return '/setup';
  }
  const hasPrefs = s.preferences != null;
  const hasProfiles = s.profiles.length > 0;
  if (hasPrefs && hasProfiles) {
    return '/expenses';
  }
  if (hasPrefs && !hasProfiles) {
    return '/profiles';
  }
  return '/setup';
}
