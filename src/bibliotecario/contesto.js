import { createContext, useContext } from "react";

/**
 * Il contesto del banco.
 *
 * Sta in un file a parte per lo stesso motivo di `dati/accesso.js`: il
 * provider esporta un componente, e mescolare componenti e funzioni
 * nello stesso modulo spegne l'aggiornamento a caldo di Vite.
 *
 * Serve perché il pannello si apre da due posti diversi — il bottone
 * fluttuante in `Shell.jsx` e il bancone dentro la stanza 3D — e
 * devono controllare lo stesso stato, non due copie che perdono il
 * sincrono.
 */
export const ContestoBibliotecario = createContext(null);

export function useBibliotecario() {
  const contesto = useContext(ContestoBibliotecario);

  if (!contesto) {
    throw new Error("useBibliotecario va usato dentro <BibliotecarioProvider>");
  }

  return contesto;
}
