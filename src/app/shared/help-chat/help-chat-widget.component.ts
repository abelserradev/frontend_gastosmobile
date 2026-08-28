import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatApiService } from '../../core/chat-api.service';

interface MensajeUi {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-help-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './help-chat-widget.component.html',
  styleUrl: './help-chat-widget.component.scss',
})
export class HelpChatWidgetComponent implements OnInit {
  /** Perfil activo en inventario u otra vista; en Gastos se omite (vista general). */
  readonly profileId = input<string | null>(null);

  private readonly chatApi = inject(ChatApiService);

  readonly abierto = signal(false);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensajes = signal<MensajeUi[]>([]);
  readonly sugerencias = signal<string[]>([]);
  readonly disclaimer = signal('');
  readonly perfilActivoLabel = signal<string | null>(null);
  entrada = '';

  private sessionId: string | null = null;

  constructor() {
    effect(() => {
      const pid = this.profileId();
      void this.cargarConfig(pid);
    });
  }

  ngOnInit(): void {
    this.sessionId = this.chatApi.readSessionId();
  }

  private async cargarConfig(profileId: string | null): Promise<void> {
    try {
      const cfg = await this.chatApi.fetchConfig(profileId);
      this.sugerencias.set(cfg.suggestions ?? []);
      this.disclaimer.set(cfg.disclaimer ?? '');
      const nombre = cfg.profileContext?.activeProfileName;
      this.perfilActivoLabel.set(nombre ?? null);
    } catch {
      this.sugerencias.set([
        '¿Cómo registro un gasto?',
        '¿Cómo funciona el inventario?',
      ]);
      this.perfilActivoLabel.set(null);
    }
  }

  toggle(): void {
    this.abierto.update((v) => !v);
  }

  reiniciar(): void {
    this.sessionId = null;
    this.chatApi.clearSession();
    this.mensajes.set([]);
    this.error.set(null);
  }

  async enviar(texto?: string): Promise<void> {
    const msg = (texto ?? this.entrada).trim();
    if (!msg || this.cargando()) {
      return;
    }
    this.error.set(null);
    this.cargando.set(true);
    this.entrada = '';
    this.mensajes.update((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', text: msg },
    ]);

    try {
      const resp = await this.chatApi.sendMessage(
        msg,
        this.sessionId,
        this.profileId(),
      );
      this.sessionId = resp.sessionId;
      this.chatApi.persistSessionId(resp.sessionId);
      this.mensajes.update((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', text: resp.reply },
      ]);
    } catch {
      this.error.set('No pudimos conectar con el asistente. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  onSubmit(ev: Event): void {
    ev.preventDefault();
    void this.enviar();
  }
}
