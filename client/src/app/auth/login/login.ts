import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LucideEye, LucideEyeOff, LucideLockKeyhole, LucideNotebookPen } from '@lucide/angular';
import { AuthApiService } from '../auth-api.service';
import { AuthStateService } from '../auth-state.service';
import { LoginRequest } from '../auth.models';

@Component({
  imports: [FormField, LucideEye, LucideEyeOff, LucideLockKeyhole, LucideNotebookPen],
  selector: 'app-login',
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <section class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
        <header class="mb-8 text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <svg lucideNotebookPen aria-hidden="true" class="size-7"></svg>
          </div>
          <p class="mt-4 text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">Bem-vindo de volta</h1>
          <p class="mt-2 text-sm text-slate-600">Entre na sua conta para continuar.</p>
        </header>

        <form (submit)="entrar($event)" novalidate>
          <div class="space-y-5">
            <div>
              <label for="email" class="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
              <input
                id="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                [formField]="loginForm.email"
                [attr.aria-invalid]="emailError() !== null"
                aria-required="true"
                aria-describedby="email-error"
                placeholder="voce@exemplo.com"
                class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-100"
              />
              <p id="email-error" class="mt-2 min-h-5 text-sm text-rose-700" aria-live="polite">
                {{ emailError() ?? '' }}
              </p>
            </div>

            <div>
              <label for="password" class="mb-2 block text-sm font-medium text-slate-700">Senha</label>
              <div class="relative">
                <input
                  id="password"
                  [type]="senhaVisivel() ? 'text' : 'password'"
                  autocomplete="current-password"
                  [formField]="loginForm.senha"
                  [attr.aria-invalid]="senhaError() !== null"
                  aria-required="true"
                  aria-describedby="password-error"
                  placeholder="Digite sua senha"
                  class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-100"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-4 text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  [attr.aria-label]="senhaVisivel() ? 'Ocultar senha' : 'Mostrar senha'"
                  [attr.aria-pressed]="senhaVisivel()"
                  (click)="alternarVisibilidadeSenha()"
                >
                  @if (senhaVisivel()) {
                    <svg lucideEyeOff aria-hidden="true" class="size-5"></svg>
                  } @else {
                    <svg lucideEye aria-hidden="true" class="size-5"></svg>
                  }
                </button>
              </div>
              <p id="password-error" class="mt-2 min-h-5 text-sm text-rose-700" aria-live="polite">
                {{ senhaError() ?? '' }}
              </p>
            </div>

            @if (mensagemErro(); as message) {
              <p class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert" aria-live="assertive">
                {{ message }}
              </p>
            }

            <button
              type="submit"
              [disabled]="enviando()"
              [attr.aria-busy]="enviando()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              @if (enviando()) {
                <span class="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
                <span>Entrando...</span>
              } @else {
                <svg lucideLockKeyhole aria-hidden="true" class="size-5"></svg>
                <span>Entrar</span>
              }
            </button>
          </div>
        </form>

        <p class="mt-7 text-center text-sm text-slate-600">
          Ainda não tem conta?
          <span class="font-semibold text-indigo-600">Cadastro em breve</span>
        </p>
      </section>
    </main>
  `,
})
export class Login {
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  private readonly model = signal<LoginRequest>({ email: '', senha: '' });
  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: 'Informe seu e-mail.' });
    email(path.email, { message: 'Informe um e-mail válido.' });
    required(path.senha, { message: 'Informe sua senha.' });
  });

  protected readonly enviando = signal(false);
  protected readonly senhaVisivel = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  private readonly submetido = signal(false);

  protected emailError(): string | null {
    if (!this.submetido() && !this.loginForm.email().touched()) {
      return null;
    }

    return this.loginForm.email().errors()[0]?.message ?? null;
  }

  protected senhaError(): string | null {
    if (!this.submetido() && !this.loginForm.senha().touched()) {
      return null;
    }

    return this.loginForm.senha().errors()[0]?.message ?? null;
  }

  protected alternarVisibilidadeSenha(): void {
    this.senhaVisivel.update((visible) => !visible);
  }

  protected entrar(event: SubmitEvent): void {
    event.preventDefault();

    if (this.enviando()) {
      return;
    }

    this.submetido.set(true);
    this.loginForm.email().markAsTouched();
    this.loginForm.senha().markAsTouched();
    this.mensagemErro.set(null);

    if (this.loginForm().invalid()) {
      return;
    }

    this.enviando.set(true);
    this.authApi
      .login(this.model())
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (token) => {
          if (!this.authState.iniciarSessao(token)) {
            this.mensagemErro.set('Não foi possível iniciar sua sessão. Tente novamente.');
            return;
          }

          void this.router.navigateByUrl('/app');
        },
        error: (error: unknown) => {
          this.mensagemErro.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'E-mail ou senha inválidos.'
              : 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.',
          );
        },
      });
  }
}
