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
import { CategoriaDto } from '../category.models';
import { CategoriesPage } from './categories-page';

describe('CategoriesPage', () => {
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

  it('shows a loading state then displays the categories returned by the API', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/categorias', CategoriesPage);
    const request = httpTesting.expectOne('http://localhost:5146/categorias');

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    expect(harness.routeNativeElement?.textContent).toContain('Carregando categorias...');

    const categories: CategoriaDto[] = [
      { id: '1', titulo: 'Pessoal' },
      { id: '2', titulo: 'Trabalho' },
    ];
    request.flush(categories);
    harness.detectChanges();

    const items = harness.routeNativeElement?.querySelectorAll('li > span');
    expect(harness.routeNativeElement?.textContent).toContain('Pessoal');
    expect(harness.routeNativeElement?.textContent).toContain('Trabalho');
    expect(Array.from(items ?? []).map((item) => item.textContent?.trim())).toEqual([
      'Pessoal',
      'Trabalho',
    ]);
  });

  it('shows the empty state when the API returns no categories', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/categorias');

    httpTesting.expectOne('http://localhost:5146/categorias').flush([]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma categoria cadastrada');
  });

  it('shows a friendly error and retries the request', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/categorias');

    httpTesting.expectOne('http://localhost:5146/categorias').flush(
      { title: 'Erro interno', detail: 'internal details' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Não foi possível carregar as categorias.',
    );
    expect(harness.routeNativeElement?.textContent).not.toContain('internal details');

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button')
      ?.dispatchEvent(new Event('click'));
    harness.detectChanges();
    const retry = httpTesting.expectOne('http://localhost:5146/categorias');
    expect(harness.routeNativeElement?.textContent).toContain('Carregando categorias...');
    retry.flush([{ id: '1', titulo: 'Pessoal' }]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Pessoal');
  });

  it('navigates back to workspace', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/categorias');
    httpTesting.expectOne('http://localhost:5146/categorias').flush([]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app"]')
      ?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app');
  });

  it('provides working links for creating and editing categories', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/categorias');
    httpTesting
      .expectOne('http://localhost:5146/categorias')
      .flush([{ id: 'category-id', titulo: 'Trabalho' }]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app/categorias/nova"]')
      ?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/app/categorias/nova');

    await harness.navigateByUrl('/app/categorias');
    httpTesting
      .expectOne('http://localhost:5146/categorias')
      .flush([{ id: 'category-id', titulo: 'Trabalho' }]);
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app/categorias/category-id/editar"]')
      ?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/app/categorias/category-id/editar');
    httpTesting.expectOne('http://localhost:5146/categorias/category-id').flush({
      id: 'category-id',
      titulo: 'Trabalho',
    });
  });
});
