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
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { CategoryDraft, CurrencyCode } from '../../core/app-context.service';
import { todayYmdCaracas } from '../../core/caracas-date';
import { guessOcrDocumentKind } from '../../core/ocr-document-kind.util';
import { MeApiService, type MeExpense } from '../../core/me-api.service';
import { OcrApiService, type ParseInvoiceResult } from '../../core/ocr-api.service';
import { formatApiHttpError } from '../../core/http-error.util';

export type ImageUploadMode = 'invoice' | 'payment';

const ALLOWED_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — seguridad contra payloads grandes

const STEP_UPLOAD = 'upload';
const STEP_CONFIRM = 'confirm';
const STEP_SAVING = 'saving';
type Step = typeof STEP_UPLOAD | typeof STEP_CONFIRM | typeof STEP_SAVING;

@Component({
  selector: 'app-image-upload-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-upload-modal.component.html',
  styles: [`
    dialog.image-upload-dialog::backdrop {
      background-color: color-mix(in srgb, var(--foreground) 45%, transparent);
    }
    dialog.image-upload-dialog:not([open]) {
      display: none;
    }
  `],
})
export class ImageUploadModalComponent implements OnChanges {
  private readonly injector = inject(Injector);
  private readonly ocrApi = inject(OcrApiService);
  private readonly meApi = inject(MeApiService);

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('uploadDialog');
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly open = input.required<boolean>();
  readonly mode = input.required<ImageUploadMode>();
  readonly categories = input.required<CategoryDraft[]>();
  readonly defaultCurrency = input<CurrencyCode>('USD');

  readonly openChange = output<boolean>();
  /** Emitido al guardar con éxito para que el padre actualice la lista. */
  readonly expenseSaved = output<MeExpense>();
  /**
   * Emitido cuando el usuario elige "Ingresar detalles" (flujo completo).
   * El padre abre ExpenseModalComponent con los datos OCR como prefill.
   */
  readonly switchToForm = output<ParseInvoiceResult | null>();

  readonly step = signal<Step>(STEP_UPLOAD);
  readonly preview = signal<string | null>(null);
  readonly ocrProcessing = signal(false);
  readonly ocrResult = signal<ParseInvoiceResult | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);

  // Campos del formulario simplificado
  confirmCategory = '';
  confirmDate = '';
  confirmAmountStr = '';
  confirmCurrency: CurrencyCode = 'USD';

  private selectedFile: File | null = null;

  get modeLabel(): string {
    return this.mode() === 'invoice' ? 'factura' : 'comprobante de pago';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
    }
    if (changes['open']?.currentValue === true) {
      this.resetAll();
    }
  }

  private syncDialog(): void {
    const el = this.dialog()?.nativeElement;
    if (!el) return;
    if (this.open()) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }

  private resetAll(): void {
    this.step.set(STEP_UPLOAD);
    this.preview.set(null);
    this.ocrProcessing.set(false);
    this.ocrResult.set(null);
    this.uploadError.set(null);
    this.saveError.set(null);
    this.selectedFile = null;
    this.confirmCategory = '';
    this.confirmDate = todayYmdCaracas();
    this.confirmAmountStr = '';
    this.confirmCurrency = this.defaultCurrency();
    const fi = this.fileInput()?.nativeElement;
    if (fi) fi.value = '';
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      this.uploadError.set('Formato no permitido. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      this.uploadError.set(
        `La imagen supera el límite de 5 MB (${(file.size / 1024 / 1024).toFixed(2)} MB). Comprime la imagen e inténtalo de nuevo.`,
      );
      return;
    }

    this.uploadError.set(null);
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.preview.set(reader.result as string);
      this.runOcr();
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.preview.set(null);
    this.ocrResult.set(null);
    this.uploadError.set(null);
    this.selectedFile = null;
    this.step.set(STEP_UPLOAD);
    const fi = this.fileInput()?.nativeElement;
    if (fi) fi.value = '';
  }

  private runOcr(): void {
    if (!this.selectedFile) return;
    this.ocrProcessing.set(true);

    this.ocrApi.parseInvoice(this.selectedFile).subscribe({
      next: (r) => {
        this.ocrProcessing.set(false);
        this.ocrResult.set(r);
        this.prefillFromOcr(r);
        this.step.set(STEP_CONFIRM);
      },
      error: () => {
        // OCR falló — igual pasa al formulario simplificado sin prefill
        this.ocrProcessing.set(false);
        this.step.set(STEP_CONFIRM);
      },
    });
  }

  private prefillFromOcr(r: ParseInvoiceResult): void {
    this.confirmDate = r.date ?? todayYmdCaracas();
    this.confirmCurrency = (r.currency as CurrencyCode) ?? this.defaultCurrency();

    if (r.amount != null && r.amount > 0) {
      this.confirmAmountStr = String(r.amount);
    }

    if (r.merchant) {
      const ml = r.merchant.toLowerCase();
      const match = this.categories().find((c) =>
        ml.includes(c.name.toLowerCase()),
      );
      if (match) this.confirmCategory = match.name;
    }
  }

  todayMax(): string {
    return todayYmdCaracas();
  }

  get ocrConfidencePercent(): number {
    return Math.round((this.ocrResult()?.confidence ?? 0) * 100);
  }

  /** Guarda directamente el gasto con la imagen adjunta. */
  saveExpense(): void {
    if (!this.selectedFile) return;

    const amount = Number.parseFloat(this.confirmAmountStr);
    if (Number.isNaN(amount) || amount < 0) {
      this.saveError.set('El monto no es válido');
      return;
    }
    if (!this.confirmCategory) {
      this.saveError.set('Selecciona una categoría');
      return;
    }
    if (!this.confirmDate) {
      this.saveError.set('Selecciona la fecha del gasto');
      return;
    }

    this.saveError.set(null);
    this.step.set(STEP_SAVING);

    // UX: nombre del gasto = categoría elegida (no OCR de beneficiario / ruido bancario)
    const title = this.confirmCategory.trim();

    this.meApi.createExpenseWithReceipt({
      file: this.selectedFile,
      amount,
      amountCurrency: this.confirmCurrency,
      categoryName: this.confirmCategory,
      paymentDate: this.confirmDate,
      title,
    }).subscribe({
      next: (expense) => {
        const ocr = this.ocrResult();
        const rt = (ocr?.rawText ?? '').trim();
        if (ocr && rt.length >= 8) {
          const guess = guessOcrDocumentKind(this.mode(), rt);
          this.meApi
            .submitOcrFeedback({
              source: 'IMAGE_UPLOAD_FLOW',
              submissionVariant: 'quick_confirm',
              documentKindGuess: guess,
              parseSnapshot: {
                ...ocr,
                rawText: rt.slice(0, 7900),
              },
              corrected: {
                title: expense.title,
                description: expense.description?.trim() ?? '',
                amountUsd: expense.amount,
                ...(expense.paymentDate
                  ? { paymentDate: expense.paymentDate.slice(0, 10) }
                  : {}),
                currencyCapture:
                  this.confirmCurrency === 'BS' ? 'BS' : 'USD',
                categoryName: this.confirmCategory,
              },
              expenseId: expense.id,
            })
            .subscribe({ error: () => {} });
        }
        this.expenseSaved.emit(expense);
        this.openChange.emit(false);
      },
      error: (err: unknown) => {
        this.step.set(STEP_CONFIRM);
        this.saveError.set(formatApiHttpError(err));
      },
    });
  }

  /** El usuario prefiere el formulario completo con todos los campos. */
  openFullForm(): void {
    this.switchToForm.emit(this.ocrResult());
    this.openChange.emit(false);
  }

  cancel(): void {
    this.openChange.emit(false);
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === this.dialog()?.nativeElement) this.cancel();
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    }
  }

  // Exponer constantes de paso al template
  readonly STEP_UPLOAD = STEP_UPLOAD;
  readonly STEP_CONFIRM = STEP_CONFIRM;
  readonly STEP_SAVING = STEP_SAVING;
}
