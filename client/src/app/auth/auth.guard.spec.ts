import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../app.routes';
import { API_BASE_URL, AUTH_SESSION_STORAGE } from './auth.tokens';
import { AuthStateService } from './auth-state.service';
import { Login } from './login/login';
import { WorkspaceHome } from '../workspace/home/workspace-home';

describe('authGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146' },
        { provide: AUTH_SESSION_STORAGE, useValue: sessionStorage },
      ],
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('allows navigation to /app with a valid session', async () => {
    TestBed.inject(AuthStateService).iniciarSessao({
      usuarioId: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
      accessToken: 'access-token',
      dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
    });

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/app', WorkspaceHome);

    expect(component).toBeInstanceOf(WorkspaceHome);
    expect(TestBed.inject(Router).url).toBe('/app');
  });

  it('redirects to login and remembers the target when there is no session', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/app', Login);

    expect(component).toBeInstanceOf(Login);
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fapp');
  });

  it('redirects to login and removes an expired stored session', async () => {
    sessionStorage.setItem(
      'notekeeper.session',
      JSON.stringify({
        usuario: { id: 'user-id', nome: 'Ana', email: 'ana@example.com' },
        accessToken: 'expired-token',
        dataExpiracaoEmUtc: '2000-01-01T00:00:00Z',
      }),
    );

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fapp');
    expect(sessionStorage.getItem('notekeeper.session')).toBeNull();
  });
});
