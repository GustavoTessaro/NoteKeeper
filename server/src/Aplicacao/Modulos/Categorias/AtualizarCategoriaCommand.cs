using FluentResults;
using MediatR;
using NoteKeeper.Aplicacao.Compartilhado;
using NoteKeeper.Dominio.Compartilhado;
using NoteKeeper.Dominio.Modulos.Categorias;

namespace NoteKeeper.Aplicacao.Modulos.Categorias;

public sealed record AtualizarCategoriaCommand(Guid UsuarioId, Guid Id, string? Titulo)
    : IRequest<Result<CategoriaDto>>;

public sealed class AtualizarCategoriaCommandHandler(IRepositorioCategoria repositorio)
    : IRequestHandler<AtualizarCategoriaCommand, Result<CategoriaDto>>
{
    public async Task<Result<CategoriaDto>> Handle(AtualizarCategoriaCommand command, CancellationToken ct)
    {
        var categoria = await repositorio.ObterAsync(command.Id, command.UsuarioId, ct);
        if (categoria is null)
        {
            return Result.Fail<CategoriaDto>(Erros.Criar(TipoErro.NaoEncontrado, "Categoria não encontrada."));
        }

        categoria.AlterarTitulo(command.Titulo ?? string.Empty);
        var erros = categoria.Validar();

        if (erros.Count > 0)
        {
            return Result.Fail<CategoriaDto>(Erros.Validacao(erros));
        }

        if (await repositorio.TituloExisteAsync(command.UsuarioId, categoria.TituloNormalizado, command.Id, ct))
        {
            return Result.Fail<CategoriaDto>(
                Erros.Criar(TipoErro.Conflito, "Já existe uma categoria com este título.", "titulo"));
        }

        await repositorio.SalvarAsync(categoria, ct);

        return Result.Ok(DtoMapper.ToDto(categoria));
    }
}
