using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NoteKeeper.Dominio.Modulos.Notas;

namespace NoteKeeper.Infraestrutura.Compartilhado.Orm.Config;

public sealed class NotaConfiguration : IEntityTypeConfiguration<Nota>
{
    public void Configure(EntityTypeBuilder<Nota> builder)
    {
        builder.HasKey(nota => nota.Id);

        builder.Property(nota => nota.Titulo)
            .HasMaxLength(Nota.TamanhoMaximoTitulo)
            .IsRequired();

        builder.Property(nota => nota.TituloNormalizado)
            .HasMaxLength(Nota.TamanhoMaximoTitulo)
            .IsRequired();

        builder.Property(nota => nota.Descricao)
            .HasMaxLength(Nota.TamanhoMaximoDescricao);

        builder.Property(nota => nota.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(nota => new { nota.UsuarioId, nota.TituloNormalizado })
            .IsUnique();

        builder.HasOne<NoteKeeperUser>()
            .WithMany()
            .HasForeignKey(nota => nota.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
