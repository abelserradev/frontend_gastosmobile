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
import type { CategoryDraft, UserProfile } from '../../core/app-context.service';
import { todayYmdCaracas } from '../../core/caracas-date';
import type { ComparisonOptionV1 } from '../../core/payment-comparison-api.service';
import { labelOptionId } from '../../core/payment-comparison-display.util';

export interface ConvertExpensePayload {
  optionId: 'efectivo' | 'electronico' | 'bs';
  title: string;
  categoryName: string;
  profileId: string;
  paymentDate: string;
  idempotencyKey: string;
}

@Component({
  selector: 'app-convert-expense-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './convert-expense-dialog.component.html',
  styleUrl: './convert-expense-dialog.component.scss',
})
export class ConvertExpenseDialogComponent implements OnChanges {
  private readonly injector = inject(Injector);

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('convertDialog');

  readonly open = input.required<boolean>();
  readonly option = input.required<ComparisonOptionV1>();
  readonly productName = input<string | null>(null);
  readonly categories = input.required<CategoryDraft[]>();
  readonly profiles = input.required<UserProfile[]>();
  readonly submitting = input(false);

  readonly openChange = output<boolean>();
  readonly confirm = output<ConvertExpensePayload>();

  title = '';
  categoryName = '';
  profileId = '';
  paymentDate = '';
  /** GC-005: una UUID por apertura del modal; reintentos reutilizan la misma. */
  private idempotencyKey = '';

  readonly fieldError = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.idempotencyKey = globalThis.crypto.randomUUID();
      const product = this.productName()?.trim();
      this.title = product || 'Gasto comparado';
      this.categoryName = this.categories()[0]?.name ?? '';
      this.profileId = this.profiles()[0]?.id ?? '';
      this.paymentDate = todayYmdCaracas();
      this.fieldError.set(null);
    }
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
    }
  }

  optionLabel(): string {
    return labelOptionId(this.option().id);
  }

  onSubmit(): void {
    const title = this.title.trim();
    const categoryName = this.categoryName.trim();
    const profileId = this.profileId.trim();
    if (!title || !categoryName || !profileId) {
      this.fieldError.set('Completa título, categoría y perfil');
      return;
    }
    this.fieldError.set(null);
    this.confirm.emit({
      optionId: this.option().id as ConvertExpensePayload['optionId'],
      title,
      categoryName,
      profileId,
      paymentDate: this.paymentDate,
      idempotencyKey: this.idempotencyKey,
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
