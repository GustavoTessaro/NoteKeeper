using Microsoft.EntityFrameworkCore;
using NoteKeeper.Dominio.Modulos.Categorias;
using NoteKeeper.Infraestrutura.Compartilhado.Orm;

namespace NoteKeeper.Infraestrutura.Modulos.Categorias;

public sealed class RepositorioCategoriaEmOrm(NoteKeeperDbContext db) : IRepositorioCategoria
{
    public async Task SalvarAsync(Categoria categoria, CancellationToken ct)
    {
        if (db.Entry(categoria).State == EntityState.Detached)
            db.Categorias.Add(categoria);

        await db.SaveChangesAsync(ct);
    }

    public async Task ExcluirAsync(Categoria categoria, CancellationToken ct)
    {
        db.Categorias.Remove(categoria);

        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Categoria>> ListarAsync(Guid usuarioId, CancellationToken ct)
    {
        return await db.Categorias
            .AsNoTracking()
            .Where(x => x.UsuarioId == usuarioId)
            .OrderBy(x => x.Titulo)
            .ToListAsync(ct);
    }

    public async Task<Categoria?> ObterAsync(Guid id, Guid usuarioId, CancellationToken ct)
    {
        return await db.Categorias
            .FirstOrDefaultAsync(x => x.Id == id && x.UsuarioId == usuarioId, ct);
    }

    public async Task<bool> TituloExisteAsync(
        Guid usuarioId,
        string tituloNormalizado,
        Guid? ignorarId,
        CancellationToken ct
    )
    {
        return await db.Categorias.AnyAsync(
            x => x.UsuarioId == usuarioId &&
            x.TituloNormalizado == tituloNormalizado &&
            x.Id != ignorarId,
            ct
        );
    }
}
