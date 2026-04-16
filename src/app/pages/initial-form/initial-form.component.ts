import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AppContextService,
  CurrencyCode,
} from '../../core/app-context.service';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import { MeApiService } from '../../core/me-api.service';

@Component({
  selector: 'app-initial-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './initial-form.component.html',
  styleUrl: './initial-form.component.scss',
})
export class InitialFormComponent implements OnInit {
  private readonly router = inject(Router);
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
  categories: string[] = [
    'Comida',
    'Mantenimiento Vehicular',
    'Salidas',
    'Varios',
  ];

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.meApi.getState().subscribe({
      next: (s) => {
        if (s.preferences) {
          this.currency = s.preferences.defaultCurrency;
          this.appContext.setCurrency(s.preferences.defaultCurrency);
          const incomeUsd = s.preferences.monthlyIncome;
          this.appContext.setMonthlyIncome(incomeUsd);
          if (this.currency === 'BS') {
            this.loadBcvRate(() => {
              if (this.bcvVesPerUsd != null) {
                this.income = (incomeUsd * this.bcvVesPerUsd).toFixed(2);
              }
            });
          } else {
            this.income = String(incomeUsd);
          }
        }
        if (s.categories.length > 0) {
          this.categories = s.categories.map((c) => c.name);
          this.appContext.setCategories(
            s.categories.map((c) => ({ id: c.id, name: c.name })),
          );
        }
      },
      error: (err: unknown) => {
        window.alert(formatApiHttpError(err));
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
    this.meApi.getBcvOfficialRate().subscribe({
      next: (r) => {
        this.bcvVesPerUsd = r.vesPerUsd;
        this.bcvRateDisplayDate = r.date;
        this.bcvLoading = false;
        after?.();
      },
      error: () => {
        this.bcvLoading = false;
        this.bcvVesPerUsd = null;
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
    if (!this.income || this.categories.length === 0) {
      window.alert('Por favor completa todos los campos requeridos');
      return;
    }
    let monthlyIncomeUsd: number;
    if (this.currency === 'BS') {
      if (this.bcvVesPerUsd == null || this.bcvVesPerUsd <= 0) {
        window.alert('Espera la tasa BCV o revisa la conexión antes de guardar.');
        return;
      }
      monthlyIncomeUsd = this.incomeAmount / this.bcvVesPerUsd;
    } else {
      const raw = Number.parseFloat(this.income);
      if (Number.isNaN(raw)) {
        window.alert('Ingreso mensual no válido');
        return;
      }
      monthlyIncomeUsd = raw;
    }
    forkJoin([
      this.meApi.updatePreferences({
        defaultCurrency: this.currency,
        monthlyIncome: monthlyIncomeUsd,
      }),
      this.meApi.replaceCategories(this.categories),
    ]).subscribe({
      next: ([pref, cats]) => {
        this.appContext.setCurrency(pref.defaultCurrency);
        this.appContext.setMonthlyIncome(pref.monthlyIncome);
        this.appContext.setCategories(
          cats.map((c) => ({ id: c.id, name: c.name })),
        );
        void this.router.navigate(['/profiles']);
      },
      error: (err: unknown) => {
        window.alert(formatApiHttpError(err));
      },
    });
  }
}
