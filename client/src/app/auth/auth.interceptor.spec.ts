import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthStateService } from './auth-state.service';
import { authInterceptor } from './auth.interceptor';
import { API_BASE_URL, AUTH_SESSION_STORAGE } from './auth.tokens';

describe('authInterceptor', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146' },
        { provide: AUTH_SESSION_STORAGE, useValue: sessionStorage },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  function startSession(expiration = '2099-01-01T00:00:00Z'): void {
    TestBed.inject(AuthStateService).iniciarSessao({
      usuarioId: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
      accessToken: 'access-token',
      dataExpiracaoEmUtc: expiration,
    });
  }

  it('adds a bearer token to API requests when a session is valid', () => {
    startSession();
    TestBed.inject(HttpClient)
      .get('http://localhost:5146/notas', { headers: { 'X-Trace': 'request-id' } })
      .subscribe();

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    const storedSession = JSON.parse(sessionStorage.getItem('notekeeper.session')!);
    expect(request.request.headers.get('Authorization')).toBe(
      `Bearer ${storedSession.accessToken}`,
    );
    expect(request.request.headers.get('X-Trace')).toBe('request-id');
    request.flush([]);
  });

  it.each(['/auth/login', '/auth/cadastro'])(
    'does not add bearer to the public endpoint %s',
    (path) => {
      startSession();
      TestBed.inject(HttpClient)
        .post(`http://localhost:5146${path}`, {})
        .subscribe();

      const request = httpTesting.expectOne(`http://localhost:5146${path}`);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    },
  );

  it('does not send the API token to external URLs', () => {
    startSession();
    TestBed.inject(HttpClient)
      .get('https://example.com/data')
      .subscribe();

    const request = httpTesting.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('preserves existing headers while adding authorization', () => {
    startSession();
    TestBed.inject(HttpClient)
      .get('http://localhost:5146/notas', {
        headers: {
          Accept: 'application/json',
          'X-Request-Id': 'request-id',
        },
      })
      .subscribe();

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    const storedSession = JSON.parse(sessionStorage.getItem('notekeeper.session')!);
    expect(request.request.headers.get('Authorization')).toBe(
      `Bearer ${storedSession.accessToken}`,
    );
    expect(request.request.headers.get('Accept')).toBe('application/json');
    expect(request.request.headers.get('X-Request-Id')).toBe('request-id');
    request.flush([]);
  });

  it('does not send an expired token', () => {
    startSession('2000-01-01T00:00:00Z');
    TestBed.inject(HttpClient)
      .get('http://localhost:5146/notas')
      .subscribe();

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(sessionStorage.getItem('notekeeper.session')).toBeNull();
    request.flush([]);
  });
});
