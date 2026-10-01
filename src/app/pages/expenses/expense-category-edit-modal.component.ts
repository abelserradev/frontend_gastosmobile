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
  SimpleChanges,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CategoryDraft } from '../../core/app-context.service';
@Component({
  selector: 'app-expense-category-edit-modal',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './expense-category-edit-modal.component.html',
  styleUrl: './expense-category-edit-modal.component.scss',
})
export class ExpenseCategoryEditModalComponent implements OnChanges, OnDestroy {
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
  /** Evita perder el id si el padre limpia el target al cerrar el dialog en el mismo tick. */
  private lockedExpenseId: string | null = null;
  fieldError: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.categoryName = this.currentCategory().trim();
      this.lockedExpenseId = this.expenseId();
      this.fieldError = null;
    }
    if (changes['open']?.currentValue === false) {
      this.lockedExpenseId = null;
      this.fieldError = null;
    }
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
    }
  }

  ngOnDestroy(): void {
    this.closeNativeDialog();
  }

  private syncDialog(): void {
    const host = this.dialog()?.nativeElement;
    if (!host) return;
    if (this.open()) {
      if (!host.open) host.showModal();
      return;
    }
    this.closeNativeDialog();
  }

  private closeNativeDialog(): void {
    const host = this.dialog()?.nativeElement;
    if (host?.open) {
      host.close();
    }
  }

  onNativeDialogClose(): void {
    this.openChange.emit(false);
  }

  handleSubmit(): void {
    const id = this.lockedExpenseId ?? this.expenseId();
    const name = this.categoryName.trim();
    if (!name) {
      this.fieldError = 'Selecciona una categoría';
      return;
    }
    const known = this.categories().some((c) => c.name === name);
    if (!known) {
      this.fieldError = 'Elige una categoría de tu lista (Ingreso mensual para crear nuevas)';
      return;
    }
    if (!id) {
      this.fieldError =
        'No se pudo identificar el gasto. Cierra el cuadro e inténtalo de nuevo.';
      return;
    }
    this.fieldError = null;
    this.saveCategory.emit({ expenseId: id, categoryName: name });
  }

  handleCancel(): void {
    this.closeNativeDialog();
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
