import { computed, Injectable, signal } from '@angular/core';
import type { ActivePeriod, BudgetCycle, MePreferences } from './me-api.service';

export type CurrencyCode = 'BS' | 'USD';

/** Re-exportar tipos de ciclo presupuestario para conveniencia */
export type { ActivePeriod, BudgetCycle };

export type ProfileType = 'familiar' | 'grupal' | 'comercio';

export interface CategoryDraft {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  name: string;
  type: ProfileType;
}

export interface ExpenseItem {
  id: string;
  profileId: string;
  profileName?: string | null;
  title: string;
  description: string;
  amount: number;
  category: string;
  isPaid: boolean;
  referenceMonth?: string;
  paymentDate?: string | null;
  bcvRateApplied?: number | null;
  bcvRateDate?: string | null;
  paidByDisplayName?: string | null;
  paidAt?: string | null;
  paidByMemberId?: string | null;
  hasReceipt?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppContextService {
  readonly currency = signal<CurrencyCode>('USD');
  readonly monthlyIncome = signal<number>(0);
  readonly carryoverUsd = signal<number>(0);
  readonly effectiveMonthlyIncome = signal<number>(0);
  /** Monto en Bs. fijado por el usuario cuando controla en bolívares. */
  readonly incomeFixedBs = signal<number | null>(null);
  readonly bsIncomeNarrative = signal<string | null>(null);
  readonly bcvQuoteIsStale = signal(false);
  readonly categories = signal<CategoryDraft[]>([]);
  readonly profiles = signal<UserProfile[]>([]);
  readonly expenses = signal<ExpenseItem[]>([]);

  /** FEAT-001: Periodo presupuestario activo calculado por el backend. */
  readonly activePeriod = signal<ActivePeriod | null>(null);
  /** FEAT-001: Etiqueta legible del periodo (ej: "16 May - 15 Jun"). */
  readonly activePeriodLabel = computed(() => this.activePeriod()?.label ?? '');
  /** FEAT-001: Configuración del ciclo presupuestario. */
  readonly budgetCycle = signal<BudgetCycle>({ mode: 'calendar_month', cutoffDay: 1 });

  readonly userData = computed(() => ({
    currency: this.currency(),
    monthlyIncome: this.monthlyIncome(),
    incomeFixedBs: this.incomeFixedBs(),
    bsIncomeNarrative: this.bsIncomeNarrative(),
    categories: this.categories(),
    profiles: this.profiles(),
    expenses: this.expenses(),
  }));

  setCurrency(value: CurrencyCode): void {
    this.currency.set(value);
  }

  setMonthlyIncome(value: number): void {
    this.monthlyIncome.set(value);
  }

  setBsIncomeContext(p: {
    incomeFixedBs: number | null;
    narrative: string | null;
    stale: boolean;
  }): void {
    this.incomeFixedBs.set(p.incomeFixedBs);
    this.bsIncomeNarrative.set(p.narrative);
    this.bcvQuoteIsStale.set(p.stale);
  }

  syncFromMePreferences(pref: MePreferences): void {
    this.setCurrency(pref.defaultCurrency);
    this.setMonthlyIncome(pref.monthlyIncome);
    this.carryoverUsd.set(pref.carryoverUsd ?? 0);
    this.effectiveMonthlyIncome.set(
      pref.effectiveMonthlyIncomeUsd ?? pref.monthlyIncome,
    );
    this.setBsIncomeContext({
      incomeFixedBs: pref.incomeFixedBs,
      narrative: pref.bsIncomeNarrative,
      stale: pref.bcvQuoteIsStale,
    });
    // FEAT-001: Sincronizar configuración del ciclo presupuestario
    this.budgetCycle.set(pref.budgetCycle ?? { mode: 'calendar_month', cutoffDay: 1 });
  }

  /**
   * FEAT-001: Actualiza el periodo activo desde la respuesta del backend.
   * Usar después de sincronizar preferencias.
   */
  syncActivePeriod(period: ActivePeriod | null): void {
    this.activePeriod.set(period);
  }

  setCategories(list: CategoryDraft[]): void {
    this.categories.set(list);
  }

  setProfiles(list: UserProfile[]): void {
    this.profiles.set(list);
  }

  setExpenses(list: ExpenseItem[]): void {
    this.expenses.set(list);
  }

  addProfile(profile: UserProfile): void {
    this.profiles.update((list) => [...list, profile]);
  }

  removeProfile(id: string): void {
    this.profiles.update((list) => list.filter((p) => p.id !== id));
  }

  addExpense(
    draft: Omit<ExpenseItem, 'id' | 'isPaid'>,
  ): void {
    const item: ExpenseItem = {
      ...draft,
      id: globalThis.crypto.randomUUID(),
      isPaid: false,
    };
    this.expenses.update((list) => [...list, item]);
  }

  deleteExpense(id: string): void {
    this.expenses.update((list) => list.filter((e) => e.id !== id));
  }

  toggleExpensePaid(id: string): void {
    this.expenses.update((list) =>
      list.map((e) => (e.id === id ? { ...e, isPaid: !e.isPaid } : e)),
    );
  }
}
