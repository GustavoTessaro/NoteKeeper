import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStateService } from './auth-state.service';
import { TokenDto } from './auth.models';
import { AUTH_SESSION_STORAGE } from './auth.tokens';

const SESSION_STORAGE_KEY = 'notekeeper.session';

function createTokenDto(expiration = '2099-01-01T00:00:00Z'): TokenDto {
  return {
    usuarioId: 'user-id',
    nome: 'Ana',
    email: 'ana@example.com',
    accessToken: 'access-token',
    dataExpiracaoEmUtc: expiration,
  };
}

describe('AuthStateService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_SESSION_STORAGE, useValue: sessionStorage }],
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('starts without an authenticated session', () => {
    const service = TestBed.inject(AuthStateService);

    expect(service.sessao()).toBeNull();
    expect(service.usuario()).toBeNull();
    expect(service.consultarSessao()).toBeNull();
  });

  it('persists only the minimal session and exposes the user and session signals', () => {
    const service = TestBed.inject(AuthStateService);

    expect(service.iniciarSessao(createTokenDto())).toBe(true);
    expect(service.sessao()).toEqual({
      usuario: {
        id: 'user-id',
        nome: 'Ana',
        email: 'ana@example.com',
      },
      accessToken: 'access-token',
      dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
    });
    expect(service.usuario()).toEqual({
      id: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
    });
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(service.sessao());
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toContain('senha');
  });

  it('recovers a valid session from sessionStorage on initialization', () => {
    const service = TestBed.inject(AuthStateService);
    service.iniciarSessao(createTokenDto());

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_SESSION_STORAGE, useValue: sessionStorage }],
    });
    const restoredService = TestBed.inject(AuthStateService);

    expect(restoredService.consultarSessao()).not.toBeNull();
    expect(restoredService.usuario()?.email).toBe('ana@example.com');
  });

  it('clears session state and persisted data', () => {
    const service = TestBed.inject(AuthStateService);
    service.iniciarSessao(createTokenDto());

    service.limparSessao();

    expect(service.sessao()).toBeNull();
    expect(service.usuario()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('rejects and clears an expired token at session start', () => {
    const service = TestBed.inject(AuthStateService);

    expect(service.iniciarSessao(createTokenDto('2000-01-01T00:00:00Z'))).toBe(false);
    expect(service.consultarSessao()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('clears an in-memory session when it expires before being queried', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = TestBed.inject(AuthStateService);

    expect(service.iniciarSessao(createTokenDto('2026-01-01T00:00:01Z'))).toBe(true);
    vi.setSystemTime(new Date('2026-01-01T00:00:02Z'));

    expect(service.consultarSessao()).toBeNull();
    expect(service.sessao()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('removes expired or malformed persisted sessions during initialization', () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        usuario: { id: 'user-id', nome: 'Ana', email: 'ana@example.com' },
        accessToken: 'access-token',
        dataExpiracaoEmUtc: '2000-01-01T00:00:00Z',
      }),
    );

    const expiredService = TestBed.inject(AuthStateService);
    expect(expiredService.sessao()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();

    sessionStorage.setItem(SESSION_STORAGE_KEY, '{invalid json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_SESSION_STORAGE, useValue: sessionStorage }],
    });
    const malformedService = TestBed.inject(AuthStateService);
    expect(malformedService.sessao()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
