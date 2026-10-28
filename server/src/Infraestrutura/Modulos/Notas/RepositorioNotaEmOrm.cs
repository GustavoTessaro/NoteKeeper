using Microsoft.EntityFrameworkCore;
using NoteKeeper.Dominio.Modulos.Notas;
using NoteKeeper.Infraestrutura.Compartilhado.Orm;

namespace NoteKeeper.Infraestrutura.Modulos.Notas;

public sealed class RepositorioNotaEmOrm(NoteKeeperDbContext db) : IRepositorioNota
{
    public async Task SalvarAsync(
        Nota nota,
        IReadOnlyCollection<Guid>? categoriaIds,
        CancellationToken ct
    )
    {
        var sendoCriada = db.Entry(nota).State == EntityState.Detached;

        if (sendoCriada)
        {
            db.Notas.Add(nota);
        }
        else
        {
            db.NotasCategorias.RemoveRange(nota.NotasCategorias);
            nota.NotasCategorias.Clear();
        }

        if (categoriaIds is { Count: > 0 })
        {
            var categorias = await db.Categorias
                .Where(x => categoriaIds.Contains(x.Id))
                .ToListAsync(ct);

            foreach (var categoria in categorias)
            {
                nota.NotasCategorias.Add(new NotaCategoria(nota, categoria));
            }
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task ExcluirAsync(Nota nota, CancellationToken ct)
    {
        db.Notas.Remove(nota);

        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Nota>> ListarAsync(
        Guid usuarioId,
        IReadOnlyCollection<Guid>? categoriaIds,
        CancellationToken ct)
    {
        var query = db.Notas
            .AsNoTracking()
            .Include(x => x.NotasCategorias)
            .ThenInclude(x => x.Categoria)
            .Where(nota => nota.UsuarioId == usuarioId);

        if (categoriaIds is { Count: > 0 })
        {
            var categoriasFiltradas = categoriaIds.Distinct().ToArray();

            query = query.Where(nota => categoriasFiltradas.All(categoriaId =>
                nota.NotasCategorias.Any(associacao => associacao.CategoriaId == categoriaId)));
        }

        return await query
            .OrderBy(nota => nota.Titulo)
            .ToListAsync(ct);
    }

    public async Task<Nota?> ObterAsync(Guid id, Guid usuarioId, CancellationToken ct)
    {
        return await db.Notas
            .Include(x => x.NotasCategorias)
            .ThenInclude(x => x.Categoria)
            .FirstOrDefaultAsync(x => x.Id == id && x.UsuarioId == usuarioId, ct);
    }

    public async Task<bool> TituloExisteAsync(
        Guid usuarioId,
        string tituloNormalizado,
        Guid? ignorarId,
        CancellationToken ct
    )
    {
        return await db.Notas.AnyAsync(
            x => x.UsuarioId == usuarioId &&
            x.TituloNormalizado == tituloNormalizado &&
            x.Id != ignorarId,
            ct
        );
    }

    public async Task<IReadOnlyList<Guid>?> CategoriasPropriasAsync(
        Guid usuarioId,
        IReadOnlyCollection<Guid> ids,
        CancellationToken ct)
    {
        var categoriasEncontradas = await db.Categorias
            .Where(x => x.UsuarioId == usuarioId && ids.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync(ct);

        if (categoriasEncontradas.Count != ids.Count)
        {
            return null;
        }

        return categoriasEncontradas;
    }
}
