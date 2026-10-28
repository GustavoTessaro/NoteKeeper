using NoteKeeper.Dominio.Modulos.Notas;

namespace NoteKeeper.Aplicacao.Modulos.Notas;

internal static class StatusNotaParser
{
    internal static bool TryParse(string? status, out StatusNota resultado)
    {
        return Enum.TryParse(status, ignoreCase: true, out resultado)
            && Enum.IsDefined(resultado);
    }
}
