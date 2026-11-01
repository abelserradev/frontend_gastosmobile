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
import {
  PaymentComparisonApiService,
  type ExpenseComparisonDetail,
} from '../../core/payment-comparison-api.service';
import { formatApiHttpError } from '../../core/http-error.util';
import { ComparisonTableComponent } from '../payment-comparison/comparison-table.component';

@Component({
  selector: 'app-expense-comparison-detail-modal',
  standalone: true,
  imports: [CommonModule, ComparisonTableComponent],
  templateUrl: './expense-comparison-detail-modal.component.html',
  styleUrl: './expense-comparison-detail-modal.component.scss',
})
export class ExpenseComparisonDetailModalComponent implements OnChanges {
  private readonly comparisonsApi = inject(PaymentComparisonApiService);
  private readonly injector = inject(Injector);

  readonly dialog =
    viewChild<ElementRef<HTMLDialogElement>>('comparisonDetailDialog');

  readonly open = input.required<boolean>();
  readonly expenseId = input<string | null>(null);
  readonly expenseTitle = input('');

  readonly openChange = output<boolean>();

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly detail = signal<ExpenseComparisonDetail | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.loadDetail();
    }
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
    }
  }

  private loadDetail(): void {
    const id = this.expenseId();
    if (!id) {
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.detail.set(null);
    this.comparisonsApi.getExpenseComparison(id).subscribe({
      next: (row) => {
        this.detail.set(row);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.loadError.set(formatApiHttpError(err));
      },
    });
  }

  onNativeClose(): void {
    this.openChange.emit(false);
  }

  private syncDialog(): void {
    const host = this.dialog()?.nativeElement;
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
}
