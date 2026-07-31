import { useCallback, useEffect, useMemo, useState } from "react";
import useRisorsa from "./useRisorsa";
import { collezione, copiaLocale, salvaCopiaLocale } from "./anticipo";
import { ContestoCollezione } from "./collezione";

/**
 * La collezione, caricata una volta per visita.
 *
 * Quasi ogni schermata ha bisogno delle stesse 189 serie: Scaffale,
 * Collezione, la scheda di una serie, i Numeri. Senza un punto unico
 * ognuna rifarebbe la stessa chiamata a ogni cambio pagina — quattro
 * scaricamenti identici solo per girare nel sito.
 *
 * Qui vengono caricate una volta e restano in memoria; `ricarica()`
 * serve dopo una modifica in Gestione.
 *
 * La richiesta però non parte da qui: è già partita prima che React
 * esistesse, e se c'è una copia dell'ultima visita le pagine si
 * disegnano con quella mentre la risposta vera è ancora per strada. Il
 * perché di tutt'e due sta in `anticipo.js`.
 *
 * I modi per leggere questo contesto stanno in `collezione.js`.
 */
export function CollezioneProvider({ children }) {
  // Letta una volta sola: è roba di archiviazione, non cambia da sé, e
  // rileggerla a ogni render darebbe un array nuovo ogni volta.
  const [copia] = useState(copiaLocale);

  const { dati, errore, inCorso, ricarica, setDati } = useRisorsa(collezione);

  const serie = useMemo(() => dati || copia || [], [dati, copia]);

  useEffect(() => {
    if (dati?.length) salvaCopiaLocale(dati);
  }, [dati]);

  // Dopo un salvataggio la scheda modificata si aggiorna subito, senza
  // aspettare il giro completo al server: la modifica si vede appena
  // premuto Salva, e il ricarica() successivo conferma.
  //
  // Il ripiego sulla copia locale conta solo nel caso limite di una
  // modifica fatta prima che la risposta sia arrivata: senza, la
  // modifica cadrebbe su un elenco vuoto.
  const aggiornaLocale = useCallback(
    (id, modifiche) => {
      setDati((precedenti) =>
        (precedenti ?? copia ?? []).map((s) => (s.id === id ? { ...s, ...modifiche } : s))
      );
    },
    [setDati, copia]
  );

  const valore = useMemo(
    () => ({
      serie,
      errore,
      // Caricare e non avere niente da mostrare sono due cose diverse:
      // con la copia dell'ultima visita in mano la pagina è già
      // disegnata, e una barra di caricamento sopra direbbe solo che
      // c'è una richiesta per strada — cosa che non riguarda chi legge.
      inCorso: inCorso && !serie.length,
      ricarica,
      aggiornaLocale
    }),
    [serie, errore, inCorso, ricarica, aggiornaLocale]
  );

  return (
    <ContestoCollezione.Provider value={valore}>
      {children}
    </ContestoCollezione.Provider>
  );
}
