import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import {
  AppContextService,
  ProfileType,
  UserProfile,
} from '../../core/app-context.service';
import { AuthService } from '../../core/auth.service';
import { formatApiHttpError } from '../../core/http-error.util';
import {
  cameFromExpenses,
  subpageBackTarget,
} from '../../core/app-navigation.util';
import {
  MeApiService,
  type MeProfileMember,
  type ProfileCollaborator,
} from '../../core/me-api.service';
import {
  getStateWithAutoRollover,
  needsSetupScreen,
} from '../../core/month-renewal.util';

@Component({
  selector: 'app-profiles-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profiles-page.component.html',
})
export class ProfilesPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly appContext = inject(AppContextService);
  private readonly meApi = inject(MeApiService);
  private readonly auth = inject(AuthService);

  profileName = '';

  profileType: ProfileType = 'familiar';

  profiles: UserProfile[] = [];
  membersModalOpen = false;
  membersProfileId: string | null = null;
  membersProfileName: string | null = null;
  membersLoading = false;
  members: MeProfileMember[] = [];
  memberName = '';

  teamModalOpen = false;
  teamProfileId: string | null = null;
  teamProfileName: string | null = null;
  teamLoading = false;
  collaborators: ProfileCollaborator[] = [];
  inviteEmail = '';

  get ownedProfiles(): UserProfile[] {
    return this.profiles.filter((p) => (p.access ?? 'owner') === 'owner');
  }

  get sharedProfiles(): UserProfile[] {
    return this.profiles.filter((p) => p.access === 'collaborator');
  }

  isProfileOwner(profile: UserProfile): boolean {
    return (profile.access ?? 'owner') === 'owner';
  }

  get fromExpenses(): boolean {
    return cameFromExpenses(this.route);
  }

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/login']);
      return;
    }
    getStateWithAutoRollover(this.meApi).subscribe({
      next: (s) => {
        if (needsSetupScreen(s)) {
          void this.router.navigate(['/setup']);
          return;
        }
        this.meApi.listProfiles().subscribe({
          next: (list) => {
            this.profiles = list;
            this.appContext.setProfiles(list);
          },
          error: (err: unknown) => {
            globalThis.alert(formatApiHttpError(err));
          },
        });
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  handleAddProfile(): void {
    const trimmed = this.profileName.trim();
    if (!trimmed) {
      globalThis.alert('Por favor ingresa un nombre para el perfil');
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
          globalThis.alert(formatApiHttpError(err));
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
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  handleContinue(): void {
    if (this.profiles.length === 0) {
      globalThis.alert('Debes crear al menos un perfil para continuar');
      return;
    }
    void this.router.navigate(['/expenses']);
  }

  openMembers(profile: UserProfile): void {
    this.membersModalOpen = true;
    this.membersProfileId = profile.id;
    this.membersProfileName = profile.name;
    this.memberName = '';
    this.members = [];
    this.loadMembers();
  }

  closeMembers(): void {
    this.membersModalOpen = false;
    this.membersProfileId = null;
    this.membersProfileName = null;
    this.memberName = '';
    this.members = [];
    this.membersLoading = false;
  }

  onMembersDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeMembers();
    }
  }

  loadMembers(): void {
    if (!this.membersProfileId || this.membersLoading) {
      return;
    }
    this.membersLoading = true;
    this.meApi.listProfileMembers(this.membersProfileId).subscribe({
      next: (list) => {
        this.membersLoading = false;
        this.members = list;
      },
      error: (err: unknown) => {
        this.membersLoading = false;
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  addMember(): void {
    if (!this.membersProfileId) {
      return;
    }
    const name = this.memberName.trim();
    if (!name) {
      globalThis.alert('Indica un nombre');
      return;
    }
    this.meApi.createProfileMember(this.membersProfileId, name).subscribe({
      next: (m) => {
        this.members = [...this.members, m];
        this.memberName = '';
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  removeMember(memberId: string): void {
    if (!this.membersProfileId) {
      return;
    }
    this.meApi.deleteProfileMember(this.membersProfileId, memberId).subscribe({
      next: () => {
        this.members = this.members.filter((m) => m.id !== memberId);
      },
      error: (err: unknown) => {
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  openTeam(profile: UserProfile): void {
    this.teamModalOpen = true;
    this.teamProfileId = profile.id;
    this.teamProfileName = profile.name;
    this.inviteEmail = '';
    this.collaborators = [];
    this.loadCollaborators();
  }

  closeTeam(): void {
    this.teamModalOpen = false;
    this.teamProfileId = null;
    this.teamProfileName = null;
    this.inviteEmail = '';
    this.collaborators = [];
    this.teamLoading = false;
  }

  onTeamDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeTeam();
    }
  }

  loadCollaborators(): void {
    if (!this.teamProfileId || this.teamLoading) return;
    this.teamLoading = true;
    this.meApi.listCollaborators(this.teamProfileId).subscribe({
      next: (list) => {
        this.teamLoading = false;
        this.collaborators = list;
      },
      error: (err: unknown) => {
        this.teamLoading = false;
        globalThis.alert(formatApiHttpError(err));
      },
    });
  }

  sendInvite(): void {
    if (!this.teamProfileId) return;
    const email = this.inviteEmail.trim();
    if (!email) {
      globalThis.alert('Indica el email del usuario registrado');
      return;
    }
    this.meApi.inviteCollaborator(this.teamProfileId, email).subscribe({
      next: (row) => {
        const idx = this.collaborators.findIndex((c) => c.userId === row.userId);
        if (idx >= 0) {
          this.collaborators = this.collaborators.map((c, i) =>
            i === idx ? row : c,
          );
        } else {
          this.collaborators = [...this.collaborators, row];
        }
        this.inviteEmail = '';
      },
      error: (err: unknown) => globalThis.alert(formatApiHttpError(err)),
    });
  }

  revokeCollaborator(userId: string): void {
    if (!this.teamProfileId) return;
    this.meApi.revokeCollaborator(this.teamProfileId, userId).subscribe({
      next: () => {
        this.collaborators = this.collaborators.filter((c) => c.userId !== userId);
      },
      error: (err: unknown) => globalThis.alert(formatApiHttpError(err)),
    });
  }

  collaboratorStatusLabel(status: ProfileCollaborator['status']): string {
    const labels: Record<ProfileCollaborator['status'], string> = {
      pending: 'Pendiente',
      accepted: 'Activo',
      rejected: 'Rechazado',
      revoked: 'Revocado',
    };
    return labels[status] ?? status;
  }

  handleLogout(): void {
    this.auth.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
    });
  }

  goBack(): void {
    void this.router.navigate([subpageBackTarget(this.fromExpenses)]);
  }
}
