import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  readBcvRateCacheOrLatest,
  writeBcvRateCache,
} from './bcv-rate-cache.util';
import type { CurrencyCode, ProfileType } from './app-context.service';
import type { ParseInvoiceResult } from './ocr-api.service';

export interface BcvOfficialRateResponse {
  date: string;
  vesPerUsd: number;
  rateDate: string;
  stale: boolean;
  fromLocalCache: boolean;
}

/** Configuración del ciclo presupuestario (FEAT-001). */
export interface BudgetCycle {
  mode: 'calendar_month' | 'monthly_cutoff';
  cutoffDay: number;
}

/** Periodo presupuestario activo (FEAT-001). */
export interface ActivePeriod {
  /** YYYY-MM-DD del inicio del periodo (día después del corte anterior). */
  periodStart: string;
  /** YYYY-MM-DD de la fecha de corte (fin del periodo). */
  cutoffDate: string;
  /** YYYY-MM-DD del inicio del siguiente periodo (día después del corte). */
  nextPeriodStart: string;
  /** Etiqueta legible para UI (ej: "16 May - 15 Jun"). */
  label: string;
  /** Si hoy es día de corte (mostrar renovación). */
  isCutoffToday: boolean;
}

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
  carryoverUsd: number;
  effectiveMonthlyIncomeUsd: number;
  /** Configuración del ciclo presupuestario (FEAT-001). */
  budgetCycle: BudgetCycle;
}

export type MePreferencesPut = (
  | { defaultCurrency: 'USD'; monthlyIncome: number }
  | { defaultCurrency: 'BS'; monthlyIncomeBs: number }
) & {
  applySurplus?: boolean;
  /** Configuración del ciclo presupuestario (FEAT-001). */
  budgetCycle?: BudgetCycle;
};

export interface MeMonthRenewal {
  closingMonthYmd: string;
  surplusUsd: number;
  requiresSurplusPrompt: boolean;
}

export interface MeCategory {
  id: string;
  name: string;
}

export interface MeProfile {
  id: string;
  name: string;
  type: ProfileType;
  access?: 'owner' | 'collaborator';
  ownerName?: string | null;
}

export interface ProfileCollaborator {
  id: string;
  profileId: string;
  profileName: string;
  userId: string;
  userEmail: string;
  userName: string;
  invitedById: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  role: 'editor' | 'viewer';
  createdAt: string;
  acceptedAt: string | null;
}

export interface ProfileInvitation {
  id: string;
  profileId: string;
  profileName: string;
  invitedByName: string;
  role: 'editor' | 'viewer';
  createdAt: string;
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

export interface MeIncomeSource {
  id: string;
  name: string;
}

export interface MeIncome {
  id: string;
  title: string;
  description: string;
  amount: number;
  source: string;
  referenceMonth: string;
  receivedDate: string | null;
  bcvRateApplied: number | null;
  bcvRateDate: string | null;
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
  incomeSources: MeIncomeSource[];
  incomes: MeIncome[];
  /** Primer día del mes/periodo en curso (Caracas), YYYY-MM-DD. */
  activeReferenceMonth: string;
  /** Periodo presupuestario activo calculado (FEAT-001). */
  activePeriod: ActivePeriod;
  needsMonthlyIncomeSetup: boolean;
  monthRenewal: MeMonthRenewal | null;
}

export type OcrFeedbackSourceApi = 'IMAGE_UPLOAD_FLOW' | 'EDIT_EXPENSE';

export type MeOcrDocumentKindGuessApi =
  | 'payment_screenshot'
  | 'physical_receipt'
  | 'fiscal_or_formal_invoice'
  | 'unknown';

/** Body de POST /me/ocr-feedback (v1.3). parseSnapshot debe alinear con ParseInvoiceResult. */
export interface SubmitOcrFeedbackBody {
  source: OcrFeedbackSourceApi;
  submissionVariant?: 'quick_confirm' | 'detail_form';
  documentKindGuess?: MeOcrDocumentKindGuessApi;
  parseSnapshot: ParseInvoiceResult;
  corrected: {
    title: string;
    description?: string;
    amountUsd: number;
    paymentDate?: string;
    currencyCapture?: 'USD' | 'BS';
    categoryName?: string;
    bankLabel?: string;
  };
  expenseId?: string;
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

  rolloverMonth(body: { applySurplus?: boolean }): Observable<MePreferences> {
    return this.http.post<MePreferences>(`${this.base}/me/month-rollover`, body);
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

  listCollaborators(profileId: string): Observable<ProfileCollaborator[]> {
    return this.http.get<ProfileCollaborator[]>(
      `${this.base}/me/profiles/${profileId}/collaborators`,
    );
  }

  inviteCollaborator(
    profileId: string,
    email: string,
  ): Observable<ProfileCollaborator> {
    return this.http.post<ProfileCollaborator>(
      `${this.base}/me/profiles/${profileId}/collaborators`,
      { email },
    );
  }

  revokeCollaborator(profileId: string, userId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/me/profiles/${profileId}/collaborators/${userId}`,
    );
  }

  listInvitations(): Observable<ProfileInvitation[]> {
    return this.http.get<ProfileInvitation[]>(`${this.base}/me/invitations`);
  }

  acceptInvitation(id: string): Observable<ProfileCollaborator> {
    return this.http.post<ProfileCollaborator>(
      `${this.base}/me/invitations/${id}/accept`,
      {},
    );
  }

  rejectInvitation(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/me/invitations/${id}/reject`, {});
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

  /**
   * Tasa BCV con caché en localStorage: si el backend/DolarApi falla, usa la última tasa guardada.
   */
  getBcvOfficialRateResilient(date?: string): Observable<BcvOfficialRateResponse> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http
      .get<{
        date: string;
        vesPerUsd: number;
        rateDate: string;
        stale?: boolean;
      }>(`${this.base}/bcv/oficial-por-dia${q}`)
      .pipe(
        tap((r) => {
          writeBcvRateCache({
            vesPerUsd: r.vesPerUsd,
            date: r.date,
            rateDate: r.rateDate,
            stale: r.stale ?? false,
          });
        }),
        map((r) => ({
          date: r.date,
          vesPerUsd: r.vesPerUsd,
          rateDate: r.rateDate,
          stale: r.stale ?? false,
          fromLocalCache: false,
        })),
        catchError((err: unknown) => {
          const cached = readBcvRateCacheOrLatest(date);
          if (cached) {
            return of({
              date: cached.date,
              vesPerUsd: cached.vesPerUsd,
              rateDate: cached.rateDate,
              stale: true,
              fromLocalCache: true,
            });
          }
          return throwError(() => err);
        }),
      );
  }

  /** @deprecated Preferir getBcvOfficialRateResilient (caché local + flag stale). */
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

  listIncomeSources(): Observable<MeIncomeSource[]> {
    return this.http.get<MeIncomeSource[]>(`${this.base}/me/income-sources`);
  }

  listIncomes(): Observable<MeIncome[]> {
    return this.http.get<MeIncome[]>(`${this.base}/me/incomes`);
  }

  createIncome(body: {
    title: string;
    description?: string;
    amount: number;
    sourceName: string;
    receivedDate?: string;
  }): Observable<MeIncome> {
    return this.http.post<MeIncome>(`${this.base}/me/incomes`, body);
  }

  deleteIncomes(ids: string[]): Observable<{ deleted: number }> {
    return this.http.post<{ deleted: number }>(
      `${this.base}/me/incomes/delete-many`,
      { ids },
    );
  }

  /** v1.3 — feedback OCR; no debe bloquear UI (llamar con subscribe errores ignorados si aplica). */
  submitOcrFeedback(body: SubmitOcrFeedbackBody): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.base}/me/ocr-feedback`,
      body,
    );
  }
}
