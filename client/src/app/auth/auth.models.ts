export interface CadastroRequest {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface UsuarioDto {
  id: string;
  nome: string;
  email: string;
}

export interface TokenDto {
  usuarioId: string;
  nome: string;
  email: string;
  accessToken: string;
  dataExpiracaoEmUtc: string;
}

export interface AuthSession {
  usuario: UsuarioDto;
  accessToken: string;
  dataExpiracaoEmUtc: string;
}
