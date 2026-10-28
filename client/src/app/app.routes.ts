import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((component) => component.Login),
  },
  {
    path: 'cadastro',
    loadComponent: () =>
      import('./auth/register/register').then((component) => component.Register),
  },
  {
    path: 'app',
    loadComponent: () =>
      import('./workspace/home/workspace-home').then((component) => component.WorkspaceHome),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
