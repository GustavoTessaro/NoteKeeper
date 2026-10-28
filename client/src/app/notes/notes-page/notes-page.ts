import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideNotebookPen, LucideRefreshCw } from '@lucide/angular';
import { NotaDto } from '../note.models';
import { NotesApiService } from '../notes-api.service';

type NotesPageState = 'loading' | 'loaded' | 'empty' | 'error';

@Component({
  imports: [LucideArrowLeft, LucideNotebookPen, LucideRefreshCw, RouterLink],
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

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.estado.set('loading');
    this.notesApi.listar().subscribe({
      next: (notas) => {
        this.notas.set(notas);
        this.estado.set(notas.length === 0 ? 'empty' : 'loaded');
      },
      error: () => this.estado.set('error'),
    });
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
