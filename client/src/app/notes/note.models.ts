import { CategoriaDto } from '../categories/category.models';

export type StatusNota = 'Ativa' | 'Arquivada';

export interface NotaDto {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusNota;
  categorias: CategoriaDto[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarNotaRequest {
  titulo: string;
  descricao: string | null;
  categoriaIds: string[];
}

export interface AtualizarNotaRequest extends CriarNotaRequest {
  status: StatusNota;
}
