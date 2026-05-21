import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CategoryDraft, CurrencyCode } from '../../core/app-context.service';
import { todayYmdCaracas } from '../../core/caracas-date';
import { MeApiService } from '../../core/me-api.service';
import type { ParseInvoiceResult } from '../../core/ocr-api.service';

@Component({
  selector: 'app-expense-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-modal.component.html',
  styleUrl: './expense-modal.component.scss',
})
export class ExpenseModalComponent implements OnChanges {
  private readonly meApi = inject(MeApiService);
  private readonly injector = inject(Injector);

  readonly expenseDialog = viewChild<ElementRef<HTMLDialogElement>>('expenseDialog');

  readonly open = input.required<boolean>();
  readonly categories = input.required<CategoryDraft[]>();
  /** Si BS: dos montos (Bs + USD); si USD: un solo monto en $. */
  readonly defaultCurrency = input<CurrencyCode>('USD');
  /** Datos pre-rellenados desde el OCR (llega desde ImageUploadModal). */
  readonly ocrPrefill = input<ParseInvoiceResult | null>(null);

  readonly openChange = output<boolean>();
  readonly addExpense = output<{
    title: string;
    description: string;
    amount: number;
    category: string;
    paymentDate?: string;
  }>();

  title = '';
  description = '';
  category = '';
  amountUsd = '';
  amountBs = '';
  paymentDate = '';
  usdPreview: number | null = null;
  previewLoading = false;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  // Referencia visual a campos que vinieron del OCR
  readonly ocrDetectedFields = signal<ParseInvoiceResult | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.reset();
      this.paymentDate = todayYmdCaracas();

      // Si vienen datos del OCR, pre-rellenar el formulario
      const prefill = this.ocrPrefill();
      if (prefill) {
        this.applyOcrPrefill(prefill);
      }
    }
    if (changes['open']) {
      afterNextRender(() => this.syncExpenseDialogOpen(), {
        injector: this.injector,
      });
    }
  }

  private syncExpenseDialogOpen(): void {
    const host = this.expenseDialog()?.nativeElement;
    if (!host) return;
    if (this.open()) {
      if (!host.open) host.showModal();
      return;
    }
    if (host.open) host.close();
  }

  paymentDateMaxYmd(): string {
    return todayYmdCaracas();
  }

  scheduleBsPreview(): void {
    if (this.defaultCurrency() !== 'BS') return;
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.refreshUsdPreview(), 350);
  }

  private amountBsText(): string {
    return String(this.amountBs ?? '').trim();
  }

  private refreshUsdPreview(): void {
    this.previewTimer = null;
    const date = String(this.paymentDate ?? '').trim() || todayYmdCaracas();
    const bsRaw = this.amountBsText();
    const bs = Number.parseFloat(bsRaw);
    if (bsRaw === '' || Number.isNaN(bs) || bs <= 0) {
      this.usdPreview = null;
      this.previewLoading = false;
      return;
    }
    this.previewLoading = true;
    this.meApi.getBcvOfficialRate(date).subscribe({
      next: (r) => {
        this.usdPreview = bs / r.vesPerUsd;
        this.previewLoading = false;
      },
      error: () => {
        this.usdPreview = null;
        this.previewLoading = false;
      },
    });
  }

  handleSubmit(): void {
    if (!this.title.trim() || !this.category) {
      globalThis.alert('Por favor completa título y categoría');
      return;
    }
    const cur = this.defaultCurrency();
    if (cur === 'USD') {
      const n = Number.parseFloat(this.amountUsd);
      if (Number.isNaN(n) || n < 0) {
        globalThis.alert('Monto en USD no válido');
        return;
      }
      const pay = String(this.paymentDate ?? '').trim() || undefined;
      this.emitAndClose({
        title: this.title.trim(),
        description: this.description.trim(),
        amount: n,
        category: this.category,
        paymentDate: pay,
      });
      return;
    }
    const date = String(this.paymentDate ?? '').trim() || todayYmdCaracas();
    const bs = Number.parseFloat(this.amountBsText());
    if (Number.isNaN(bs) || bs < 0) {
      globalThis.alert('Monto en Bs. no válido');
      return;
    }
    this.meApi.getBcvOfficialRate(date).subscribe({
      next: (r) => {
        const usd = bs / r.vesPerUsd;
        this.emitAndClose({
          title: this.title.trim(),
          description: this.description.trim(),
          amount: usd,
          category: this.category,
          paymentDate: date,
        });
      },
      error: () => {
        globalThis.alert('No se pudo obtener la tasa BCV para esa fecha.');
      },
    });
  }

  private emitAndClose(payload: {
    title: string;
    description: string;
    amount: number;
    category: string;
    paymentDate?: string;
  }): void {
    this.addExpense.emit(payload);
    this.reset();
    this.openChange.emit(false);
  }

  handleCancel(): void {
    this.reset();
    this.openChange.emit(false);
  }

  onBackdropClick(event: MouseEvent): void {
    const host = this.expenseDialog()?.nativeElement;
    if (host && event.target === host) this.handleCancel();
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.handleCancel();
  }

  onExpensePanelKeydown(_event: KeyboardEvent): void {
    // El <dialog> gestiona Escape; este handler es solo para paridad de accesibilidad.
  }

  stopBubble(event: Event): void {
    event.stopPropagation();
  }

  private reset(): void {
    this.title = '';
    this.description = '';
    this.amountUsd = '';
    this.amountBs = '';
    this.category = '';
    this.paymentDate = '';
    this.usdPreview = null;
    this.previewLoading = false;
    this.ocrDetectedFields.set(null);
  }

  /** Aplica los datos que devolvió el OCR al abrir el formulario. */
  private applyOcrPrefill(result: ParseInvoiceResult): void {
    this.ocrDetectedFields.set(result);

    if (result.merchant) {
      this.title = result.merchant;
      // Intentar mapear categoría por nombre parcial
      const merchantLower = result.merchant.toLowerCase();
      const match = this.categories().find((c) =>
        merchantLower.includes(c.name.toLowerCase()),
      );
      if (match) this.category = match.name;
    }

    if (result.date) this.paymentDate = result.date;

    if (result.description) this.description = result.description;

    if (result.amount != null && result.amount > 0) {
      if (this.defaultCurrency() === 'USD' || result.currency === 'USD') {
        this.amountUsd = String(result.amount);
      } else if (result.currency === 'BS') {
        this.amountBs = String(result.amount);
        if (this.defaultCurrency() === 'BS') this.scheduleBsPreview();
      }
    }
  }

  get ocrConfidencePercent(): number {
    const fields = this.ocrDetectedFields();
    if (!fields) return 0;
    return Math.round(fields.confidence * 100);
  }
}
