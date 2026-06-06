import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import { AppContextService } from '../../core/app-context.service';
import { navigateFromExpensesMenu } from '../../core/app-navigation.util';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import { writeBcvRateCache } from '../../core/bcv-rate-cache.util';
import { MeApiService, type MeExpense, type MeIncome, type MeProfileMember } from '../../core/me-api.service';
import {
  getStateWithAutoRollover,
  needsSetupScreen,
} from '../../core/month-renewal.util';
import type { ParseInvoiceResult } from '../../core/ocr-api.service';
import { guessOcrDocumentKind } from '../../core/ocr-document-kind.util';
import { ExpenseModalComponent } from './expense-modal.component';
import { IncomeModalComponent } from './income-modal.component';
import { ExpensePieChartComponent } from './expense-pie-chart.component';
import { ExpenseTypeSelectorComponent, type ExpenseCreationMode } from './expense-type-selector.component';
import { ImageUploadModalComponent, type ImageUploadMode } from './image-upload-modal.component';
import { ReceiptViewerComponent } from './receipt-viewer.component';
import { resolveExpenseCategoryIcon, type ExpenseCategoryIconKind } from './expense-category-icon.util';
import {
  buildLastSevenDaySpending,
  sparklinePolyline,
} from './expense-sparkline.util';

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

function toIncomeItem(i: MeIncome) {
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    amount: i.amount,
    source: i.source,
    referenceMonth: i.referenceMonth,
    receivedDate: i.receivedDate,
    bcvRateApplied: i.bcvRateApplied,
    bcvRateDate: i.bcvRateDate,
  };
}

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ExpenseModalComponent,
    IncomeModalComponent,
    ExpensePieChartComponent,
    ExpenseTypeSelectorComponent,
    ImageUploadModalComponent,
    ReceiptViewerComponent,
  ],
  templateUrl: './expenses-page.component.html',
  styleUrl: './expenses-page.component.scss',
})
export class ExpensesPageComponent implements OnInit, OnDestroy {
  readonly ctx = inject(AppContextService);
  private readonly meApi = inject(MeApiService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  /** Miniaturas OCR en hover; se liberan al destruir la vista. */
  private readonly receiptBlobCache = new Map<string, string>();
  private readonly receiptFetchInFlight = new Set<string>();

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
  readonly incomeModalOpen = signal(false);
  readonly boardTab = signal<'expenses' | 'incomes'>('expenses');
  /** Datos del OCR que se pasan al formulario; null = sin prefill (gasto manual). */
  readonly ocrPrefill = signal<ParseInvoiceResult | null>(null);
  /** Factura vs pago móvil: guía estadística tipo documento cuando hay OCR previo al formulario. */
  readonly lastReceiptCaptureKind = signal<ImageUploadMode | null>(null);

  // --- Visor de comprobantes ---
  readonly receiptViewerOpen = signal(false);
  readonly receiptExpenseId = signal<string | null>(null);
  readonly showChart = signal(false);
  readonly sidebarOpen = signal(false);
  /** Invitaciones pendientes a perfiles comercio compartidos. */
  readonly pendingInvitationsCount = signal(0);

  /** Perfiles propios — excluye colaboraciones compartidas del flujo de gastos. */
  readonly expenseProfiles = computed(() =>
    this.ctx.profiles().filter((p) => (p.access ?? 'owner') === 'owner'),
  );
  /** Determina si mostrar el enlace de inventario en el sidebar (al menos un perfil comercio). */
  readonly hasInventory = computed(() =>
    this.ctx.profiles().some((p) => p.type === 'comercio'),
  );
  readonly hoveredReceiptId = signal<string | null>(null);
  /** Fuerza repaint cuando llega una miniatura de recibo en caché. */
  readonly receiptPreviewTick = signal(0);
  /** YYYY-MM-01 del mes de control activo (API, calendario Caracas). */
  readonly activeReferenceMonth = signal('');
  /**
   * FEAT-001: Label del periodo activo.
   * Usa el label del backend si está disponible (ej: "16 May - 15 Jun"),
   * fallback al label del mes calendario si no.
   */
  readonly monthLabelActive = computed(() => {
    // FEAT-001: Primero intentar usar el label del periodo activo del contexto
    const periodLabel = this.ctx.activePeriodLabel();
    if (periodLabel) {
      return periodLabel;
    }

    // Fallback legacy: calcular desde activeReferenceMonth
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
  readonly selectedIncomes = signal<Set<string>>(new Set());
  readonly paidByModalOpen = signal(false);
  /** Gastos a marcar como pagados al confirmar el modal (uno o varios). */
  readonly pendingPaidExpenseIds = signal<string[] | null>(null);
  /** Perfil (de la lista /profiles) que realizó el pago. */
  readonly paidByProfileId = signal<string>('');
  /** Integrante específico dentro del perfil seleccionado (opcional). */
  readonly paidByMemberId = signal<string>('');
  readonly profileMembers = signal<MeProfileMember[]>([]);
  readonly membersLoading = signal<boolean>(false);

  readonly totalExpenses = computed(() => {
    const ex = this.ctx.userData().expenses;
    return ex.filter((e) => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
  });

  readonly totalLoggedIncome = computed(() =>
    this.ctx.incomes().reduce((sum, i) => sum + i.amount, 0),
  );

  readonly totalPeriodIncome = computed(
    () => this.ctx.effectiveMonthlyIncome() + this.totalLoggedIncome(),
  );

  readonly remaining = computed(
    () => this.totalPeriodIncome() - this.totalExpenses(),
  );

  readonly spendingSparklineValues = computed(() =>
    buildLastSevenDaySpending(this.ctx.expenses()),
  );

  readonly spendingSparklinePath = computed(() =>
    sparklinePolyline(this.spendingSparklineValues()),
  );

  readonly averageBcvRate = computed(() => {
    const rows = this.ctx
      .expenses()
      .filter((e) => e.bcvRateApplied != null && e.isPaid);
    if (rows.length === 0) {
      return null;
    }
    const sum = rows.reduce((acc, e) => acc + (e.bcvRateApplied ?? 0), 0);
    return sum / rows.length;
  });

  readonly userInitial = computed(() => {
    const name = this.auth.displayName()?.trim();
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    const mail = this.auth.email()?.trim();
    return mail ? mail.charAt(0).toUpperCase() : '?';
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
    getStateWithAutoRollover(this.meApi).subscribe({
      next: (s) => {
        if (needsSetupScreen(s)) {
          void this.router.navigate(['/setup']);
          return;
        }
        this.activeReferenceMonth.set(s.activeReferenceMonth);
        // FEAT-001: Sincronizar periodo activo
        this.ctx.syncActivePeriod(s.activePeriod ?? null);
        if (s.preferences) {
          this.ctx.syncFromMePreferences(s.preferences);
          if (
            s.preferences.bcvVesPerUsdNow != null &&
            s.preferences.bcvRateDateNow
          ) {
            writeBcvRateCache({
              vesPerUsd: s.preferences.bcvVesPerUsdNow,
              date: s.preferences.bcvRateDateNow,
              rateDate: s.preferences.bcvRateDateNow,
              stale: s.preferences.bcvQuoteIsStale,
            });
          }
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
        this.ctx.setIncomeSources(s.incomeSources ?? []);
        this.ctx.setIncomes((s.incomes ?? []).map(toIncomeItem));
        this.loadPendingInvitationsCount();
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

  onIncomeModalOpenChange(open: boolean): void {
    this.incomeModalOpen.set(open);
  }

  onAddIncome(payload: {
    title: string;
    description: string;
    amount: number;
    source: string;
    receivedDate?: string;
  }): void {
    this.meApi
      .createIncome({
        title: payload.title,
        description: payload.description,
        amount: payload.amount,
        sourceName: payload.source,
        receivedDate: payload.receivedDate,
      })
      .subscribe({
      next: (row) => {
        this.ctx.setIncomes([toIncomeItem(row), ...this.ctx.incomes()]);
        this.boardTab.set('incomes');
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  isIncomeSelected(id: string): boolean {
    return this.selectedIncomes().has(id);
  }

  toggleIncomeSelection(id: string): void {
    const next = new Set(this.selectedIncomes());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIncomes.set(next);
  }

  handleDeleteIncomes(): void {
    const sel = this.selectedIncomes();
    if (sel.size === 0) {
      globalThis.alert('Selecciona al menos un ingreso para eliminar');
      return;
    }
    if (!globalThis.confirm(`¿Eliminar ${sel.size} ingreso(s)?`)) {
      return;
    }
    const ids = [...sel];
    this.meApi.deleteIncomes(ids).subscribe({
      next: () => {
        this.ctx.setIncomes(this.ctx.incomes().filter((i) => !ids.includes(i.id)));
        this.selectedIncomes.set(new Set());
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  /** Punto de entrada único: gasto manual, OCR o ingreso del periodo. */
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
    if (mode === 'income') {
      this.lastReceiptCaptureKind.set(null);
      this.incomeModalOpen.set(true);
      return;
    }
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
    if (this.expenseProfiles().length === 0) {
      globalThis.alert(
        'No hay perfiles. Ve a Perfiles, crea al menos uno y vuelve para indicar quién pagó.',
      );
      return;
    }
    this.pendingPaidExpenseIds.set(pendientes);
    this.paidByProfileId.set('');
    this.paidByMemberId.set('');
    this.profileMembers.set([]);
    this.membersLoading.set(false);
    this.paidByModalOpen.set(true);
  }

  closePaidByModal(): void {
    this.paidByModalOpen.set(false);
    this.pendingPaidExpenseIds.set(null);
    this.paidByProfileId.set('');
    this.paidByMemberId.set('');
    this.profileMembers.set([]);
    this.membersLoading.set(false);
  }

  /** Al cambiar el perfil seleccionado se cargan sus integrantes (si tiene). */
  onProfileChange(profileId: string): void {
    this.paidByProfileId.set(profileId);
    this.paidByMemberId.set('');
    this.profileMembers.set([]);
    if (!profileId) return;
    this.membersLoading.set(true);
    this.meApi.listProfileMembers(profileId).subscribe({
      next: (members) => {
        this.membersLoading.set(false);
        this.profileMembers.set(members);
      },
      error: () => {
        // Fallo silencioso: el usuario puede pagar como perfil sin integrante
        this.membersLoading.set(false);
      },
    });
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
    const payer = this.expenseProfiles().find((p) => p.id === pid);
    if (!payer) {
      globalThis.alert('Perfil no válido; recarga la página e intenta de nuevo');
      return;
    }
    const mid = this.paidByMemberId().trim();
    // El backend construye "Mamá (Familia García)" si hay memberId; aquí solo
    // mandamos el nombre del perfil como fallback por si la resolución falla.
    const nombrePagador = payer.name.trim();
    this.meApi
      .markExpensesPaid({
        ids,
        paidByDisplayName: nombrePagador,
        ...(mid ? { paidByMemberId: mid } : {}),
      })
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
    this.closeSidebar();
    void this.router.navigate(['/historial']);
  }

  goProfiles(): void {
    navigateFromExpensesMenu(this.router, '/profiles', () => this.closeSidebar());
  }

  goInvitations(): void {
    navigateFromExpensesMenu(this.router, '/invitations', () => this.closeSidebar());
  }

  private loadPendingInvitationsCount(): void {
    this.meApi.listInvitations().subscribe({
      next: (list) => this.pendingInvitationsCount.set(list.length),
      error: () => this.pendingInvitationsCount.set(0),
    });
  }

  goSetup(): void {
    navigateFromExpensesMenu(this.router, '/setup', () => this.closeSidebar());
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  categoryIconKind(category: string): ExpenseCategoryIconKind {
    return resolveExpenseCategoryIcon(category);
  }

  receiptPreviewUrl(expenseId: string): string | null {
    this.receiptPreviewTick();
    return this.receiptBlobCache.get(expenseId) ?? null;
  }

  onReceiptHover(expenseId: string): void {
    this.hoveredReceiptId.set(expenseId);
    if (
      this.receiptBlobCache.has(expenseId) ||
      this.receiptFetchInFlight.has(expenseId)
    ) {
      return;
    }
    this.receiptFetchInFlight.add(expenseId);
    this.meApi.getExpenseReceipt(expenseId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.receiptBlobCache.set(expenseId, url);
        this.receiptFetchInFlight.delete(expenseId);
        this.receiptPreviewTick.update((n) => n + 1);
      },
      error: () => {
        this.receiptFetchInFlight.delete(expenseId);
      },
    });
  }

  onReceiptHoverEnd(): void {
    this.hoveredReceiptId.set(null);
  }

  ngOnDestroy(): void {
    for (const url of this.receiptBlobCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.receiptBlobCache.clear();
  }

  goPrevExpensePage(): void {
    this.expensesPage.update((p) => Math.max(1, p - 1));
  }

  goNextExpensePage(): void {
    const max = this.expenseTotalPages();
    this.expensesPage.update((p) => Math.min(max, p + 1));
  }
}
