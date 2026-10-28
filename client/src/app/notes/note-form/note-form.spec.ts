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
import { CategoriaDto } from '../../categories/category.models';
import { NotaDto, StatusNota } from '../note.models';
import { NoteForm } from './note-form';

const categories: CategoriaDto[] = [
  { id: 'category-1', titulo: 'Pessoal' },
  { id: 'category-2', titulo: 'Trabalho' },
];

function createNote(status: StatusNota = 'Ativa'): NotaDto {
  return {
    id: 'note-id',
    titulo: 'Nota existente',
    descricao: 'Descrição existente',
    status,
    categorias: [{ id: 'category-1', titulo: 'Pessoal' }],
    criadoEm: '2026-10-28T15:00:00Z',
    atualizadoEm: '2026-10-28T16:00:00Z',
  };
}

describe('NoteForm', () => {
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

  async function openCreate(availableCategories = categories): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas/nova', NoteForm);
    httpTesting.expectOne('http://localhost:5146/categorias').flush(availableCategories);
    harness.detectChanges();
    return harness;
  }

  async function openEdit(
    status: StatusNota = 'Ativa',
    categoryIds = ['category-1'],
  ): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas/note-id/editar', NoteForm);
    httpTesting.expectOne('http://localhost:5146/categorias').flush(categories);
    httpTesting.expectOne('http://localhost:5146/notas/note-id').flush({
      ...createNote(status),
      categorias: categories.filter((category) => categoryIds.includes(category.id)),
    });
    harness.detectChanges();
    return harness;
  }

  function setField(harness: RouterTestingHarness, id: string, value: string): void {
    const input = harness.routeNativeElement?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(`#${id}`);
    if (!input) {
      throw new Error(`Form field ${id} was not rendered.`);
    }

    input.value = value;
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
  }

  function setCategory(harness: RouterTestingHarness, id: string, checked: boolean): void {
    const checkbox = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      `input[type="checkbox"][value="${id}"]`,
    );
    if (!checkbox) {
      throw new Error(`Category checkbox ${id} was not rendered.`);
    }

    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event('change'));
    harness.detectChanges();
  }

  function submit(harness: RouterTestingHarness): void {
    const form = harness.routeNativeElement?.querySelector('form');
    if (!form) {
      throw new Error('Note form was not rendered.');
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
  }

  function expectNotesReload(): void {
    httpTesting.expectOne('http://localhost:5146/categorias').flush(categories);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
  }

  it('creates a note with categories and omits status from the payload', async () => {
    const harness = await openCreate();
    setField(harness, 'titulo', '  Nova nota  ');
    setField(harness, 'descricao', '  Descrição nova  ');
    setCategory(harness, 'category-2', true);
    submit(harness);

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      titulo: 'Nova nota',
      descricao: 'Descrição nova',
      categoriaIds: ['category-2'],
    });
    expect(request.request.body).not.toHaveProperty('status');
    request.flush(
      {
        ...createNote(),
        titulo: 'Nova nota',
        descricao: 'Descrição nova',
        categorias: [categories[1]],
      },
      { status: 201, statusText: 'Created' },
    );
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app/notas');
    expectNotesReload();
  });

  it('creates a note without categories and sends an empty category ID array', async () => {
    const harness = await openCreate([]);
    setField(harness, 'titulo', 'Sem categoria');
    setField(harness, 'descricao', '   ');
    submit(harness);

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    expect(request.request.body).toEqual({
      titulo: 'Sem categoria',
      descricao: null,
      categoriaIds: [],
    });
    request.flush(
      { ...createNote(), titulo: 'Sem categoria', descricao: null, categorias: [] },
      { status: 201, statusText: 'Created' },
    );
    await harness.fixture.whenStable();
    expectNotesReload();
  });

  it.each<StatusNota>(['Ativa', 'Arquivada'])(
    'loads an existing note and preserves its %s status on update',
    async (status) => {
      const harness = await openEdit(status);
      expect((harness.routeNativeElement?.querySelector('#titulo') as HTMLInputElement).value).toBe(
        'Nota existente',
      );
      expect(
        (harness.routeNativeElement?.querySelector('#descricao') as HTMLTextAreaElement).value,
      ).toBe('Descrição existente');
      expect(
        (harness.routeNativeElement?.querySelector('input[value="category-1"]') as HTMLInputElement)
          .checked,
      ).toBe(true);

      setField(harness, 'titulo', '  Nota atualizada  ');
      setField(harness, 'descricao', '  Detalhes  ');
      submit(harness);

      const request = httpTesting.expectOne('http://localhost:5146/notas/note-id');
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({
        titulo: 'Nota atualizada',
        descricao: 'Detalhes',
        status,
        categoriaIds: ['category-1'],
      });
      request.flush({ ...createNote(status), titulo: 'Nota atualizada', descricao: 'Detalhes' });
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/app/notas');
      expectNotesReload();
    },
  );

  it('sends the complete selected category set and an empty array when all are removed', async () => {
    const harness = await openEdit('Ativa', ['category-1', 'category-2']);
    setCategory(harness, 'category-1', false);
    setCategory(harness, 'category-2', false);
    submit(harness);

    const request = httpTesting.expectOne('http://localhost:5146/notas/note-id');
    expect(request.request.body.categoriaIds).toEqual([]);
    request.flush({ ...createNote(), categorias: [] });
    await harness.fixture.whenStable();
    expectNotesReload();
  });

  it.each([
    ['', 'Informe o título da nota.'],
    ['  ', 'Informe o título da nota.'],
    ['A', 'O título deve ter entre 2 e 100 caracteres.'],
    ['A'.repeat(101), 'O título deve ter entre 2 e 100 caracteres.'],
  ])('validates title %s before sending a request', async (title, message) => {
    const harness = await openCreate();
    setField(harness, 'titulo', title);
    submit(harness);

    expect(harness.routeNativeElement?.textContent).toContain(message);
    httpTesting.expectNone('http://localhost:5146/notas');
  });

  it('rejects descriptions longer than 300 characters after trimming', async () => {
    const harness = await openCreate();
    setField(harness, 'titulo', 'Título válido');
    setField(harness, 'descricao', `  ${'a'.repeat(301)}  `);
    submit(harness);

    expect(harness.routeNativeElement?.textContent).toContain(
      'A descrição deve ter no máximo 300 caracteres.',
    );
    httpTesting.expectNone('http://localhost:5146/notas');
  });

  it('maps HTTP 400 validation errors to a friendly message', async () => {
    const harness = await openCreate();
    setField(harness, 'titulo', 'Título válido');
    submit(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush(
      { title: 'Requisição inválida', errors: { descricao: ['Inválida'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'A descrição deve ter no máximo 300 caracteres.',
    );
  });

  it('handles a duplicate-title conflict without exposing server details', async () => {
    const harness = await openCreate();
    setField(harness, 'titulo', 'Título repetido');
    submit(harness);

    httpTesting.expectOne('http://localhost:5146/notas').flush(
      { title: 'Conflito', detail: 'internal details' },
      { status: 409, statusText: 'Conflict' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Já existe uma nota com este título.',
    );
    expect(harness.routeNativeElement?.textContent).not.toContain('internal details');
  });

  it('handles a missing selected category with a friendly 404 message', async () => {
    const harness = await openCreate();
    setField(harness, 'titulo', 'Título válido');
    setCategory(harness, 'category-1', true);
    submit(harness);

    httpTesting.expectOne('http://localhost:5146/notas').flush(
      { title: 'Recurso não encontrado' },
      { status: 404, statusText: 'Not Found' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'A nota ou uma das categorias selecionadas não foi encontrada.',
    );
  });

  it('shows note not found when editing an unavailable note', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas/note-id/editar', NoteForm);
    httpTesting.expectOne('http://localhost:5146/categorias').flush(categories);
    httpTesting.expectOne('http://localhost:5146/notas/note-id').flush(
      { title: 'Recurso não encontrado' },
      { status: 404, statusText: 'Not Found' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Nota não encontrada.');
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
  });

  it('prevents editing save when categories fail to load and allows retry', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas/note-id/editar', NoteForm);
    httpTesting.expectOne('http://localhost:5146/notas/note-id').flush(createNote());
    httpTesting.expectOne('http://localhost:5146/categorias').flush(
      { title: 'Erro interno' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Não é possível salvar a edição até que as categorias sejam carregadas',
    );
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
    httpTesting.expectNone('http://localhost:5146/notas/note-id');

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button')
      ?.click();
    harness.detectChanges();
    httpTesting.expectOne('http://localhost:5146/categorias').flush(categories);
    harness.detectChanges();

    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(false);
    expect(
      (harness.routeNativeElement?.querySelector('input[value="category-1"]') as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it('blocks duplicate submissions while a save is pending', async () => {
    const harness = await openCreate();
    setField(harness, 'titulo', 'Nova nota');
    submit(harness);
    submit(harness);

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    expect(request.request.body).toEqual({ titulo: 'Nova nota', descricao: null, categoriaIds: [] });
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
    request.flush(
      { ...createNote(), titulo: 'Nova nota', descricao: null, categorias: [] },
      { status: 201, statusText: 'Created' },
    );
    await harness.fixture.whenStable();
    expectNotesReload();
  });

  it('cancels without saving', async () => {
    const harness = await openCreate();
    setField(harness, 'titulo', 'Não salvar');
    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app/notas"]')
      ?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app/notas');
    httpTesting.expectNone('POST http://localhost:5146/notas');
    httpTesting.expectOne('http://localhost:5146/categorias').flush(categories);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
  });
});
