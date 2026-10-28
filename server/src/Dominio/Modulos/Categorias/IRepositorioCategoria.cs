namespace NoteKeeper.Dominio.Modulos.Categorias;

public interface IRepositorioCategoria
{
    Task SalvarAsync(Categoria categoria, CancellationToken cancellationToken);
    Task ExcluirAsync(Categoria categoria, CancellationToken cancellationToken);
    Task<IReadOnlyList<Categoria>> ListarAsync(Guid usuarioId, CancellationToken cancellationToken);
    Task<Categoria?> ObterAsync(Guid id, Guid usuarioId, CancellationToken cancellationToken);
    Task<bool> TituloExisteAsync(
        Guid usuarioId,
        string tituloNormalizado,
        Guid? ignorarId,
        CancellationToken cancellationToken
    );
}
