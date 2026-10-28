import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthApiService } from './auth-api.service';
import { CadastroRequest, LoginRequest, TokenDto, UsuarioDto } from './auth.models';
import { API_BASE_URL } from './auth.tokens';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146/' },
      ],
    });

    service = TestBed.inject(AuthApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  it('sends cadastro payload and returns the user DTO', () => {
    const request: CadastroRequest = {
      nome: 'Ana',
      email: 'ana@example.com',
      senha: 'SenhaSegura1!',
    };
    const response: UsuarioDto = {
      id: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
    };

    service.cadastrar(request).subscribe((user) => expect(user).toEqual(response));

    const httpRequest = httpTesting.expectOne('http://localhost:5146/auth/cadastro');
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush(response);
  });

  it('sends login payload and returns the token DTO', () => {
    const request: LoginRequest = {
      email: 'ana@example.com',
      senha: 'SenhaSegura1!',
    };
    const response: TokenDto = {
      usuarioId: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
      accessToken: 'access-token',
      dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
    };

    service.login(request).subscribe((token) => expect(token).toEqual(response));

    const httpRequest = httpTesting.expectOne('http://localhost:5146/auth/login');
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush(response);
  });

  it('sends the bearer token when obtaining the current user', () => {
    const response: UsuarioDto = {
      id: 'user-id',
      nome: 'Ana',
      email: 'ana@example.com',
    };

    service.obterUsuario('access-token').subscribe((user) => expect(user).toEqual(response));

    const httpRequest = httpTesting.expectOne('http://localhost:5146/auth/me');
    expect(httpRequest.request.method).toBe('GET');
    expect(httpRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    httpRequest.flush(response);
  });

  it('sends the bearer token when logging out and expects an empty response', () => {
    service.logout('access-token').subscribe((result) => expect(result).toBeNull());

    const httpRequest = httpTesting.expectOne('http://localhost:5146/auth/logout');
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toBeNull();
    expect(httpRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    httpRequest.flush(null);
  });
});
