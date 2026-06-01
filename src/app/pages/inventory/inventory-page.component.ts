import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AppContextService } from '../../core/app-context.service';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import {
  InventoryApiService,
  type InventoryItem,
  type InventorySummary,
  type MovementType,
  type CreateInventoryItemBody,
} from '../../core/inventory-api.service';
import { StockListComponent } from './stock-list.component';
import { ItemFormModalComponent } from './item-form-modal.component';
import { MovementFormModalComponent } from './movement-form-modal.component';

type ViewMode = 'all' | 'low-stock' | 'movements';

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StockListComponent,
    ItemFormModalComponent,
    MovementFormModalComponent,
  ],
  templateUrl: './inventory-page.component.html',
})
export class InventoryPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly appContext = inject(AppContextService);
  private readonly api = inject(InventoryApiService);
  private readonly auth = inject(AuthService);

  // Signals de estado
  readonly profileId = signal<string | null>(null);
  readonly profileName = signal<string>('');
  readonly items = signal<InventoryItem[]>([]);
  readonly summary = signal<InventorySummary | null>(null);
  readonly searchQuery = signal<string>('');
  readonly viewMode = signal<ViewMode>('all');
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Modales
  readonly itemModalOpen = signal<boolean>(false);
  readonly itemToEdit = signal<InventoryItem | null>(null);
  readonly movementModalOpen = signal<boolean>(false);
  readonly itemForMovement = signal<InventoryItem | null>(null);

  // Computed
  readonly filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly lowStockItems = computed(() =>
    this.items().filter((i) => i.isLowStock)
  );

  readonly selectedItem = signal<InventoryItem | null>(null);
  readonly itemMovementsOpen = signal<boolean>(false);

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }

    // Obtener profileId de query params
    const pid = this.route.snapshot.queryParamMap.get('profileId');
    if (!pid) {
      // Si no hay profileId, ir a selección de perfiles
      void this.router.navigate(['/profiles']);
      return;
    }

    this.profileId.set(pid);

    // Buscar nombre del perfil en contexto
    const profiles = this.appContext.profiles();
    const profile = profiles.find((p) => p.id === pid);
    if (profile) {
      this.profileName.set(profile.name);
    }

    this.loadData();
  }

  loadData(): void {
    const pid = this.profileId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set(null);

    // Cargar items y summary en paralelo
    Promise.all([
      new Promise<void>((resolve) => {
        this.api.listItems(pid, this.searchQuery() || undefined).subscribe({
          next: (list) => {
            this.items.set(list);
            resolve();
          },
          error: (err: unknown) => {
            this.error.set(formatApiHttpError(err));
            resolve();
          },
        });
      }),
      new Promise<void>((resolve) => {
        this.api.getSummary(pid).subscribe({
          next: (s) => {
            this.summary.set(s);
            resolve();
          },
          error: () => resolve(), // no bloquear si summary falla
        });
      }),
    ]).finally(() => {
      this.loading.set(false);
    });
  }

  onSearch(): void {
    // Debounce simple: recargar con búsqueda
    this.loadData();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'low-stock') {
      this.loadLowStock();
    }
  }

  loadLowStock(): void {
    const pid = this.profileId();
    if (!pid) return;

    this.loading.set(true);
    this.api.listLowStock(pid).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(formatApiHttpError(err));
        this.loading.set(false);
      },
    });
  }

  openNewItemModal(): void {
    this.itemToEdit.set(null);
    this.itemModalOpen.set(true);
  }

  openEditItemModal(item: InventoryItem): void {
    this.itemToEdit.set(item);
    this.itemModalOpen.set(true);
  }

  closeItemModal(): void {
    this.itemModalOpen.set(false);
    this.itemToEdit.set(null);
  }

  handleItemSave(body: CreateInventoryItemBody): void {
    const pid = this.profileId();
    if (!pid) return;

    const editing = this.itemToEdit();

    if (editing) {
      // Update
      this.api.updateItem(pid, editing.id, body).subscribe({
        next: () => {
          this.closeItemModal();
          this.loadData();
        },
        error: (err: unknown) => {
          globalThis.alert(formatApiHttpError(err));
        },
      });
    } else {
      // Create
      this.api.createItem(pid, body).subscribe({
        next: () => {
          this.closeItemModal();
          this.loadData();
        },
        error: (err: unknown) => {
          globalThis.alert(formatApiHttpError(err));
        },
      });
    }
  }

  handleItemDelete(item: InventoryItem): void {
    if (!globalThis.confirm(`¿Eliminar "${item.name}"?\n\nSolo se puede eliminar si no tiene movimientos ni stock.`)) {
      return;
    }

    const pid = this.profileId();
    if (!pid) return;

    this.api.deleteItem(pid, item.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  openMovementModal(item: InventoryItem, type: MovementType): void {
    this.itemForMovement.set({ ...item, movementType: type });
    this.movementModalOpen.set(true);
  }

  closeMovementModal(): void {
    this.movementModalOpen.set(false);
    this.itemForMovement.set(null);
  }

  handleMovementSave(data: {
    itemId: string;
    type: MovementType;
    quantity: number;
    reason?: string;
  }): void {
    const pid = this.profileId();
    if (!pid) return;

    this.api.createMovement(pid, data).subscribe({
      next: () => {
        this.closeMovementModal();
        this.loadData();
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  openMovementsHistory(item: InventoryItem): void {
    this.selectedItem.set(item);
    this.itemMovementsOpen.set(true);
  }

  closeMovementsHistory(): void {
    this.itemMovementsOpen.set(false);
    this.selectedItem.set(null);
  }

  handleLogout(): void {
    this.auth.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/expenses']);
  }
}

// Extender interface temporal para pasar tipo al modal
declare module '../../core/inventory-api.service' {
  interface InventoryItem {
    movementType?: MovementType;
  }
}
