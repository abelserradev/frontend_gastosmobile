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
import type { CategoryDraft } from '../../core/app-context.service';
import type { MeExpense } from '../../core/me-api.service';

@Component({
  selector: 'app-expense-category-edit-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './expense-category-edit-modal.component.html',
})
export class ExpenseCategoryEditModalComponent implements OnChanges {
  private readonly injector = inject(Injector);

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('categoryDialog');

  readonly open = input.required<boolean>();
  readonly categories = input.required<CategoryDraft[]>();
  readonly expenseId = input<string | null>(null);
  readonly expenseTitle = input<string>('');
  readonly currentCategory = input<string>('');

  readonly openChange = output<boolean>();
  readonly saveCategory = output<{ expenseId: string; categoryName: string }>();

  categoryName = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.categoryName = this.currentCategory().trim();
    }
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
    }
  }

  private syncDialog(): void {
    const host = this.dialog()?.nativeElement;
    if (!host) return;
    if (this.open()) {
      if (!host.open) host.showModal();
      return;
    }
    if (host.open) host.close();
  }

  handleSubmit(): void {
    const id = this.expenseId();
    const name = this.categoryName.trim();
    if (!id || !name) {
      globalThis.alert('Indica una categoría válida');
      return;
    }
    this.saveCategory.emit({ expenseId: id, categoryName: name });
    this.openChange.emit(false);
  }

  handleCancel(): void {
    this.openChange.emit(false);
  }

  onBackdropClick(event: MouseEvent): void {
    const host = this.dialog()?.nativeElement;
    if (host && event.target === host) this.handleCancel();
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleCancel();
    }
  }

  stopBubble(event: Event): void {
    event.stopPropagation();
  }
}
