import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Tipos de movimiento de inventario (FEAT-002).
 */
export type MovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'INITIAL'
  | 'RETURN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN';

/**
 * Producto en inventario.
 */
export interface InventoryItem {
  id: string;
  profileId: string;
  name: string;
  sku: string | null;
  unit: string;
  minStock: number;
  currentStock: number;
  isLowStock: boolean;
  salePrice: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Movimiento de stock.
 */
export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  quantity: number;
  displayQuantity: string;
  reason: string | null;
  branchId: string | null;
  branchName: string | null;
  targetBranchId: string | null;
  targetBranchName: string | null;
  unitPrice: number | null;
  lineValue: number | null;
  createdAt: string;
}

/**
 * DTO para crear producto.
 */
export interface CreateInventoryItemBody {
  name: string;
  sku?: string;
  unit?: string;
  minStock?: number;
  initialStock?: number;
  salePrice?: number | null;
}

/**
 * DTO para actualizar producto.
 */
export interface UpdateInventoryItemBody {
  name?: string;
  sku?: string;
  unit?: string;
  minStock?: number;
  salePrice?: number | null;
}

/**
 * DTO para crear movimiento.
 */
export interface CreateStockMovementBody {
  itemId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  branchId?: string;
  targetBranchId?: string;
  unitPrice?: number;
}

/**
 * DTO para ajuste de stock.
 */
export interface AdjustStockBody {
  itemId: string;
  adjustmentQty: number;
  reason: string;
}

/**
 * Resumen de inventario.
 */
export interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  totalStockValue: number;
  lastMovementAt: string | null;
}

export interface InventoryBranch {
  id: string;
  profileId: string;
  name: string;
  address: string | null;
  managerName: string | null;
  createdAt: string;
}

export interface CreateBranchBody {
  name: string;
  address?: string;
  managerName?: string;
}

export interface TransferStockBody {
  itemId: string;
  sourceBranchId: string;
  targetBranchId: string;
  quantity: number;
  reason?: string;
}

/**
 * Servicio de API para operaciones de inventario (FEAT-002).
 *
 * Endpoints bajo: /me/profiles/:profileId/inventory
 */
@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ========== RESUMEN ==========

  getSummary(profileId: string): Observable<InventorySummary> {
    return this.http.get<InventorySummary>(
      `${this.base}/me/profiles/${profileId}/inventory/summary`
    );
  }

  // ========== PRODUCTOS ==========

  listItems(profileId: string, search?: string): Observable<InventoryItem[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.http.get<InventoryItem[]>(
      `${this.base}/me/profiles/${profileId}/inventory/items${q}`
    );
  }

  listLowStock(profileId: string): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(
      `${this.base}/me/profiles/${profileId}/inventory/items/low-stock`
    );
  }

  getItem(profileId: string, itemId: string): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(
      `${this.base}/me/profiles/${profileId}/inventory/items/${itemId}`
    );
  }

  createItem(
    profileId: string,
    body: CreateInventoryItemBody
  ): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(
      `${this.base}/me/profiles/${profileId}/inventory/items`,
      body
    );
  }

  updateItem(
    profileId: string,
    itemId: string,
    body: UpdateInventoryItemBody
  ): Observable<InventoryItem> {
    return this.http.patch<InventoryItem>(
      `${this.base}/me/profiles/${profileId}/inventory/items/${itemId}`,
      body
    );
  }

  deleteItem(profileId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/me/profiles/${profileId}/inventory/items/${itemId}`
    );
  }

  // ========== MOVIMIENTOS ==========

  listMovements(
    profileId: string,
    itemId: string,
    branchId?: string
  ): Observable<StockMovement[]> {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return this.http.get<StockMovement[]>(
      `${this.base}/me/profiles/${profileId}/inventory/items/${itemId}/movements${q}`
    );
  }

  createMovement(
    profileId: string,
    body: CreateStockMovementBody
  ): Observable<StockMovement> {
    return this.http.post<StockMovement>(
      `${this.base}/me/profiles/${profileId}/inventory/movements`,
      body
    );
  }

  adjustStock(
    profileId: string,
    body: AdjustStockBody
  ): Observable<StockMovement> {
    return this.http.post<StockMovement>(
      `${this.base}/me/profiles/${profileId}/inventory/movements/adjust`,
      body
    );
  }

  transferStock(
    profileId: string,
    body: TransferStockBody
  ): Observable<StockMovement[]> {
    return this.http.post<StockMovement[]>(
      `${this.base}/me/profiles/${profileId}/inventory/movements/transfer`,
      body
    );
  }

  // ========== SUCURSALES (Fase B) ==========

  listBranches(profileId: string): Observable<InventoryBranch[]> {
    return this.http.get<InventoryBranch[]>(
      `${this.base}/me/profiles/${profileId}/inventory/branches`
    );
  }

  createBranch(
    profileId: string,
    body: CreateBranchBody
  ): Observable<InventoryBranch> {
    return this.http.post<InventoryBranch>(
      `${this.base}/me/profiles/${profileId}/inventory/branches`,
      body
    );
  }

  deleteBranch(profileId: string, branchId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/me/profiles/${profileId}/inventory/branches/${branchId}`
    );
  }
}
