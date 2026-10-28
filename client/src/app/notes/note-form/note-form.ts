import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { disabled, form, FormField, required, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideNotebookPen,
  LucideRefreshCw,
  LucideSave,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { CategoriaDto } from '../../categories/category.models';
import { CategoriesApiService } from '../../categories/categories-api.service';
import {
  AtualizarNotaRequest,
  CriarNotaRequest,
  NotaDto,
  StatusNota,
} from '../note.models';
import { NotesApiService } from '../notes-api.service';

interface NoteFormModel {
  titulo: string;
  descricao: string;
  categoriaIds: string[];
}

@Component({
  imports: [
    FormField,
    LucideArrowLeft,
    LucideNotebookPen,
    LucideRefreshCw,
    LucideSave,
    RouterLink,
  ],
  selector: 'app-note-form',
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header class="flex items-start gap-3">
          <span class="mt-1 rounded-xl bg-indigo-50 p-3 text-indigo-700">
            <svg lucideNotebookPen aria-hidden="true" class="size-5"></svg>
          </span>
          <div>
            <p class="text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
            <h1 class="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {{ editando ? 'Editar nota' : 'Nova nota' }}
            </h1>
            <p class="mt-2 text-slate-600">Preencha os dados e escolha as categorias desejadas.</p>
          </div>
        </header>

        @if (carregandoNota()) {
          <div class="mt-8 flex items-center gap-3 rounded-xl bg-slate-50 p-5 text-slate-600" role="status">
            <span class="size-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true"></span>
            <p>Carregando nota...</p>
          </div>
        } @else if (notaNaoEncontrada()) {
          <div class="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5" role="alert">
            <p class="font-semibold text-amber-900">Nota não encontrada.</p>
            <p class="mt-1 text-sm text-amber-800">Ela pode ter sido removida ou não estar disponível.</p>
          </div>
        } @else if (falhaCarregamentoNota()) {
          <div class="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-5" role="alert">
            <p class="font-semibold text-rose-900">Não foi possível carregar a nota.</p>
            <p class="mt-1 text-sm text-rose-800">Verifique sua conexão e tente novamente.</p>
            <button
              type="button"
              (click)="carregarNota(id!)"
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
                [formField]="noteForm.titulo"
                [attr.aria-invalid]="tituloError() !== null"
                aria-required="true"
                aria-describedby="titulo-hint titulo-error"
                placeholder="Ex.: Revisar projeto"
                class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500 disabled:bg-slate-50"
              />
              <p id="titulo-hint" class="mt-2 text-xs text-slate-500">De 2 a 100 caracteres; espaços externos serão removidos.</p>
              <p id="titulo-error" class="mt-1 min-h-5 text-sm text-rose-700" aria-live="polite">{{ tituloError() ?? '' }}</p>
            </div>

            <div class="mt-5">
              <label for="descricao" class="mb-2 block text-sm font-medium text-slate-700">
                Descrição <span class="font-normal text-slate-500">(opcional)</span>
              </label>
              <textarea
                id="descricao"
                rows="4"
                [formField]="noteForm.descricao"
                [attr.aria-invalid]="descricaoError() !== null"
                aria-describedby="descricao-hint descricao-error"
                placeholder="Adicione detalhes para esta nota"
                class="block w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 aria-[invalid=true]:border-rose-500 disabled:bg-slate-50"
              ></textarea>
              <div class="mt-2 flex justify-between gap-3">
                <p id="descricao-hint" class="text-xs text-slate-500">Até 300 caracteres após remover espaços externos.</p>
                <p class="text-xs text-slate-500">{{ descricaoRestante() }} restantes</p>
              </div>
              <p id="descricao-error" class="mt-1 min-h-5 text-sm text-rose-700" aria-live="polite">{{ descricaoError() ?? '' }}</p>
            </div>

            <fieldset class="mt-6">
              <legend class="text-sm font-medium text-slate-700">Categorias <span class="font-normal text-slate-500">(opcional)</span></legend>

              @if (carregandoCategorias()) {
                <div class="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600" role="status">
                  <span class="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true"></span>
                  <span>Carregando categorias...</span>
                </div>
              } @else if (erroCategorias()) {
                <div class="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
                  <p class="text-sm text-rose-800">Não foi possível carregar as categorias. Tente novamente.</p>
                  <button
                    type="button"
                    (click)="carregarCategorias()"
                    class="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <svg lucideRefreshCw aria-hidden="true" class="size-4"></svg>
                    <span>Tentar novamente</span>
                  </button>
                  @if (editando) {
                    <p class="mt-3 text-sm font-medium text-rose-900">Não é possível salvar a edição até que as categorias sejam carregadas, para preservar as associações existentes.</p>
                  }
                </div>
              } @else if (categorias().length === 0) {
                <p class="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nenhuma categoria disponível.</p>
              } @else {
                <div class="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Categorias disponíveis">
                  @for (categoria of categorias(); track categoria.id) {
                    <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700 transition hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                      <input
                        type="checkbox"
                        [value]="categoria.id"
                        [checked]="categoriaSelecionada(categoria.id)"
                        [disabled]="enviando() || !categoriasCarregadas()"
                        (change)="alternarCategoria(categoria.id, $event)"
                        class="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{{ categoria.titulo }}</span>
                    </label>
                  }
                </div>
              }
            </fieldset>

            @if (mensagemErro(); as message) {
              <p class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert" aria-live="assertive">
                {{ message }}
              </p>
            }

            <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <a
                routerLink="/app/notas"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <svg lucideArrowLeft aria-hidden="true" class="size-4"></svg>
                <span>Cancelar</span>
              </a>
              <button
                type="submit"
                [disabled]="enviando() || carregandoCategorias() || (editando && !categoriasCarregadas())"
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
export class NoteForm implements OnInit {
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly notesApi = inject(NotesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly editando = this.id !== null;
  private readonly statusOriginal = signal<StatusNota>('Ativa');
  private readonly model = signal<NoteFormModel>({
    titulo: '',
    descricao: '',
    categoriaIds: [],
  });
  protected readonly noteForm = form(this.model, (path) => {
    disabled(path.titulo, { when: () => this.enviando() });
    disabled(path.descricao, { when: () => this.enviando() });
    required(path.titulo, { message: 'Informe o título da nota.' });
    validate(path.titulo, ({ value }) => {
      const titulo = value().trim();
      if (!titulo) {
        return { kind: 'required', message: 'Informe o título da nota.' };
      }

      return titulo.length < 2 || titulo.length > 100
        ? { kind: 'titleLength', message: 'O título deve ter entre 2 e 100 caracteres.' }
        : undefined;
    });
    validate(path.descricao, ({ value }) =>
      value().trim().length > 300
        ? { kind: 'descriptionLength', message: 'A descrição deve ter no máximo 300 caracteres.' }
        : undefined,
    );
  });

  protected readonly categorias = signal<CategoriaDto[]>([]);
  protected readonly categoriasCarregadas = signal(false);
  protected readonly carregandoCategorias = signal(true);
  protected readonly erroCategorias = signal(false);
  protected readonly carregandoNota = signal(this.editando);
  protected readonly falhaCarregamentoNota = signal(false);
  protected readonly notaNaoEncontrada = signal(false);
  protected readonly enviando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  private readonly submetido = signal(false);

  ngOnInit(): void {
    this.carregarCategorias();
    if (this.id) {
      this.carregarNota(this.id);
    }
  }

  protected tituloError(): string | null {
    const field = this.noteForm.titulo;
    if (!this.submetido() && !field().touched()) {
      return null;
    }
    return field().errors()[0]?.message ?? null;
  }

  protected descricaoError(): string | null {
    const field = this.noteForm.descricao;
    if (!this.submetido() && !field().touched()) {
      return null;
    }
    return field().errors()[0]?.message ?? null;
  }

  protected descricaoRestante(): number {
    return Math.max(0, 300 - this.model().descricao.trim().length);
  }

  protected categoriaSelecionada(id: string): boolean {
    return this.model().categoriaIds.includes(id);
  }

  protected alternarCategoria(id: string, event: Event): void {
    const selecionada = (event.target as HTMLInputElement).checked;
    this.model.update((model) => ({
      ...model,
      categoriaIds: selecionada
        ? [...new Set([...model.categoriaIds, id])]
        : model.categoriaIds.filter((categoriaId) => categoriaId !== id),
    }));
  }

  protected carregarCategorias(): void {
    this.carregandoCategorias.set(true);
    this.erroCategorias.set(false);
    this.categoriasCarregadas.set(false);
    this.categoriesApi
      .listar()
      .pipe(finalize(() => this.carregandoCategorias.set(false)))
      .subscribe({
        next: (categorias) => {
          this.categorias.set(categorias);
          this.categoriasCarregadas.set(true);
        },
        error: () => {
          this.erroCategorias.set(true);
        },
      });
  }

  protected carregarNota(id: string): void {
    this.carregandoNota.set(true);
    this.falhaCarregamentoNota.set(false);
    this.notaNaoEncontrada.set(false);
    this.notesApi
      .obter(id)
      .pipe(finalize(() => this.carregandoNota.set(false)))
      .subscribe({
        next: (nota) => {
          this.statusOriginal.set(nota.status);
          this.model.set({
            titulo: nota.titulo,
            descricao: nota.descricao ?? '',
            categoriaIds: nota.categorias.map((categoria) => categoria.id),
          });
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.notaNaoEncontrada.set(true);
            return;
          }
          this.falhaCarregamentoNota.set(true);
        },
      });
  }

  protected salvar(event: SubmitEvent): void {
    event.preventDefault();
    if (
      this.enviando() ||
      this.carregandoNota() ||
      this.notaNaoEncontrada() ||
      this.falhaCarregamentoNota() ||
      (this.editando && !this.categoriasCarregadas())
    ) {
      return;
    }

    this.submetido.set(true);
    this.noteForm.titulo().markAsTouched();
    this.noteForm.descricao().markAsTouched();
    this.mensagemErro.set(null);

    if (this.noteForm().invalid()) {
      return;
    }

    const value = this.model();
    const descricao = value.descricao.trim();
    const common = {
      titulo: value.titulo.trim(),
      descricao: descricao.length > 0 ? descricao : null,
      categoriaIds: [...value.categoriaIds],
    };

    const request = this.id
      ? this.notesApi.atualizar(this.id, {
          ...common,
          status: this.statusOriginal(),
        } satisfies AtualizarNotaRequest)
      : this.notesApi.criar(common satisfies CriarNotaRequest);

    this.enviando.set(true);
    request.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/app/notas'),
      error: (error: unknown) => {
        this.mensagemErro.set(this.apiErrorMessage(error));
      },
    });
  }

  private apiErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Não foi possível salvar a nota. Verifique sua conexão e tente novamente.';
    }

    if (error.status === 400) {
      return this.validationMessage(error.error);
    }
    if (error.status === 404) {
      return 'A nota ou uma das categorias selecionadas não foi encontrada. Confira os dados e tente novamente.';
    }
    if (error.status === 409) {
      return 'Já existe uma nota com este título.';
    }
    return 'Não foi possível salvar a nota. Verifique sua conexão e tente novamente.';
  }

  private validationMessage(response: unknown): string {
    if (!response || typeof response !== 'object' || !('errors' in response)) {
      return 'Revise o título e a descrição informados e tente novamente.';
    }

    const errors = response.errors;
    if (!errors || typeof errors !== 'object') {
      return 'Revise o título e a descrição informados e tente novamente.';
    }

    const fields = Object.keys(errors).map((field) => field.toLowerCase());
    const messages: string[] = [];
    if (fields.includes('titulo')) {
      messages.push('O título deve ter entre 2 e 100 caracteres.');
    }
    if (fields.includes('descricao')) {
      messages.push('A descrição deve ter no máximo 300 caracteres.');
    }

    return messages.length > 0
      ? messages.join(' ')
      : 'Revise o título e a descrição informados e tente novamente.';
  }
}
