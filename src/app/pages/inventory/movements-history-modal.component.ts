import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import {
  InventoryApiService,
  type InventoryItem,
  type StockMovement,
} from '../../core/inventory-api.service';
import { formatApiHttpError } from '../../core/http-error.util';
import {
  getMovementTypeBadgeClass,
  getMovementTypeLabel,
} from './inventory-movement.util';

@Component({
  selector: 'app-movements-history-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './movements-history-modal.component.html',
})
export class MovementsHistoryModalComponent {
  private readonly api = inject(InventoryApiService);

  readonly isOpen = input.required<boolean>();
  readonly profileId = input<string | null>(null);
  readonly item = input<InventoryItem | null>(null);

  readonly onClose = output<void>();

  readonly movements = signal<StockMovement[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly getMovementTypeLabel = getMovementTypeLabel;
  readonly getMovementTypeBadgeClass = getMovementTypeBadgeClass;

  constructor() {
    effect(() => {
      if (this.isOpen() && this.profileId() && this.item()) {
        this.loadMovements();
      }
    });
  }

  loadMovements(): void {
    const pid = this.profileId();
    const it = this.item();
    if (!pid || !it) return;

    this.loading.set(true);
    this.error.set(null);

    this.api.listMovements(pid, it.id).subscribe({
      next: (list) => {
        this.movements.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(formatApiHttpError(err));
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.onClose.emit();
    this.movements.set([]);
    this.error.set(null);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  movementDetail(m: StockMovement): string | null {
    const parts: string[] = [];
    if (m.reason) parts.push(m.reason);
    if (m.targetBranchName) parts.push(`→ ${m.targetBranchName}`);
    else if (m.branchName) parts.push(m.branchName);
    return parts.length ? parts.join(' · ') : null;
  }
}
