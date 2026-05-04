import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly tokenPresent = signal(false);
  readonly submitting = signal(false);

  /** Contraseña nueva (y confirmación en plantilla). */
  newPassword = '';
  confirmPassword = '';

  private rawToken = '';

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.rawToken = t;
    this.tokenPresent.set(t.length >= 32);
  }

  submit(): void {
    if (!this.rawToken || !this.tokenPresent()) {
      globalThis.alert('El enlace no es válido.');
      return;
    }
    if (this.newPassword.length < 8) {
      globalThis.alert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      globalThis.alert('Las contraseñas no coinciden.');
      return;
    }
    this.submitting.set(true);
    this.auth.resetPassword(this.rawToken, this.newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        globalThis.alert(
          'Contraseña actualizada. Ya podés iniciar sesión con tu nueva clave.',
        );
        this.router.navigate(['/login']).catch(() => undefined);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  goLogin(): void {
    this.router.navigate(['/login']).catch(() => undefined);
  }
}
