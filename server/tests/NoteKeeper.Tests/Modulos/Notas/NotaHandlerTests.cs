using Moq;
using NoteKeeper.Aplicacao.Modulos.Notas;
using NoteKeeper.Dominio.Modulos.Notas;
using Xunit;

namespace NoteKeeper.Tests.Modulos.Notas;

public sealed class NotaHandlerTests
{
    [Fact]
    public async Task CriarNota_SemStatus_SalvaComoAtiva()
    {
        // Arrange
        var usuarioId = Guid.NewGuid();
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.TituloExisteAsync(usuarioId, "LEMBRETE", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        repositorio
            .Setup(x => x.CategoriasPropriasAsync(usuarioId, It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Guid>());
        Nota? notaSalva = null;
        repositorio
            .Setup(x => x.SalvarAsync(It.IsAny<Nota>(), It.IsAny<IReadOnlyCollection<Guid>?>(), It.IsAny<CancellationToken>()))
            .Callback<Nota, IReadOnlyCollection<Guid>?, CancellationToken>((nota, _, _) => notaSalva = nota)
            .Returns(Task.CompletedTask);
        var handler = new CriarNotaCommandHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new CriarNotaCommand(usuarioId, "Lembrete", null),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Ativa", result.Value.Status);
        Assert.Equal(StatusNota.Ativa, notaSalva?.Status);
    }

    [Fact]
    public async Task CriarNota_ComTituloInvalido_NaoConsultaRepositorio()
    {
        // Arrange
        var repositorio = new Mock<IRepositorioNota>();
        var handler = new CriarNotaCommandHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new CriarNotaCommand(Guid.NewGuid(), "X", null),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsFailed);
        repositorio.Verify(
            x => x.TituloExisteAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<Guid?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CriarNota_ComTituloDuplicado_NaoSalva()
    {
        // Arrange
        var usuarioId = Guid.NewGuid();
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.TituloExisteAsync(usuarioId, "LEMBRETE", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var handler = new CriarNotaCommandHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new CriarNotaCommand(usuarioId, "Lembrete", null),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsFailed);
        repositorio.Verify(
            x => x.SalvarAsync(It.IsAny<Nota>(), It.IsAny<IReadOnlyCollection<Guid>?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CriarNota_ComCategoriaDeOutroUsuario_NaoSalva()
    {
        // Arrange
        var usuarioId = Guid.NewGuid();
        var categoriaId = Guid.NewGuid();
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.TituloExisteAsync(usuarioId, "LEMBRETE", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        repositorio
            .Setup(x => x.CategoriasPropriasAsync(
                usuarioId,
                It.Is<IReadOnlyCollection<Guid>>(ids => ids.Contains(categoriaId)),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Guid>?)null);
        var handler = new CriarNotaCommandHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new CriarNotaCommand(usuarioId, "Lembrete", null, [categoriaId]),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsFailed);
        repositorio.Verify(
            x => x.SalvarAsync(It.IsAny<Nota>(), It.IsAny<IReadOnlyCollection<Guid>?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ListarNotas_EncaminhaCategoriasDoFiltroAoRepositorio()
    {
        // Arrange
        var usuarioId = Guid.NewGuid();
        IReadOnlyCollection<Guid> categoriaIds = [Guid.NewGuid(), Guid.NewGuid()];
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.ListarAsync(usuarioId, categoriaIds, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Nota>());
        var handler = new ListarNotasQueryHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new ListarNotasQuery(usuarioId, categoriaIds),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
        repositorio.Verify(x => x.ListarAsync(usuarioId, categoriaIds, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ObterNota_QuandoNaoExiste_RetornaFalha()
    {
        // Arrange
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.ObterAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Nota?)null);
        var handler = new ObterNotaQueryHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new ObterNotaQuery(Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsFailed);
    }

    [Fact]
    public async Task AtualizarNota_SemStatus_RetornaFalhaSemSalvar()
    {
        // Arrange
        var usuarioId = Guid.NewGuid();
        var nota = new Nota(usuarioId, "Lembrete", null, StatusNota.Ativa);
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.ObterAsync(nota.Id, usuarioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nota);
        var handler = new AtualizarNotaCommandHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new AtualizarNotaCommand(usuarioId, nota.Id, "Lembrete", null, null, []),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsFailed);
        repositorio.Verify(
            x => x.SalvarAsync(It.IsAny<Nota>(), It.IsAny<IReadOnlyCollection<Guid>?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AtualizarNota_ComStatusValido_SalvaAlteracao()
    {
        // Arrange
        var usuarioId = Guid.NewGuid();
        var nota = new Nota(usuarioId, "Lembrete", null, StatusNota.Ativa);
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.ObterAsync(nota.Id, usuarioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nota);
        repositorio
            .Setup(x => x.TituloExisteAsync(usuarioId, "LEMBRETE", nota.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        repositorio
            .Setup(x => x.CategoriasPropriasAsync(usuarioId, It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Guid>());
        repositorio
            .Setup(x => x.SalvarAsync(nota, It.IsAny<IReadOnlyCollection<Guid>?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var handler = new AtualizarNotaCommandHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new AtualizarNotaCommand(usuarioId, nota.Id, "Lembrete", null, "Arquivada", []),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Arquivada", result.Value.Status);
        repositorio.Verify(
            x => x.SalvarAsync(nota, It.IsAny<IReadOnlyCollection<Guid>?>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task AtualizarNota_QuandoNaoExiste_RetornaFalha()
    {
        // Arrange
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.ObterAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Nota?)null);
        var handler = new AtualizarNotaCommandHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new AtualizarNotaCommand(Guid.NewGuid(), Guid.NewGuid(), "Lembrete", null, "Ativa", []),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsFailed);
        repositorio.Verify(
            x => x.SalvarAsync(It.IsAny<Nota>(), It.IsAny<IReadOnlyCollection<Guid>?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExcluirNota_QuandoExiste_ExcluiERetornaSucesso()
    {
        // Arrange
        var usuarioId = Guid.NewGuid();
        var nota = new Nota(usuarioId, "Lembrete", null, StatusNota.Ativa);
        var repositorio = new Mock<IRepositorioNota>();
        repositorio
            .Setup(x => x.ObterAsync(nota.Id, usuarioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nota);
        repositorio
            .Setup(x => x.ExcluirAsync(nota, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var handler = new ExcluirNotaCommandHandler(repositorio.Object);

        // Act
        var result = await handler.Handle(
            new ExcluirNotaCommand(usuarioId, nota.Id),
            CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        repositorio.Verify(x => x.ExcluirAsync(nota, It.IsAny<CancellationToken>()), Times.Once);
    }
}
