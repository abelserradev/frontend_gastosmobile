import type { MeState } from './me-api.service';

/** Misma lógica que el login post-auth: preferencias → perfiles → expenses. */
export function routePathForMeState(s: MeState): string {
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
