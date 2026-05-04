import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import { MeApiService } from '../../core/me-api.service';
import { routePathForMeState } from '../../core/me-route.util';

@Component({
  selector: 'app-setup-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup-password-page.component.html',
  styleUrl: './setup-password-page.component.scss',
})
export class SetupPasswordPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly meApi = inject(MeApiService);

  readonly submitting = signal(false);
  password = '';
  confirmPassword = '';

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      this.router.navigate(['/login']).catch(() => undefined);
      return;
    }
    if (this.auth.hasPassword()) {
      this.goOnboardingOrHome();
    }
  }

  submit(): void {
    if (this.password.length < 8) {
      globalThis.alert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      globalThis.alert('Las contraseñas no coinciden.');
      return;
    }
    this.submitting.set(true);
    this.auth.setupPasswordRemote(this.password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.goOnboardingOrHome();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  /** Tras definir clave, mismo destino que tras login con email. */
  private goOnboardingOrHome(): void {
    this.meApi.getState().subscribe({
      next: (s) => {
        const path = routePathForMeState(s);
        this.router.navigate([path]).catch(() => undefined);
      },
      error: () => {
        this.router.navigate(['/setup']).catch(() => undefined);
      },
    });
  }
}
