using NoteKeeper.Dominio.Compartilhado;

namespace NoteKeeper.Dominio.Modulos.Notas;

public sealed class Nota
{
    public const int TamanhoMinimoTitulo = 2;
    public const int TamanhoMaximoTitulo = 100;
    public const int TamanhoMaximoDescricao = 300;

    public Guid Id { get; private set; }
    public Guid UsuarioId { get; private set; }
    public string Titulo { get; private set; } = string.Empty;
    public string TituloNormalizado { get; private set; } = string.Empty;

    public string? Descricao { get; private set; }
    public StatusNota Status { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }
    public DateTimeOffset AtualizadoEm { get; private set; }

    public List<NotaCategoria> NotasCategorias { get; private set; } = [];

    private Nota() { }

    public Nota(Guid usuarioId, string titulo, string? descricao, StatusNota status)
    {
        Id = Guid.CreateVersion7();
        UsuarioId = usuarioId;
        CriadoEm = DateTimeOffset.UtcNow;
        Atualizar(titulo, descricao, status);
    }

    public IReadOnlyList<ErroValidacao> Validar()
    {
        List<ErroValidacao> erros = [];

        if (Titulo.Length < TamanhoMinimoTitulo || Titulo.Length > TamanhoMaximoTitulo)
        {
            erros.Add(new("titulo", "Título deve ter entre 2 e 100 caracteres."));
        }

        if (Descricao?.Length > TamanhoMaximoDescricao)
        {
            erros.Add(new("descricao", "Descrição deve ter no máximo 300 caracteres."));
        }

        if (!Enum.IsDefined(Status))
        {
            erros.Add(new("status", "Status inválido."));
        }

        return erros;
    }

    public void Atualizar(string titulo, string? descricao, StatusNota status)
    {
        Titulo = titulo?.Trim() ?? string.Empty;
        TituloNormalizado = Titulo.ToUpperInvariant();
        Descricao = string.IsNullOrWhiteSpace(descricao) ? null : descricao.Trim();

        Status = status;
        AtualizadoEm = DateTimeOffset.UtcNow;
    }
}
