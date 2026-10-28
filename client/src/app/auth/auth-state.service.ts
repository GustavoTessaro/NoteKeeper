import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthSession, TokenDto } from './auth.models';
import { AUTH_SESSION_STORAGE } from './auth.tokens';

const SESSION_STORAGE_KEY = 'notekeeper.session';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly storage = inject(AUTH_SESSION_STORAGE);
  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

  readonly sessao = this.sessionState.asReadonly();
  readonly usuario = computed(() => this.sessionState()?.usuario ?? null);

  iniciarSessao(token: TokenDto): boolean {
    const session: AuthSession = {
      usuario: {
        id: token.usuarioId,
        nome: token.nome,
        email: token.email,
      },
      accessToken: token.accessToken,
      dataExpiracaoEmUtc: token.dataExpiracaoEmUtc,
    };

    if (!this.isValidSession(session)) {
      this.limparSessao();
      return false;
    }

    this.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.sessionState.set(session);
    return true;
  }

  consultarSessao(): AuthSession | null {
    const session = this.sessionState();

    if (session && !this.isValidSession(session)) {
      this.limparSessao();
      return null;
    }

    return session;
  }

  limparSessao(): void {
    this.storage.removeItem(SESSION_STORAGE_KEY);
    this.sessionState.set(null);
  }

  private readStoredSession(): AuthSession | null {
    const storedSession = this.storage.getItem(SESSION_STORAGE_KEY);

    if (!storedSession) {
      return null;
    }

    let parsedSession: unknown;
    try {
      parsedSession = JSON.parse(storedSession);
    } catch {
      this.storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    if (!this.isValidSession(parsedSession)) {
      this.storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsedSession;
  }

  private isValidSession(value: unknown): value is AuthSession {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const session = value as Partial<AuthSession>;
    const user = session.usuario;
    const expiration = Date.parse(session.dataExpiracaoEmUtc ?? '');

    return (
      !!user &&
      typeof user.id === 'string' &&
      user.id.length > 0 &&
      typeof user.nome === 'string' &&
      user.nome.length > 0 &&
      typeof user.email === 'string' &&
      user.email.length > 0 &&
      typeof session.accessToken === 'string' &&
      session.accessToken.length > 0 &&
      Number.isFinite(expiration) &&
      expiration > Date.now()
    );
  }
}
