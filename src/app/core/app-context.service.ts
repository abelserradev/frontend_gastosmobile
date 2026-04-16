import { computed, Injectable, signal } from '@angular/core';

export type CurrencyCode = 'BS' | 'USD';

export type ProfileType = 'familiar' | 'grupal';

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
  title: string;
  description: string;
  amount: number;
  category: string;
  isPaid: boolean;
  paymentDate?: string | null;
  bcvRateApplied?: number | null;
  bcvRateDate?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppContextService {
  readonly currency = signal<CurrencyCode>('USD');
  readonly monthlyIncome = signal<number>(0);
  readonly categories = signal<CategoryDraft[]>([]);
  readonly profiles = signal<UserProfile[]>([]);
  readonly expenses = signal<ExpenseItem[]>([]);

  readonly userData = computed(() => ({
    currency: this.currency(),
    monthlyIncome: this.monthlyIncome(),
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
