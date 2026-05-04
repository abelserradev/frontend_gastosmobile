import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { FirebaseAuthService } from '../../core/firebase-auth.service';
import { routePathForMeState } from '../../core/me-route.util';
import { formatApiHttpError } from '../../core/http-error.util';
import { switchMap } from 'rxjs';
import { MeApiService, type MeState } from '../../core/me-api.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly firebaseAuth = inject(FirebaseAuthService);
  private readonly meApi = inject(MeApiService);
  readonly isLogin = signal(true);
  readonly showPassword = signal(false);
  readonly forgotPasswordOpen = signal(false);
  readonly forgotSending = signal(false);

  formData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  ngOnInit(): void {
    if (this.auth.hasSession()) {
      this.navigateByOnBoardingState();
      return;
    }
    
    const skipRestoreOnce =
    globalThis.sessionStorage.getItem('gastos_skip_restore_once') === '1';
    if (skipRestoreOnce) {
      globalThis.sessionStorage.removeItem('gastos_skip_restore_once');
      return;
    }

    this.auth.tryRestoreSession().subscribe((ok) => {
      if (ok) {
        this.navigateByOnBoardingState();
      }
    });
  }

  private navigateByOnBoardingState(): void {
    if (!this.auth.hasPassword()) {
      this.router.navigate(['/setup-password']).catch(() => undefined);
      return;
    }
    this.meApi.getState().subscribe({
      next: (s: MeState) => {
        const path = routePathForMeState(s);
        this.router.navigate([path]).catch(() => undefined);
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
        this.router.navigate(['/setup']).catch(() => undefined);
      },
    });
  }

  setMode(login: boolean): void {
    if (!login) {
      this.forgotPasswordOpen.set(false);
    }
    this.isLogin.set(login);
  }

  openForgotPassword(): void {
    this.forgotPasswordOpen.set(true);
  }

  cancelForgotPassword(): void {
    this.forgotPasswordOpen.set(false);
  }

  submitForgotPassword(): void {
    const email = this.formData.email.trim();
    if (!email) {
      globalThis.alert('Ingresá tu correo electrónico.');
      return;
    }
    this.forgotSending.set(true);
    this.auth.requestPasswordReset(email).subscribe({
      next: () => {
        this.forgotSending.set(false);
        this.forgotPasswordOpen.set(false);
        globalThis.alert(
          'Si tu cuenta existe, recibirás un correo con un enlace para crear o restablecer tu contraseña.',
        );
      },
      error: (err: unknown) => {
        this.forgotSending.set(false);
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  handleSubmit(): void {
    const loginMode = this.isLogin();
    if (!loginMode && this.formData.password !== this.formData.confirmPassword) {
      globalThis.alert('Las contraseñas no coinciden');
      return;
    }
    if (!this.formData.email.trim() || !this.formData.password) {
      globalThis.alert('Por favor completa todos los campos');
      return;
    }
    if (!loginMode && !this.formData.name.trim()) {
      globalThis.alert('Por favor ingresa tu nombre');
      return;
    }
    const email = this.formData.email.trim();
    const password = this.formData.password;
    const req = loginMode
      ? this.auth.loginRemote(email, password)
      : this.auth.registerRemote(email, password, this.formData.name.trim());
    req.subscribe({
      next: () => {
        this.navigateByOnBoardingState();
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  showSocialSoon(provider: 'google' | 'github'): void {
    const msg =
      provider === 'google'
        ? 'Inicio de sesión con Google: pendiente de integración OAuth.'
        : 'Inicio de sesión con GitHub: pendiente de integración OAuth.';
    globalThis.alert(msg);
  }

  handleGoogleLogin(): void {
    this.firebaseAuth
      .signInWithGoogle()
      .pipe(switchMap((idToken: string) => this.auth.loginWithFirebase(idToken)))
      .subscribe({
        next: () => {
          this.navigateByOnBoardingState();
        },
        error: (err: unknown) => {
          globalThis.alert(formatApiHttpError(err));
        },
      });
  }
}
