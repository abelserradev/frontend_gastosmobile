import { CommonModule } from '@angular/common';
import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  InventoryItem,
  MovementType,
} from '../../core/inventory-api.service';

interface MovementFormData {
  quantity: number;
  reason: string;
}

@Component({
  selector: 'app-movement-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movement-form-modal.component.html',
})
export class MovementFormModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly item = input<InventoryItem | null>(null);

  readonly onClose = output<void>();
  readonly onSave = output<{
    itemId: string;
    type: MovementType;
    quantity: number;
    reason?: string;
  }>();

  readonly formData = signal<MovementFormData>({
    quantity: 1,
    reason: '',
  });

  readonly errors = signal<Record<string, string>>({});

  readonly movementType = computed(() => this.item()?.movementType ?? 'SALE');

  readonly modalTitle = computed(() => {
    const type = this.movementType();
    switch (type) {
      case 'SALE':
        return 'Registrar Venta';
      case 'PURCHASE':
        return 'Registrar Compra';
      case 'ADJUSTMENT':
        return 'Ajustar Stock';
      case 'RETURN':
        return 'Registrar Devolución';
      default:
        return 'Movimiento';
    }
  });

  readonly isNegativeMovement = computed(() => {
    const type = this.movementType();
    return type === 'SALE' || type === 'TRANSFER_OUT';
  });

  ngOnChanges(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.formData.set({
      quantity: 1,
      reason: '',
    });
    this.errors.set({});
  }

  close(): void {
    this.onClose.emit();
    this.resetForm();
  }

  validate(): boolean {
    const errs: Record<string, string> = {};
    const data = this.formData();
    const item = this.item();

    if (!data.quantity || data.quantity <= 0) {
      errs['quantity'] = 'La cantidad debe ser mayor a 0';
    }

    if (!Number.isInteger(data.quantity)) {
      errs['quantity'] = 'La cantidad debe ser un número entero';
    }

    // Validar stock suficiente para salidas
    if (item && this.isNegativeMovement()) {
      if (data.quantity > item.currentStock) {
        errs['quantity'] = `Stock insuficiente. Disponible: ${item.currentStock}`;
      }
    }

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  save(): void {
    if (!this.validate()) return;

    const item = this.item();
    if (!item) return;

    const data = this.formData();
    const type = this.movementType();

    this.onSave.emit({
      itemId: item.id,
      type,
      quantity: data.quantity,
      reason: data.reason.trim() || undefined,
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  incrementQuantity(): void {
    this.formData.update(d => ({ ...d, quantity: d.quantity + 1 }));
  }

  decrementQuantity(): void {
    this.formData.update(d => ({ ...d, quantity: Math.max(1, d.quantity - 1) }));
  }
}
