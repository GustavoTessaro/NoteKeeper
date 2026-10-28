import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { AuthStateService } from '../auth-state.service';
import { API_BASE_URL, AUTH_SESSION_STORAGE } from '../auth.tokens';
import { Register } from './register';

describe('Register', () => {
  let httpTesting: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<Register>>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: API_BASE_URL, useValue: 'http://localhost:5146' },
        { provide: AUTH_SESSION_STORAGE, useValue: sessionStorage },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Register);
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

  function fillValidForm(confirmPassword = 'SenhaSegura1!'): void {
    setInput('name', 'Ana');
    setInput('email', 'ana@example.com');
    setInput('password', 'SenhaSegura1!');
    setInput('confirm-password', confirmPassword);
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('validates required fields, email, password rules, and password confirmation', () => {
    submitForm();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Informe seu nome.');
    expect(fixture.nativeElement.textContent).toContain('Informe seu e-mail.');
    expect(fixture.nativeElement.textContent).toContain('Informe uma senha.');
    expect(fixture.nativeElement.textContent).toContain('Confirme sua senha.');
    httpTesting.expectNone('http://localhost:5146/auth/cadastro');

    setInput('name', 'Ana');
    setInput('email', 'invalid-email');
    setInput('password', 'abcdefgh');
    setInput('confirm-password', 'different');
    submitForm();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Informe um e-mail válido.');
    expect(fixture.nativeElement.textContent).toContain('A senha deve conter um número e um caractere especial.');
    expect(fixture.nativeElement.textContent).toContain('As senhas não conferem.');
    httpTesting.expectNone('http://localhost:5146/auth/cadastro');
  });

  it('sends only the API payload and navigates to login without starting a session', async () => {
    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne('http://localhost:5146/auth/cadastro');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nome: 'Ana',
      email: 'ana@example.com',
      senha: 'SenhaSegura1!',
    });
    expect(request.request.body).not.toHaveProperty('confirmarSenha');
    request.flush({ id: 'user-id', nome: 'Ana', email: 'ana@example.com' });

    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login?cadastro=sucesso');
    expect(TestBed.inject(AuthStateService).sessao()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('shows a useful message when the email is already registered', () => {
    fillValidForm();
    submitForm();

    httpTesting.expectOne('http://localhost:5146/auth/cadastro').flush(
      { title: 'Conflito', detail: 'raw backend response' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('raw backend response');
  });

  it('maps HTTP 400 field errors to friendly validation messages', () => {
    fillValidForm();
    submitForm();

    httpTesting.expectOne('http://localhost:5146/auth/cadastro').flush(
      {
        title: 'Requisição inválida',
        errors: { senha: ['raw backend validation details'] },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'A senha deve ter pelo menos 8 caracteres, incluindo um número e um caractere especial.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('raw backend validation details');
  });

  it('shows a friendly message when the connection fails', () => {
    fillValidForm();
    submitForm();

    httpTesting.expectOne('http://localhost:5146/auth/cadastro').error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível concluir o cadastro agora. Verifique sua conexão e tente novamente.',
    );
  });

  it('blocks duplicate submissions while the request is pending', () => {
    fillValidForm();
    submitForm();
    submitForm();

    const request = httpTesting.expectOne('http://localhost:5146/auth/cadastro');
    expect(request.request.body).toEqual({
      nome: 'Ana',
      email: 'ana@example.com',
      senha: 'SenhaSegura1!',
    });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);

    request.flush({ id: 'user-id', nome: 'Ana', email: 'ana@example.com' });
  });

  it('provides a working link back to login', () => {
    const loginLink = fixture.nativeElement.querySelector('a[routerLink="/login"]') as HTMLAnchorElement;

    expect(loginLink).not.toBeNull();
    expect(loginLink.getAttribute('href')).toBe('/login');
  });
});
