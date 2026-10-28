using Microsoft.AspNetCore.Identity;

namespace NoteKeeper.Infraestrutura.Compartilhado.Orm;

public sealed class NoteKeeperUser : IdentityUser<Guid>
{
    public string Nome { get; set; } = string.Empty;
}
