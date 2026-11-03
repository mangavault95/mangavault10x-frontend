import { createContext, useContext } from "react";

/**
 * La Collezione resta in memoria mentre si guarda la scheda di una serie
 * (03/11/2026, vedi `app/routes.jsx`): chiudere la scheda deve costare
 * zero, non una ricostruzione di duecento copertine.
 *
 * Questo contesto dice alle pagine che restano in vita "nascoste" se sono
 * davanti agli occhi o no. Quella nascosta non deve ascoltare lo scorrimento,
 * né rubare tasti, né reagire a nient'altro: sta ferma finché non torna.
 */
export const PaginaViva = createContext(true);

export function usePaginaViva() {
  return useContext(PaginaViva);
}

/**
 * Chi riporta la Collezione al punto dove era (`routes.jsx`) alza questo
 * segno, e la cornice (`Shell.jsx`) — che altrimenti rimetterebbe lo
 * scorrimento in cima a ogni cambio di indirizzo — lo legge e si astiene.
 */
export const ripristino = { fatto: false, scorrimento: 0 };
