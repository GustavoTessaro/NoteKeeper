import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Login } from './auth/login/login';
import { API_BASE_URL, AUTH_SESSION_STORAGE } from './auth/auth.tokens';
import { WorkspaceHome } from './workspace/home/workspace-home';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146' },
        { provide: AUTH_SESSION_STORAGE, useValue: sessionStorage },
      ],
    });
  });

  it('loads the login page at /login', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/login', Login);

    expect(component).toBeInstanceOf(Login);
  });

  it('loads the workspace page at /app without requiring authentication', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/app', WorkspaceHome);

    expect(component).toBeInstanceOf(WorkspaceHome);
  });

  it('redirects the root and unknown paths to /login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/login');

    await harness.navigateByUrl('/unknown');
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
