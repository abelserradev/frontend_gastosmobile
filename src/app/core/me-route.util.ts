import type { MeState } from './me-api.service';

/** Post-login / post-password: ingreso del mes vigente primero; luego perfiles → gastos. */
export function routePathForMeState(s: MeState): string {
  if (!s.preferences) {
    return '/setup';
  }
  if (
    s.needsMonthlyIncomeSetup &&
    s.monthRenewal?.requiresSurplusPrompt
  ) {
    return '/setup';
  }
  const hasProfiles = s.profiles.length > 0;
  if (hasProfiles) {
    return '/expenses';
  }
  if (s.preferences != null) {
    return '/profiles';
  }
  return '/setup';
}
