import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import {
  MeApiService,
  type MeExpense,
  type MeHistoryMonthSummary,
} from '../../core/me-api.service';

@Component({
  selector: 'app-historial-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './historial-page.component.html',
  styleUrl: './historial-page.component.scss',
})
export class HistorialPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly meApi = inject(MeApiService);

  readonly months = signal<MeHistoryMonthSummary[]>([]);
  readonly listLoading = signal(true);
  readonly detailYm = signal<string | null>(null);
  readonly detailExpenses = signal<MeExpense[]>([]);
  readonly detailLoading = signal(false);

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }
    const ym = this.route.snapshot.paramMap.get('ym');
    if (ym && /^\d{4}-\d{2}$/.test(ym)) {
      this.detailYm.set(ym);
      this.loadDetail(ym);
      return;
    }
    if (ym) {
      void this.router.navigate(['/historial']);
      return;
    }
    this.loadMonths();
  }

  private loadMonths(): void {
    this.listLoading.set(true);
    this.meApi.listExpenseHistoryMonths().subscribe({
      next: (rows) => {
        this.months.set(rows);
        this.listLoading.set(false);
      },
      error: (err: unknown) => {
        this.listLoading.set(false);
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  private loadDetail(ym: string): void {
    this.detailLoading.set(true);
    this.meApi.listExpenseHistoryForMonth(ym).subscribe({
      next: (rows) => {
        this.detailExpenses.set(rows);
        this.detailLoading.set(false);
      },
      error: (err: unknown) => {
        this.detailLoading.set(false);
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  monthTitleFromYmd(ymd: string): string {
    const [y, m] = ymd.split('-').map(Number);
    if (!y || !m) {
      return ymd;
    }
    return new Date(Date.UTC(y, m - 1, 12)).toLocaleDateString('es-VE', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  /** YYYY-MM-01 → YYYY-MM para la ruta /historial/:ym */
  ymRouteFromApiMonth(month: string): string {
    return month.slice(0, 7);
  }
}
