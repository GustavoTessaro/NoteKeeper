import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { email, FieldTree, form, FormField, minLength, pattern, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LucideEye, LucideEyeOff, LucideNotebookPen, LucideUserPlus } from '@lucide/angular';
import { AuthApiService } from '../auth-api.service';
import { CadastroRequest, UsuarioDto } from '../auth.models';

interface RegisterFormValue extends CadastroRequest {
  confirmarSenha: string;
}

@Component({
  imports: [FormField, LucideEye, LucideEyeOff, LucideNotebookPen, LucideUserPlus, RouterLink],
  selector: 'app-register',
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <section class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
        <header class="mb-8 text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <svg lucideNotebookPen aria-hidden="true" class="size-7"></svg>
          </div>
          <p class="mt-4 text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">Criar sua conta</h1>
          <p class="mt-2 text-sm text-slate-600">Preencha seus dados para começar.</p>
        </header>

        <form (submit)="cadastrar($event)" novalidate>
          <div class="space-y-4">
            <div>
              <label for="name" class="mb-2 block text-sm font-medium text-slate-700">Nome</label>
              <input
                id="name"
                type="text"
                autocomplete="name"
                [formField]="registerForm.nome"
                [attr.aria-invalid]="nomeError() !== null"
                aria-required="true"
                aria-describedby="name-error"
                placeholder="Seu nome"
                class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500"
              />
              <p id="name-error" class="mt-1 min-h-5 text-sm text-rose-700" aria-live="polite">{{ nomeError() ?? '' }}</p>
            </div>

            <div>
              <label for="email" class="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
              <input
                id="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                [formField]="registerForm.email"
                [attr.aria-invalid]="emailError() !== null"
                aria-required="true"
                aria-describedby="email-error"
                placeholder="voce@exemplo.com"
                class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500"
              />
              <p id="email-error" class="mt-1 min-h-5 text-sm text-rose-700" aria-live="polite">{{ emailError() ?? '' }}</p>
            </div>

            <div>
              <label for="password" class="mb-2 block text-sm font-medium text-slate-700">Senha</label>
              <div class="relative">
                <input
                  id="password"
                  [type]="senhaVisivel() ? 'text' : 'password'"
                  autocomplete="new-password"
                  [formField]="registerForm.senha"
                  [attr.aria-invalid]="senhaError() !== null"
                  aria-required="true"
                  aria-describedby="password-hint password-error"
                  placeholder="Pelo menos 8 caracteres"
                  class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500"
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
              <p id="password-hint" class="mt-1 text-xs text-slate-500">Use pelo menos 8 caracteres, incluindo um número e um caractere especial.</p>
              <p id="password-error" class="mt-1 min-h-5 text-sm text-rose-700" aria-live="polite">{{ senhaError() ?? '' }}</p>
            </div>

            <div>
              <label for="confirm-password" class="mb-2 block text-sm font-medium text-slate-700">Confirmar senha</label>
              <input
                id="confirm-password"
                [type]="senhaVisivel() ? 'text' : 'password'"
                autocomplete="new-password"
                [formField]="registerForm.confirmarSenha"
                [attr.aria-invalid]="confirmarSenhaError() !== null"
                aria-required="true"
                aria-describedby="confirm-password-error"
                placeholder="Digite novamente sua senha"
                class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500"
              />
              <p id="confirm-password-error" class="mt-1 min-h-5 text-sm text-rose-700" aria-live="polite">{{ confirmarSenhaError() ?? '' }}</p>
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
                <span>Cadastrando...</span>
              } @else {
                <svg lucideUserPlus aria-hidden="true" class="size-5"></svg>
                <span>Cadastrar</span>
              }
            </button>
          </div>
        </form>

        <p class="mt-7 text-center text-sm text-slate-600">
          Já tem uma conta?
          <a
            routerLink="/login"
            class="font-semibold text-indigo-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >Voltar ao login</a>
        </p>
      </section>
    </main>
  `,
})
export class Register {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  private readonly model = signal<RegisterFormValue>({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });

  protected readonly registerForm = form(this.model, (path) => {
    required(path.nome, { message: 'Informe seu nome.' });
    required(path.email, { message: 'Informe seu e-mail.' });
    email(path.email, { message: 'Informe um e-mail válido.' });
    required(path.senha, { message: 'Informe uma senha.' });
    minLength(path.senha, 8, { message: 'A senha deve ter pelo menos 8 caracteres.' });
    pattern(path.senha, /(?=.*\p{Nd})(?=.*[^\p{L}\p{Nd}]).*/u, {
      message: 'A senha deve conter um número e um caractere especial.',
    });
    required(path.confirmarSenha, { message: 'Confirme sua senha.' });
    validate(path.confirmarSenha, ({ value, valueOf }) =>
      value() && value() !== valueOf(path.senha)
        ? { kind: 'passwordMismatch', message: 'As senhas não conferem.' }
        : undefined,
    );
  });

  protected readonly enviando = signal(false);
  protected readonly senhaVisivel = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  private readonly submetido = signal(false);

  protected nomeError(): string | null {
    return this.fieldError(this.registerForm.nome);
  }

  protected emailError(): string | null {
    return this.fieldError(this.registerForm.email);
  }

  protected senhaError(): string | null {
    return this.fieldError(this.registerForm.senha);
  }

  protected confirmarSenhaError(): string | null {
    return this.fieldError(this.registerForm.confirmarSenha);
  }

  protected alternarVisibilidadeSenha(): void {
    this.senhaVisivel.update((visible) => !visible);
  }

  protected cadastrar(event: SubmitEvent): void {
    event.preventDefault();

    if (this.enviando()) {
      return;
    }

    this.submetido.set(true);
    this.registerForm.nome().markAsTouched();
    this.registerForm.email().markAsTouched();
    this.registerForm.senha().markAsTouched();
    this.registerForm.confirmarSenha().markAsTouched();
    this.mensagemErro.set(null);

    if (this.registerForm().invalid()) {
      return;
    }

    const { nome, email: address, senha } = this.model();
    const request: CadastroRequest = { nome, email: address, senha };

    this.enviando.set(true);
    this.authApi
      .cadastrar(request)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (_user: UsuarioDto) => {
          void this.router.navigate(['/login'], { queryParams: { cadastro: 'sucesso' } });
        },
        error: (error: unknown) => this.mensagemErro.set(this.apiErrorMessage(error)),
      });
  }

  private fieldError(field: FieldTree<string>): string | null {
    if (!this.submetido() && !field().touched()) {
      return null;
    }

    return field().errors()[0]?.message ?? null;
  }

  private apiErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Não foi possível concluir o cadastro agora. Verifique sua conexão e tente novamente.';
    }

    if (error.status === 409) {
      return 'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.';
    }

    if (error.status === 400) {
      return this.validationMessage(error.error);
    }

    return 'Não foi possível concluir o cadastro agora. Verifique sua conexão e tente novamente.';
  }

  private validationMessage(response: unknown): string {
    if (!response || typeof response !== 'object' || !('errors' in response)) {
      return 'Revise os dados informados e tente novamente.';
    }

    const errors = response.errors;
    if (!errors || typeof errors !== 'object') {
      return 'Revise os dados informados e tente novamente.';
    }

    const messages: string[] = [];
    for (const [field, message] of Object.entries(errors)) {
      const userMessage = this.validationFieldMessage(field);
      if (userMessage && message) {
        messages.push(userMessage);
      }
    }

    return messages.length > 0
      ? [...new Set(messages)].join(' ')
      : 'Revise os dados informados e tente novamente.';
  }

  private validationFieldMessage(field: string): string | null {
    switch (field.toLowerCase()) {
      case 'nome':
        return 'Informe seu nome.';
      case 'email':
        return 'Informe um e-mail válido.';
      case 'senha':
        return 'A senha deve ter pelo menos 8 caracteres, incluindo um número e um caractere especial.';
      default:
        return null;
    }
  }
}
