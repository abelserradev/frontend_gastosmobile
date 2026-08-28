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
  SimpleChanges,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CurrencyCode } from '../../core/app-context.service';
import { todayYmdCaracas } from '../../core/caracas-date';
import { MeApiService } from '../../core/me-api.service';

@Component({
  selector: 'app-income-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './income-modal.component.html',
  styleUrl: './expense-modal.component.scss',
})
export class IncomeModalComponent implements OnChanges {
  private readonly meApi = inject(MeApiService);
  private readonly injector = inject(Injector);

  readonly incomeDialog =
    viewChild<ElementRef<HTMLDialogElement>>('incomeDialog');

  readonly open = input.required<boolean>();
  readonly sources = input.required<{ id: string; name: string }[]>();
  readonly defaultCurrency = input<CurrencyCode>('USD');

  readonly openChange = output<boolean>();
  readonly addIncome = output<{
    title: string;
    description: string;
    amount: number;
    source: string;
    receivedDate?: string;
  }>();

  title = '';
  description = '';
  source = '';
  amountUsd = '';
  amountBs = '';
  receivedDate = '';
  usdPreview: number | null = null;
  previewLoading = false;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.reset();
      this.receivedDate = todayYmdCaracas();
    }
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
    }
  }

  private syncDialog(): void {
    const host = this.incomeDialog()?.nativeElement;
    if (!host) return;
    if (this.open()) {
      if (!host.open) host.showModal();
      return;
    }
    if (host.open) host.close();
  }

  receivedDateMaxYmd(): string {
    return todayYmdCaracas();
  }

  scheduleBsPreview(): void {
    if (this.defaultCurrency() !== 'BS') return;
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.refreshUsdPreview(), 350);
  }

  private refreshUsdPreview(): void {
    this.previewTimer = null;
    const date = String(this.receivedDate ?? '').trim() || todayYmdCaracas();
    const bs = Number.parseFloat(String(this.amountBs ?? '').trim());
    if (Number.isNaN(bs) || bs <= 0) {
      this.usdPreview = null;
      this.previewLoading = false;
      return;
    }
    this.previewLoading = true;
    this.meApi.getBcvOfficialRateResilient(date).subscribe({
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
    if (!this.title.trim() || !this.source) {
      globalThis.alert('Completa título y fuente');
      return;
    }

    const emit = (amount: number, date?: string) => {
      this.addIncome.emit({
        title: this.title.trim(),
        description: this.description.trim(),
        amount,
        source: this.source,
        receivedDate: date,
      });
      this.reset();
      this.openChange.emit(false);
    };

    if (this.defaultCurrency() === 'USD') {
      const n = Number.parseFloat(this.amountUsd);
      if (Number.isNaN(n) || n < 0) {
        globalThis.alert('Monto en USD no válido');
        return;
      }
      emit(n, String(this.receivedDate ?? '').trim() || undefined);
      return;
    }

    const date = String(this.receivedDate ?? '').trim() || todayYmdCaracas();
    const bs = Number.parseFloat(String(this.amountBs ?? '').trim());
    if (Number.isNaN(bs) || bs < 0) {
      globalThis.alert('Monto en Bs. no válido');
      return;
    }

    this.meApi.getBcvOfficialRateResilient(date).subscribe({
      next: (r) => emit(bs / r.vesPerUsd, date),
      error: () =>
        globalThis.alert('No se pudo obtener la tasa BCV para esa fecha.'),
    });
  }

  handleCancel(): void {
    this.reset();
    this.openChange.emit(false);
  }

  onBackdropClick(event: MouseEvent): void {
    const host = this.incomeDialog()?.nativeElement;
    if (host && event.target === host) this.handleCancel();
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.handleCancel();
  }

  onIncomePanelKeydown(_event: KeyboardEvent): void {
    // Escape lo gestiona el <dialog>; handler para paridad de accesibilidad.
  }

  private reset(): void {
    this.title = '';
    this.description = '';
    this.source = '';
    this.amountUsd = '';
    this.amountBs = '';
    this.receivedDate = '';
    this.usdPreview = null;
    this.previewLoading = false;
  }
}
