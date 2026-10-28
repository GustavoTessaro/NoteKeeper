using FluentResults;
using MediatR;
using NoteKeeper.Aplicacao.Compartilhado;
using NoteKeeper.Dominio.Compartilhado;
using NoteKeeper.Dominio.Modulos.Notas;

namespace NoteKeeper.Aplicacao.Modulos.Notas;

public sealed record ObterNotaQuery(Guid UsuarioId, Guid Id) : IRequest<Result<NotaDto>>;

public sealed class ObterNotaQueryHandler(IRepositorioNota repositorio)
    : IRequestHandler<ObterNotaQuery, Result<NotaDto>>
{
    public async Task<Result<NotaDto>> Handle(ObterNotaQuery query, CancellationToken ct)
    {
        var nota = await repositorio.ObterAsync(query.Id, query.UsuarioId, ct);
        if (nota is null)
        {
            return Result.Fail<NotaDto>(Erros.Criar(TipoErro.NaoEncontrado, "Nota não encontrada."));
        }

        return Result.Ok(DtoMapper.ToDto(nota));
    }
}
