import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { AuthStateService } from '../auth-state.service';
import { TokenDto } from '../auth.models';
import { API_BASE_URL, AUTH_SESSION_STORAGE } from '../auth.tokens';
import { Login } from './login';

const validToken: TokenDto = {
  usuarioId: 'user-id',
  nome: 'Ana',
  email: 'ana@example.com',
  accessToken: 'access-token',
  dataExpiracaoEmUtc: '2099-01-01T00:00:00Z',
};

describe('Login', () => {
  let httpTesting: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<Login>>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146' },
        { provide: AUTH_SESSION_STORAGE, useValue: sessionStorage },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  function setInput(id: string, value: string): HTMLInputElement {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return input;
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('validates required fields and email format before making a request', () => {
    submitForm();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Informe seu e-mail.');
    expect(fixture.nativeElement.textContent).toContain('Informe sua senha.');
    httpTesting.expectNone('http://localhost:5146/auth/login');

    setInput('email', 'invalid-email');
    setInput('password', 'password');
    submitForm();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Informe um e-mail válido.');
    httpTesting.expectNone('http://localhost:5146/auth/login');
  });

  it('submits the credentials, starts a session, and navigates to /app on success', async () => {
    setInput('email', 'ana@example.com');
    setInput('password', 'correct-password');
    submitForm();

    const request = httpTesting.expectOne('http://localhost:5146/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@example.com', senha: 'correct-password' });
    request.flush(validToken);

    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(AuthStateService).usuario()?.email).toBe('ana@example.com');
    expect(TestBed.inject(Router).url).toBe('/app');
  });

  it('shows a generic credentials error for HTTP 401 without starting a session', () => {
    setInput('email', 'ana@example.com');
    setInput('password', 'wrong-password');
    submitForm();

    httpTesting.expectOne('http://localhost:5146/auth/login').flush(
      { title: 'Não autenticado' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('E-mail ou senha inválidos.');
    expect(TestBed.inject(AuthStateService).sessao()).toBeNull();
  });

  it('shows a friendly message when the connection fails', () => {
    setInput('email', 'ana@example.com');
    setInput('password', 'correct-password');
    submitForm();

    httpTesting.expectOne('http://localhost:5146/auth/login').error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível entrar agora. Verifique sua conexão e tente novamente.',
    );
    expect(TestBed.inject(AuthStateService).sessao()).toBeNull();
  });

  it('blocks duplicate submissions while the request is pending', () => {
    setInput('email', 'ana@example.com');
    setInput('password', 'correct-password');
    submitForm();
    submitForm();

    const request = httpTesting.expectOne('http://localhost:5146/auth/login');
    expect(request.request.body).toEqual({ email: 'ana@example.com', senha: 'correct-password' });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);

    request.flush(validToken);
  });
});
