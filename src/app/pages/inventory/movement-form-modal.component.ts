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

/** Motivos de salida visibles al usuario; se mapean a tipos del backend. */
type ExitCategory = 'sale' | 'transfer_store' | 'transfer_warehouse';

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

  readonly exitCategory = signal<ExitCategory>('sale');
  readonly errors = signal<Record<string, string>>({});

  readonly movementType = computed(() => this.item()?.movementType ?? 'SALE');

  readonly showExitCategory = computed(
    () => this.movementType() === 'SALE' || this.movementType() === 'TRANSFER_OUT'
  );

  readonly modalTitle = computed(() => {
    const type = this.movementType();
    switch (type) {
      case 'SALE':
      case 'TRANSFER_OUT':
        return 'Registrar Salida';
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
    if (type === 'ADJUSTMENT') return false;
    return type === 'SALE' || type === 'TRANSFER_OUT';
  });

  readonly reasonPlaceholder = computed(() => {
    if (!this.isNegativeMovement()) {
      return 'Ej: Compra proveedor XYZ';
    }
    switch (this.exitCategory()) {
      case 'transfer_store':
        return 'Ej: Tienda Chacao → Centro';
      case 'transfer_warehouse':
        return 'Ej: Almacén principal';
      default:
        return 'Ej: Venta cliente #123';
    }
  });

  readonly previewLabel = computed(() =>
    this.isNegativeMovement() ? 'Stock después de la salida:' : 'Stock después de la entrada:'
  );

  ngOnChanges(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.formData.set({ quantity: 1, reason: '' });
    this.exitCategory.set('sale');
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

    if (item && this.isNegativeMovement()) {
      if (data.quantity > item.currentStock) {
        errs['quantity'] = `Stock insuficiente. Disponible: ${item.currentStock}`;
      }
    }

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  resolveMovementType(): MovementType {
    const base = this.movementType();
    if (base !== 'SALE' && base !== 'TRANSFER_OUT') {
      return base;
    }
    switch (this.exitCategory()) {
      case 'transfer_store':
      case 'transfer_warehouse':
        return 'TRANSFER_OUT';
      default:
        return 'SALE';
    }
  }

  buildReason(): string | undefined {
    const note = this.formData().reason.trim();
    if (!this.showExitCategory()) {
      return note || undefined;
    }
    switch (this.exitCategory()) {
      case 'transfer_store':
        return note ? `Traslado: ${note}` : 'Traslado a otra tienda';
      case 'transfer_warehouse':
        return note ? `Almacén: ${note}` : 'Envío a almacén';
      default:
        return note || undefined;
    }
  }

  save(): void {
    if (!this.validate()) return;

    const item = this.item();
    if (!item) return;

    const data = this.formData();

    this.onSave.emit({
      itemId: item.id,
      type: this.resolveMovementType(),
      quantity: data.quantity,
      reason: this.buildReason(),
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  incrementQuantity(): void {
    this.formData.update((d) => ({ ...d, quantity: d.quantity + 1 }));
  }

  decrementQuantity(): void {
    this.formData.update((d) => ({ ...d, quantity: Math.max(1, d.quantity - 1) }));
  }
}
