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
import { CategoryForm } from './category-form';

describe('CategoryForm', () => {
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

  function setTitle(harness: RouterTestingHarness, title: string): void {
    const input = harness.routeNativeElement?.querySelector<HTMLInputElement>('#titulo');
    if (!input) {
      throw new Error('Category title field was not rendered.');
    }

    input.value = title;
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
  }

  function submit(harness: RouterTestingHarness): void {
    const form = harness.routeNativeElement?.querySelector('form');
    if (!form) {
      throw new Error('Category form was not rendered.');
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
  }

  async function openCreate(): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/categorias/nova', CategoryForm);
    return harness;
  }

  async function openEdit(id = 'category-id'): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/app/categorias/${id}/editar`, CategoryForm);
    return harness;
  }

  function expectReloadedList(): void {
    httpTesting.expectOne('http://localhost:5146/categorias').flush([
      { id: 'category-id', titulo: 'Pessoal' },
    ]);
  }

  it('creates a category with trimmed title and returns to the refreshed list', async () => {
    const harness = await openCreate();
    setTitle(harness, '  Pessoal  ');
    submit(harness);

    const request = httpTesting.expectOne('http://localhost:5146/categorias');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ titulo: 'Pessoal' });
    request.flush({ id: 'category-id', titulo: 'Pessoal' }, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app/categorias');
    expectReloadedList();
  });

  it('loads the existing category and updates it with a trimmed title', async () => {
    const harness = await openEdit();
    const getRequest = httpTesting.expectOne('http://localhost:5146/categorias/category-id');
    expect(getRequest.request.method).toBe('GET');
    getRequest.flush({ id: 'category-id', titulo: 'Trabalho' });
    harness.detectChanges();
    expect((harness.routeNativeElement?.querySelector('#titulo') as HTMLInputElement).value).toBe(
      'Trabalho',
    );

    setTitle(harness, '  Pessoal  ');
    submit(harness);

    const updateRequest = httpTesting.expectOne('http://localhost:5146/categorias/category-id');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({ titulo: 'Pessoal' });
    updateRequest.flush({ id: 'category-id', titulo: 'Pessoal' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app/categorias');
    expectReloadedList();
  });

  it.each([
    ['', 'Informe o título da categoria.'],
    ['A', 'O título deve ter entre 2 e 100 caracteres.'],
    ['A'.repeat(101), 'O título deve ter entre 2 e 100 caracteres.'],
  ])('validates title %s before sending a request', async (title, message) => {
    const harness = await openCreate();
    setTitle(harness, title);
    submit(harness);

    expect(harness.routeNativeElement?.textContent).toContain(message);
    httpTesting.expectNone('http://localhost:5146/categorias');
  });

  it('shows the API validation error for HTTP 400', async () => {
    const harness = await openCreate();
    setTitle(harness, 'Pessoal');
    submit(harness);

    httpTesting.expectOne('http://localhost:5146/categorias').flush(
      { title: 'Requisição inválida', errors: { titulo: ['Título inválido'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'O título deve ter entre 2 e 100 caracteres.',
    );
  });

  it('shows a conflict message when the title already exists', async () => {
    const harness = await openCreate();
    setTitle(harness, 'Pessoal');
    submit(harness);

    httpTesting.expectOne('http://localhost:5146/categorias').flush(
      { title: 'Conflito', detail: 'internal details' },
      { status: 409, statusText: 'Conflict' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Já existe uma categoria com este título.',
    );
    expect(harness.routeNativeElement?.textContent).not.toContain('internal details');
  });

  it('shows not found when the requested category does not exist', async () => {
    const harness = await openEdit();
    httpTesting.expectOne('http://localhost:5146/categorias/category-id').flush(
      { title: 'Recurso não encontrado' },
      { status: 404, statusText: 'Not Found' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Categoria não encontrada.');
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
  });

  it('shows a friendly message when the save request fails to connect', async () => {
    const harness = await openCreate();
    setTitle(harness, 'Pessoal');
    submit(harness);

    httpTesting.expectOne('http://localhost:5146/categorias').error(new ProgressEvent('error'));
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Não foi possível salvar a categoria. Verifique sua conexão e tente novamente.',
    );
  });

  it('blocks duplicate submissions while the request is pending', async () => {
    const harness = await openCreate();
    setTitle(harness, 'Pessoal');
    submit(harness);
    submit(harness);

    const request = httpTesting.expectOne('http://localhost:5146/categorias');
    expect(request.request.body).toEqual({ titulo: 'Pessoal' });
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
    request.flush({ id: 'category-id', titulo: 'Pessoal' }, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();
    expectReloadedList();
  });

  it('cancels without saving and returns to the category list', async () => {
    const harness = await openCreate();
    setTitle(harness, 'Não salvar');
    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app/categorias"]')
      ?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app/categorias');
    const request = httpTesting.expectOne('http://localhost:5146/categorias');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
