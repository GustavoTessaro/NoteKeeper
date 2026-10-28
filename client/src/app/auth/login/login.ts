import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p class="text-sm font-semibold tracking-wide text-indigo-600">NoteKeeper</p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">Entrar</h1>
        <p class="mt-2 text-slate-600">A tela de autenticação será implementada em uma próxima etapa.</p>
      </section>
    </main>
  `,
})
export class Login {}
