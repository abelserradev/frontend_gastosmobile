import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  OnChanges,
  OnDestroy,
  output,
  signal,
  SimpleChanges,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeApiService } from '../../core/me-api.service';

@Component({
  selector: 'app-receipt-viewer',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './receipt-viewer.component.html',
  styles: [`
    dialog.receipt-viewer-dialog::backdrop {
      background-color: color-mix(in srgb, var(--foreground) 60%, transparent);
    }
    dialog.receipt-viewer-dialog:not([open]) {
      display: none;
    }
  `],
})
export class ReceiptViewerComponent implements OnChanges, OnDestroy {
  private readonly injector = inject(Injector);
  private readonly meApi = inject(MeApiService);

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('viewerDialog');

  readonly open = input.required<boolean>();
  /** ID del gasto cuya imagen se va a mostrar. */
  readonly expenseId = input<string | null>(null);
  readonly openChange = output<boolean>();

  readonly imageUrl = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private blobUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
    }
    if (changes['open']?.currentValue === true) {
      this.loadImage();
    }
    if (changes['open']?.currentValue === false) {
      this.releaseBlob();
    }
  }

  ngOnDestroy(): void {
    this.releaseBlob();
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

  private loadImage(): void {
    const id = this.expenseId();
    if (!id) return;

    this.releaseBlob();
    this.loading.set(true);
    this.error.set(null);

    this.meApi.getExpenseReceipt(id).subscribe({
      next: (blob) => {
        this.blobUrl = URL.createObjectURL(blob);
        this.imageUrl.set(this.blobUrl);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la imagen del comprobante.');
      },
    });
  }

  private releaseBlob(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    this.imageUrl.set(null);
  }

  close(): void {
    this.openChange.emit(false);
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === this.dialog()?.nativeElement) this.close();
  }

  stopBubble(e: Event): void {
    e.stopPropagation();
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }
}
