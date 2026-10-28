using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Mvc;
using NoteKeeper.Api.Compartilhado.Http;
using MediatR;
using NoteKeeper.Aplicacao.Modulos.Notas;

namespace NoteKeeper.Api.Modulos.Notas;

public sealed record CriarNotaRequest(
    string? Titulo,
    string? Descricao,
    IReadOnlyCollection<Guid>? CategoriaIds
);

public sealed record AtualizarNotaRequest(
    string? Titulo,
    string? Descricao,
    string? Status,
    IReadOnlyCollection<Guid>? CategoriaIds
);

[ApiController]
[Route("notas")]
public sealed class NotasController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] Guid[]? categoriaIds,
        CancellationToken ct)
    {
        var query = new ListarNotasQuery(UserId(), categoriaIds);
        var result = await mediator.Send(query, ct);

        return Responder(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Obter(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new ObterNotaQuery(UserId(), id), ct);

        return Responder(result);
    }

    [HttpPost]
    public async Task<IActionResult> Criar(CriarNotaRequest request, CancellationToken ct)
    {
        var command = new CriarNotaCommand(
            UserId(),
            request.Titulo,
            request.Descricao,
            request.CategoriaIds);

        var result = await mediator.Send(command, ct);

        if (result.IsFailed) return this.ResultProblem(result);

        return CreatedAtAction(nameof(Obter), new { id = result.Value.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, AtualizarNotaRequest request, CancellationToken ct)
    {
        var command = new AtualizarNotaCommand(
            UserId(),
            id,
            request.Titulo,
            request.Descricao,
            request.Status,
            request.CategoriaIds);

        var result = await mediator.Send(command, ct);

        return Responder(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new ExcluirNotaCommand(UserId(), id), ct);

        return result.IsSuccess ? NoContent() : this.ResultProblem(result);
    }

    private Guid UserId()
    {
        return Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
    }

    private IActionResult Responder<T>(FluentResults.Result<T> resultado)
    {
        if (resultado.IsSuccess) return Ok(resultado.Value);

        return this.ResultProblem(resultado);
    }
}
