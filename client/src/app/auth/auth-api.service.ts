import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './auth.tokens';
import { CadastroRequest, LoginRequest, TokenDto, UsuarioDto } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  cadastrar(request: CadastroRequest): Observable<UsuarioDto> {
    return this.http.post<UsuarioDto>(this.endpoint('/auth/cadastro'), request);
  }

  login(request: LoginRequest): Observable<TokenDto> {
    return this.http.post<TokenDto>(this.endpoint('/auth/login'), request);
  }

  obterUsuario(accessToken: string): Observable<UsuarioDto> {
    return this.http.get<UsuarioDto>(this.endpoint('/auth/me'), {
      headers: this.authorizationHeaders(accessToken),
    });
  }

  logout(accessToken: string): Observable<void> {
    return this.http.post<void>(
      this.endpoint('/auth/logout'),
      null,
      { headers: this.authorizationHeaders(accessToken) },
    );
  }

  private endpoint(path: string): string {
    return `${this.apiBaseUrl.replace(/\/+$/, '')}${path}`;
  }

  private authorizationHeaders(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }
}
