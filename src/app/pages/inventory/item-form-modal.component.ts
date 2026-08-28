import { CommonModule } from '@angular/common';
import { Component, input, output, signal, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  InventoryItem,
  CreateInventoryItemBody,
} from '../../core/inventory-api.service';

interface ItemFormData {
  name: string;
  sku: string;
  unit: string;
  minStock: number;
  initialStock: number;
  salePrice: string;
}

@Component({
  selector: 'app-item-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-form-modal.component.html',
})
export class ItemFormModalComponent implements OnChanges {
  readonly isOpen = input.required<boolean>();
  readonly itemToEdit = input<InventoryItem | null>(null);

  readonly closed = output<void>();
  readonly saved = output<CreateInventoryItemBody>();

  readonly formData = signal<ItemFormData>({
    name: '',
    sku: '',
    unit: 'pieza',
    minStock: 0,
    initialStock: 0,
    salePrice: '',
  });

  readonly errors = signal<Record<string, string>>({});

  ngOnChanges(): void {
    const editing = this.itemToEdit();
    if (editing) {
      this.formData.set({
        name: editing.name,
        sku: editing.sku ?? '',
        unit: editing.unit,
        minStock: editing.minStock,
        initialStock: 0,
        salePrice: String(editing.salePrice ?? ''),
      });
    } else {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.formData.set({
      name: '',
      sku: '',
      unit: 'pieza',
      minStock: 0,
      initialStock: 0,
      salePrice: '',
    });
    this.errors.set({});
  }

  close(): void {
    this.closed.emit();
    this.resetForm();
  }

  validate(): boolean {
    const errs: Record<string, string> = {};
    const data = this.formData();

    if (!data.name.trim()) {
      errs['name'] = 'El nombre es obligatorio';
    }

    if (data.minStock < 0) {
      errs['minStock'] = 'El stock mínimo no puede ser negativo';
    }

    if (data.initialStock < 0) {
      errs['initialStock'] = 'El stock inicial no puede ser negativo';
    }

    const saleRaw = data.salePrice.trim();
    if (saleRaw !== '') {
      const parsed = Number(saleRaw);
      if (Number.isNaN(parsed) || parsed < 0) {
        errs['salePrice'] = 'El precio debe ser un número ≥ 0';
      }
    }

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  save(): void {
    if (!this.validate()) return;

    const data = this.formData();
    const editing = this.itemToEdit();

    const body: CreateInventoryItemBody = {
      name: data.name.trim(),
      sku: data.sku.trim() || undefined,
      unit: data.unit,
      minStock: data.minStock,
    };

    // Solo enviar initialStock al crear
    if (!editing && data.initialStock > 0) {
      body.initialStock = data.initialStock;
    }

    const saleRaw = data.salePrice.trim();
    if (saleRaw !== '') {
      body.salePrice = Number(saleRaw);
    } else if (editing) {
      body.salePrice = null;
    }

    this.saved.emit(body);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
