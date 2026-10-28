import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './auth.tokens';
import { AuthStateService } from './auth-state.service';

const publicAuthPaths = ['/auth/login', '/auth/cadastro'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const apiUrl = new URL(apiBaseUrl, window.location.origin);
  const requestUrl = new URL(request.url, window.location.origin);
  const basePath = apiUrl.pathname.replace(/\/+$/, '');
  const isApiRequest =
    requestUrl.origin === apiUrl.origin &&
    (basePath === '' ||
      requestUrl.pathname === basePath ||
      requestUrl.pathname.startsWith(`${basePath}/`));

  if (!isApiRequest) {
    return next(request);
  }

  const apiPath = basePath
    ? requestUrl.pathname.slice(basePath.length) || '/'
    : requestUrl.pathname;

  if (publicAuthPaths.includes(apiPath)) {
    return next(request);
  }

  const session = inject(AuthStateService).consultarSessao();
  if (!session) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    }),
  );
};
