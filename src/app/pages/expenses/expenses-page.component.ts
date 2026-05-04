import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import { AppContextService } from '../../core/app-context.service';
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
  /** Gastos a marcar como pagados al confirmar el modal (uno o varios). */
  readonly pendingPaidExpenseIds = signal<string[] | null>(null);
  /** Perfil (de la lista /profiles) que realizó el pago. */
  readonly paidByProfileId = signal<string>('');

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
              const arr = ds.data;
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

  @HostListener('document:keydown.escape')
  onPaidByModalEscape(): void {
    if (this.paidByModalOpen()) {
      this.closePaidByModal();
    }
  }

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
            profileId: e.profileId,
            profileName: e.profileName,
            title: e.title,
            description: e.description,
            amount: e.amount,
            category: e.category,
            isPaid: e.isPaid,
            paymentDate: e.paymentDate,
            bcvRateApplied: e.bcvRateApplied,
            bcvRateDate: e.bcvRateDate,
            paidByDisplayName: e.paidByDisplayName,
            paidAt: e.paidAt,
            paidByMemberId: e.paidByMemberId,
          })),
        );
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  isSelected(id: string): boolean {
    return this.selectedExpenses().has(id);
  }

  toggleChart(): void {
    this.showChart.update((v) => !v);
  }

  /** Al menos un seleccionado sigue pendiente → habilita “Pagar”. */
  hasPendingPaySelection(): boolean {
    const sel = this.selectedExpenses();
    const list = this.ctx.expenses();
    for (const id of sel) {
      const row = list.find((e) => e.id === id);
      if (row && !row.isPaid) {
        return true;
      }
    }
    return false;
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  onModalOpenChange(open: boolean): void {
    this.modalOpen.set(open);
  }

  onAddExpense(payload: {
    title: string;
    description: string;
    amount: number;
    category: string;
    paymentDate?: string;
  }): void {
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
              profileId: row.profileId,
              profileName: row.profileName,
              title: row.title,
              description: row.description,
              amount: row.amount,
              category: row.category,
              isPaid: row.isPaid,
              paymentDate: row.paymentDate,
              bcvRateApplied: row.bcvRateApplied,
              bcvRateDate: row.bcvRateDate,
              paidByDisplayName: row.paidByDisplayName,
              paidAt: row.paidAt,
              paidByMemberId: row.paidByMemberId,
            },
            ...this.ctx.expenses(),
          ]);
        },
        error: (err: unknown) => {
          globalThis.alert(formatApiHttpError(err));
        },
      });
  }

  toggleExpensePaid(id: string): void {
    const ex = this.ctx.expenses().find((e) => e.id === id);
    if (!ex) {
      return;
    }
    if (!ex.isPaid) {
      // El modal “¿Quién pagó?” solo desde el botón Pagar; igual que la casilla derecha.
      this.toggleExpenseSelection(id);
      return;
    }
    this.meApi.patchExpensePaid(id, false).subscribe({
      next: (row) => this.applyPatchedExpense(id, row),
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  openBulkPaidByModal(): void {
    const pendientes = [...this.selectedExpenses()].filter((id) => {
      const row = this.ctx.expenses().find((e) => e.id === id);
      return row && !row.isPaid;
    });
    if (pendientes.length === 0) {
      globalThis.alert(
        'Selecciona al menos un gasto pendiente para marcarlo como pagado.',
      );
      return;
    }
    if (this.ctx.profiles().length === 0) {
      globalThis.alert(
        'No hay perfiles. Ve a Perfiles, crea al menos uno y vuelve para indicar quién pagó.',
      );
      return;
    }
    this.pendingPaidExpenseIds.set(pendientes);
    this.paidByProfileId.set('');
    this.paidByModalOpen.set(true);
  }

  closePaidByModal(): void {
    this.paidByModalOpen.set(false);
    this.pendingPaidExpenseIds.set(null);
    this.paidByProfileId.set('');
  }

  confirmPaidBy(): void {
    const ids = this.pendingPaidExpenseIds();
    if (!ids?.length) {
      this.closePaidByModal();
      return;
    }
    const pid = this.paidByProfileId().trim();
    if (!pid) {
      globalThis.alert('Selecciona qué perfil realizó el pago');
      return;
    }
    const payer = this.ctx.profiles().find((p) => p.id === pid);
    if (!payer) {
      globalThis.alert('Perfil no válido; recarga la página e intenta de nuevo');
      return;
    }
    const nombrePagador = payer.name.trim();
    this.meApi
      .markExpensesPaid({ ids, paidByDisplayName: nombrePagador })
      .subscribe({
        next: (rows) => {
          for (const row of rows) {
            this.applyPatchedExpense(row.id, row);
          }
          this.selectedExpenses.update((prev) => {
            const next = new Set(prev);
            for (const id of ids) {
              next.delete(id);
            }
            return next;
          });
          this.closePaidByModal();
        },
        error: (err: unknown) => {
          globalThis.alert(formatApiHttpError(err));
        },
      });
  }

  stopPaidByModalBubble(event: Event): void {
    event.stopPropagation();
  }

  private applyPatchedExpense(id: string, row: MeExpense): void {
    if (row.isPaid) {
      this.selectedExpenses.update((prev) => {
        const nextSel = new Set(prev);
        nextSel.delete(id);
        return nextSel;
      });
    }
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
                paidByDisplayName: row.paidByDisplayName ?? e.paidByDisplayName,
                paidAt: row.paidAt ?? e.paidAt,
                paidByMemberId: row.paidByMemberId ?? e.paidByMemberId,
              }
            : e,
        ),
    );
  }

  toggleExpenseSelection(expenseId: string): void {
    const ex = this.ctx.expenses().find((e) => e.id === expenseId);
    if (ex?.isPaid) {
      return;
    }
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
      globalThis.alert('Selecciona al menos un gasto para eliminar');
      return;
    }
    if (
      !globalThis.confirm(
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
        globalThis.alert(formatApiHttpError(err));
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


  goBack(): void {
    void this.router.navigate(['/profiles']);
  }
}
