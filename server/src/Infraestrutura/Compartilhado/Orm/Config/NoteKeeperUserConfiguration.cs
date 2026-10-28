using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace NoteKeeper.Infraestrutura.Compartilhado.Orm.Config;

public sealed class NoteKeeperUserConfiguration : IEntityTypeConfiguration<NoteKeeperUser>
{
    public void Configure(EntityTypeBuilder<NoteKeeperUser> builder)
    {
        builder.Property(usuario => usuario.Nome)
            .IsRequired();
    }
}
