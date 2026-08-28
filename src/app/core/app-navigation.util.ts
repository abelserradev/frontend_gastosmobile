import { ActivatedRoute, Router } from '@angular/router';

/** Query ?from=expenses — usuario entró desde el menú de gastos, no onboarding. */
export const FROM_EXPENSES = 'expenses';

export const fromExpensesQuery = { from: FROM_EXPENSES } as const;

export function cameFromExpenses(route: ActivatedRoute): boolean {
  return route.snapshot.queryParamMap.get('from') === FROM_EXPENSES;
}

export function subpageBackTarget(fromExpenses: boolean): '/expenses' | '/setup' {
  return fromExpenses ? '/expenses' : '/setup';
}

export function navigateFromExpensesMenu(
  router: Router,
  path: '/profiles' | '/setup' | '/invitations',
  onNavigate?: () => void,
): void {
  onNavigate?.();
  void router.navigate([path], { queryParams: fromExpensesQuery });
}
