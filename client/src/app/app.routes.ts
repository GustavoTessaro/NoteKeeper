import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

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
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./workspace/home/workspace-home').then((component) => component.WorkspaceHome),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./categories/categories-page/categories-page').then(
            (component) => component.CategoriesPage,
          ),
      },
      {
        path: 'categorias/nova',
        loadComponent: () =>
          import('./categories/category-form/category-form').then(
            (component) => component.CategoryForm,
          ),
      },
      {
        path: 'categorias/:id/editar',
        loadComponent: () =>
          import('./categories/category-form/category-form').then(
            (component) => component.CategoryForm,
          ),
      },
    ],
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
