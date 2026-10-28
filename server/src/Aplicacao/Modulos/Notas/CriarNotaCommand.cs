using FluentResults;
using MediatR;
using NoteKeeper.Aplicacao.Compartilhado;
using NoteKeeper.Dominio.Compartilhado;
using NoteKeeper.Dominio.Modulos.Notas;

namespace NoteKeeper.Aplicacao.Modulos.Notas;

public sealed record CriarNotaCommand(
    Guid UsuarioId,
    string? Titulo,
    string? Descricao,
    IReadOnlyCollection<Guid>? CategoriaIds = null) : IRequest<Result<NotaDto>>;

public sealed class CriarNotaCommandHandler(IRepositorioNota repositorio)
    : IRequestHandler<CriarNotaCommand, Result<NotaDto>>
{
    public async Task<Result<NotaDto>> Handle(CriarNotaCommand command, CancellationToken ct)
    {
        var nota = new Nota(
            command.UsuarioId,
            command.Titulo ?? string.Empty,
            command.Descricao,
            StatusNota.Ativa);
        var erros = nota.Validar();

        if (erros.Count > 0)
        {
            return Result.Fail<NotaDto>(Erros.Validacao(erros));
        }

        if (await repositorio.TituloExisteAsync(command.UsuarioId, nota.TituloNormalizado, null, ct))
        {
            return Result.Fail<NotaDto>(
                Erros.Criar(TipoErro.Conflito, "Já existe uma nota com este título.", "titulo"));
        }

        var categoriaIds = command.CategoriaIds?.Distinct().ToArray() ?? [];
        var categoriasDaConta = await repositorio.CategoriasPropriasAsync(command.UsuarioId, categoriaIds, ct);

        if (categoriasDaConta is null || categoriasDaConta.Count != categoriaIds.Length)
        {
            return Result.Fail<NotaDto>(
                Erros.Criar(TipoErro.NaoEncontrado, "Uma ou mais categorias não foram encontradas."));
        }

        await repositorio.SalvarAsync(nota, categoriaIds, ct);

        return Result.Ok(DtoMapper.ToDto(nota));
    }
}
