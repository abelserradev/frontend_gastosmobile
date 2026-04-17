import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AppContextService,
  ProfileType,
  UserProfile,
} from '../../core/app-context.service';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import { EmailApiService } from '../../core/email-api.service';
import { MeApiService } from '../../core/me-api.service';

@Component({
  selector: 'app-profiles-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profiles-page.component.html',
  styleUrl: './profiles-page.component.scss',
})
export class ProfilesPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly appContext = inject(AppContextService);
  private readonly meApi = inject(MeApiService);
  private readonly emailApi = inject(EmailApiService);
  private readonly auth = inject(AuthService);

  profileName = '';
  resendTestLoading = false;

  profileType: ProfileType = 'familiar';

  profiles: UserProfile[] = [];

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.meApi.listProfiles().subscribe({
      next: (list) => {
        this.profiles = list;
        this.appContext.setProfiles(list);
      },
      error: (err: unknown) => {
        window.alert(formatApiHttpError(err));
      },
    });
  }

  handleAddProfile(): void {
    const trimmed = this.profileName.trim();
    if (!trimmed) {
      window.alert('Por favor ingresa un nombre para el perfil');
      return;
    }
    this.meApi
      .createProfile({ name: trimmed, type: this.profileType })
      .subscribe({
        next: (p) => {
          this.profiles = [...this.profiles, p];
          this.appContext.addProfile(p);
          this.profileName = '';
        },
        error: (err: unknown) => {
          window.alert(formatApiHttpError(err));
        },
      });
  }

  onNameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleAddProfile();
    }
  }

  handleRemoveProfile(profileId: string): void {
    this.meApi.deleteProfile(profileId).subscribe({
      next: () => {
        this.profiles = this.profiles.filter((p) => p.id !== profileId);
        this.appContext.removeProfile(profileId);
      },
      error: (err: unknown) => {
        window.alert(formatApiHttpError(err));
      },
    });
  }

  handleContinue(): void {
    if (this.profiles.length === 0) {
      window.alert('Debes crear al menos un perfil para continuar');
      return;
    }
    void this.router.navigate(['/expenses']);
  }

  handleResendTest(): void {
    if (this.resendTestLoading) {
      return;
    }
    this.resendTestLoading = true;
    this.emailApi.sendResendTest().subscribe({
      next: () => {
        this.resendTestLoading = false;
        window.alert('Revisá tu bandeja: se envió un correo de prueba desde el servidor (Resend).');
      },
      error: (err: unknown) => {
        this.resendTestLoading = false;
        window.alert(formatApiHttpError(err));
      },
    });
  }

  handleLogout(): void {
    this.auth.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
    });
  }
}
