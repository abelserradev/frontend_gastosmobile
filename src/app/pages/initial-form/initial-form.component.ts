import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  cameFromExpenses,
  subpageBackTarget,
} from '../../core/app-navigation.util';
import {
  AppContextService,
  CurrencyCode,
} from '../../core/app-context.service';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import { MeApiService, type MePreferencesPut } from '../../core/me-api.service';
import { routePathForMeState } from '../../core/me-route.util';

@Component({
  selector: 'app-initial-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './initial-form.component.html',
  styleUrl: './initial-form.component.scss',
})
export class InitialFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly appContext = inject(AppContextService);
  private readonly meApi = inject(MeApiService);
  private readonly auth = inject(AuthService);

  currency: CurrencyCode = 'USD';
  income = '';
  categoryInput = '';
  /** Bs por 1 USD (DolarApi); solo cuando moneda es BS. */
  bcvVesPerUsd: number | null = null;
  bcvRateDisplayDate = '';
  bcvLoading = false;
  bcvError: string | null = null;
  bcvStale = false;
  categories: string[] = [
    'Comida',
    'Mantenimiento Vehicular',
    'Salidas',
    'Varios',
  ];

  /** True cuando ya hay preferencias pero hay que revalidar ingreso por mes nuevo (Caracas). */
  monthlyRenewal = false;

  get fromExpenses(): boolean {
    return cameFromExpenses(this.route);
  }

  /** Solo actualiza ingreso (renovación mensual o edición desde gastos). */
  get preferencesOnly(): boolean {
    return this.monthlyRenewal || this.fromExpenses;
  }

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.meApi.getState().subscribe({
      next: (s) => {
        this.monthlyRenewal =
          s.preferences != null && s.needsMonthlyIncomeSetup;
        if (s.preferences) {
          this.currency = s.preferences.defaultCurrency;
          this.appContext.setCurrency(s.preferences.defaultCurrency);
          const incomeUsd = s.preferences.monthlyIncome;
          this.appContext.setMonthlyIncome(incomeUsd);
          this.appContext.setBsIncomeContext({
            incomeFixedBs: s.preferences.incomeFixedBs,
            narrative: s.preferences.bsIncomeNarrative,
            stale: s.preferences.bcvQuoteIsStale,
          });
          if (this.currency === 'BS') {
            const storedNominalBs = s.preferences.incomeFixedBs;
            if (storedNominalBs === null) {
              this.loadBcvRate(() => {
                if (this.bcvVesPerUsd !== null && incomeUsd > 0) {
                  this.income = (incomeUsd * this.bcvVesPerUsd).toFixed(2);
                }
              });
            } else {
              this.income = String(storedNominalBs);
              this.loadBcvRate();
            }
          } else {
            this.income = String(incomeUsd);
          }
        } else {
          this.appContext.setBsIncomeContext({
            incomeFixedBs: null,
            narrative: null,
            stale: false,
          });
        }
        if (s.categories.length > 0) {
          this.categories = s.categories.map((c) => c.name);
          this.appContext.setCategories(
            s.categories.map((c) => ({ id: c.id, name: c.name })),
          );
        }
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  handleAddCategory(): void {
    const trimmed = this.categoryInput.trim();
    if (trimmed && !this.categories.includes(trimmed)) {
      this.categories = [...this.categories, trimmed];
      this.categoryInput = '';
    }
  }

  handleRemoveCategory(category: string): void {
    this.categories = this.categories.filter((c) => c !== category);
  }

  onCategoryKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleAddCategory();
    }
  }

  selectCurrency(code: CurrencyCode): void {
    this.currency = code;
    if (code === 'BS') {
      this.loadBcvRate();
    } else {
      this.bcvError = null;
    }
  }

  private loadBcvRate(after?: () => void): void {
    this.bcvLoading = true;
    this.bcvError = null;
    this.bcvStale = false;
    this.meApi.getBcvOfficialRateResilient().subscribe({
      next: (r) => {
        this.bcvVesPerUsd = r.vesPerUsd;
        this.bcvRateDisplayDate = r.date;
        this.bcvStale = r.stale || r.fromLocalCache;
        this.bcvLoading = false;
        if (r.fromLocalCache) {
          this.bcvError =
            'Mostrando la última tasa guardada en este dispositivo (servidor no disponible).';
        } else if (r.stale) {
          this.bcvError =
            'Tasa de respaldo: DolarApi no respondió; se usa la última cotización conocida.';
        }
        after?.();
      },
      error: () => {
        this.bcvLoading = false;
        this.bcvVesPerUsd = null;
        this.bcvStale = false;
        this.bcvError =
          'No se pudo cargar la tasa BCV. Revisa la conexión o intenta más tarde.';
      },
    });
  }

  /** Monto numérico del input de ingreso. */
  get incomeAmount(): number {
    const n = Number.parseFloat(String(this.income).replace(',', '.'));
    return Number.isNaN(n) ? 0 : n;
  }

  /** Equivalente en USD si el ingreso está en Bs (mismo día que la tasa). */
  get incomeUsdEquivalent(): number | null {
    if (this.currency !== 'BS' || this.bcvVesPerUsd == null || this.bcvVesPerUsd <= 0) {
      return null;
    }
    return this.incomeAmount / this.bcvVesPerUsd;
  }

  handleSubmit(): void {
    if (!this.income || (!this.preferencesOnly && this.categories.length === 0)) {
      globalThis.alert('Por favor completa todos los campos requeridos');
      return;
    }
    let putBody: MePreferencesPut;
    if (this.currency === 'BS') {
      if (this.bcvVesPerUsd == null || this.bcvVesPerUsd <= 0) {
        globalThis.alert('Espera la tasa BCV o revisa la conexión antes de guardar.');
        return;
      }
      putBody = { defaultCurrency: 'BS', monthlyIncomeBs: this.incomeAmount };
    } else {
      const raw = Number.parseFloat(this.income);
      if (Number.isNaN(raw)) {
        globalThis.alert('Ingreso mensual no válido');
        return;
      }
      putBody = { defaultCurrency: 'USD', monthlyIncome: raw };
    }
    if (this.preferencesOnly) {
      this.meApi.updatePreferences(putBody).subscribe({
        next: (pref) => {
          this.appContext.syncFromMePreferences(pref);
          if (this.fromExpenses) {
            void this.router.navigate(['/expenses']);
            return;
          }
          this.meApi.getState().subscribe({
            next: (st) => void this.router.navigate([routePathForMeState(st)]),
            error: (err: unknown) => globalThis.alert(formatApiHttpError(err)),
          });
        },
        error: (err: unknown) => globalThis.alert(formatApiHttpError(err)),
      });
      return;
    }
    forkJoin([
      this.meApi.updatePreferences(putBody),
      this.meApi.replaceCategories(this.categories),
    ]).subscribe({
      next: ([pref, cats]) => {
        this.appContext.syncFromMePreferences(pref);
        this.appContext.setCategories(
          cats.map((c) => ({ id: c.id, name: c.name })),
        );
        void this.router.navigate(['/profiles']);
      },
      error: (err: unknown) => globalThis.alert(formatApiHttpError(err)),
    });
  }

  goBack(): void {
    void this.router.navigate([subpageBackTarget(this.fromExpenses)]);
  }
}
