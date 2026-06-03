import { CommonModule } from '@angular/common';
import { Component, input, output, signal, computed, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  InventoryItem,
  InventoryBranch,
  MovementType,
} from '../../core/inventory-api.service';

interface MovementFormData {
  quantity: number;
  reason: string;
  /** ngModel con type="number" puede devolver number en runtime. */
  unitPrice: string | number;
}

/** Motivos de salida visibles al usuario; se mapean a tipos del backend. */
type ExitCategory = 'sale' | 'transfer_store' | 'transfer_warehouse';

@Component({
  selector: 'app-movement-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movement-form-modal.component.html',
})
export class MovementFormModalComponent implements OnChanges {
  readonly isOpen = input.required<boolean>();
  readonly item = input<InventoryItem | null>(null);
  readonly branches = input<InventoryBranch[]>([]);

  readonly onClose = output<void>();
  readonly onSave = output<{
    itemId: string;
    type: MovementType;
    quantity: number;
    reason?: string;
    sourceBranchId?: string;
    targetBranchId?: string;
    unitPrice?: number;
  }>();

  readonly formData = signal<MovementFormData>({
    quantity: 1,
    reason: '',
    unitPrice: '',
  });

  readonly exitCategory = signal<ExitCategory>('sale');
  readonly sourceBranchId = signal<string>('');
  readonly targetBranchId = signal<string>('');
  readonly errors = signal<Record<string, string>>({});

  readonly movementType = computed(() => this.item()?.movementType ?? 'SALE');

  readonly isTransferExit = computed(
    () =>
      this.exitCategory() === 'transfer_store' ||
      this.exitCategory() === 'transfer_warehouse',
  );

  readonly canTransferBetweenBranches = computed(
    () => this.branches().length >= 2 && this.isTransferExit(),
  );

  readonly showExitCategory = computed(
    () => this.movementType() === 'SALE' || this.movementType() === 'TRANSFER_OUT',
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

  readonly showUnitPriceField = computed(() => {
    if (this.isTransferExit()) return false;
    const type = this.resolveMovementTypeForUi();
    return type === 'SALE' || type === 'PURCHASE';
  });

  readonly unitPriceHint = computed(() => {
    const it = this.item();
    if (it?.salePrice != null && this.resolveMovementTypeForUi() === 'SALE') {
      return `Catálogo: ${it.salePrice.toFixed(2)} USD`;
    }
    return 'Opcional — deja vacío si no controlas valor';
  });

  private resolveMovementTypeForUi(): MovementType {
    const base = this.movementType();
    if (base !== 'SALE' && base !== 'TRANSFER_OUT') return base;
    return this.exitCategory() === 'sale' ? 'SALE' : 'TRANSFER_OUT';
  }

  readonly previewLabel = computed(() =>
    this.isNegativeMovement() ? 'Stock después de la salida:' : 'Stock después de la entrada:',
  );

  ngOnChanges(): void {
    this.resetForm();
  }

  resetForm(): void {
    const it = this.item();
    const suggested =
      it?.salePrice != null && this.movementType() === 'SALE'
        ? String(it.salePrice)
        : '';
    this.formData.set({ quantity: 1, reason: '', unitPrice: suggested });
    this.exitCategory.set('sale');
    this.sourceBranchId.set('');
    this.targetBranchId.set('');
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

    if (this.canTransferBetweenBranches()) {
      if (!this.sourceBranchId()) {
        errs['sourceBranchId'] = 'Selecciona la sucursal origen';
      }
      if (!this.targetBranchId()) {
        errs['targetBranchId'] = 'Selecciona la sucursal destino';
      }
      if (
        this.sourceBranchId() &&
        this.targetBranchId() &&
        this.sourceBranchId() === this.targetBranchId()
      ) {
        errs['targetBranchId'] = 'Origen y destino deben ser distintos';
      }
    }

    if (this.showUnitPriceField()) {
      const raw = this.asPriceText(data.unitPrice);
      if (raw !== '') {
        const parsed = Number(raw);
        if (Number.isNaN(parsed) || parsed < 0) {
          errs['unitPrice'] = 'El precio debe ser un número ≥ 0';
        }
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

    const payload: {
      itemId: string;
      type: MovementType;
      quantity: number;
      reason?: string;
      sourceBranchId?: string;
      targetBranchId?: string;
      unitPrice?: number;
    } = {
      itemId: item.id,
      type: this.resolveMovementType(),
      quantity: data.quantity,
      reason: this.buildReason(),
    };

    if (this.canTransferBetweenBranches()) {
      payload.sourceBranchId = this.sourceBranchId();
      payload.targetBranchId = this.targetBranchId();
    }

    if (this.showUnitPriceField()) {
      const raw = this.asPriceText(data.unitPrice);
      if (raw !== '') {
        payload.unitPrice = Number(raw);
      }
    }

    this.onSave.emit(payload);
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

  /** type="number" en el template no garantiza string — evita .trim() directo. */
  private asPriceText(value: string | number | null | undefined): string {
    if (value == null || value === '') {
      return '';
    }
    return String(value).trim();
  }
}
