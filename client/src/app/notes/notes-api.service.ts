import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../auth/auth.tokens';
import { AtualizarNotaRequest, CriarNotaRequest, NotaDto } from './note.models';

@Injectable({ providedIn: 'root' })
export class NotesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  listar(categoriaIds?: string[]): Observable<NotaDto[]> {
    let params = new HttpParams();
    for (const id of categoriaIds ?? []) {
      params = params.append('categoriaIds', id);
    }

    return this.http.get<NotaDto[]>(this.endpoint('/notas'), { params });
  }

  obter(id: string): Observable<NotaDto> {
    return this.http.get<NotaDto>(this.endpoint(`/notas/${encodeURIComponent(id)}`));
  }

  criar(request: CriarNotaRequest): Observable<NotaDto> {
    return this.http.post<NotaDto>(this.endpoint('/notas'), request);
  }

  atualizar(id: string, request: AtualizarNotaRequest): Observable<NotaDto> {
    return this.http.put<NotaDto>(this.endpoint(`/notas/${encodeURIComponent(id)}`), request);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/notas/${encodeURIComponent(id)}`));
  }

  private endpoint(path: string): string {
    return `${this.apiBaseUrl.replace(/\/+$/, '')}${path}`;
  }
}
