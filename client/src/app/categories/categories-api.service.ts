import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../auth/auth.tokens';
import { CategoriaDto, CategoriaRequest } from './category.models';

@Injectable({ providedIn: 'root' })
export class CategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  listar(): Observable<CategoriaDto[]> {
    return this.http.get<CategoriaDto[]>(this.endpoint('/categorias'));
  }

  obter(id: string): Observable<CategoriaDto> {
    return this.http.get<CategoriaDto>(this.endpoint(`/categorias/${encodeURIComponent(id)}`));
  }

  criar(request: CategoriaRequest): Observable<CategoriaDto> {
    return this.http.post<CategoriaDto>(this.endpoint('/categorias'), request);
  }

  atualizar(id: string, request: CategoriaRequest): Observable<CategoriaDto> {
    return this.http.put<CategoriaDto>(
      this.endpoint(`/categorias/${encodeURIComponent(id)}`),
      request,
    );
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/categorias/${encodeURIComponent(id)}`));
  }

  private endpoint(path: string): string {
    return `${this.apiBaseUrl.replace(/\/+$/, '')}${path}`;
  }
}
