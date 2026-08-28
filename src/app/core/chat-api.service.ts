import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatProfileContext {
  mode: 'single' | 'overview';
  activeProfileName?: string;
  activeProfileType?: 'familiar' | 'grupal' | 'comercio';
  access?: 'owner' | 'collaborator';
  inventoryEnabled?: boolean;
  branchCount?: number;
  currency?: 'BS' | 'USD';
  otherProfilesSummary?: string[];
}

export interface ChatConfig {
  brandName: string;
  disclaimer: string;
  suggestions: string[];
  profileContext?: ChatProfileContext;
}

export interface ChatMessageResponse {
  sessionId: string;
  reply: string;
  blocked: boolean;
  ollamaAvailable: boolean;
}

const SESSION_KEY = 'gastos_help_chat_session';

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/chat`;

  readSessionId(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(SESSION_KEY);
  }

  persistSessionId(id: string): void {
    sessionStorage.setItem(SESSION_KEY, id);
  }

  clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
  }

  fetchConfig(profileId?: string | null): Promise<ChatConfig> {
    let params = new HttpParams();
    if (profileId?.trim()) {
      params = params.set('profileId', profileId.trim());
    }
    return firstValueFrom(
      this.http.get<ChatConfig>(`${this.base}/config`, { params }),
    );
  }

  sendMessage(
    message: string,
    sessionId?: string | null,
    profileId?: string | null,
  ): Promise<ChatMessageResponse> {
    return firstValueFrom(
      this.http.post<ChatMessageResponse>(`${this.base}/message`, {
        message,
        sessionId: sessionId ?? undefined,
        profileId: profileId?.trim() || undefined,
      }),
    );
  }
}
