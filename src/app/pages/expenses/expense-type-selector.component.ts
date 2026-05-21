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
  ViewEncapsulation,
} from '@angular/core';

export type ExpenseCreationMode = 'manual' | 'invoice' | 'payment';

@Component({
  selector: 'app-expense-type-selector',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './expense-type-selector.component.html',
  styles: [`
    dialog.type-selector-dialog::backdrop {
      background-color: color-mix(in srgb, var(--foreground) 45%, transparent);
    }
    dialog.type-selector-dialog:not([open]) {
      display: none;
    }
  `],
})
export class ExpenseTypeSelectorComponent implements OnChanges {
  private readonly injector = inject(Injector);
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('selectorDialog');

  readonly open = input.required<boolean>();
  readonly openChange = output<boolean>();
  readonly modeSelected = output<ExpenseCreationMode>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      afterNextRender(() => this.syncDialog(), { injector: this.injector });
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

  select(mode: ExpenseCreationMode): void {
    this.modeSelected.emit(mode);
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
}
