import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArchive,
  LucideArchiveRestore,
  LucideArrowLeft,
  LucideNotebookPen,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { CategoriaDto } from '../../categories/category.models';
import { CategoriesApiService } from '../../categories/categories-api.service';
import { AtualizarNotaRequest, NotaDto, StatusNota } from '../note.models';
import { NotesApiService } from '../notes-api.service';

type NotesPageState = 'loading' | 'loaded' | 'empty' | 'error';
type CategoriesPageState = 'loading' | 'loaded' | 'empty' | 'error';

interface NoteOperationError {
  message: string;
  refreshRequired: boolean;
}

@Component({
  imports: [
    LucideArchive,
    LucideArchiveRestore,
    LucideArrowLeft,
    LucideNotebookPen,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideTrash2,
    LucideX,
    RouterLink,
  ],
  selector: 'app-notes-page',
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section class="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div [attr.inert]="notaParaExcluir() ? '' : null">
        <header class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <span class="mt-1 rounded-xl bg-indigo-50 p-3 text-indigo-700">
              <svg lucideNotebookPen aria-hidden="true" class="size-5"></svg>
            </span>
            <div>
              <p class="text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
              <h1 #pageTitle tabindex="-1" class="mt-1 text-3xl font-bold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600">Notas</h1>
              <p class="mt-2 text-slate-600">Acompanhe suas notas e categorias.</p>
            </div>
          </div>
          <a
            routerLink="/app"
            class="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <svg lucideArrowLeft aria-hidden="true" class="size-4"></svg>
            <span>Voltar ao workspace</span>
          </a>
        </header>

        <div class="mt-8 flex justify-end">
          <a
            routerLink="/app/notas/nova"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <svg lucidePlus aria-hidden="true" class="size-4"></svg>
            <span>Nova nota</span>
          </a>
        </div>

        <section
          class="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
          aria-labelledby="category-filter-title"
          [attr.aria-busy]="estadoCategorias() === 'loading'"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1">
              <h2 id="category-filter-title" class="font-semibold text-slate-900">
                Filtrar por categorias
              </h2>
              @switch (estadoCategorias()) {
                @case ('loading') {
                  <p class="mt-2 text-sm text-slate-600" role="status">Carregando categorias...</p>
                }
                @case ('error') {
                  <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <p class="text-sm text-rose-800" role="alert">
                      Não foi possível carregar as categorias. Tente novamente.
                    </p>
                    <button
                      type="button"
                      (click)="carregarCategorias()"
                      class="inline-flex items-center gap-2 self-start rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                    >
                      <svg lucideRefreshCw aria-hidden="true" class="size-4"></svg>
                      <span>Tentar novamente</span>
                    </button>
                  </div>
                }
                @case ('empty') {
                  <p class="mt-2 text-sm text-slate-600">
                    Você ainda não tem categorias para filtrar.
                  </p>
                }
                @case ('loaded') {
                  <fieldset class="mt-3" [disabled]="acoesBloqueadas()">
                    <legend class="sr-only">Selecione uma ou mais categorias</legend>
                    <div class="flex flex-wrap gap-2">
                      @for (categoria of categorias(); track categoria.id) {
                        <label
                          class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-800"
                        >
                          <input
                            type="checkbox"
                            [checked]="categoriaEstaSelecionada(categoria.id)"
                            (change)="alternarCategoria(categoria.id, $event)"
                            [attr.aria-label]="'Filtrar por categoria ' + categoria.titulo"
                            class="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          />
                          <span>{{ categoria.titulo }}</span>
                        </label>
                      }
                    </div>
                  </fieldset>
                }
              }
            </div>
            @if (temFiltrosAtivos()) {
              <button
                type="button"
                (click)="limparFiltros()"
                class="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <svg lucideX aria-hidden="true" class="size-4"></svg>
                <span>Limpar filtros</span>
              </button>
            }
          </div>
        </section>

        <section class="mt-8" aria-live="polite" [attr.aria-busy]="estado() === 'loading'">
          @switch (estado()) {
            @case ('loading') {
              <div class="flex items-center gap-3 rounded-xl bg-slate-50 p-5 text-slate-600" role="status">
                <span class="size-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true"></span>
                <p>Carregando notas...</p>
              </div>
            }
            @case ('empty') {
              <div class="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                @if (temFiltrosAtivos()) {
                  <h2 class="font-semibold text-slate-900">Nenhuma nota corresponde aos filtros</h2>
                  <p class="mt-2 text-sm text-slate-600">
                    Tente selecionar outras categorias ou limpar os filtros.
                  </p>
                } @else {
                  <h2 class="font-semibold text-slate-900">Nenhuma nota cadastrada</h2>
                  <p class="mt-2 text-sm text-slate-600">Suas notas aparecerão aqui quando você criar a primeira.</p>
                }
              </div>
            }
            @case ('error') {
              <div class="rounded-xl border border-rose-200 bg-rose-50 p-5" role="alert">
                <p class="font-semibold text-rose-900">Não foi possível carregar as notas.</p>
                <p class="mt-1 text-sm text-rose-800">Verifique sua conexão e tente novamente.</p>
                <button
                  type="button"
                  (click)="carregar()"
                  class="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                >
                  <svg lucideRefreshCw aria-hidden="true" class="size-4"></svg>
                  <span>Tentar novamente</span>
                </button>
              </div>
            }
            @case ('loaded') {
              <ul
                class="grid gap-4 md:grid-cols-2"
                aria-label="Lista de notas"
              >
                @for (nota of notas(); track nota.id) {
                  <li class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="flex items-start justify-between gap-3">
                      <h2 class="text-lg font-semibold text-slate-900">{{ nota.titulo }}</h2>
                      <span
                        class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                        [class]="nota.status === 'Ativa'
                          ? 'shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800'
                          : 'shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'"
                      >
                        {{ nota.status }}
                      </span>
                    </div>

                    @if (nota.descricao) {
                      <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{{ nota.descricao }}</p>
                    }

                    @if (nota.categorias.length > 0) {
                      <ul class="mt-4 flex flex-wrap gap-2" aria-label="Categorias da nota">
                        @for (categoria of nota.categorias; track categoria.id) {
                          <li class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                            {{ categoria.titulo }}
                          </li>
                        }
                      </ul>
                    }

                    <p class="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      Atualizada em
                      <time [attr.datetime]="nota.atualizadoEm">{{ dataAtualizacao(nota.atualizadoEm) }}</time>
                    </p>
                    <a
                      [routerLink]="['/app/notas', nota.id, 'editar']"
                      [attr.aria-label]="'Editar nota ' + nota.titulo"
                      class="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      <svg lucidePencil aria-hidden="true" class="size-4"></svg>
                      <span>Editar</span>
                    </a>
                    <button
                      type="button"
                      (click)="alterarStatus(nota, nota.status === 'Ativa' ? 'Arquivada' : 'Ativa')"
                      [disabled]="acoesBloqueadas()"
                      [attr.aria-busy]="emProcessamento(nota.id)"
                      [attr.aria-label]="(nota.status === 'Ativa' ? 'Arquivar' : 'Reativar') + ' nota ' + nota.titulo"
                      class="ml-2 mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      @if (emProcessamento(nota.id)) {
                        <span class="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true"></span>
                        <span>{{ nota.status === 'Ativa' ? 'Arquivando...' : 'Reativando...' }}</span>
                      } @else if (nota.status === 'Ativa') {
                        <svg lucideArchive aria-hidden="true" class="size-4"></svg>
                        <span>Arquivar</span>
                      } @else {
                        <svg lucideArchiveRestore aria-hidden="true" class="size-4"></svg>
                        <span>Reativar</span>
                      }
                    </button>
                    <button
                      type="button"
                      (click)="solicitarExclusao(nota, $event)"
                      [disabled]="acoesBloqueadas()"
                      [attr.aria-label]="'Excluir nota ' + nota.titulo"
                      class="ml-2 mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg lucideTrash2 aria-hidden="true" class="size-4"></svg>
                      <span>Excluir</span>
                    </button>
                    @if (erroOperacao()[nota.id]; as erro) {
                      <div class="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="alert">
                        <p>{{ erro.message }}</p>
                        @if (erro.refreshRequired) {
                          <button
                            type="button"
                            (click)="carregar()"
                            class="mt-2 inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-1.5 font-semibold text-rose-900 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                          >
                            <svg lucideRefreshCw aria-hidden="true" class="size-4"></svg>
                            <span>Atualizar lista</span>
                          </button>
                        }
                      </div>
                    }
                  </li>
                }
              </ul>
            }
          }
        </section>

        @if (mensagemStatus(); as mensagem) {
          <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status" aria-live="polite">
            {{ mensagem }}
          </p>
        }
        </div>

        @if (notaParaExcluir(); as nota) {
          <div
            class="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/40 p-4"
            (click)="fecharConfirmacao($event)"
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-note-title"
              aria-describedby="delete-note-description delete-note-warning"
              [attr.aria-busy]="excluindoId() !== null"
              tabindex="-1"
              #confirmDialog
              class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              (keydown)="manterFocoNoDialogo($event)"
              (click)="$event.stopPropagation()"
            >
              <h2 id="delete-note-title" class="text-xl font-bold text-slate-900">
                Excluir nota?
              </h2>
              <p id="delete-note-description" class="mt-3 text-slate-700">
                Confirma a exclusão da nota <strong>{{ nota.titulo }}</strong>?
              </p>
              <p id="delete-note-warning" class="mt-2 text-sm text-slate-600">
                Esta ação é definitiva. A nota e todas as suas associações com categorias serão removidas.
              </p>

              @if (erroExclusao(); as message) {
                <p class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                  {{ message }}
                </p>
              }

              <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  [disabled]="excluindoId() !== null"
                  #cancelButton
                  (click)="cancelarExclusao()"
                  class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg lucideX aria-hidden="true" class="size-4"></svg>
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  [disabled]="excluindoId() !== null"
                  [attr.aria-busy]="excluindoId() !== null"
                  (click)="confirmarExclusao()"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  @if (excluindoId() !== null) {
                    <span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
                    <span>Excluindo...</span>
                  } @else {
                    <svg lucideTrash2 aria-hidden="true" class="size-4"></svg>
                    <span>Excluir nota</span>
                  }
                </button>
              </div>
            </section>
          </div>
        }
      </section>
    </main>
  `,
})
export class NotesPage implements OnInit {
  private readonly notesApi = inject(NotesApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly injector = inject(Injector);
  @ViewChild('pageTitle') private pageTitle?: ElementRef<HTMLHeadingElement>;
  @ViewChild('confirmDialog') private confirmDialog?: ElementRef<HTMLElement>;
  @ViewChild('cancelButton') private cancelButton?: ElementRef<HTMLButtonElement>;
  private deleteTrigger: HTMLButtonElement | null = null;
  private notesRequestVersion = 0;

  protected readonly notas = signal<NotaDto[]>([]);
  protected readonly estado = signal<NotesPageState>('loading');
  protected readonly categorias = signal<CategoriaDto[]>([]);
  protected readonly estadoCategorias = signal<CategoriesPageState>('loading');
  protected readonly categoriasSelecionadas = signal<ReadonlySet<string>>(new Set());
  protected readonly notasEmProcessamento = signal<ReadonlySet<string>>(new Set());
  protected readonly erroOperacao = signal<Readonly<Record<string, NoteOperationError>>>({});
  protected readonly notaParaExcluir = signal<NotaDto | null>(null);
  protected readonly excluindoId = signal<string | null>(null);
  protected readonly erroExclusao = signal<string | null>(null);
  protected readonly mensagemStatus = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarCategorias();
    this.carregar();
  }

  protected carregar(): void {
    const requestVersion = ++this.notesRequestVersion;
    const categoriaIds = [...this.categoriasSelecionadas()];
    this.estado.set('loading');
    this.erroOperacao.set({});
    this.notesApi.listar(categoriaIds.length > 0 ? categoriaIds : undefined).subscribe({
      next: (notas) => {
        if (requestVersion !== this.notesRequestVersion) {
          return;
        }
        this.notas.set(notas);
        this.estado.set(notas.length === 0 ? 'empty' : 'loaded');
      },
      error: () => {
        if (requestVersion === this.notesRequestVersion) {
          this.estado.set('error');
        }
      },
    });
  }

  protected carregarCategorias(): void {
    this.estadoCategorias.set('loading');
    this.categoriesApi.listar().subscribe({
      next: (categorias) => {
        this.categorias.set(categorias);
        this.estadoCategorias.set(categorias.length === 0 ? 'empty' : 'loaded');
      },
      error: () => this.estadoCategorias.set('error'),
    });
  }

  protected alternarCategoria(id: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const checked = event.target.checked;
    this.categoriasSelecionadas.update((selected) => {
      const updated = new Set(selected);
      if (checked) {
        updated.add(id);
      } else {
        updated.delete(id);
      }
      return updated;
    });
    this.carregar();
  }

  protected limparFiltros(): void {
    if (this.categoriasSelecionadas().size === 0) {
      return;
    }

    this.categoriasSelecionadas.set(new Set());
    this.carregar();
  }

  protected categoriaEstaSelecionada(id: string): boolean {
    return this.categoriasSelecionadas().has(id);
  }

  protected temFiltrosAtivos(): boolean {
    return this.categoriasSelecionadas().size > 0;
  }

  protected emProcessamento(id: string): boolean {
    return this.notasEmProcessamento().has(id);
  }

  protected acoesBloqueadas(): boolean {
    return this.notaParaExcluir() !== null
      || this.excluindoId() !== null
      || this.notasEmProcessamento().size > 0;
  }

  protected solicitarExclusao(nota: NotaDto, event: MouseEvent): void {
    if (this.acoesBloqueadas()) {
      return;
    }

    this.deleteTrigger = event.currentTarget instanceof HTMLButtonElement
      ? event.currentTarget
      : null;
    this.erroExclusao.set(null);
    this.mensagemStatus.set(null);
    this.notaParaExcluir.set(nota);
    this.focarDepoisDaRenderizacao(() => this.cancelButton?.nativeElement.focus());
  }

  protected fecharConfirmacao(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancelarExclusao();
    }
  }

  protected cancelarExclusao(): void {
    if (this.excluindoId() !== null) {
      return;
    }

    this.notaParaExcluir.set(null);
    this.erroExclusao.set(null);
    this.restaurarFocoAoAcionador();
  }

  protected manterFocoNoDialogo(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelarExclusao();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const dialog = this.confirmDialog?.nativeElement;
    if (!dialog) {
      return;
    }

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!dialog.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected confirmarExclusao(): void {
    const nota = this.notaParaExcluir();
    if (!nota || this.excluindoId() !== null) {
      return;
    }

    this.erroExclusao.set(null);
    this.excluindoId.set(nota.id);
    this.focarDepoisDaRenderizacao(() => this.confirmDialog?.nativeElement.focus());
    this.notesApi.excluir(nota.id).subscribe({
      next: () => {
        this.notaParaExcluir.set(null);
        this.removerNota(nota.id);
        this.mensagemStatus.set(`A nota "${nota.titulo}" foi excluída.`);
        this.excluindoId.set(null);
        this.focarTituloDaPagina();
      },
      error: (error: unknown) => {
        this.excluindoId.set(null);
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.notaParaExcluir.set(null);
          this.removerNota(nota.id);
          this.mensagemStatus.set(
            `A nota "${nota.titulo}" não está mais disponível. A lista foi atualizada.`,
          );
          this.focarTituloDaPagina();
          return;
        }

        this.erroExclusao.set(
          error instanceof HttpErrorResponse && error.status === 0
            ? 'Não foi possível excluir a nota. Verifique sua conexão e tente novamente.'
            : 'Ocorreu um erro ao excluir a nota. Tente novamente.',
        );
        this.focarDepoisDaRenderizacao(() => this.cancelButton?.nativeElement.focus());
      },
    });
  }

  private restaurarFocoAoAcionador(): void {
    this.focarDepoisDaRenderizacao(() => {
      if (this.deleteTrigger?.isConnected) {
        this.deleteTrigger.focus();
      } else {
        this.focarTituloDaPagina();
      }
    });
  }

  private focarTituloDaPagina(): void {
    this.focarDepoisDaRenderizacao(() => this.pageTitle?.nativeElement.focus());
  }

  private focarDepoisDaRenderizacao(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }

  private removerNota(id: string): void {
    this.notas.update((notes) => notes.filter((nota) => nota.id !== id));
    this.estado.set(this.notas().length === 0 ? 'empty' : 'loaded');
  }

  protected alterarStatus(nota: NotaDto, status: StatusNota): void {
    if (this.acoesBloqueadas()) {
      return;
    }

    this.notasEmProcessamento.update((ids) => new Set(ids).add(nota.id));
    this.erroOperacao.update((errors) => {
      const { [nota.id]: _previousError, ...remaining } = errors;
      return remaining;
    });

    const request: AtualizarNotaRequest = {
      titulo: nota.titulo,
      descricao: nota.descricao,
      status,
      categoriaIds: nota.categorias.map((categoria) => categoria.id),
    };

    this.notesApi.atualizar(nota.id, request).subscribe({
      next: (updatedNote) => {
        this.notas.update((notes) =>
          notes.map((currentNote) =>
            currentNote.id === updatedNote.id ? updatedNote : currentNote,
          ),
        );
        this.finalizarOperacao(nota.id);
      },
      error: (error: unknown) => {
        this.erroOperacao.update((errors) => ({
          ...errors,
          [nota.id]: this.mensagemErroOperacao(error),
        }));
        this.finalizarOperacao(nota.id);
      },
    });
  }

  private finalizarOperacao(id: string): void {
    this.notasEmProcessamento.update((ids) => {
      const remaining = new Set(ids);
      remaining.delete(id);
      return remaining;
    });
  }

  private mensagemErroOperacao(error: unknown): NoteOperationError {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return {
          message: 'Esta nota não está mais disponível. Atualize a lista para sincronizar os dados.',
          refreshRequired: true,
        };
      }
      if (error.status === 409) {
        return {
          message: 'A nota foi alterada e não foi possível atualizar o status. Atualize a lista e tente novamente.',
          refreshRequired: true,
        };
      }
      if (error.status === 0) {
        return {
          message: 'Não foi possível atualizar o status da nota. Verifique sua conexão e tente novamente.',
          refreshRequired: false,
        };
      }
    }

    return {
      message: 'Ocorreu um erro ao atualizar o status da nota. Tente novamente.',
      refreshRequired: false,
    };
  }

  protected dataAtualizacao(value: string): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return 'Data indisponível';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}
