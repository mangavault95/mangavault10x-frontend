import { useCallback, useMemo } from "react";
import useRisorsa from "./useRisorsa";
import { getManga } from "../services/api";
import { normalizzaElenco } from "./serie";
import { ContestoCollezione } from "./collezione";

/**
 * La collezione, caricata una volta per visita.
 *
 * Quasi ogni schermata ha bisogno delle stesse 188 serie: Scaffale,
 * Collezione, la scheda di una serie, i Numeri. Senza un punto unico
 * ognuna rifarebbe la stessa chiamata a ogni cambio pagina — quattro
 * scaricamenti identici solo per girare nel sito.
 *
 * Qui vengono caricate una volta e restano in memoria; `ricarica()`
 * serve dopo una modifica in Gestione.
 *
 * I modi per leggere questo contesto stanno in `collezione.js`.
 */
export function CollezioneProvider({ children }) {
  const { dati, errore, inCorso, ricarica, setDati } = useRisorsa(getManga, {
    trasforma: normalizzaElenco
  });

  const serie = useMemo(() => dati || [], [dati]);

  // Dopo un salvataggio la scheda modificata si aggiorna subito, senza
  // aspettare il giro completo al server: la modifica si vede appena
  // premuto Salva, e il ricarica() successivo conferma.
  const aggiornaLocale = useCallback(
    (id, modifiche) => {
      setDati((precedenti) =>
        (precedenti || []).map((s) => (s.id === id ? { ...s, ...modifiche } : s))
      );
    },
    [setDati]
  );

  const valore = useMemo(
    () => ({ serie, errore, inCorso, ricarica, aggiornaLocale }),
    [serie, errore, inCorso, ricarica, aggiornaLocale]
  );

  return (
    <ContestoCollezione.Provider value={valore}>
      {children}
    </ContestoCollezione.Provider>
  );
}
