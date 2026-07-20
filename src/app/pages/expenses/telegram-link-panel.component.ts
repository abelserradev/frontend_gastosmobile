import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { formatApiHttpError } from '../../core/http-error.util';
import {
  MeApiService,
  type TelegramLinkCodeResponse,
  type TelegramLinkStatusResponse,
} from '../../core/me-api.service';

@Component({
  selector: 'app-telegram-link-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './telegram-link-panel.component.html',
})
export class TelegramLinkPanelComponent implements OnInit {
  private readonly meApi = inject(MeApiService);

  readonly status = signal<TelegramLinkStatusResponse | null>(null);
  readonly linkCode = signal<TelegramLinkCodeResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.refreshStatus();
  }

  refreshStatus(): void {
    this.loading.set(true);
    this.error.set(null);
    this.meApi.getTelegramLinkStatus().subscribe({
      next: (s) => {
        this.status.set(s);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(formatApiHttpError(err));
        this.loading.set(false);
      },
    });
  }

  generateCode(): void {
    this.loading.set(true);
    this.error.set(null);
    this.meApi.createTelegramLinkCode().subscribe({
      next: (res) => {
        this.linkCode.set(res);
        this.loading.set(false);
        this.refreshStatus();
      },
      error: (err: unknown) => {
        this.error.set(formatApiHttpError(err));
        this.loading.set(false);
      },
    });
  }

  unlink(): void {
    if (!globalThis.confirm('¿Desvincular Telegram de esta cuenta?')) {
      return;
    }
    this.loading.set(true);
    this.meApi.unlinkTelegram().subscribe({
      next: () => {
        this.linkCode.set(null);
        this.refreshStatus();
      },
      error: (err: unknown) => {
        this.error.set(formatApiHttpError(err));
        this.loading.set(false);
      },
    });
  }
}
