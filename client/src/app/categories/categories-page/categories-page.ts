import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucidePencil, LucidePlus, LucideRefreshCw, LucideTags } from '@lucide/angular';
import { CategoriaDto } from '../category.models';
import { CategoriesApiService } from '../categories-api.service';

type CategoriesPageState = 'loading' | 'loaded' | 'empty' | 'error';

@Component({
  imports: [LucideArrowLeft, LucidePencil, LucidePlus, LucideRefreshCw, LucideTags, RouterLink],
  selector: 'app-categories-page',
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section class="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <span class="mt-1 rounded-xl bg-indigo-50 p-3 text-indigo-700">
              <svg lucideTags aria-hidden="true" class="size-5"></svg>
            </span>
            <div>
              <p class="text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
              <h1 class="mt-1 text-3xl font-bold tracking-tight text-slate-900">Categorias</h1>
              <p class="mt-2 text-slate-600">Organize suas notas por categoria.</p>
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
            routerLink="/app/categorias/nova"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <svg lucidePlus aria-hidden="true" class="size-4"></svg>
            <span>Nova categoria</span>
          </a>
        </div>

        <section class="mt-4" aria-live="polite" [attr.aria-busy]="estado() === 'loading'">
          @switch (estado()) {
            @case ('loading') {
              <div class="flex items-center gap-3 rounded-xl bg-slate-50 p-5 text-slate-600">
                <span class="size-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true"></span>
                <p>Carregando categorias...</p>
              </div>
            }
            @case ('empty') {
              <div class="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <h2 class="font-semibold text-slate-900">Nenhuma categoria cadastrada</h2>
                <p class="mt-2 text-sm text-slate-600">Suas categorias aparecerão aqui quando estiverem disponíveis.</p>
              </div>
            }
            @case ('error') {
              <div class="rounded-xl border border-rose-200 bg-rose-50 p-5" role="alert">
                <p class="font-semibold text-rose-900">Não foi possível carregar as categorias.</p>
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
              <ul class="grid gap-3 sm:grid-cols-2" aria-label="Lista de categorias">
                @for (categoria of categorias(); track categoria.id) {
                  <li class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
                    <span class="font-medium">{{ categoria.titulo }}</span>
                    <a
                      [routerLink]="['/app/categorias', categoria.id, 'editar']"
                      [attr.aria-label]="'Editar categoria ' + categoria.titulo"
                      class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      <svg lucidePencil aria-hidden="true" class="size-4"></svg>
                      <span>Editar</span>
                    </a>
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
export class CategoriesPage implements OnInit {
  private readonly categoriesApi = inject(CategoriesApiService);

  protected readonly categorias = signal<CategoriaDto[]>([]);
  protected readonly estado = signal<CategoriesPageState>('loading');

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.estado.set('loading');
    this.categoriesApi.listar().subscribe({
      next: (categorias) => {
        this.categorias.set(categorias);
        this.estado.set(categorias.length === 0 ? 'empty' : 'loaded');
      },
      error: () => {
        this.estado.set('error');
      },
    });
  }
}
