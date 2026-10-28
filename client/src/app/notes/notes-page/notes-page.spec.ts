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
import { NotaDto } from '../note.models';
import { NotesPage } from './notes-page';

describe('NotesPage', () => {
  let httpTesting: HttpTestingController;

  async function abrirNotas(harness: RouterTestingHarness): Promise<void> {
    await harness.navigateByUrl('/app/notas', NotesPage);
    httpTesting.expectOne('http://localhost:5146/categorias').flush([
      { id: 'category-1', titulo: 'Trabalho' },
      { id: 'category-2', titulo: 'Pessoal' },
    ]);
  }

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

  it('loads categories and notes independently and retries category loading after an error', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas', NotesPage);

    expect(harness.routeNativeElement?.textContent).toContain('Carregando categorias...');
    expect(harness.routeNativeElement?.textContent).toContain('Carregando notas...');
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    httpTesting.expectOne('http://localhost:5146/categorias').flush(
      { detail: 'internal details' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Não foi possível carregar as categorias.',
    );
    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');

    Array.from(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.includes('Tentar novamente'))
      ?.click();
    const retry = httpTesting.expectOne('http://localhost:5146/categorias');
    retry.flush([{ id: 'category-1', titulo: 'Trabalho' }]);
    harness.detectChanges();

    expect(
      harness.routeNativeElement?.querySelector(
        'input[aria-label="Filtrar por categoria Trabalho"]',
      ),
    ).not.toBeNull();
  });

  it('filters by one and multiple categories using the API AND query semantics', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    const trabalho = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[aria-label="Filtrar por categoria Trabalho"]',
    );
    expect(trabalho).not.toBeNull();
    trabalho!.checked = true;
    trabalho!.dispatchEvent(new Event('change'));
    harness.detectChanges();

    const singleFilter = httpTesting.expectOne(
      'http://localhost:5146/notas?categoriaIds=category-1',
    );
    expect(singleFilter.request.method).toBe('GET');
    expect(singleFilter.request.params.getAll('categoriaIds')).toEqual(['category-1']);
    singleFilter.flush([
      {
        id: 'work-note',
        titulo: 'Nota de trabalho',
        descricao: null,
        status: 'Ativa',
        categorias: [{ id: 'category-1', titulo: 'Trabalho' }],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    const pessoal = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[aria-label="Filtrar por categoria Pessoal"]',
    );
    pessoal!.checked = true;
    pessoal!.dispatchEvent(new Event('change'));
    harness.detectChanges();

    const multipleFilters = httpTesting.expectOne(
      'http://localhost:5146/notas?categoriaIds=category-1&categoriaIds=category-2',
    );
    expect(multipleFilters.request.method).toBe('GET');
    expect(multipleFilters.request.params.getAll('categoriaIds')).toEqual([
      'category-1',
      'category-2',
    ]);
    multipleFilters.flush([
      {
        id: 'and-note',
        titulo: 'Nota nas duas categorias',
        descricao: null,
        status: 'Ativa',
        categorias: [
          { id: 'category-1', titulo: 'Trabalho' },
          { id: 'category-2', titulo: 'Pessoal' },
        ],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Nota nas duas categorias');
    expect(trabalho?.checked).toBe(true);
    expect(pessoal?.checked).toBe(true);
  });

  it('clears selected categories and lists without query parameters', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    const category = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[aria-label="Filtrar por categoria Trabalho"]',
    )!;
    category.checked = true;
    category.dispatchEvent(new Event('change'));
    httpTesting
      .expectOne('http://localhost:5146/notas?categoriaIds=category-1')
      .flush([]);
    harness.detectChanges();

    const clearButton = Array.from(
      harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) => button.textContent?.includes('Limpar filtros'));
    expect(clearButton).toBeDefined();
    clearButton?.click();
    harness.detectChanges();

    const unfiltered = httpTesting.expectOne('http://localhost:5146/notas');
    expect(unfiltered.request.params.keys()).toEqual([]);
    unfiltered.flush([]);
    harness.detectChanges();

    expect(category.checked).toBe(false);
    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');
    expect(harness.routeNativeElement?.textContent).not.toContain(
      'Nenhuma nota corresponde aos filtros',
    );
  });

  it('shows a filtered empty state distinct from the no-notes state', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    const category = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[aria-label="Filtrar por categoria Trabalho"]',
    )!;
    category.checked = true;
    category.dispatchEvent(new Event('change'));
    httpTesting
      .expectOne('http://localhost:5146/notas?categoriaIds=category-1')
      .flush([]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Nenhuma nota corresponde aos filtros',
    );
    expect(harness.routeNativeElement?.textContent).not.toContain('Nenhuma nota cadastrada');
  });

  it('retries a failed filtered notes request without clearing selected categories', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    const category = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[aria-label="Filtrar por categoria Trabalho"]',
    )!;
    category.checked = true;
    category.dispatchEvent(new Event('change'));
    httpTesting.expectOne('http://localhost:5146/notas?categoriaIds=category-1').flush(
      { detail: 'internal details' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Não foi possível carregar as notas.',
    );
    expect(harness.routeNativeElement?.textContent).not.toContain('internal details');

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button:has(svg[lucideRefreshCw])')
      ?.click();
    const retry = httpTesting.expectOne(
      'http://localhost:5146/notas?categoriaIds=category-1',
    );
    expect(retry.request.params.getAll('categoriaIds')).toEqual(['category-1']);
    retry.flush([]);
    harness.detectChanges();

    expect(category.checked).toBe(true);
    expect(harness.routeNativeElement?.textContent).toContain(
      'Nenhuma nota corresponde aos filtros',
    );
  });

  it('ignores stale note responses when category selections change quickly', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    const trabalho = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[aria-label="Filtrar por categoria Trabalho"]',
    )!;
    trabalho.checked = true;
    trabalho.dispatchEvent(new Event('change'));
    const firstRequest = httpTesting.expectOne(
      'http://localhost:5146/notas?categoriaIds=category-1',
    );

    const pessoal = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[aria-label="Filtrar por categoria Pessoal"]',
    )!;
    pessoal.checked = true;
    pessoal.dispatchEvent(new Event('change'));
    const latestRequest = httpTesting.expectOne(
      'http://localhost:5146/notas?categoriaIds=category-1&categoriaIds=category-2',
    );

    latestRequest.flush([
      {
        id: 'latest-note',
        titulo: 'Resultado mais recente',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();
    firstRequest.flush([
      {
        id: 'stale-note',
        titulo: 'Resultado antigo',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Resultado mais recente');
    expect(harness.routeNativeElement?.textContent).not.toContain('Resultado antigo');
    expect(trabalho.checked).toBe(true);
    expect(pessoal.checked).toBe(true);
  });

  it('preserves selected filters after status updates and deletion', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    const category = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[aria-label="Filtrar por categoria Trabalho"]',
    )!;
    category.checked = true;
    category.dispatchEvent(new Event('change'));
    httpTesting.expectOne('http://localhost:5146/notas?categoriaIds=category-1').flush([
      {
        id: 'filtered-note',
        titulo: 'Nota filtrada',
        descricao: null,
        status: 'Ativa',
        categorias: [{ id: 'category-1', titulo: 'Trabalho' }],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    Array.from(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.trim() === 'Arquivar')
      ?.click();
    const update = httpTesting.expectOne('http://localhost:5146/notas/filtered-note');
    update.flush({
      id: 'filtered-note',
      titulo: 'Nota filtrada',
      descricao: null,
      status: 'Arquivada',
      categorias: [{ id: 'category-1', titulo: 'Trabalho' }],
      criadoEm: '2026-10-28T15:00:00Z',
      atualizadoEm: '2026-10-28T17:00:00Z',
    });
    harness.detectChanges();
    expect(category.checked).toBe(true);
    expect(harness.routeNativeElement?.textContent).toContain('Arquivada');

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Nota filtrada"]')
      ?.click();
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')
      ?.click();
    httpTesting.expectOne('http://localhost:5146/notas/filtered-note').flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    harness.detectChanges();

    expect(category.checked).toBe(true);
    expect(harness.routeNativeElement?.textContent).toContain(
      'Nenhuma nota corresponde aos filtros',
    );
  });

  it('shows loading then displays notes, descriptions, categories and statuses in API order', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    expect(harness.routeNativeElement?.textContent).toContain('Carregando notas...');

    const notes: NotaDto[] = [
      {
        id: '1',
        titulo: 'A primeira nota',
        descricao: 'Descrição da primeira',
        status: 'Ativa',
        categorias: [{ id: 'category-1', titulo: 'Trabalho' }],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:30:00Z',
      },
      {
        id: '2',
        titulo: 'B segunda nota',
        descricao: null,
        status: 'Arquivada',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ];
    request.flush(notes);
    harness.detectChanges();

    const cards = harness.routeNativeElement?.querySelectorAll('li[class*="rounded-xl border"]');
    expect(Array.from(cards ?? []).map((card) => card.querySelector('h2')?.textContent?.trim()))
      .toEqual(['A primeira nota', 'B segunda nota']);

    expect(cards?.[0]?.textContent).toContain('Descrição da primeira');
    expect(cards?.[0]?.textContent).toContain('Ativa');
    expect(cards?.[0]?.textContent).toContain('Trabalho');
    expect(cards?.[0]?.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-10-28T16:30:00Z',
    );

    expect(cards?.[1]?.textContent).toContain('Arquivada');
    expect(cards?.[1]?.textContent).not.toContain('Descrição da primeira');
    expect(cards?.[1]?.textContent).not.toContain('Trabalho');
  });

  it('shows a clear empty state when the API returns no notes', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);

    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');
  });

  it('shows a friendly error and retries the notes request', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);

    httpTesting.expectOne('http://localhost:5146/notas').flush(
      { title: 'Erro interno', detail: 'internal details' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Não foi possível carregar as notas.',
    );
    expect(harness.routeNativeElement?.textContent).not.toContain('internal details');

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button')
      ?.click();
    harness.detectChanges();
    const retry = httpTesting.expectOne('http://localhost:5146/notas');
    expect(harness.routeNativeElement?.textContent).toContain('Carregando notas...');
    retry.flush([]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');
  });

  it('opens an accessible confirmation for the selected note and cancel does not call the API', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'first-id',
        titulo: 'Nota pessoal',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
      {
        id: 'second-id',
        titulo: 'Nota de trabalho',
        descricao: 'Descrição',
        status: 'Ativa',
        categorias: [{ id: 'category-id', titulo: 'Trabalho' }],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Nota de trabalho"]')
      ?.click();
    harness.detectChanges();

    const dialog = harness.routeNativeElement?.querySelector('[role="alertdialog"]');
    const cancelButton = dialog?.querySelector<HTMLButtonElement>('button:first-child');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('delete-note-title');
    expect(dialog?.getAttribute('aria-describedby')).toBe(
      'delete-note-description delete-note-warning',
    );
    expect(dialog?.textContent).toContain('Nota de trabalho');
    expect(dialog?.textContent).toContain('Esta ação é definitiva');
    expect(dialog?.textContent).toContain('nota e todas as suas associações com categorias');
    expect(document.activeElement).toBe(cancelButton);
    expect(harness.routeNativeElement?.querySelector('section > div')?.hasAttribute('inert')).toBe(
      true,
    );

    cancelButton?.click();
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('[role="alertdialog"]')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Nota pessoal');
    expect(harness.routeNativeElement?.textContent).toContain('Nota de trabalho');
    expect(document.activeElement).toBe(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>(
        'button[aria-label="Excluir nota Nota de trabalho"]',
      ),
    );
    httpTesting.expectNone('http://localhost:5146/notas/second-id');
  });

  it('keeps Tab and Shift+Tab navigation inside the note confirmation', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota para excluir',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Nota para excluir"]')
      ?.click();
    harness.detectChanges();

    const dialog = harness.routeNativeElement?.querySelector<HTMLElement>('[role="alertdialog"]');
    const cancel = dialog?.querySelector<HTMLButtonElement>('button:first-child');
    const confirm = dialog?.querySelector<HTMLButtonElement>('button:last-child');

    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    cancel?.dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(confirm);

    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    confirm?.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cancel);
  });

  it('confirms deletion with the selected ID and removes the note on HTTP 204', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'first-id',
        titulo: 'Nota pessoal',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
      {
        id: 'second-id',
        titulo: 'Nota de trabalho',
        descricao: null,
        status: 'Arquivada',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Nota de trabalho"]')
      ?.click();
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')
      ?.click();
    harness.detectChanges();

    const request = httpTesting.expectOne('http://localhost:5146/notas/second-id');
    expect(request.request.method).toBe('DELETE');
    expect(harness.routeNativeElement?.textContent).toContain('Excluindo...');
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>(
        'button[aria-label="Excluir nota Nota pessoal"]',
      )?.disabled,
    ).toBe(true);
    expect(document.activeElement).toBe(
      harness.routeNativeElement?.querySelector('[role="alertdialog"]'),
    );
    request.flush(null, { status: 204, statusText: 'No Content' });
    harness.detectChanges();

    expect(
      Array.from(harness.routeNativeElement?.querySelectorAll('[aria-label="Lista de notas"] h2') ?? [])
        .map((heading) => heading.textContent?.trim()),
    ).toEqual(['Nota pessoal']);
    expect(harness.routeNativeElement?.querySelector('[role="alertdialog"]')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('foi excluída');
    expect(document.activeElement).toBe(harness.routeNativeElement?.querySelector('h1'));
  });

  it('shows the empty state after deleting the last note', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'only-note',
        titulo: 'Única nota',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Única nota"]')
      ?.click();
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')
      ?.click();
    httpTesting.expectOne('http://localhost:5146/notas/only-note').flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');
    expect(harness.routeNativeElement?.textContent).toContain('foi excluída');
  });

  it('prevents duplicate confirmations and selecting another note during deletion', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'first-id',
        titulo: 'Nota um',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
      {
        id: 'second-id',
        titulo: 'Nota dois',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Nota um"]')
      ?.click();
    harness.detectChanges();
    const dialog = harness.routeNativeElement?.querySelector('[role="alertdialog"]');
    const confirmButton = dialog?.querySelector<HTMLButtonElement>('button:last-child');
    const cancelButton = dialog?.querySelector<HTMLButtonElement>('button:first-child');
    confirmButton?.click();
    harness.detectChanges();
    confirmButton?.click();
    cancelButton?.click();

    const request = httpTesting.expectOne('http://localhost:5146/notas/first-id');
    expect(harness.routeNativeElement?.querySelector('[role="alertdialog"]')?.textContent)
      .toContain('Nota um');
    httpTesting.expectNone('http://localhost:5146/notas/second-id');
    request.flush(null, { status: 204, statusText: 'No Content' });
    harness.detectChanges();
  });

  it('removes a note from the list and reports when it was already unavailable', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota removida externamente',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Nota removida externamente"]')
      ?.click();
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')
      ?.click();
    httpTesting.expectOne('http://localhost:5146/notas/note-id').flush(
      {},
      { status: 404, statusText: 'Not Found' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('[role="alertdialog"]')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('não está mais disponível');
    expect(harness.routeNativeElement?.textContent).toContain('A lista foi atualizada');
    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');
  });

  it('keeps the confirmation open after a network failure and allows retrying', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota para tentar novamente',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Nota para tentar novamente"]')
      ?.click();
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')
      ?.click();
    httpTesting
      .expectOne('http://localhost:5146/notas/note-id')
      .error(new ProgressEvent('error'));
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain(
      'Verifique sua conexão e tente novamente.',
    );
    expect(harness.routeNativeElement?.textContent).toContain('Nota para tentar novamente');

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')
      ?.click();
    const retry = httpTesting.expectOne('http://localhost:5146/notas/note-id');
    retry.flush(null, { status: 204, statusText: 'No Content' });
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('[role="alertdialog"]')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');
  });

  it('keeps the confirmation open with a friendly message after an unexpected error', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota para manter',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Excluir nota Nota para manter"]')
      ?.click();
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')
      ?.click();
    httpTesting.expectOne('http://localhost:5146/notas/note-id').flush(
      { detail: 'internal details' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain(
      'Ocorreu um erro ao excluir a nota. Tente novamente.',
    );
    expect(harness.routeNativeElement?.textContent).not.toContain('internal details');
    expect(harness.routeNativeElement?.textContent).toContain('Nota para manter');
  });

  it.each([
    { initialStatus: 'Ativa', newStatus: 'Arquivada', action: 'Arquivar' },
    { initialStatus: 'Arquivada', newStatus: 'Ativa', action: 'Reativar' },
  ] as const)(
    '$action sends the complete note payload and updates only after success',
    async ({ initialStatus, newStatus, action }) => {
      const harness = await RouterTestingHarness.create();
      await abrirNotas(harness);
      httpTesting.expectOne('http://localhost:5146/notas').flush([
        {
          id: 'note-id',
          titulo: 'B Nota preservada',
          descricao: 'Descrição preservada',
          status: initialStatus,
          categorias: [
            { id: 'category-1', titulo: 'Trabalho' },
            { id: 'category-2', titulo: 'Pessoal' },
          ],
          criadoEm: '2026-10-28T15:00:00Z',
          atualizadoEm: '2026-10-28T16:00:00Z',
        },
        {
          id: 'note-after',
          titulo: 'C Outra nota',
          descricao: null,
          status: 'Ativa',
          categorias: [],
          criadoEm: '2026-10-28T15:00:00Z',
          atualizadoEm: '2026-10-28T16:00:00Z',
        },
      ]);
      harness.detectChanges();

      const button = Array.from(
        harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [],
      ).find((element) => element.textContent?.trim() === action);
      expect(button).toBeDefined();
      button?.click();
      harness.detectChanges();

      const request = httpTesting.expectOne('http://localhost:5146/notas/note-id');
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({
        titulo: 'B Nota preservada',
        descricao: 'Descrição preservada',
        status: newStatus,
        categoriaIds: ['category-1', 'category-2'],
      });
      expect(harness.routeNativeElement?.textContent).toContain(initialStatus);
      expect(harness.routeNativeElement?.textContent).toContain(
        initialStatus === 'Ativa' ? 'Arquivando...' : 'Reativando...',
      );

      request.flush({
        id: 'note-id',
        titulo: 'B Nota preservada',
        descricao: 'Descrição preservada',
        status: newStatus,
        categorias: [
          { id: 'category-1', titulo: 'Trabalho' },
          { id: 'category-2', titulo: 'Pessoal' },
        ],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T17:00:00Z',
      });
      harness.detectChanges();

      expect(harness.routeNativeElement?.textContent).toContain(newStatus);
      expect(harness.routeNativeElement?.textContent).not.toContain(
        initialStatus === 'Ativa' ? 'Arquivando...' : 'Reativando...',
      );
      expect(
        Array.from(harness.routeNativeElement?.querySelectorAll('li h2') ?? []).map(
          (element) => element.textContent?.trim(),
        ),
      ).toEqual(['B Nota preservada', 'C Outra nota']);
    },
  );

  it('sends an empty category list when archiving a note without categories', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Sem categoria',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    Array.from(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.trim() === 'Arquivar')
      ?.click();

    const request = httpTesting.expectOne('http://localhost:5146/notas/note-id');
    expect(request.request.body).toEqual({
      titulo: 'Sem categoria',
      descricao: null,
      status: 'Arquivada',
      categoriaIds: [],
    });
    request.flush({
      id: 'note-id',
      titulo: 'Sem categoria',
      descricao: null,
      status: 'Arquivada',
      categorias: [],
      criadoEm: '2026-10-28T15:00:00Z',
      atualizadoEm: '2026-10-28T17:00:00Z',
    });
  });

  it('prevents duplicate status updates for the same note', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    const button = Array.from(
      harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((element) => element.textContent?.trim() === 'Arquivar');
    button?.click();
    button?.click();

    const request = httpTesting.expectOne('http://localhost:5146/notas/note-id');
    expect(request.request.method).toBe('PUT');
    request.flush({
      id: 'note-id',
      titulo: 'Nota',
      descricao: null,
      status: 'Arquivada',
      categorias: [],
      criadoEm: '2026-10-28T15:00:00Z',
      atualizadoEm: '2026-10-28T17:00:00Z',
    });
  });

  it.each([
    {
      status: 404,
      message: 'Esta nota não está mais disponível.',
    },
    {
      status: 409,
      message: 'A nota foi alterada e não foi possível atualizar o status.',
    },
  ])('offers a list refresh after HTTP $status', async ({ status, message }) => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    Array.from(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.trim() === 'Arquivar')
      ?.click();
    httpTesting.expectOne('http://localhost:5146/notas/note-id').flush(
      {},
      {
        status,
        statusText: status === 404 ? 'Not Found' : 'Conflict',
      },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(message);
    expect(
      Array.from(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [])
        .some((button) => button.textContent?.includes('Atualizar lista')),
    ).toBe(true);
    expect(harness.routeNativeElement?.textContent).toContain('Ativa');

    Array.from(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.includes('Atualizar lista'))
      ?.click();
    const refresh = httpTesting.expectOne('http://localhost:5146/notas');
    refresh.flush([]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');
  });

  it('shows a friendly network error and allows retrying the status update', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    const archive = () =>
      Array.from(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [])
        .find((button) => button.textContent?.trim() === 'Arquivar')
        ?.click();
    archive();
    httpTesting.expectOne('http://localhost:5146/notas/note-id').error(new ProgressEvent('error'));
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Verifique sua conexão e tente novamente.',
    );
    expect(harness.routeNativeElement?.textContent).toContain('Ativa');

    archive();
    const retry = httpTesting.expectOne('http://localhost:5146/notas/note-id');
    retry.flush({
      id: 'note-id',
      titulo: 'Nota',
      descricao: null,
      status: 'Arquivada',
      categorias: [],
      criadoEm: '2026-10-28T15:00:00Z',
      atualizadoEm: '2026-10-28T17:00:00Z',
    });
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Arquivada');
  });

  it('formats valid update dates and handles malformed dates safely', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);

    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: '1',
        titulo: 'Nota',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: 'invalid',
        atualizadoEm: 'invalid',
      },
    ]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Data indisponível');
  });

  it('navigates back to workspace', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('a[href="/app"]')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app');
  });

  it('provides working links for creating and editing notes', async () => {
    const harness = await RouterTestingHarness.create();
    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota de teste',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app/notas/nova"]')
      ?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/app/notas/nova');
    httpTesting.expectOne('http://localhost:5146/categorias').flush([]);

    await abrirNotas(harness);
    httpTesting.expectOne('http://localhost:5146/notas').flush([
      {
        id: 'note-id',
        titulo: 'Nota de teste',
        descricao: null,
        status: 'Ativa',
        categorias: [],
        criadoEm: '2026-10-28T15:00:00Z',
        atualizadoEm: '2026-10-28T16:00:00Z',
      },
    ]);
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLAnchorElement>('a[href="/app/notas/note-id/editar"]')
      ?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/app/notas/note-id/editar');
    httpTesting.expectOne('http://localhost:5146/categorias').flush([]);
    httpTesting.expectOne('http://localhost:5146/notas/note-id').flush({
      id: 'note-id',
      titulo: 'Nota de teste',
      descricao: null,
      status: 'Ativa',
      categorias: [],
      criadoEm: '2026-10-28T15:00:00Z',
      atualizadoEm: '2026-10-28T16:00:00Z',
    });
  });
});
