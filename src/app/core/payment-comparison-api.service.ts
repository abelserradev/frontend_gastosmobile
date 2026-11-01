import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { MeExpense } from './me-api.service';

export type ComparisonPaymentMethod = 'CASH' | 'ELECTRONIC' | 'BS';

export interface ComparisonOptionV1 {
  id: string;
  moneda: 'USD' | 'BS';
  montoCobrado: string;
  equivalenteBcvUsd: string;
  comisionPct: string | null;
  comisionUsd: string | null;
  costoRealUsd: string;
  costoRealBs: string;
  diferenciaVsMejorUsd: string;
  esMejor: boolean;
}

export interface ComparacionResultV1 {
  version: 'v1';
  computedAt: string;
  producto: string | null;
  tasas: {
    oficial: { valor: string; fechaFuente: string };
    paralelo: { valor: string; fechaFuente: string };
    desactualizado: boolean;
  };
  tasaVenta: { valor: string; origen: 'usuario' | 'paralelo' };
  precioBs: { modo: string; monto: string } | null;
  opciones: ComparisonOptionV1[];
  mejores: string[];
  empateTotal: boolean;
  ahorroUsd: string;
  tasaEquilibrio: string | null;
  recargoBsPct: string | null;
}

export interface PaymentComparisonRow {
  id: string;
  status: 'PENDING' | 'CONVERTED';
  productName: string | null;
  offer: unknown;
  result: ComparacionResultV1;
  contractVersion: string;
  bestOptionId: string;
  computedAt: string;
  expiresAt: string;
  createdAt: string;
  expenseId: string | null;
}

export interface CreateComparisonBody {
  metodos: ('efectivo' | 'electronico' | 'bs')[];
  precioUsd?: string;
  precioBs?: {
    modo: 'monto_bs' | 'usd_bcv' | 'usd_otra_tasa';
    monto?: string;
    montoUsd?: string;
    tasaVendedor?: string;
  };
  comisionElectronicoPct?: string;
  tasaVenta?: string;
  producto?: string;
}

export interface ConvertComparisonBody {
  optionId: 'efectivo' | 'electronico' | 'bs';
  title: string;
  categoryId?: string;
  categoryName?: string;
  profileId?: string;
  paymentDate?: string;
}

export interface ExpenseComparisonDetail {
  comparisonId: string;
  contractVersion: string;
  computedAt: string;
  productName: string | null;
  tasas: ComparacionResultV1['tasas'];
  tasaVenta: ComparacionResultV1['tasaVenta'];
  opciones: ComparisonOptionV1[];
  bestOptionId: string;
  chosenOptionId: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentComparisonApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listPending(): Observable<PaymentComparisonRow[]> {
    return this.http.get<PaymentComparisonRow[]>(`${this.base}/me/comparisons`);
  }

  getComparison(id: string): Observable<PaymentComparisonRow> {
    return this.http.get<PaymentComparisonRow>(
      `${this.base}/me/comparisons/${id}`,
    );
  }

  createComparison(
    body: CreateComparisonBody,
  ): Observable<PaymentComparisonRow> {
    return this.http.post<PaymentComparisonRow>(
      `${this.base}/me/comparisons`,
      body,
    );
  }

  discardComparison(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(
      `${this.base}/me/comparisons/${id}`,
    );
  }

  convertToExpense(
    comparisonId: string,
    idempotencyKey: string,
    body: ConvertComparisonBody,
  ): Observable<MeExpense> {
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey,
    });
    return this.http.post<MeExpense>(
      `${this.base}/me/comparisons/${comparisonId}/expense`,
      body,
      { headers },
    );
  }

  getExpenseComparison(
    expenseId: string,
  ): Observable<ExpenseComparisonDetail> {
    return this.http.get<ExpenseComparisonDetail>(
      `${this.base}/me/expenses/${expenseId}/comparison`,
    );
  }
}
