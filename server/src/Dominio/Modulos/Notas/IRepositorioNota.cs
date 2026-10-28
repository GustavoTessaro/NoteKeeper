namespace NoteKeeper.Dominio.Modulos.Notas;

public interface IRepositorioNota
{
    Task SalvarAsync(
        Nota nota,
        IReadOnlyCollection<Guid>? categoriaIds,
        CancellationToken cancellationToken
    );
    Task ExcluirAsync(Nota nota, CancellationToken cancellationToken);
    Task<IReadOnlyList<Nota>> ListarAsync(
        Guid usuarioId,
        IReadOnlyCollection<Guid>? categoriaIds,
        CancellationToken cancellationToken);
    Task<Nota?> ObterAsync(Guid id, Guid usuarioId, CancellationToken cancellationToken);
    Task<bool> TituloExisteAsync(Guid usuarioId, string tituloNormalizado, Guid? ignorarId, CancellationToken cancellationToken);
    Task<IReadOnlyList<Guid>?> CategoriasPropriasAsync(
        Guid usuarioId,
        IReadOnlyCollection<Guid> ids,
        CancellationToken cancellationToken
    );
}
