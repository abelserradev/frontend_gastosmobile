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
import { OcrApiService, type ParseInvoiceResult } from '../../core/ocr-api.service';

@Component({
  selector: 'app-expense-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-modal.component.html',
  styleUrl: './expense-modal.component.scss',
})
export class ExpenseModalComponent implements OnChanges {
  private readonly meApi = inject(MeApiService);
  private readonly ocrApi = inject(OcrApiService);
  private readonly injector = inject(Injector);
  readonly expenseDialog =
    viewChild<ElementRef<HTMLDialogElement>>('expenseDialog');
  readonly invoiceFileInput =
    viewChild<ElementRef<HTMLInputElement>>('invoiceFileInput');

  readonly open = input.required<boolean>();
  readonly categories = input.required<CategoryDraft[]>();
  /** Si BS: dos montos (Bs + USD); si USD: un solo monto en $. */
  readonly defaultCurrency = input<CurrencyCode>('USD');
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
  /** Monto en USD cuando defaultCurrency es USD. */
  amountUsd = '';
  /** Monto en Bs. cuando defaultCurrency es BS. */
  amountBs = '';
  paymentDate = '';
  usdPreview: number | null = null;
  previewLoading = false;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  // OCR / Escanear factura
  readonly ocrProcessing = signal(false);
  readonly ocrError = signal<string | null>(null);
  readonly ocrImagePreview = signal<string | null>(null);
  readonly ocrDetectedFields = signal<ParseInvoiceResult | null>(null);
  private selectedInvoiceFile: File | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.reset();
      this.paymentDate = todayYmdCaracas();
    }
    if (changes['open']) {
      afterNextRender(() => this.syncExpenseDialogOpen(), {
        injector: this.injector,
      });
    }
  }

  /** showModal/close enlazan el <dialog> con el input open() del padre. */
  private syncExpenseDialogOpen(): void {
    const host = this.expenseDialog()?.nativeElement;
    if (!host) {
      return;
    }
    if (this.open()) {
      if (!host.open) {
        host.showModal();
      }
      return;
    }
    if (host.open) {
      host.close();
    }
  }

  /** Tope del datepicker: mismo criterio que el API (no tasas futuras en Caracas). */
  paymentDateMaxYmd(): string {
    return todayYmdCaracas();
  }

  scheduleBsPreview(): void {
    if (this.defaultCurrency() !== 'BS') {
      return;
    }
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }
    this.previewTimer = setTimeout(() => this.refreshUsdPreview(), 350);
  }

  /** type="number" + ngModel puede dejar number | null, no string — evitar .trim() directo */
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
    if (host && event.target === host) {
      this.handleCancel();
    }
  }

  /** Escape cierra el modal y notifica al padre; `preventDefault` evita el cierre nativo duplicado antes de `close()` en sync. */
  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }
    event.preventDefault();
    this.handleCancel();
  }

  /** Paridad accesibilidad con `(click)` en el panel; no interceptamos teclas — el <dialog> gestiona Escape. */
  onExpensePanelKeydown(event: KeyboardEvent): void {
    if (!event.cancelable) {
      return;
    }
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
    this.ocrProcessing.set(false);
    this.ocrError.set(null);
    this.ocrImagePreview.set(null);
    this.ocrDetectedFields.set(null);
    this.selectedInvoiceFile = null;
    // Resetear input file
    const fileInput = this.invoiceFileInput()?.nativeElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // ========== OCR / Escanear factura ==========

  /** Abre el selector de archivos para escanear factura. */
  openInvoiceScanner(): void {
    const fileInput = this.invoiceFileInput()?.nativeElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /** Maneja la selección de imagen de factura. */
  onInvoiceImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      this.ocrError.set('Solo se permiten imágenes (JPG, PNG, WebP)');
      return;
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.ocrError.set('La imagen es demasiado grande. Máximo 10MB');
      return;
    }

    this.selectedInvoiceFile = file;
    this.ocrError.set(null);

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = () => {
      this.ocrImagePreview.set(reader.result as string);
      this.processInvoiceWithOcr();
    };
    reader.readAsDataURL(file);
  }

  /** Envía la imagen al servicio OCR y autocompleta campos. */
  private processInvoiceWithOcr(): void {
    if (!this.selectedInvoiceFile) {
      return;
    }

    this.ocrProcessing.set(true);
    this.ocrError.set(null);

    this.ocrApi.parseInvoice(this.selectedInvoiceFile).subscribe({
      next: (result) => {
        this.ocrProcessing.set(false);
        this.ocrDetectedFields.set(result);

        // Autocompletar campos según resultado
        this.applyOcrResultToForm(result);
      },
      error: (err: unknown) => {
        this.ocrProcessing.set(false);
        const message =
          err instanceof Error ? err.message : 'Error al procesar la factura';
        this.ocrError.set(message);
      },
    });
  }

  /** Aplica los datos OCR al formulario con indicadores visuales. */
  private applyOcrResultToForm(result: ParseInvoiceResult): void {
    // Título: usar merchant si está disponible
    if (result.merchant) {
      this.title = result.merchant;
    }

    // Fecha
    if (result.date) {
      this.paymentDate = result.date;
    }

    // Monto
    if (result.amount != null && result.amount > 0) {
      if (this.defaultCurrency() === 'USD' || result.currency === 'USD') {
        this.amountUsd = String(result.amount);
      } else if (result.currency === 'BS') {
        this.amountBs = String(result.amount);
        // Recalcular preview USD si es necesario
        if (this.defaultCurrency() === 'BS') {
          this.scheduleBsPreview();
        }
      }
    }

    // Descripción
    if (result.description) {
      this.description = result.description;
    }

    // Intentar mapear categoría si hay merchant que coincida
    if (result.merchant) {
      const merchantLower = result.merchant.toLowerCase();
      const matchingCategory = this.categories().find((cat) =>
        merchantLower.includes(cat.name.toLowerCase()),
      );
      if (matchingCategory) {
        this.category = matchingCategory.name;
      }
    }
  }

  /** Limpia la imagen seleccionada y reinicia OCR. */
  clearInvoiceImage(): void {
    this.ocrImagePreview.set(null);
    this.ocrDetectedFields.set(null);
    this.ocrError.set(null);
    this.selectedInvoiceFile = null;
    const fileInput = this.invoiceFileInput()?.nativeElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /** Confianza del OCR como porcentaje para mostrar en UI. */
  get ocrConfidencePercent(): number {
    const fields = this.ocrDetectedFields();
    if (!fields) {
      return 0;
    }
    return Math.round(fields.confidence * 100);
  }
}
