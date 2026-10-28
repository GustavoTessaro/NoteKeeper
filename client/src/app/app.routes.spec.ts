import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach } from 'vitest';
import { routes } from './app.routes';
import { Login } from './auth/login/login';
import { API_BASE_URL, AUTH_SESSION_STORAGE } from './auth/auth.tokens';
import { AuthStateService } from './auth/auth-state.service';
import { WorkspaceHome } from './workspace/home/workspace-home';
import { CategoriesPage } from './categories/categories-page/categories-page';
import { NotesPage } from './notes/notes-page/notes-page';
import { NoteForm } from './notes/note-form/note-form';

describe('app routes', () => {
  beforeEach(() => {
    sessionStorage.clear();
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

  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('loads the login page at /login', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/login', Login);

    expect(component).toBeInstanceOf(Login);
  });

  it('loads the workspace page at /app with a valid session', async () => {
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
  });

  it('loads the categories page under the protected /app route', async () => {
    TestBed.inject(AuthStateService).iniciarSessao({
      usuarioId: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
      accessToken: 'access-token',
      dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
    });

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/app/categorias', CategoriesPage);
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:5146/categorias',
    );

    expect(component).toBeInstanceOf(CategoriesPage);
    request.flush([]);
  });

  it('loads the notes page under the protected /app route', async () => {
    TestBed.inject(AuthStateService).iniciarSessao({
      usuarioId: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
      accessToken: 'access-token',
      dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
    });

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/app/notas', NotesPage);

    expect(component).toBeInstanceOf(NotesPage);
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:5146/notas')
      .flush([]);
  });

  it('redirects an unauthenticated direct visit to /app/notas to login', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/app/notas');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fapp%2Fnotas');
  });

  it.each(['/app/notas/nova', '/app/notas/note-id/editar'])(
    'redirects unauthenticated users from note form route %s to login',
    async (url) => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(url);

      expect(TestBed.inject(Router).url).toBe(`/login?returnUrl=${encodeURIComponent(url)}`);
    },
  );

  it.each(['/app/notas/nova', '/app/notas/note-id/editar'])(
    'loads protected note form route %s with a valid session',
    async (url) => {
      TestBed.inject(AuthStateService).iniciarSessao({
        usuarioId: 'user-id',
        nome: 'Ana',
        email: 'ana@example.com',
        accessToken: 'access-token',
        dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
      });

      const harness = await RouterTestingHarness.create();
      const component = await harness.navigateByUrl(url, NoteForm);

      expect(component).toBeInstanceOf(NoteForm);
      TestBed.inject(HttpTestingController)
        .expectOne('http://localhost:5146/categorias')
        .flush([]);

      if (url.includes('/editar')) {
        TestBed.inject(HttpTestingController)
          .expectOne('http://localhost:5146/notas/note-id')
          .flush({
            id: 'note-id',
            titulo: 'Nota',
            descricao: null,
            status: 'Ativa',
            categorias: [],
            criadoEm: '2026-10-28T15:00:00Z',
            atualizadoEm: '2026-10-28T16:00:00Z',
          });
      }
    },
  );

  it('navigates from workspace to categories using the visible link', async () => {
    TestBed.inject(AuthStateService).iniciarSessao({
      usuarioId: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
      accessToken: 'access-token',
      dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app', WorkspaceHome);
    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app/categorias"]')
      ?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app/categorias');
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:5146/categorias')
      .flush([]);
  });

  it('navigates from workspace to notes using the visible link', async () => {
    TestBed.inject(AuthStateService).iniciarSessao({
      usuarioId: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
      accessToken: 'access-token',
      dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app', WorkspaceHome);
    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app/notas"]')
      ?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app/notas');
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:5146/notas')
      .flush([]);
  });

  it('redirects an unauthenticated categories route to login', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/app/categorias');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fapp%2Fcategorias');
  });

  it.each(['/app/categorias/nova', '/app/categorias/category-id/editar'])(
    'redirects unauthenticated users from category form route %s to login',
    async (url) => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(url);

      expect(TestBed.inject(Router).url).toBe(`/login?returnUrl=${encodeURIComponent(url)}`);
    },
  );

  it('redirects the root and unknown paths to /login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/login');

    await harness.navigateByUrl('/unknown');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('navigates between login and registration using their links', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');

    const registerLink = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(
      'a[href="/cadastro"]',
    );
    expect(registerLink).not.toBeNull();
    registerLink?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/cadastro');

    const loginLink = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(
      'a[href="/login"]',
    );
    expect(loginLink).not.toBeNull();
    loginLink?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
