using FluentResults;
using MediatR;
using NoteKeeper.Aplicacao.Compartilhado;
using NoteKeeper.Dominio.Modulos.Notas;

namespace NoteKeeper.Aplicacao.Modulos.Notas;

public sealed record ListarNotasQuery(Guid UsuarioId, IReadOnlyCollection<Guid>? CategoriaIds)
    : IRequest<Result<IReadOnlyList<NotaDto>>>;

public sealed class ListarNotasQueryHandler(IRepositorioNota repositorio)
    : IRequestHandler<ListarNotasQuery, Result<IReadOnlyList<NotaDto>>>
{
    public async Task<Result<IReadOnlyList<NotaDto>>> Handle(ListarNotasQuery query, CancellationToken ct)
    {
        var notas = await repositorio.ListarAsync(query.UsuarioId, query.CategoriaIds, ct);
        var resultado = notas.Select(DtoMapper.ToDto).ToArray();

        return Result.Ok<IReadOnlyList<NotaDto>>(resultado);
    }
}
