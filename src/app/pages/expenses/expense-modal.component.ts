import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  input,
  OnChanges,
  output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CategoryDraft, CurrencyCode } from '../../core/app-context.service';
import { todayYmdCaracas } from '../../core/caracas-date';
import { MeApiService } from '../../core/me-api.service';

@Component({
  selector: 'app-expense-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-modal.component.html',
  styleUrl: './expense-modal.component.scss',
})
export class ExpenseModalComponent implements OnChanges {
  private readonly meApi = inject(MeApiService);

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.reset();
      this.paymentDate = todayYmdCaracas();
    }
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

  private refreshUsdPreview(): void {
    this.previewTimer = null;
    const date = this.paymentDate.trim() || todayYmdCaracas();
    const bs = Number.parseFloat(this.amountBs);
    if (this.amountBs.trim() === '' || Number.isNaN(bs) || bs <= 0) {
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
      window.alert('Por favor completa título y categoría');
      return;
    }
    const cur = this.defaultCurrency();
    if (cur === 'USD') {
      const n = Number.parseFloat(this.amountUsd);
      if (Number.isNaN(n) || n < 0) {
        window.alert('Monto en USD no válido');
        return;
      }
      const pay = this.paymentDate.trim() || undefined;
      this.emitAndClose({
        title: this.title.trim(),
        description: this.description.trim(),
        amount: n,
        category: this.category,
        paymentDate: pay,
      });
      return;
    }
    const date = this.paymentDate.trim() || todayYmdCaracas();
    const bs = Number.parseFloat(this.amountBs);
    if (Number.isNaN(bs) || bs < 0) {
      window.alert('Monto en Bs. no válido');
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
        window.alert('No se pudo obtener la tasa BCV para esa fecha.');
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

  onBackdropClick(): void {
    this.handleCancel();
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
  }
}
