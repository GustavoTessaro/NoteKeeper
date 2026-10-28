using FluentResults;
using MediatR;
using NoteKeeper.Aplicacao.Compartilhado;
using NoteKeeper.Dominio.Compartilhado;
using NoteKeeper.Dominio.Modulos.Notas;

namespace NoteKeeper.Aplicacao.Modulos.Notas;

public sealed record AtualizarNotaCommand(
    Guid UsuarioId,
    Guid Id,
    string? Titulo,
    string? Descricao,
    string? Status,
    IReadOnlyCollection<Guid>? CategoriaIds) : IRequest<Result<NotaDto>>;

public sealed class AtualizarNotaCommandHandler(IRepositorioNota repositorio)
    : IRequestHandler<AtualizarNotaCommand, Result<NotaDto>>
{
    public async Task<Result<NotaDto>> Handle(AtualizarNotaCommand command, CancellationToken ct)
    {
        var nota = await repositorio.ObterAsync(command.Id, command.UsuarioId, ct);
        if (nota is null)
        {
            return Result.Fail<NotaDto>(Erros.Criar(TipoErro.NaoEncontrado, "Nota não encontrada."));
        }

        if (!StatusNotaParser.TryParse(command.Status, out var status))
        {
            return Result.Fail<NotaDto>(
                Erros.Criar(TipoErro.Validacao, "Status deve ser Ativa ou Arquivada.", "status"));
        }

        nota.Atualizar(command.Titulo ?? string.Empty, command.Descricao, status);
        var erros = nota.Validar();

        if (erros.Count > 0)
        {
            return Result.Fail<NotaDto>(Erros.Validacao(erros));
        }

        if (await repositorio.TituloExisteAsync(command.UsuarioId, nota.TituloNormalizado, command.Id, ct))
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
