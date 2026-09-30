import { Component, inject } from '@angular/core';
import { PlatformService } from '../../core/native/platform.service';
import { LandingPageComponent } from '../landing/landing-page.component';
import { SplashPageComponent } from '../splash/splash-page.component';

/**
 * Punto de entrada en `/`: crawlers y usuarios web ven landing;
 * Capacitor mantiene splash + flujo de sesión (APK no pierde UX nativa).
 */
@Component({
  selector: 'app-home-entry',
  standalone: true,
  imports: [LandingPageComponent, SplashPageComponent],
  template: `
    @if (platform.isNative) {
      <app-splash-page />
    } @else {
      <app-landing-page />
    }
  `,
})
export class HomeEntryComponent {
  protected readonly platform = inject(PlatformService);
}
