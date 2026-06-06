import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { getStateWithAutoRollover } from '../../core/month-renewal.util';
import { MeApiService } from '../../core/me-api.service';
import {
  BRAND_APP_NAME,
  BRAND_LOGO_SRC,
} from '../../core/brand-assets';
import { routePathForMeState } from '../../core/me-route.util';

/**
 * Splash screen inicial para la app mobile.
 *
 * - Muestra branding mientras verifica sesión
 * - Auto-navega al login o dashboard según estado
 * - Transición suave para experiencia nativa
 */
@Component({
  selector: 'app-splash-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#FFD300] flex flex-col items-center justify-center px-6">
      <!-- Logo con animación de pulso sutil -->
      <div class="relative">
        <div class="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
        <img
          [src]="brandLogoSrc"
          [attr.alt]="brandAppName"
          class="relative w-72 max-w-[90vw] h-auto object-contain drop-shadow-2xl transition-opacity duration-700"
          [class.opacity-0]="!isVisible()"
          [class.opacity-100]="isVisible()"
        >
      </div>

      <!-- Tagline -->
      <p
        class="mt-6 text-foreground/80 text-base font-medium tracking-wide"
        [class.opacity-0]="!isVisible()"
        [class.opacity-100]="isVisible()"
        [class.translate-y-4]="!isVisible()"
        [class.translate-y-0]="isVisible()"
        class="mt-6 text-foreground/80 text-base font-medium tracking-wide transition-all duration-700 delay-200"
      >
        {{ brandTagline }}
      </p>

      <!-- Loading indicator -->
      <div class="mt-12">
        <div class="flex space-x-2">
          <div
            class="w-2 h-2 bg-white rounded-full animate-bounce"
            style="animation-delay: 0ms"
          ></div>
          <div
            class="w-2 h-2 bg-white rounded-full animate-bounce"
            style="animation-delay: 150ms"
          ></div>
          <div
            class="w-2 h-2 bg-white rounded-full animate-bounce"
            style="animation-delay: 300ms"
          ></div>
        </div>
      </div>

      <!-- Versión -->
      <p class="absolute bottom-8 text-primary-foreground/60 text-xs">
        v{{ version }}
      </p>
    </div>
  `
})
export class SplashPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly meApi = inject(MeApiService);

  readonly version = '1.3.1';
  readonly brandLogoSrc = BRAND_LOGO_SRC;
  readonly brandAppName = BRAND_APP_NAME;
  readonly isVisible = signal(false);

  ngOnInit(): void {
    // Fade in logo
    setTimeout(() => this.isVisible.set(true), 100);

    // Verificar sesión después de mostrar splash
    setTimeout(() => {
      this.checkSessionAndNavigate();
    }, 2000);
  }

  private checkSessionAndNavigate(): void {
    // Si tiene sesión activa, ir al dashboard
    if (this.auth.hasSession()) {
      this.navigateToDashboard();
      return;
    }

    // Intentar restaurar sesión
    this.auth.tryRestoreSession().subscribe({
      next: (hasSession) => {
        if (hasSession) {
          this.navigateToDashboard();
        } else {
          this.navigateToLogin();
        }
      },
      error: () => {
        this.navigateToLogin();
      }
    });
  }

  private navigateToDashboard(): void {
    if (!this.auth.hasPassword()) {
      this.router.navigate(['/setup-password']).catch(() => undefined);
      return;
    }

    getStateWithAutoRollover(this.meApi).subscribe({
      next: (state) => {
        const path = routePathForMeState(state);
        this.router.navigate([path]).catch(() => undefined);
      },
      error: () => {
        this.router.navigate(['/setup']).catch(() => undefined);
      }
    });
  }

  private navigateToLogin(): void {
    this.router.navigate(['/login']).catch(() => undefined);
  }
}

