import { Observable, of, switchMap } from 'rxjs';
import type { MeApiService, MeState } from './me-api.service';

/** Si el mes cambió sin sobrante, hace rollover silencioso antes de continuar. */
export function getStateWithAutoRollover(
  meApi: MeApiService,
): Observable<MeState> {
  return meApi.getState().pipe(
    switchMap((state) => {
      const shouldAutoRollover =
        state.needsMonthlyIncomeSetup &&
        state.preferences != null &&
        !state.monthRenewal?.requiresSurplusPrompt;
      if (!shouldAutoRollover) {
        return of(state);
      }
      return meApi
        .rolloverMonth({ applySurplus: false })
        .pipe(switchMap(() => meApi.getState()));
    }),
  );
}

/** ¿Hay que mostrar el formulario de renovación (sobrante o onboarding)? */
export function needsSetupScreen(state: MeState): boolean {
  if (!state.preferences) {
    return true;
  }
  return (
    state.needsMonthlyIncomeSetup &&
    Boolean(state.monthRenewal?.requiresSurplusPrompt)
  );
}
