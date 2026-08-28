import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import {
  MeApiService,
  type ProfileInvitation,
} from '../../core/me-api.service';

@Component({
  selector: 'app-invitations-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './invitations-page.component.html',
})
export class InvitationsPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly meApi = inject(MeApiService);
  private readonly auth = inject(AuthService);

  readonly invitations = signal<ProfileInvitation[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.loadInvitations();
  }

  loadInvitations(): void {
    this.loading.set(true);
    this.meApi.listInvitations().subscribe({
      next: (list) => {
        this.invitations.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  accept(inv: ProfileInvitation): void {
    this.meApi.acceptInvitation(inv.id).subscribe({
      next: () => {
        void this.router.navigate(['/inventory'], {
          queryParams: { profileId: inv.profileId },
        });
      },
      error: (err: unknown) => globalThis.alert(formatApiHttpError(err)),
    });
  }

  reject(inv: ProfileInvitation): void {
    this.meApi.rejectInvitation(inv.id).subscribe({
      next: () => {
        this.invitations.update((list) => list.filter((i) => i.id !== inv.id));
      },
      error: (err: unknown) => globalThis.alert(formatApiHttpError(err)),
    });
  }

  goBack(): void {
    void this.router.navigate(['/expenses']);
  }
}
