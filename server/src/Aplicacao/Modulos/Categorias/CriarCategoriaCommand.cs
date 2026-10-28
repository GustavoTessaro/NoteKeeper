using FluentResults;
using MediatR;
using NoteKeeper.Aplicacao.Compartilhado;
using NoteKeeper.Dominio.Compartilhado;
using NoteKeeper.Dominio.Modulos.Categorias;

namespace NoteKeeper.Aplicacao.Modulos.Categorias;

public sealed record CriarCategoriaCommand(Guid UsuarioId, string? Titulo)
    : IRequest<Result<CategoriaDto>>;

public sealed class CriarCategoriaCommandHandler(IRepositorioCategoria repositorio)
    : IRequestHandler<CriarCategoriaCommand, Result<CategoriaDto>>
{
    public async Task<Result<CategoriaDto>> Handle(CriarCategoriaCommand command, CancellationToken ct)
    {
        var categoria = new Categoria(command.UsuarioId, command.Titulo ?? string.Empty);
        var erros = categoria.Validar();

        if (erros.Count > 0)
        {
            return Result.Fail<CategoriaDto>(Erros.Validacao(erros));
        }

        if (await repositorio.TituloExisteAsync(command.UsuarioId, categoria.TituloNormalizado, null, ct))
        {
            return Result.Fail<CategoriaDto>(
                Erros.Criar(TipoErro.Conflito, "Já existe uma categoria com este título.", "titulo"));
        }

        await repositorio.SalvarAsync(categoria, ct);

        return Result.Ok(DtoMapper.ToDto(categoria));
    }
}
