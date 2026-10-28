import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((component) => component.Login),
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
