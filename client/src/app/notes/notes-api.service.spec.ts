import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../auth/auth.tokens';
import {
  AtualizarNotaRequest,
  CriarNotaRequest,
  NotaDto,
} from './note.models';
import { NotesApiService } from './notes-api.service';

describe('NotesApiService', () => {
  let service: NotesApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146/' },
      ],
    });

    service = TestBed.inject(NotesApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  const note: NotaDto = {
    id: 'note-id',
    titulo: 'Revisar projeto',
    descricao: 'Descrição',
    status: 'Ativa',
    categorias: [{ id: 'category-id', titulo: 'Trabalho' }],
    criadoEm: '2026-10-28T17:00:00Z',
    atualizadoEm: '2026-10-28T17:00:00Z',
  };

  it('lists notes without unnecessary filter parameters', () => {
    service.listar().subscribe((notes) => expect(notes).toEqual([note]));

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([note]);
  });

  it('lists notes filtered by one category', () => {
    service.listar(['category-id']).subscribe((notes) => expect(notes).toEqual([note]));

    const request = httpTesting.expectOne('http://localhost:5146/notas?categoriaIds=category-id');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.getAll('categoriaIds')).toEqual(['category-id']);
    request.flush([note]);
  });

  it('serializes multiple category filters as repeated query parameters', () => {
    service.listar(['category-1', 'category-2']).subscribe((notes) => {
      expect(notes).toEqual([note]);
    });

    const request = httpTesting.expectOne(
      'http://localhost:5146/notas?categoriaIds=category-1&categoriaIds=category-2',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.getAll('categoriaIds')).toEqual(['category-1', 'category-2']);
    request.flush([note]);
  });

  it('gets a note by ID and returns its typed DTO', () => {
    service.obter('note-id').subscribe((response) => expect(response).toEqual(note));

    const request = httpTesting.expectOne('http://localhost:5146/notas/note-id');
    expect(request.request.method).toBe('GET');
    request.flush(note);
  });

  it('creates a note without a status field', () => {
    const payload: CriarNotaRequest = {
      titulo: 'Revisar projeto',
      descricao: 'Descrição',
      categoriaIds: ['category-id'],
    };

    service.criar(payload).subscribe((response) => expect(response).toEqual(note));

    const request = httpTesting.expectOne('http://localhost:5146/notas');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body).not.toHaveProperty('status');
    request.flush(note, { status: 201, statusText: 'Created' });
  });

  it('updates a note including its status', () => {
    const payload: AtualizarNotaRequest = {
      titulo: 'Revisar projeto',
      descricao: null,
      status: 'Arquivada',
      categoriaIds: [],
    };
    const response = { ...note, descricao: null, status: 'Arquivada' as const, categorias: [] };

    service.atualizar('note-id', payload).subscribe((result) => expect(result).toEqual(response));

    const request = httpTesting.expectOne('http://localhost:5146/notas/note-id');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush(response);
  });

  it('deletes a note and completes with an empty 204 response', () => {
    let completed = false;

    service.excluir('note-id').subscribe({
      complete: () => (completed = true),
    });

    const request = httpTesting.expectOne('http://localhost:5146/notas/note-id');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });

  it('propagates HTTP errors to the caller', () => {
    let receivedError: HttpErrorResponse | undefined;

    service.listar().subscribe({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          receivedError = error;
        }
      },
    });

    httpTesting.expectOne('http://localhost:5146/notas').flush(
      { title: 'Conflito' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(receivedError).toBeInstanceOf(HttpErrorResponse);
    expect(receivedError?.status).toBe(409);
  });
});
