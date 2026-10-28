import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { AuthStateService } from '../../auth/auth-state.service';
import { authInterceptor } from '../../auth/auth.interceptor';
import { API_BASE_URL, AUTH_SESSION_STORAGE } from '../../auth/auth.tokens';
import { WorkspaceHome } from './workspace-home';

describe('WorkspaceHome', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146' },
        { provide: AUTH_SESSION_STORAGE, useValue: sessionStorage },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStateService).iniciarSessao({
      usuarioId: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
      accessToken: 'access-token',
      dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
    });
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('shows the signed-in user and logs out before clearing the session', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/app', WorkspaceHome);
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.textContent).toContain('Ana');
    expect(element.textContent).toContain('ana@example.com');

    const button = element.querySelector('button') as HTMLButtonElement;
    button.click();
    button.click();
    harness.fixture.detectChanges();

    const request = httpTesting.expectOne('http://localhost:5146/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    expect(button.disabled).toBe(true);

    request.flush(null);
    await harness.fixture.whenStable();

    expect(component).toBeInstanceOf(WorkspaceHome);
    expect(TestBed.inject(AuthStateService).sessao()).toBeNull();
    expect(sessionStorage.getItem('notekeeper.session')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');

    await harness.navigateByUrl('/app');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fapp');
  });

  it('clears the local session and redirects even when logout fails', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app', WorkspaceHome);
    const element = harness.routeNativeElement as HTMLElement;

    (element.querySelector('button') as HTMLButtonElement).click();
    httpTesting
      .expectOne('http://localhost:5146/auth/logout')
      .error(new ProgressEvent('error'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(AuthStateService).sessao()).toBeNull();
    expect(sessionStorage.getItem('notekeeper.session')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('clears the local session when the server rejects the logout token', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app', WorkspaceHome);

    (harness.routeNativeElement?.querySelector('button') as HTMLButtonElement).click();
    httpTesting.expectOne('http://localhost:5146/auth/logout').flush(
      { title: 'Não autorizado' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await harness.fixture.whenStable();

    expect(TestBed.inject(AuthStateService).sessao()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
