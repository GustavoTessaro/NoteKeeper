import { InjectionToken } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export const AUTH_SESSION_STORAGE = new InjectionToken<Storage>('AUTH_SESSION_STORAGE', {
  providedIn: 'root',
  factory: () => sessionStorage,
});
