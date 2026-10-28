import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideLogOut, LucideTags } from '@lucide/angular';
import { EMPTY, catchError, finalize } from 'rxjs';
import { AuthApiService } from '../../auth/auth-api.service';
import { AuthStateService } from '../../auth/auth-state.service';

@Component({
  imports: [LucideLogOut, LucideTags, RouterLink],
  selector: 'app-workspace-home',
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section class="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
            <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">Workspace</h1>
            <p class="mt-2 text-slate-600">Olá, {{ authState.usuario()?.nome }}.</p>
            <p class="text-sm text-slate-500">{{ authState.usuario()?.email }}</p>
          </div>
          <button
            type="button"
            [disabled]="saindo()"
            [attr.aria-busy]="saindo()"
            (click)="sair()"
            class="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            @if (saindo()) {
              <span class="size-4 animate-spin rounded-full border-2 border-slate-400/40 border-t-slate-700" aria-hidden="true"></span>
              <span>Saindo...</span>
            } @else {
              <svg lucideLogOut aria-hidden="true" class="size-4"></svg>
              <span>Sair</span>
            }
          </button>
        </header>

        <nav class="mt-8">
          <a
            routerLink="/app/categorias"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <svg lucideTags aria-hidden="true" class="size-4"></svg>
            <span>Gerenciar categorias</span>
          </a>
        </nav>
        <p class="mt-6 text-slate-600">A área principal da aplicação será construída nas próximas etapas.</p>
      </section>
    </main>
  `,
})
export class WorkspaceHome {
  protected readonly authState = inject(AuthStateService);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly saindo = signal(false);

  protected sair(): void {
    if (this.saindo()) {
      return;
    }

    const session = this.authState.consultarSessao();
    if (!session) {
      this.authState.limparSessao();
      void this.router.navigateByUrl('/login');
      return;
    }

    this.saindo.set(true);
    this.authApi
      .logout()
      .pipe(
        catchError(() => EMPTY),
        finalize(() => {
          this.authState.limparSessao();
          this.saindo.set(false);
          void this.router.navigateByUrl('/login');
        }),
      )
      .subscribe();
  }
}
