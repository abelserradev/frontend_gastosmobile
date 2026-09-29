import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BRAND_APP_NAME } from '../../core/brand-assets';

/**
 * Página de descarga de la APK Android.
 * Solo accesible con sesión activa (requiresPasswordGuard en las rutas).
 *
 * No tiene enlace directo al APK — el usuario recibe el correo de Firebase
 * App Distribution cuando se registró. Esta página solo informa y guía.
 */
@Component({
  selector: 'app-android-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-android-page.component.html',
})
export class AppAndroidPageComponent {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly brandAppName = BRAND_APP_NAME;

  goBack(): void {
    this.router.navigate(['/expenses']);
  }
}
