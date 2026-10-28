import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { disabled, form, FormField, required, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideRefreshCw, LucideSave, LucideTags } from '@lucide/angular';
import { finalize } from 'rxjs';
import { CategoriaDto, CategoriaRequest } from '../category.models';
import { CategoriesApiService } from '../categories-api.service';

@Component({
  imports: [FormField, LucideArrowLeft, LucideRefreshCw, LucideSave, LucideTags, RouterLink],
  selector: 'app-category-form',
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section class="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header class="flex items-start gap-3">
          <span class="mt-1 rounded-xl bg-indigo-50 p-3 text-indigo-700">
            <svg lucideTags aria-hidden="true" class="size-5"></svg>
          </span>
          <div>
            <p class="text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
            <h1 class="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {{ editando ? 'Editar categoria' : 'Nova categoria' }}
            </h1>
            <p class="mt-2 text-slate-600">Informe um título entre 2 e 100 caracteres.</p>
          </div>
        </header>

        @if (carregando()) {
          <div class="mt-8 flex items-center gap-3 rounded-xl bg-slate-50 p-5 text-slate-600" role="status" aria-live="polite">
            <span class="size-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true"></span>
            <p>Carregando categoria...</p>
          </div>
        } @else if (categoriaNaoEncontrada()) {
          <div class="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5" role="alert">
            <p class="font-semibold text-amber-900">Categoria não encontrada.</p>
            <p class="mt-1 text-sm text-amber-800">Ela pode ter sido removida ou não estar disponível.</p>
          </div>
        } @else if (falhaCarregamento()) {
          <div class="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-5" role="alert">
            <p class="font-semibold text-rose-900">Não foi possível carregar a categoria.</p>
            <p class="mt-1 text-sm text-rose-800">Verifique sua conexão e tente novamente.</p>
            <button
              type="button"
              (click)="carregarCategoria(id!)"
              class="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              <svg lucideRefreshCw aria-hidden="true" class="size-4"></svg>
              <span>Tentar novamente</span>
            </button>
          </div>
        } @else {
          <form class="mt-8" (submit)="salvar($event)" novalidate>
            <div>
              <label for="titulo" class="mb-2 block text-sm font-medium text-slate-700">Título</label>
              <input
                id="titulo"
                type="text"
                autocomplete="off"
                [formField]="categoryForm.titulo"
                [attr.aria-invalid]="tituloError() !== null"
                aria-required="true"
                aria-describedby="titulo-hint titulo-error"
                placeholder="Ex.: Trabalho"
                class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500 disabled:bg-slate-50"
              />
              <p id="titulo-hint" class="mt-2 text-xs text-slate-500">Espaços no início e no fim serão removidos.</p>
              <p id="titulo-error" class="mt-1 min-h-5 text-sm text-rose-700" aria-live="polite">
                {{ tituloError() ?? '' }}
              </p>
            </div>

            @if (mensagemErro(); as message) {
              <p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert" aria-live="assertive">
                {{ message }}
              </p>
            }

            <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <a
                routerLink="/app/categorias"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <svg lucideArrowLeft aria-hidden="true" class="size-4"></svg>
                <span>Cancelar</span>
              </a>
              <button
                type="submit"
                [disabled]="enviando()"
                [attr.aria-busy]="enviando()"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                @if (enviando()) {
                  <span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
                  <span>Salvando...</span>
                } @else {
                  <svg lucideSave aria-hidden="true" class="size-4"></svg>
                  <span>Salvar</span>
                }
              </button>
            </div>
          </form>
        }
      </section>
    </main>
  `,
})
export class CategoryForm implements OnInit {
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly editando = this.id !== null;
  protected readonly model = signal<CategoriaRequest>({ titulo: '' });
  protected readonly categoryForm = form(this.model, (path) => {
    disabled(path.titulo, { when: () => this.enviando() || this.carregando() });
    required(path.titulo, { message: 'Informe o título da categoria.' });
    validate(path.titulo, ({ value }) => {
      const titulo = value().trim();

      if (!titulo) {
        return { kind: 'required', message: 'Informe o título da categoria.' };
      }

      if (titulo.length < 2 || titulo.length > 100) {
        return { kind: 'titleLength', message: 'O título deve ter entre 2 e 100 caracteres.' };
      }

      return undefined;
    });
  });

  protected readonly carregando = signal(this.editando);
  protected readonly enviando = signal(false);
  protected readonly categoriaNaoEncontrada = signal(false);
  protected readonly falhaCarregamento = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  private readonly submetido = signal(false);

  ngOnInit(): void {
    if (this.id) {
      this.carregarCategoria(this.id);
    }
  }

  protected tituloError(): string | null {
    const field = this.categoryForm.titulo;
    if (!this.submetido() && !field().touched()) {
      return null;
    }

    return field().errors()[0]?.message ?? null;
  }

  protected salvar(event: SubmitEvent): void {
    event.preventDefault();
    if (this.enviando() || this.carregando() || this.categoriaNaoEncontrada()) {
      return;
    }

    this.submetido.set(true);
    this.categoryForm.titulo().markAsTouched();
    this.mensagemErro.set(null);

    if (this.categoryForm().invalid()) {
      return;
    }

    const request: CategoriaRequest = { titulo: this.model().titulo.trim() };
    const saveRequest = this.id
      ? this.categoriesApi.atualizar(this.id, request)
      : this.categoriesApi.criar(request);

    this.enviando.set(true);
    saveRequest.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/app/categorias'),
      error: (error: unknown) => this.mensagemErro.set(this.apiErrorMessage(error)),
    });
  }

  private carregarCategoria(id: string): void {
    this.carregando.set(true);
    this.falhaCarregamento.set(false);
    this.categoriaNaoEncontrada.set(false);
    this.categoriesApi
      .obter(id)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (categoria: CategoriaDto) => this.model.set({ titulo: categoria.titulo }),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.categoriaNaoEncontrada.set(true);
            return;
          }

          this.falhaCarregamento.set(true);
        },
      });
  }

  private apiErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Não foi possível salvar a categoria. Verifique sua conexão e tente novamente.';
    }

    if (error.status === 400) {
      return this.validationMessage(error.error);
    }

    if (error.status === 404) {
      this.categoriaNaoEncontrada.set(true);
      return 'Categoria não encontrada.';
    }

    if (error.status === 409) {
      return 'Já existe uma categoria com este título.';
    }

    return 'Não foi possível salvar a categoria. Verifique sua conexão e tente novamente.';
  }

  private validationMessage(response: unknown): string {
    if (!response || typeof response !== 'object' || !('errors' in response)) {
      return 'Revise o título informado e tente novamente.';
    }

    const errors = response.errors;
    if (!errors || typeof errors !== 'object' || !Object.keys(errors).some((key) => key.toLowerCase() === 'titulo')) {
      return 'Revise o título informado e tente novamente.';
    }

    return 'O título deve ter entre 2 e 100 caracteres.';
  }
}
