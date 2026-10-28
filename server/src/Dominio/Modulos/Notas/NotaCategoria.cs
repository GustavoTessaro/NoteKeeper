using NoteKeeper.Dominio.Modulos.Categorias;

namespace NoteKeeper.Dominio.Modulos.Notas;

public sealed class NotaCategoria
{
    public Guid NotaId { get; private set; }
    public Guid CategoriaId { get; private set; }
    public Nota Nota { get; private set; } = null!;
    public Categoria Categoria { get; private set; } = null!;

    private NotaCategoria() { }

    public NotaCategoria(Guid notaId, Guid categoriaId)
    {
        NotaId = notaId;
        CategoriaId = categoriaId;
    }

    public NotaCategoria(Nota nota, Categoria categoria)
    {
        Nota = nota;
        Categoria = categoria;
        NotaId = nota.Id;
        CategoriaId = categoria.Id;
    }
}
