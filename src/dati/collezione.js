import { createContext, useContext, useMemo } from "react";

/**
 * Il contesto della collezione e i modi per leggerlo.
 *
 * Sta in un file separato dal provider perché quel file esporta un
 * componente: mescolare componenti e funzioni nello stesso modulo
 * spegne l'aggiornamento a caldo di Vite, e ogni salvataggio
 * ricaricherebbe la pagina da zero invece di sostituire il pezzo
 * modificato.
 */

export const ContestoCollezione = createContext(null);

export function useCollezione() {
  const contesto = useContext(ContestoCollezione);

  if (!contesto) {
    throw new Error("useCollezione va usato dentro <CollezioneProvider>");
  }

  return contesto;
}

/** La singola serie per indirizzo `/serie/:id`. */
export function useSerie(id) {
  const { serie, inCorso, errore } = useCollezione();

  const trovata = useMemo(
    () => serie.find((s) => String(s.id) === String(id)) || null,
    [serie, id]
  );

  return { serie: trovata, inCorso, errore };
}

/**
 * Le altre edizioni della stessa opera.
 *
 * Il "gruppo effettivo" di una serie è `operaId` se collegata,
 * altrimenti il proprio `id` — quindi due righe sono sorelle quando
 * questo valore coincide. Nessuna nuova richiesta: la collezione
 * intera è già in memoria via `useCollezione`.
 */
export function edizioniSorelle(serieCorrente, tutteLeSerie) {
  if (!serieCorrente) return [];

  const gruppo = serieCorrente.operaId ?? serieCorrente.id;

  return tutteLeSerie.filter(
    (s) => s.id !== serieCorrente.id && (s.operaId ?? s.id) === gruppo
  );
}
