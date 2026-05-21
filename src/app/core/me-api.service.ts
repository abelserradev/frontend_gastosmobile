import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { CurrencyCode, ProfileType } from './app-context.service';

export interface MePreferences {
  defaultCurrency: CurrencyCode;
  monthlyIncome: number;
  incomeFixedBs: number | null;
  /** YYYY-MM-DD del mes confirmado para el ingreso. */
  incomeReferenceMonth: string | null;
  monthlyIncomeUsdAtRegistration: number | null;
  bcvVesPerUsdNow: number | null;
  bcvRateDateNow: string | null;
  bcvVesPerUsdAtRegistration: number | null;
  bcvRateDateAtRegistration: string | null;
  usdEquivalentDelta: number | null;
  bsIncomeNarrative: string | null;
  bcvQuoteIsStale: boolean;
}

export type MePreferencesPut =
  | { defaultCurrency: 'USD'; monthlyIncome: number }
  | { defaultCurrency: 'BS'; monthlyIncomeBs: number };

export interface MeCategory {
  id: string;
  name: string;
}

export interface MeProfile {
  id: string;
  name: string;
  type: ProfileType;
}

export interface MeProfileMember {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface MeExpense {
  id: string;
  profileId: string;
  profileName: string | null;
  title: string;
  description: string;
  amount: number;
  category: string;
  isPaid: boolean;
  referenceMonth: string;
  paymentDate: string | null;
  bcvRateApplied: number | null;
  bcvRateDate: string | null;
  paidByDisplayName: string | null;
  paidAt: string | null;
  paidByMemberId: string | null;
  /** true si el gasto tiene una imagen de comprobante/factura almacenada. */
  hasReceipt: boolean;
}

export interface MeHistoryMonthSummary {
  month: string;
  expenseCount: number;
  totalAmountUsd: number;
}

export interface MeState {
  preferences: MePreferences | null;
  categories: MeCategory[];
  profiles: MeProfile[];
  expenses: MeExpense[];
  /** Primer día del mes en curso (Caracas), YYYY-MM-DD. */
  activeReferenceMonth: string;
  needsMonthlyIncomeSetup: boolean;
}

@Injectable({ providedIn: 'root' })
export class MeApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getState(): Observable<MeState> {
    return this.http.get<MeState>(`${this.base}/me`);
  }

  updatePreferences(body: MePreferencesPut): Observable<MePreferences> {
    return this.http.put<MePreferences>(`${this.base}/me/preferences`, body);
  }

  replaceCategories(names: string[]): Observable<MeCategory[]> {
    return this.http.put<MeCategory[]>(`${this.base}/me/categories`, {
      names,
    });
  }

  listProfiles(): Observable<MeProfile[]> {
    return this.http.get<MeProfile[]>(`${this.base}/me/profiles`);
  }

  createProfile(body: {
    name: string;
    type: ProfileType;
  }): Observable<MeProfile> {
    return this.http.post<MeProfile>(`${this.base}/me/profiles`, body);
  }

  deleteProfile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/me/profiles/${id}`);
  }

  listProfileMembers(profileId: string): Observable<MeProfileMember[]> {
    return this.http.get<MeProfileMember[]>(
      `${this.base}/me/profiles/${profileId}/members`,
    );
  }

  createProfileMember(
    profileId: string,
    displayName: string,
  ): Observable<MeProfileMember> {
    return this.http.post<MeProfileMember>(
      `${this.base}/me/profiles/${profileId}/members`,
      { displayName },
    );
  }

  deleteProfileMember(profileId: string, memberId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/me/profiles/${profileId}/members/${memberId}`,
    );
  }

  listExpenses(): Observable<MeExpense[]> {
    return this.http.get<MeExpense[]>(`${this.base}/me/expenses`);
  }

  listExpenseHistoryMonths(): Observable<MeHistoryMonthSummary[]> {
    return this.http.get<MeHistoryMonthSummary[]>(
      `${this.base}/me/history/months`,
    );
  }

  listExpenseHistoryForMonth(ym: string): Observable<MeExpense[]> {
    return this.http.get<MeExpense[]>(
      `${this.base}/me/history/months/${encodeURIComponent(ym)}`,
    );
  }

  createExpense(body: {
    title: string;
    description?: string;
    amount: number;
    categoryName: string;
    /** YYYY-MM-DD; si omites, el backend usa hoy (Caracas). */
    paymentDate?: string;
  }): Observable<MeExpense> {
    return this.http.post<MeExpense>(`${this.base}/me/expenses`, body);
  }

  /**
   * Crea un gasto con imagen de comprobante/factura.
   * El amount puede estar en USD o BS (amountCurrency indica cuál).
   * El título es opcional; si falta el backend genera "Comprobante · YYYY-MM-DD".
   */
  createExpenseWithReceipt(params: {
    file: File;
    amount: number;
    amountCurrency: 'USD' | 'BS';
    categoryName: string;
    paymentDate?: string;
    title?: string;
  }): Observable<MeExpense> {
    const fd = new FormData();
    fd.append('file', params.file, params.file.name);
    fd.append('amount', String(params.amount));
    fd.append('amountCurrency', params.amountCurrency);
    fd.append('categoryName', params.categoryName);
    if (params.paymentDate) fd.append('paymentDate', params.paymentDate);
    if (params.title) fd.append('title', params.title);
    return this.http.post<MeExpense>(`${this.base}/me/expenses/with-receipt`, fd);
  }

  /**
   * Devuelve los bytes del comprobante como Blob para mostrarlo en un <img>.
   * La imagen viene protegida por JWT (mismo interceptor que el resto de llamadas).
   */
  getExpenseReceipt(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/me/expenses/${id}/receipt`, {
      responseType: 'blob',
    });
  }

  /** Tasa dólar oficial (Bs/USD) para un día; sin fecha = hoy Caracas. */
  getBcvOfficialRate(date?: string): Observable<{
    date: string;
    vesPerUsd: number;
    rateDate: string;
  }> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http.get<{
      date: string;
      vesPerUsd: number;
      rateDate: string;
    }>(`${this.base}/bcv/oficial-por-dia${q}`);
  }

  patchExpensePaid(
    id: string,
    isPaid: boolean,
    paidByMemberId?: string,
    paidByDisplayName?: string,
  ): Observable<MeExpense> {
    const body: {
      isPaid: boolean;
      paidByMemberId?: string;
      paidByDisplayName?: string;
    } = { isPaid };
    if (paidByMemberId) {
      body.paidByMemberId = paidByMemberId;
    }
    if (paidByDisplayName) {
      body.paidByDisplayName = paidByDisplayName;
    }
    return this.http.patch<MeExpense>(`${this.base}/me/expenses/${id}`, body);
  }

  /** Varios pendientes → un solo correo de resumen (backend / Resend). */
  markExpensesPaid(body: {
    ids: string[];
    paidByDisplayName: string;
    paidByMemberId?: string;
  }): Observable<MeExpense[]> {
    return this.http.post<MeExpense[]>(
      `${this.base}/me/expenses/mark-paid`,
      body,
    );
  }

  deleteExpenses(ids: string[]): Observable<{ deleted: number }> {
    return this.http.post<{ deleted: number }>(
      `${this.base}/me/expenses/delete-many`,
      { ids },
    );
  }
}
