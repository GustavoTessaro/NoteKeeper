import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArchive,
  LucideArchiveRestore,
  LucideArrowLeft,
  LucideNotebookPen,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
} from '@lucide/angular';
import { AtualizarNotaRequest, NotaDto, StatusNota } from '../note.models';
import { NotesApiService } from '../notes-api.service';

type NotesPageState = 'loading' | 'loaded' | 'empty' | 'error';

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
    RouterLink,
  ],
  selector: 'app-notes-page',
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section class="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <span class="mt-1 rounded-xl bg-indigo-50 p-3 text-indigo-700">
              <svg lucideNotebookPen aria-hidden="true" class="size-5"></svg>
            </span>
            <div>
              <p class="text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
              <h1 class="mt-1 text-3xl font-bold tracking-tight text-slate-900">Notas</h1>
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
                <h2 class="font-semibold text-slate-900">Nenhuma nota cadastrada</h2>
                <p class="mt-2 text-sm text-slate-600">Suas notas aparecerão aqui quando você criar a primeira.</p>
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
              <ul class="grid gap-4 md:grid-cols-2" aria-label="Lista de notas">
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
                      [disabled]="emProcessamento(nota.id)"
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
      </section>
    </main>
  `,
})
export class NotesPage implements OnInit {
  private readonly notesApi = inject(NotesApiService);

  protected readonly notas = signal<NotaDto[]>([]);
  protected readonly estado = signal<NotesPageState>('loading');
  protected readonly notasEmProcessamento = signal<ReadonlySet<string>>(new Set());
  protected readonly erroOperacao = signal<Readonly<Record<string, NoteOperationError>>>({});

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.estado.set('loading');
    this.erroOperacao.set({});
    this.notesApi.listar().subscribe({
      next: (notas) => {
        this.notas.set(notas);
        this.estado.set(notas.length === 0 ? 'empty' : 'loaded');
      },
      error: () => this.estado.set('error'),
    });
  }

  protected emProcessamento(id: string): boolean {
    return this.notasEmProcessamento().has(id);
  }

  protected alterarStatus(nota: NotaDto, status: StatusNota): void {
    if (this.emProcessamento(nota.id)) {
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
