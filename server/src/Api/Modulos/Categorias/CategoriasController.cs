using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Mvc;
using NoteKeeper.Api.Compartilhado.Http;
using MediatR;
using NoteKeeper.Aplicacao.Modulos.Categorias;

namespace NoteKeeper.Api.Modulos.Categorias;

public sealed record CategoriaRequest(string? Titulo);

[ApiController]
[Route("categorias")]
public sealed class CategoriasController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var result = await mediator.Send(new ListarCategoriasQuery(UserId()), ct);

        return Responder(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Obter(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new ObterCategoriaQuery(UserId(), id), ct);

        return Responder(result);
    }

    [HttpPost]
    public async Task<IActionResult> Criar(CategoriaRequest request, CancellationToken ct)
    {
        var resultado = await mediator.Send(new CriarCategoriaCommand(UserId(), request.Titulo), ct);

        if (resultado.IsFailed) return this.ResultProblem(resultado);

        return CreatedAtAction(nameof(Obter), new { id = resultado.Value.Id }, resultado.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, CategoriaRequest request, CancellationToken ct)
    {
        var command = new AtualizarCategoriaCommand(UserId(), id, request.Titulo);

        var result = await mediator.Send(command, ct);

        return Responder(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new ExcluirCategoriaCommand(UserId(), id), ct);

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
