using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NoteKeeper.Dominio.Compartilhado;
using NoteKeeper.Dominio.Modulos.Categorias;
using NoteKeeper.Dominio.Modulos.Notas;
using NoteKeeper.Infraestrutura.Compartilhado.Auth;
using NoteKeeper.Infraestrutura.Compartilhado.Orm;
using NoteKeeper.Infraestrutura.Modulos.Categorias;
using NoteKeeper.Infraestrutura.Modulos.Notas;

namespace NoteKeeper.Infraestrutura;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connection = configuration.GetConnectionString("SqlServer");
        if (string.IsNullOrWhiteSpace(connection))
        {
            throw new InvalidOperationException("Connection string \"SqlServer\" não configurada.");
        }

        services.AddDbContext<NoteKeeperDbContext>(options =>
            options.UseSqlServer(connection, sql => sql.EnableRetryOnFailure(3)));

        services.AddIdentityCore<NoteKeeperUser>(options =>
        {
            options.User.RequireUniqueEmail = true;

            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;

            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            options.Lockout.AllowedForNewUsers = true;
        }).AddEntityFrameworkStores<NoteKeeperDbContext>();

        services.AddScoped<IGerenciadorIdentidade, GerenciadorIdentidade>();
        services.AddScoped<IRevogacaoToken, RevogacaoTokenEmOrm>();
        services.AddScoped<IRepositorioCategoria, RepositorioCategoriaEmOrm>();
        services.AddScoped<IRepositorioNota, RepositorioNotaEmOrm>();

        return services;
    }
}
