using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NoteKeeper.Dominio.Modulos.Notas;

namespace NoteKeeper.Infraestrutura.Compartilhado.Orm.Config;

public sealed class NotaCategoriaConfiguration : IEntityTypeConfiguration<NotaCategoria>
{
    public void Configure(EntityTypeBuilder<NotaCategoria> builder)
    {
        builder.HasKey(notaCategoria => new { notaCategoria.NotaId, notaCategoria.CategoriaId });

        builder.HasOne(notaCategoria => notaCategoria.Nota)
            .WithMany(nota => nota.NotasCategorias)
            .HasForeignKey(notaCategoria => notaCategoria.NotaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(notaCategoria => notaCategoria.Categoria)
            .WithMany(categoria => categoria.NotasCategorias)
            .HasForeignKey(notaCategoria => notaCategoria.CategoriaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
