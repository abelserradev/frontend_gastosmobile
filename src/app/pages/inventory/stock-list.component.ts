import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { InventoryItem, MovementType } from '../../core/inventory-api.service';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-list.component.html',
})
export class StockListComponent {
  // Inputs
  readonly items = input.required<InventoryItem[]>();
  readonly loading = input<boolean>(false);

  // Outputs
  readonly onEdit = output<InventoryItem>();
  readonly onDelete = output<InventoryItem>();
  readonly onSale = output<InventoryItem>();
  readonly onPurchase = output<InventoryItem>();
  readonly onAdjust = output<InventoryItem>();
  readonly onHistory = output<InventoryItem>();

  // Estados de UI por item (para menú de acciones)
  expandedItemId: string | null = null;

  toggleActions(itemId: string): void {
    this.expandedItemId = this.expandedItemId === itemId ? null : itemId;
  }

  editItem(item: InventoryItem, event: Event): void {
    event.stopPropagation();
    this.onEdit.emit(item);
  }

  deleteItem(item: InventoryItem, event: Event): void {
    event.stopPropagation();
    this.onDelete.emit(item);
  }

  registerSale(item: InventoryItem, event: Event): void {
    event.stopPropagation();
    this.onSale.emit(item);
    this.expandedItemId = null;
  }

  registerPurchase(item: InventoryItem, event: Event): void {
    event.stopPropagation();
    this.onPurchase.emit(item);
    this.expandedItemId = null;
  }

  adjustStock(item: InventoryItem, event: Event): void {
    event.stopPropagation();
    this.onAdjust.emit(item);
    this.expandedItemId = null;
  }

  viewHistory(item: InventoryItem, event: Event): void {
    event.stopPropagation();
    this.onHistory.emit(item);
    this.expandedItemId = null;
  }

  getStockClass(item: InventoryItem): string {
    if (item.currentStock === 0) return 'stock-empty';
    if (item.isLowStock) return 'stock-low';
    return 'stock-ok';
  }

  getUnitLabel(item: InventoryItem): string {
    // Singular/plural simple
    if (item.unit === 'pieza') {
      return item.currentStock === 1 ? 'pieza' : 'piezas';
    }
    return item.unit;
  }
}
