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

  it('shows loading then displays notes, descriptions, categories and statuses in API order', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas', NotesPage);

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
    await harness.navigateByUrl('/app/notas');

    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma nota cadastrada');
  });

  it('shows a friendly error and retries the notes request', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas');

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

  it('formats valid update dates and handles malformed dates safely', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas');

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
    await harness.navigateByUrl('/app/notas');
    httpTesting.expectOne('http://localhost:5146/notas').flush([]);
    harness.detectChanges();

    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('a[href="/app"]')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app');
  });

  it('provides working links for creating and editing notes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/notas');
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

    await harness.navigateByUrl('/app/notas');
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
