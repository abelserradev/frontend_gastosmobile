import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import type {
  ComparisonOptionV1,
  ExpenseComparisonDetail,
} from '../../core/payment-comparison-api.service';
import { labelOptionId } from '../../core/payment-comparison-display.util';

@Component({
  selector: 'app-comparison-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comparison-table.component.html',
  styleUrl: './comparison-table.component.scss',
})
export class ComparisonTableComponent {
  readonly detail = input.required<ExpenseComparisonDetail>();
  readonly highlightOptionId = input<string | null>(null);

  optionLabel(id: string): string {
    return labelOptionId(id);
  }

  isHighlighted(option: ComparisonOptionV1): boolean {
    const chosen = this.highlightOptionId() ?? this.detail().chosenOptionId;
    return chosen != null && option.id === chosen;
  }

  isBest(option: ComparisonOptionV1): boolean {
    return option.esMejor;
  }
}
