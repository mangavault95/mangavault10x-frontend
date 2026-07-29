import { createContext, useContext } from "react";

/**
 * Il contesto dell'accesso protetto.
 *
 * Sta in un file a parte per lo stesso motivo di `collezione.js`: il
 * provider esporta un componente, e mescolare componenti e funzioni
 * nello stesso modulo spegne l'aggiornamento a caldo di Vite.
 */
export const ContestoAccesso = createContext(null);

/**
 * `eseguiProtetto(azione)` esegue una funzione che scrive sul server.
 *
 * Se non sei autenticato, o se il token è scaduto, appare un accesso
 * compatto proprio dove ti trovi — non un rimando alla pagina
 * Gestione. Fatto l'accesso, l'azione riparte da sola: chi ha cliccato
 * "aggiungi un volume" non deve rifare quel click.
 *
 * Se l'accesso viene annullato, la Promise si rifiuta con un errore
 * che ha `annullato: true`: chi chiama può distinguere "ho detto di
 * no" da "qualcosa si è rotto" e reagire in silenzio al primo caso.
 */
export function useAccessoProtetto() {
  const contesto = useContext(ContestoAccesso);

  if (!contesto) {
    throw new Error("useAccessoProtetto va usato dentro <AccessoProvider>");
  }

  return contesto;
}
