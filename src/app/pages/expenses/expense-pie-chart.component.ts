import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { Chart, ChartData, ChartOptions } from 'chart.js';

/**
 * Torta con Chart.js sin ng2-charts: evita peer deps (@angular/cdk) desalineadas con el core de Angular.
 */
@Component({
  selector: 'app-expense-pie-chart',
  standalone: true,
  template:
    '<div class="h-full w-full min-h-[260px] relative"><canvas #chartCanvas></canvas></div>',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class ExpensePieChartComponent implements AfterViewInit, OnDestroy {
  readonly chartData = input.required<ChartData<'pie'>>();
  readonly chartOptions = input.required<ChartOptions<'pie'>>();

  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const data = this.chartData();
      const options = this.chartOptions();
      const c = this.chart;
      if (!c) {
        return;
      }
      c.data = data;
      c.options = options;
      c.update();
    });
  }

  ngAfterViewInit(): void {
    const el = this.canvasRef().nativeElement;
    this.chart = new Chart(el, {
      type: 'pie',
      data: this.chartData(),
      options: this.chartOptions(),
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }
}
