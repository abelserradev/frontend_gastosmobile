import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AppContextService } from '../../core/app-context.service';
import { formatApiHttpError } from '../../core/http-error.util';
import {
  PaymentComparisonApiService,
  type ComparisonOptionV1,
  type CreateComparisonBody,
  type PaymentComparisonRow,
} from '../../core/payment-comparison-api.service';
import { labelOptionId } from '../../core/payment-comparison-display.util';
import type { MeExpense } from '../../core/me-api.service';
import { ComparisonTableComponent } from './comparison-table.component';
import {
  ConvertExpenseDialogComponent,
  type ConvertExpensePayload,
} from './convert-expense-dialog.component';

@Component({
  selector: 'app-payment-comparison-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ComparisonTableComponent,
    ConvertExpenseDialogComponent,
  ],
  templateUrl: './payment-comparison-page.component.html',
  styleUrl: './payment-comparison-page.component.scss',
})
export class PaymentComparisonPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ctx = inject(AppContextService);
  private readonly comparisonsApi = inject(PaymentComparisonApiService);

  readonly pending = signal<PaymentComparisonRow[]>([]);
  readonly loadingPending = signal(true);
  readonly comparison = signal<PaymentComparisonRow | null>(null);
  readonly loadingComparison = signal(false);
  readonly comparing = signal(false);
  readonly convertOpen = signal(false);
  readonly convertSubmitting = signal(false);
  readonly selectedOption = signal<ComparisonOptionV1 | null>(null);
  readonly banner = signal<string | null>(null);

  metodoEfectivo = true;
  metodoElectronico = false;
  metodoBs = false;
  precioUsd = '';
  precioBsModo: 'monto_bs' | 'usd_bcv' | 'usd_otra_tasa' = 'monto_bs';
  precioBsMonto = '';
  precioBsUsd = '';
  precioBsTasa = '';
  comisionPct = '0';
  tasaVenta = '';
  producto = '';

  ngOnInit(): void {
    this.reloadPending();
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadComparison(id);
      } else {
        this.comparison.set(null);
      }
    });
  }

  reloadPending(): void {
    this.loadingPending.set(true);
    this.comparisonsApi.listPending().subscribe({
      next: (rows) => {
        this.pending.set(rows);
        this.loadingPending.set(false);
      },
      error: () => this.loadingPending.set(false),
    });
  }

  loadComparison(id: string): void {
    this.loadingComparison.set(true);
    this.banner.set(null);
    this.comparisonsApi.getComparison(id).subscribe({
      next: (row) => {
        this.comparison.set(row);
        this.loadingComparison.set(false);
      },
      error: (err: unknown) => {
        this.loadingComparison.set(false);
        if (err instanceof HttpErrorResponse && err.status === 410) {
          this.banner.set('La comparación venció, vuelve a cargar el precio');
          void this.router.navigate(['/comparar']);
          this.resetForm();
          this.reloadPending();
          return;
        }
        globalThis.alert(formatApiHttpError(err));
        void this.router.navigate(['/comparar']);
      },
    });
  }

  discard(id: string): void {
    this.comparisonsApi.discardComparison(id).subscribe({
      next: () => {
        this.pending.update((list) => list.filter((r) => r.id !== id));
        if (this.comparison()?.id === id) {
          void this.router.navigate(['/comparar']);
        }
      },
      error: (err: unknown) => globalThis.alert(formatApiHttpError(err)),
    });
  }

  openResult(id: string): void {
    void this.router.navigate(['/comparar', id]);
  }

  submitCompare(): void {
    const metodos: CreateComparisonBody['metodos'] = [];
    if (this.metodoEfectivo) {
      metodos.push('efectivo');
    }
    if (this.metodoElectronico) {
      metodos.push('electronico');
    }
    if (this.metodoBs) {
      metodos.push('bs');
    }
    if (metodos.length === 0) {
      globalThis.alert('Elige al menos un método de pago');
      return;
    }
    const body: CreateComparisonBody = {
      metodos,
      comisionElectronicoPct: this.comisionPct.trim() || '0',
    };
    if (metodos.includes('efectivo') || metodos.includes('electronico')) {
      if (!this.precioUsd.trim()) {
        globalThis.alert('Indica el precio en USD');
        return;
      }
      body.precioUsd = this.precioUsd.trim();
    }
    if (metodos.includes('bs')) {
      body.precioBs = { modo: this.precioBsModo };
      if (this.precioBsModo === 'monto_bs') {
        body.precioBs.monto = this.precioBsMonto.trim();
      } else {
        body.precioBs.montoUsd = this.precioBsUsd.trim();
        if (this.precioBsModo === 'usd_otra_tasa') {
          body.precioBs.tasaVendedor = this.precioBsTasa.trim();
        }
      }
    }
    if (this.tasaVenta.trim()) {
      body.tasaVenta = this.tasaVenta.trim();
    }
    if (this.producto.trim()) {
      body.producto = this.producto.trim();
    }

    this.comparing.set(true);
    this.banner.set(null);
    this.comparisonsApi.createComparison(body).subscribe({
      next: (row) => {
        this.comparing.set(false);
        this.reloadPending();
        void this.router.navigate(['/comparar', row.id]);
      },
      error: (err: unknown) => {
        this.comparing.set(false);
        if (
          err instanceof HttpErrorResponse &&
          err.status === 503 &&
          (err.error as { code?: string })?.code === 'COMPARISON_UNAVAILABLE'
        ) {
          this.banner.set(
            'Servicio de comparación no disponible, intenta más tarde',
          );
          return;
        }
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  resetForm(): void {
    this.metodoEfectivo = true;
    this.metodoElectronico = false;
    this.metodoBs = false;
    this.precioUsd = '';
    this.precioBsMonto = '';
    this.precioBsUsd = '';
    this.precioBsTasa = '';
    this.comisionPct = '0';
    this.tasaVenta = '';
    this.producto = '';
  }

  pickOption(option: ComparisonOptionV1): void {
    this.selectedOption.set(option);
    this.convertOpen.set(true);
  }

  onConvert(payload: ConvertExpensePayload): void {
    const cmp = this.comparison();
    if (!cmp) {
      return;
    }
    this.convertSubmitting.set(true);
    this.comparisonsApi
      .convertToExpense(cmp.id, payload.idempotencyKey, {
        optionId: payload.optionId,
        title: payload.title,
        categoryName: payload.categoryName,
        profileId: payload.profileId,
        paymentDate: payload.paymentDate,
      })
      .subscribe({
        next: (_expense: MeExpense) => {
          this.convertSubmitting.set(false);
          this.convertOpen.set(false);
          globalThis.alert('Gasto pendiente creado');
          void this.router.navigate(['/expenses']);
        },
        error: (err: unknown) => {
          this.convertSubmitting.set(false);
          if (err instanceof HttpErrorResponse && err.status === 410) {
            this.banner.set('La comparación venció, vuelve a cargar el precio');
            this.convertOpen.set(false);
            this.resetForm();
            void this.router.navigate(['/comparar']);
            this.reloadPending();
            return;
          }
          globalThis.alert(formatApiHttpError(err));
        },
      });
  }

  optionLabel(id: string): string {
    return labelOptionId(id);
  }

  detailFromRow(row: PaymentComparisonRow) {
    return {
      comparisonId: row.id,
      contractVersion: row.contractVersion,
      computedAt: row.computedAt,
      productName: row.productName,
      tasas: row.result.tasas,
      tasaVenta: row.result.tasaVenta,
      opciones: row.result.opciones,
      bestOptionId: row.bestOptionId,
      chosenOptionId: null,
    };
  }

  categories() {
    return this.ctx.categories();
  }

  profiles() {
    return this.ctx.profiles();
  }

  goNewComparison(): void {
    void this.router.navigate(['/comparar']);
  }
}
