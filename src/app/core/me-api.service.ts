import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { CurrencyCode, ProfileType } from './app-context.service';

export interface MePreferences {
  defaultCurrency: CurrencyCode;
  monthlyIncome: number;
}

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
  paymentDate: string | null;
  bcvRateApplied: number | null;
  bcvRateDate: string | null;
  paidByDisplayName: string | null;
  paidAt: string | null;
  paidByMemberId: string | null;
}

export interface MeState {
  preferences: MePreferences | null;
  categories: MeCategory[];
  profiles: MeProfile[];
  expenses: MeExpense[];
}

@Injectable({ providedIn: 'root' })
export class MeApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getState(): Observable<MeState> {
    return this.http.get<MeState>(`${this.base}/me`);
  }

  updatePreferences(body: MePreferences): Observable<MePreferences> {
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
  ): Observable<MeExpense> {
    return this.http.patch<MeExpense>(`${this.base}/me/expenses/${id}`, {
      isPaid,
      ...(paidByMemberId ? { paidByMemberId } : {}),
    });
  }

  deleteExpenses(ids: string[]): Observable<{ deleted: number }> {
    return this.http.post<{ deleted: number }>(
      `${this.base}/me/expenses/delete-many`,
      { ids },
    );
  }
}
