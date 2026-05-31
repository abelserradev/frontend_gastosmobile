import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
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
}

@Component({
  selector: 'app-item-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-form-modal.component.html',
})
export class ItemFormModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly itemToEdit = input<InventoryItem | null>(null);

  readonly onClose = output<void>();
  readonly onSave = output<CreateInventoryItemBody>();

  readonly formData = signal<ItemFormData>({
    name: '',
    sku: '',
    unit: 'pieza',
    minStock: 0,
    initialStock: 0,
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
        initialStock: 0, // no editable en update
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

    if (!data.name.trim()) {
      errs['name'] = 'El nombre es obligatorio';
    }

    if (data.minStock < 0) {
      errs['minStock'] = 'El stock mínimo no puede ser negativo';
    }

    if (data.initialStock < 0) {
      errs['initialStock'] = 'El stock inicial no puede ser negativo';
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

    this.onSave.emit(body);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
