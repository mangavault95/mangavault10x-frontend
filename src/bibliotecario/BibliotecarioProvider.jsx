import { useCallback, useState } from "react";
import { ContestoBibliotecario } from "./contesto";

/**
 * Tiene lo stato di apertura del banco in un solo posto, raggiungibile
 * da chiunque: il bottone fluttuante di ogni pagina e il bancone
 * dentro la stanza 3D.
 */
export function BibliotecarioProvider({ children }) {
  const [aperto, setAperto] = useState(false);

  const apri = useCallback(() => setAperto(true), []);
  const chiudi = useCallback(() => setAperto(false), []);
  const alterna = useCallback(() => setAperto((a) => !a), []);

  return (
    <ContestoBibliotecario.Provider value={{ aperto, apri, chiudi, alterna }}>
      {children}
    </ContestoBibliotecario.Provider>
  );
}
