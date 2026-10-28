import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../auth/auth.tokens';
import { CategoriaDto, CategoriaRequest } from './category.models';
import { CategoriesApiService } from './categories-api.service';

describe('CategoriesApiService', () => {
  let service: CategoriesApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146/' },
      ],
    });

    service = TestBed.inject(CategoriesApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  it('lists categories and returns typed DTOs', () => {
    const response: CategoriaDto[] = [{ id: 'category-id', titulo: 'Trabalho' }];

    service.listar().subscribe((categorias) => expect(categorias).toEqual(response));

    const request = httpTesting.expectOne('http://localhost:5146/categorias');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(response);
  });

  it('gets a category by ID and returns its DTO', () => {
    const response: CategoriaDto = { id: 'category-id', titulo: 'Trabalho' };

    service.obter('category-id').subscribe((categoria) => expect(categoria).toEqual(response));

    const request = httpTesting.expectOne('http://localhost:5146/categorias/category-id');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('creates a category with the request payload', () => {
    const payload: CategoriaRequest = { titulo: 'Trabalho' };
    const response: CategoriaDto = { id: 'category-id', titulo: 'Trabalho' };

    service.criar(payload).subscribe((categoria) => expect(categoria).toEqual(response));

    const request = httpTesting.expectOne('http://localhost:5146/categorias');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(response, { status: 201, statusText: 'Created' });
  });

  it('updates a category with the request payload and returns its DTO', () => {
    const payload: CategoriaRequest = { titulo: 'Pessoal' };
    const response: CategoriaDto = { id: 'category-id', titulo: 'Pessoal' };

    service.atualizar('category-id', payload).subscribe((categoria) => {
      expect(categoria).toEqual(response);
    });

    const request = httpTesting.expectOne('http://localhost:5146/categorias/category-id');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush(response);
  });

  it('deletes a category and completes with an empty response', () => {
    let completed = false;

    service.excluir('category-id').subscribe({
      complete: () => (completed = true),
    });

    const request = httpTesting.expectOne('http://localhost:5146/categorias/category-id');
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

    httpTesting.expectOne('http://localhost:5146/categorias').flush(
      { title: 'Conflito' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(receivedError).toBeInstanceOf(HttpErrorResponse);
    expect(receivedError?.status).toBe(409);
  });
});
