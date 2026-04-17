import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import {
  AppContextService,
  ExpenseItem,
} from '../../core/app-context.service';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import { MeApiService, type MeExpense } from '../../core/me-api.service';
import { ExpenseModalComponent } from './expense-modal.component';
import { ExpensePieChartComponent } from './expense-pie-chart.component';

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#06b6d4',
];

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ExpenseModalComponent, ExpensePieChartComponent],
  templateUrl: './expenses-page.component.html',
  styleUrl: './expenses-page.component.scss',
})
export class ExpensesPageComponent implements OnInit {
  readonly ctx = inject(AppContextService);
  private readonly meApi = inject(MeApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly modalOpen = signal(false);
  readonly showChart = signal(false);
  readonly selectedExpenses = signal<Set<string>>(new Set());
  readonly paidByModalOpen = signal(false);
  readonly paidByName = signal('');
  readonly pendingPaidExpenseId = signal<string | null>(null);

  readonly totalExpenses = computed(() => {
    const ex = this.ctx.userData().expenses;
    return ex.filter((e) => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
  });

  readonly remaining = computed(() => {
    return this.ctx.monthlyIncome() - this.totalExpenses();
  });

  readonly pieChartData = computed((): ChartData<'pie'> => {
    const paid = this.ctx
      .userData()
      .expenses.filter((e) => e.isPaid);
    const categoryMap = new Map<string, number>();
    paid.forEach((e) => {
      categoryMap.set(
        e.category,
        (categoryMap.get(e.category) ?? 0) + e.amount,
      );
    });
    const entries = Array.from(categoryMap.entries());
    const labels = entries.map(([name]) => name);
    const data = entries.map(([, v]) => v);
    const backgroundColor = entries.map(
      (_, i) => COLORS[i % COLORS.length],
    );
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
        },
      ],
    };
  });

  readonly pieChartOptions = computed((): ChartOptions<'pie'> => {
    const sym = '$';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const ds = ctx.dataset;
              const arr = ds.data as number[];
              const sum = arr.reduce((a, b) => a + b, 0);
              const v = ctx.raw as number;
              const pct = sum > 0 ? ((v / sum) * 100).toFixed(1) : '0';
              return `${ctx.label}: ${pct}% (${sym} ${v.toFixed(2)})`;
            },
          },
        },
      },
    };
  });

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.meApi.getState().subscribe({
      next: (s) => {
        if (s.preferences) {
          this.ctx.setCurrency(s.preferences.defaultCurrency);
          this.ctx.setMonthlyIncome(s.preferences.monthlyIncome);
        }
        this.ctx.setCategories(
          s.categories.map((c) => ({ id: c.id, name: c.name })),
        );
        this.ctx.setProfiles(s.profiles);
        this.ctx.setExpenses(
          s.expenses.map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            amount: e.amount,
            category: e.category,
            isPaid: e.isPaid,
            paymentDate: e.paymentDate,
            bcvRateApplied: e.bcvRateApplied,
            bcvRateDate: e.bcvRateDate,
          })),
        );
      },
      error: (err: unknown) => {
        window.alert(formatApiHttpError(err));
      },
    });
  }

  isSelected(id: string): boolean {
    return this.selectedExpenses().has(id);
  }

  toggleChart(): void {
    this.showChart.update((v) => !v);
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  onModalOpenChange(open: boolean): void {
    this.modalOpen.set(open);
  }

  onAddExpense(payload: Omit<ExpenseItem, 'id' | 'isPaid'>): void {
    this.meApi
      .createExpense({
        title: payload.title,
        description: payload.description,
        amount: payload.amount,
        categoryName: payload.category,
        paymentDate: payload.paymentDate ?? undefined,
      })
      .subscribe({
        next: (row) => {
          this.ctx.setExpenses([
            {
              id: row.id,
              title: row.title,
              description: row.description,
              amount: row.amount,
              category: row.category,
              isPaid: row.isPaid,
              paymentDate: row.paymentDate,
              bcvRateApplied: row.bcvRateApplied,
              bcvRateDate: row.bcvRateDate,
            },
            ...this.ctx.expenses(),
          ]);
        },
        error: (err: unknown) => {
          window.alert(formatApiHttpError(err));
        },
      });
  }

  toggleExpensePaid(id: string): void {
    const ex = this.ctx.expenses().find((e) => e.id === id);
    if (!ex) {
      return;
    }
    if (!ex.isPaid) {
      this.openPaidByModal(id);
      return;
    }
    this.meApi.patchExpensePaid(id, false).subscribe({
      next: (row) => this.applyPatchedExpense(id, row),
      error: (err: unknown) => {
        window.alert(formatApiHttpError(err));
      },
    });
  }

  openPaidByModal(expenseId: string): void {
    this.pendingPaidExpenseId.set(expenseId);
    this.paidByName.set('');
    this.paidByModalOpen.set(true);
  }

  closePaidByModal(): void {
    this.paidByModalOpen.set(false);
    this.pendingPaidExpenseId.set(null);
    this.paidByName.set('');
  }

  onPaidByDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePaidByModal();
    }
  }

  confirmPaidBy(): void {
    const id = this.pendingPaidExpenseId();
    const paidBy = this.paidByName().trim();
    if (!id) {
      this.closePaidByModal();
      return;
    }
    if (!paidBy) {
      window.alert('Indica quién pagó');
      return;
    }
    this.meApi.patchExpensePaid(id, true, paidBy).subscribe({
      next: (row) => {
        this.applyPatchedExpense(id, row);
        this.closePaidByModal();
      },
      error: (err: unknown) => {
        window.alert(formatApiHttpError(err));
      },
    });
  }

  private applyPatchedExpense(id: string, row: MeExpense): void {
    this.ctx.setExpenses(
      this.ctx
        .expenses()
        .map((e) =>
          e.id === id
            ? {
                ...e,
                isPaid: row.isPaid,
                paymentDate: row.paymentDate ?? e.paymentDate,
                bcvRateApplied: row.bcvRateApplied ?? e.bcvRateApplied,
                bcvRateDate: row.bcvRateDate ?? e.bcvRateDate,
              }
            : e,
        ),
    );
  }

  toggleExpenseSelection(expenseId: string): void {
    const next = new Set(this.selectedExpenses());
    if (next.has(expenseId)) {
      next.delete(expenseId);
    } else {
      next.add(expenseId);
    }
    this.selectedExpenses.set(next);
  }

  handleDeleteExpenses(): void {
    const sel = this.selectedExpenses();
    if (sel.size === 0) {
      window.alert('Selecciona al menos un gasto para eliminar');
      return;
    }
    if (
      !window.confirm(
        `¿Estás seguro de eliminar ${sel.size} gasto(s)?`,
      )
    ) {
      return;
    }
    const ids = [...sel];
    this.meApi.deleteExpenses(ids).subscribe({
      next: () => {
        this.ctx.setExpenses(
          this.ctx.expenses().filter((e) => !ids.includes(e.id)),
        );
        this.selectedExpenses.set(new Set());
      },
      error: (err: unknown) => {
        window.alert(formatApiHttpError(err));
      },
    });
  }

  handleLogout(): void {
    this.auth.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
    });
  }
}
