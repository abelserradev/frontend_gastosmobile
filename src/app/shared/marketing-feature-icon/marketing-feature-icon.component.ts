import { Component, input } from '@angular/core';

/** Iconos de beneficios públicos — mismo trazo que el resto de la app (sin emojis). */
export type MarketingFeatureIconKind =
  'exchange-rate' | 'receipt-scan' | 'inventory' | 'budget-cycle' | 'android';

@Component({
  selector: 'app-marketing-feature-icon',
  standalone: true,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="shrink-0"
    >
      @switch (kind()) {
        @case ('exchange-rate') {
          <path d="M7 16V4M7 4 3 8m4-4 4 4" />
          <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
        }
        @case ('receipt-scan') {
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          />
          <path d="M14 2v6h6" />
          <path d="M8 13h2" />
          <path d="M8 17h6" />
          <path d="M16 13h.01" />
          <circle cx="17" cy="17" r="3" />
          <path d="m21 21-1.5-1.5" />
        }
        @case ('inventory') {
          <path
            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
          />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        }
        @case ('budget-cycle') {
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        }
        @case ('android') {
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        }
      }
    </svg>
  `,
})
export class MarketingFeatureIconComponent {
  readonly kind = input.required<MarketingFeatureIconKind>();
  readonly size = input<number>(24);
}
