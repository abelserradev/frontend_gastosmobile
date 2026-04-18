import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { FirebaseAuthService } from '../../core/firebase-auth.service';
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
    this.meApi.getState().subscribe({
      next: (s: MeState) => {
        const path = this.routeForState(s);
        void this.router.navigate([path]);
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
        void this.router.navigate(['/setup']);
      },
    });
  }

  private routeForState(s: MeState): string {
    const hasPrefs = s.preferences != null;
    const hasProfiles = s.profiles.length > 0;
    if (hasPrefs && hasProfiles) {
      return '/expenses';
    }
    if (hasPrefs && !hasProfiles) {
      return '/profiles';
    }
    return '/setup';
  }

  setMode(login: boolean): void {
    this.isLogin.set(login);
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

  showForgotPasswordSoon(): void {
    globalThis.alert(
      'Recuperación de contraseña estará disponible cuando conectemos el backend.',
    );
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
      .pipe(switchMap((idToken) => this.auth.loginWithFirebase(idToken)))
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
