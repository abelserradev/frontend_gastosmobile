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
import { OcrApiService, type ParseInvoiceResult } from '../../core/ocr-api.service';

export type ImageUploadMode = 'invoice' | 'payment';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

const MODE_LABELS: Record<ImageUploadMode, { title: string; hint: string; action: string }> = {
  invoice: {
    title: 'Cargar factura',
    hint: 'Sube la foto de tu factura o ticket de compra.',
    action: 'Analizar factura',
  },
  payment: {
    title: 'Comprobante de pago',
    hint: 'Sube la captura de tu pago móvil o transferencia.',
    action: 'Analizar comprobante',
  },
};

@Component({
  selector: 'app-image-upload-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
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

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('uploadDialog');
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly open = input.required<boolean>();
  readonly mode = input.required<ImageUploadMode>();
  readonly openChange = output<boolean>();
  /** Emitido cuando el OCR termina; el caller abre el form con los datos pre-rellenados. */
  readonly ocrDone = output<ParseInvoiceResult>();

  readonly preview = signal<string | null>(null);
  readonly processing = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<ParseInvoiceResult | null>(null);

  private selectedFile: File | null = null;

  get labels() {
    return MODE_LABELS[this.mode()];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
    }
    if (changes['open']?.currentValue === true) {
      this.resetState();
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

  private resetState(): void {
    this.preview.set(null);
    this.processing.set(false);
    this.error.set(null);
    this.result.set(null);
    this.selectedFile = null;
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

    // Validación de tipo real por MIME (el navegador lo toma del archivo, no solo extensión)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      this.error.set('Formato no permitido. Usa JPG, PNG o WebP.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      this.error.set(
        `La imagen supera el límite de 1 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
      );
      return;
    }

    this.error.set(null);
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.preview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.preview.set(null);
    this.result.set(null);
    this.error.set(null);
    this.selectedFile = null;
    const fi = this.fileInput()?.nativeElement;
    if (fi) fi.value = '';
  }

  analyze(): void {
    if (!this.selectedFile || this.processing()) return;
    this.processing.set(true);
    this.error.set(null);
    this.result.set(null);

    this.ocrApi.parseInvoice(this.selectedFile).subscribe({
      next: (r) => {
        this.processing.set(false);
        this.result.set(r);
      },
      error: () => {
        this.processing.set(false);
        this.error.set('No se pudo analizar la imagen. Intenta con una foto más nítida.');
      },
    });
  }

  continueWithResult(): void {
    const r = this.result();
    if (r) this.ocrDone.emit(r);
    this.openChange.emit(false);
  }

  skipOcr(): void {
    // Pasa resultado vacío para que el form abra sin prefill
    this.ocrDone.emit({ rawText: '', confidence: 0, currency: 'USD' });
    this.openChange.emit(false);
  }

  cancel(): void {
    this.openChange.emit(false);
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === this.dialog()?.nativeElement) this.cancel();
  }

  stopBubble(e: Event): void {
    e.stopPropagation();
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    }
  }

  get confidencePercent(): number {
    return Math.round((this.result()?.confidence ?? 0) * 100);
  }
}
