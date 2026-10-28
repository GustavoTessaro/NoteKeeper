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
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideTags,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { CategoriaDto } from '../category.models';
import { CategoriesApiService } from '../categories-api.service';

type CategoriesPageState = 'loading' | 'loaded' | 'empty' | 'error';

@Component({
  imports: [
    LucideArrowLeft,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideTags,
    LucideTrash2,
    LucideX,
    RouterLink,
  ],
  selector: 'app-categories-page',
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section class="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div [attr.inert]="categoriaParaExcluir() ? '' : null">
        <header class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <span class="mt-1 rounded-xl bg-indigo-50 p-3 text-indigo-700">
              <svg lucideTags aria-hidden="true" class="size-5"></svg>
            </span>
            <div>
              <p class="text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
              <h1 #pageTitle tabindex="-1" class="mt-1 text-3xl font-bold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600">Categorias</h1>
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
          @if (mensagemStatus(); as message) {
            <p class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
              {{ message }}
            </p>
          }
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
                    <button
                      type="button"
                      [disabled]="excluindoId() !== null"
                      [attr.aria-label]="'Excluir categoria ' + categoria.titulo"
                      (click)="solicitarExclusao(categoria, $event)"
                      class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg lucideTrash2 aria-hidden="true" class="size-4"></svg>
                      <span>Excluir</span>
                    </button>
                  </li>
                }
              </ul>
            }
          }
        </section>
        </div>

        @if (categoriaParaExcluir(); as categoria) {
          <div
            class="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/40 p-4"
            (click)="fecharConfirmacao($event)"
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-category-title"
              aria-describedby="delete-category-description delete-category-note"
              tabindex="-1"
              #confirmDialog
              class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              (keydown)="manterFocoNoDialogo($event)"
              (click)="$event.stopPropagation()"
            >
              <h2 id="delete-category-title" class="text-xl font-bold text-slate-900">
                Excluir categoria?
              </h2>
              <p id="delete-category-description" class="mt-3 text-slate-700">
                Confirma a exclusão da categoria <strong>{{ categoria.titulo }}</strong>?
              </p>
              <p id="delete-category-note" class="mt-2 text-sm text-slate-600">
                As notas não serão excluídas; apenas deixarão de estar associadas a esta categoria.
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
                    <span>Confirmar exclusão</span>
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
export class CategoriesPage implements OnInit {
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly injector = inject(Injector);
  @ViewChild('pageTitle') private pageTitle?: ElementRef<HTMLHeadingElement>;
  @ViewChild('confirmDialog') private confirmDialog?: ElementRef<HTMLElement>;
  @ViewChild('cancelButton') private cancelButton?: ElementRef<HTMLButtonElement>;
  private deleteTrigger: HTMLButtonElement | null = null;

  protected readonly categorias = signal<CategoriaDto[]>([]);
  protected readonly estado = signal<CategoriesPageState>('loading');
  protected readonly categoriaParaExcluir = signal<CategoriaDto | null>(null);
  protected readonly excluindoId = signal<string | null>(null);
  protected readonly erroExclusao = signal<string | null>(null);
  protected readonly mensagemStatus = signal<string | null>(null);

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

  protected solicitarExclusao(categoria: CategoriaDto, event: MouseEvent): void {
    if (this.excluindoId() !== null) {
      return;
    }

    this.deleteTrigger = event.currentTarget instanceof HTMLButtonElement
      ? event.currentTarget
      : null;
    this.erroExclusao.set(null);
    this.mensagemStatus.set(null);
    this.categoriaParaExcluir.set(categoria);
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

    this.categoriaParaExcluir.set(null);
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
    const categoria = this.categoriaParaExcluir();
    if (!categoria || this.excluindoId() !== null) {
      return;
    }

    this.erroExclusao.set(null);
    this.excluindoId.set(categoria.id);
    this.focarDepoisDaRenderizacao(() => this.confirmDialog?.nativeElement.focus());
    this.categoriesApi
      .excluir(categoria.id)
      .pipe(finalize(() => this.excluindoId.set(null)))
      .subscribe({
        next: () => {
          this.categoriaParaExcluir.set(null);
          this.removerCategoria(categoria.id);
          this.focarTituloDaPagina();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.categoriaParaExcluir.set(null);
            this.removerCategoria(categoria.id);
            this.mensagemStatus.set('A categoria não foi encontrada ou já havia sido removida. A lista foi atualizada.');
            this.focarTituloDaPagina();
            return;
          }

          this.erroExclusao.set(
            'Não foi possível excluir a categoria. Verifique sua conexão e tente novamente.',
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

  private removerCategoria(id: string): void {
    this.categorias.update((categorias) => categorias.filter((item) => item.id !== id));
    this.estado.set(this.categorias().length === 0 ? 'empty' : 'loaded');
  }
}
