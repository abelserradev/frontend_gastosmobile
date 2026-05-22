import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import { AppContextService } from '../../core/app-context.service';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import { MeApiService, type MeExpense } from '../../core/me-api.service';
import type { ParseInvoiceResult } from '../../core/ocr-api.service';
import { guessOcrDocumentKind } from '../../core/ocr-document-kind.util';
import { ExpenseModalComponent } from './expense-modal.component';
import { ExpensePieChartComponent } from './expense-pie-chart.component';
import { ExpenseTypeSelectorComponent, type ExpenseCreationMode } from './expense-type-selector.component';
import { ImageUploadModalComponent, type ImageUploadMode } from './image-upload-modal.component';
import { ReceiptViewerComponent } from './receipt-viewer.component';

const EXPENSES_PAGE_SIZE = 6;

/* Solo chart-1…3 + destructive de la paleta fija */
const COLORS = ['#ee8329', '#cd5241', '#084152', '#ef4444'];

/** Mapeo canónico MeExpense → item de contexto; centralizado aquí para no repetirlo en cada acción. */
function toExpenseItem(e: MeExpense) {
  return {
    id: e.id,
    profileId: e.profileId,
    profileName: e.profileName,
    title: e.title,
    description: e.description,
    amount: e.amount,
    category: e.category,
    isPaid: e.isPaid,
    referenceMonth: e.referenceMonth,
    paymentDate: e.paymentDate,
    bcvRateApplied: e.bcvRateApplied,
    bcvRateDate: e.bcvRateDate,
    paidByDisplayName: e.paidByDisplayName,
    paidAt: e.paidAt,
    paidByMemberId: e.paidByMemberId,
    hasReceipt: e.hasReceipt ?? false,
  };
}

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExpenseModalComponent,
    ExpensePieChartComponent,
    ExpenseTypeSelectorComponent,
    ImageUploadModalComponent,
    ReceiptViewerComponent,
  ],
  templateUrl: './expenses-page.component.html',
  styleUrl: './expenses-page.component.scss',
})
export class ExpensesPageComponent implements OnInit {
  readonly ctx = inject(AppContextService);
  private readonly meApi = inject(MeApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly paidByDialog =
    viewChild<ElementRef<HTMLDialogElement>>('paidByDialog');

  /** 1-based; solo la lista visible está paginada. */
  readonly expensesPage = signal(1);

  readonly expenseTotalPages = computed(() => {
    const n = this.ctx.expenses().length;
    return Math.max(1, Math.ceil(n / EXPENSES_PAGE_SIZE));
  });

  readonly showExpensePagination = computed(
    () => this.ctx.expenses().length > EXPENSES_PAGE_SIZE,
  );

  readonly expensesPageSlice = computed(() => {
    const all = this.ctx.expenses();
    const page = this.expensesPage();
    const start = (page - 1) * EXPENSES_PAGE_SIZE;
    return all.slice(start, start + EXPENSES_PAGE_SIZE);
  });

  // --- Flujo de creación de gasto (3 pasos posibles) ---
  readonly selectorOpen = signal(false);
  readonly imageUploadOpen = signal(false);
  readonly imageUploadMode = signal<ImageUploadMode>('invoice');
  readonly modalOpen = signal(false);
  /** Datos del OCR que se pasan al formulario; null = sin prefill (gasto manual). */
  readonly ocrPrefill = signal<ParseInvoiceResult | null>(null);
  /** Factura vs pago móvil: guía estadística tipo documento cuando hay OCR previo al formulario. */
  readonly lastReceiptCaptureKind = signal<ImageUploadMode | null>(null);

  // --- Visor de comprobantes ---
  readonly receiptViewerOpen = signal(false);
  readonly receiptExpenseId = signal<string | null>(null);
  readonly showChart = signal(false);
  /** YYYY-MM-01 del mes de control activo (API, calendario Caracas). */
  readonly activeReferenceMonth = signal('');
  readonly monthLabelActive = computed(() => {
    const ymd = this.activeReferenceMonth();
    if (!ymd || ymd.length < 7) {
      return '';
    }
    const [y, m] = ymd.split('-').map(Number);
    if (!y || !m) {
      return '';
    }
    return new Date(Date.UTC(y, m - 1, 12)).toLocaleDateString('es-VE', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  });
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

  constructor() {
    effect(() => {
      const pages = this.expenseTotalPages();
      if (this.expensesPage() > pages) {
        this.expensesPage.set(pages);
      }
    });
    effect(() => {
      const abierto = this.paidByModalOpen();
      afterNextRender(() => this.syncPaidByDialogOpen(abierto), {
        injector: this.injector,
      });
    });
  }

  private syncPaidByDialogOpen(isOpen: boolean): void {
    const host = this.paidByDialog()?.nativeElement;
    if (!host) {
      return;
    }
    if (isOpen) {
      if (!host.open) {
        host.showModal();
      }
      return;
    }
    if (host.open) {
      host.close();
    }
  }

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.meApi.getState().subscribe({
      next: (s) => {
        if (s.needsMonthlyIncomeSetup) {
          void this.router.navigate(['/setup']);
          return;
        }
        this.activeReferenceMonth.set(s.activeReferenceMonth);
        if (s.preferences) {
          this.ctx.setCurrency(s.preferences.defaultCurrency);
          this.ctx.setMonthlyIncome(s.preferences.monthlyIncome);
          this.ctx.setBsIncomeContext({
            incomeFixedBs: s.preferences.incomeFixedBs,
            narrative: s.preferences.bsIncomeNarrative,
            stale: s.preferences.bcvQuoteIsStale,
          });
        } else {
          this.ctx.setBsIncomeContext({
            incomeFixedBs: null,
            narrative: null,
            stale: false,
          });
        }
        this.ctx.setCategories(
          s.categories.map((c) => ({ id: c.id, name: c.name })),
        );
        this.ctx.setProfiles(s.profiles);
        this.ctx.setExpenses(s.expenses.map(toExpenseItem));
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
    const expenses = this.ctx.expenses();
    return [...this.selectedExpenses()].some(
      (id) => expenses.some((e) => e.id === id && !e.isPaid),
    );
  }

  /** Punto de entrada único: abre el selector de tipo de gasto. */
  openTypeSelector(): void {
    this.selectorOpen.set(true);
  }

  onSelectorOpenChange(open: boolean): void {
    this.selectorOpen.set(open);
    if (open) {
      this.lastReceiptCaptureKind.set(null);
    }
  }

  onCreationModeSelected(mode: ExpenseCreationMode): void {
    if (mode === 'invoice' || mode === 'payment') {
      this.lastReceiptCaptureKind.set(mode);
    } else {
      this.lastReceiptCaptureKind.set(null);
    }
    if (mode === 'manual') {
      this.ocrPrefill.set(null);
      this.modalOpen.set(true);
      return;
    }
    this.imageUploadMode.set(mode);
    this.imageUploadOpen.set(true);
  }

  onImageUploadOpenChange(open: boolean): void {
    this.imageUploadOpen.set(open);
  }

  onModalOpenChange(open: boolean): void {
    this.modalOpen.set(open);
    if (!open) this.ocrPrefill.set(null);
  }

  /** El ImageUploadModal guardó el gasto directamente (flujo rápido con imagen). */
  onExpenseSavedFromReceipt(expense: MeExpense): void {
    this.expensesPage.set(1);
    this.ctx.setExpenses([toExpenseItem(expense), ...this.ctx.expenses()]);
  }

  /** El usuario eligió "Agregar más detalles" desde el ImageUploadModal. */
  onSwitchToForm(ocrResult: ParseInvoiceResult | null): void {
    this.ocrPrefill.set(ocrResult);
    this.modalOpen.set(true);
  }

  openReceiptViewer(expenseId: string): void {
    this.receiptExpenseId.set(expenseId);
    this.receiptViewerOpen.set(true);
  }

  onReceiptViewerOpenChange(open: boolean): void {
    this.receiptViewerOpen.set(open);
    if (!open) this.receiptExpenseId.set(null);
  }

  onAddExpense(payload: {
    title: string;
    description: string;
    amount: number;
    category: string;
    paymentDate?: string;
  }): void {
    const ocrSnapshot = this.ocrPrefill();
    const flowKind = this.lastReceiptCaptureKind();
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
          this.expensesPage.set(1);
          this.ctx.setExpenses([toExpenseItem(row), ...this.ctx.expenses()]);
          const raw = (ocrSnapshot?.rawText ?? '').trim();
          if (raw.length >= 8 && ocrSnapshot) {
            this.enqueueOcrFeedbackAfterDetailForm(
              row,
              payload,
              ocrSnapshot,
              flowKind,
            );
          }
        },
        error: (err: unknown) => {
          globalThis.alert(formatApiHttpError(err));
        },
      });
  }

  /** Fire-and-forget opcional contra el servidor (v1.3). */
  private enqueueOcrFeedbackAfterDetailForm(
    expenseRow: MeExpense,
    formPayload: {
      title: string;
      description: string;
      amount: number;
      category: string;
      paymentDate?: string;
    },
    ocrSnapshot: ParseInvoiceResult,
    receiptFlow: ImageUploadMode | null,
  ): void {
    const kind = guessOcrDocumentKind(receiptFlow ?? undefined, ocrSnapshot.rawText);
    const parseSnapshot = {
      ...ocrSnapshot,
      rawText: (ocrSnapshot.rawText ?? '').slice(0, 7900),
    };
    const pay = expenseRow.paymentDate ?? formPayload.paymentDate?.trim();
    this.meApi
      .submitOcrFeedback({
        source: 'IMAGE_UPLOAD_FLOW',
        submissionVariant: 'detail_form',
        documentKindGuess: kind,
        parseSnapshot,
        corrected: {
          title: expenseRow.title,
          description: expenseRow.description,
          amountUsd: expenseRow.amount,
          ...(pay ? { paymentDate: pay.slice(0, 10) } : {}),
          currencyCapture:
            this.ctx.currency() === 'BS' ? 'BS' : 'USD',
          categoryName: expenseRow.category,
        },
        expenseId: expenseRow.id,
      })
      .subscribe({ error: () => {} });
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

  onPaidByDialogBackdropClick(event: MouseEvent): void {
    const host = this.paidByDialog()?.nativeElement;
    if (host && event.target === host) {
      this.closePaidByModal();
    }
  }

  onPaidByDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }
    event.preventDefault();
    this.closePaidByModal();
  }

  stopPaidByModalBubble(event: Event): void {
    event.stopPropagation();
  }

  /** Paridad con `(click)` en el panel del modal; Escape lo gestiona el <dialog>. */
  onPaidByPanelKeydown(event: KeyboardEvent): void {
    if (!event.cancelable) {
      return;
    }
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
                referenceMonth: row.referenceMonth ?? e.referenceMonth,
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

  goHistorial(): void {
    void this.router.navigate(['/historial']);
  }

  goPrevExpensePage(): void {
    this.expensesPage.update((p) => Math.max(1, p - 1));
  }

  goNextExpensePage(): void {
    const max = this.expenseTotalPages();
    this.expensesPage.update((p) => Math.min(max, p + 1));
  }
}
