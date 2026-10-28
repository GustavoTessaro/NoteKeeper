using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using NoteKeeper.Infraestrutura.Compartilhado.Orm;

namespace NoteKeeper.Api.Compartilhado.Orm;

public sealed class NoteKeeperDbContextFactory : IDesignTimeDbContextFactory<NoteKeeperDbContext>
{
    public NoteKeeperDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .AddUserSecrets<NoteKeeperDbContextFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connection = configuration.GetConnectionString("SqlServer")
            ?? "Server=localhost;Database=NoteKeeperDb;Trusted_Connection=True;TrustServerCertificate=True";

        var options = new DbContextOptionsBuilder<NoteKeeperDbContext>()
            .UseSqlServer(connection)
            .Options;

        return new NoteKeeperDbContext(options);
    }
}
