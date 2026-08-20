import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useRisorsa from "./useRisorsa";
import { collezione, copiaLocale, salvaCopiaLocale } from "./anticipo";
import { ContestoCollezione } from "./collezione";
import { useSessione } from "./sessione";
import { votoDi } from "./serie";

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

  const { idVisto } = useSessione();

  // Il voto non è della serie, è di una persona: la scheda porta i voti
  // di tutti, e `valutazione` — quello che il resto del sito legge da
  // sempre — è quello di chi sta guardando. Si calcola qui e non nella
  // normalizzazione perché la collezione si normalizza una volta sola,
  // mentre chi guarda può cambiare senza ricaricare niente: basta un
  // accesso, e tutte le stelle del sito devono passare a dire l'altra
  // cosa.
  const serie = useMemo(() => {
    const elenco = dati || copia || [];

    return elenco.map((s) => ({ ...s, valutazione: votoDi(s, idVisto) }));
  }, [dati, copia, idVisto]);

  useEffect(() => {
    if (dati?.length) salvaCopiaLocale(dati);
  }, [dati]);

  // Cambiare persona non è un filtro: entrare o uscire cambia di chi
  // sono i voti che si stanno guardando, e la copia in memoria è stata
  // scaricata prima. Senza questa richiesta, il voto appena dato dalla
  // persona sbagliata resterebbe disegnato dov'era finché non si
  // ricarica la pagina.
  //
  // Il primo valore non conta: è il caricamento normale, la richiesta è
  // già partita da sola (vedi `anticipo.js`).
  const primaIdentita = useRef(idVisto);

  useEffect(() => {
    if (primaIdentita.current === idVisto) return;

    primaIdentita.current = idVisto;
    ricarica();
  }, [idVisto, ricarica]);

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

  /**
   * Il voto appena dato, prima che il server risponda.
   *
   * Non passa da `aggiornaLocale` perché `valutazione` non è un campo
   * che si può scrivere: è il voto di chi guarda, ricavato ogni volta
   * dalla lista. Scriverlo lì verrebbe cancellato al primo ricalcolo.
   * Quello che si aggiorna è la riga della persona dentro `voti`.
   *
   * `voto` a null toglie il voto: un giudizio dato per sbaglio deve
   * potersi ritirare, e "non votato" non è lo zero.
   */
  const aggiornaVoto = useCallback(
    (id, voto) => {
      if (!idVisto) return;

      setDati((precedenti) =>
        (precedenti ?? copia ?? []).map((s) => {
          if (s.id !== id) return s;

          const altri = (s.voti || []).filter((v) => v.utenteId !== idVisto);

          if (!voto) return { ...s, voti: altri };

          const mio = (s.voti || []).find((v) => v.utenteId === idVisto);

          return {
            ...s,
            voti: [
              ...altri,
              {
                utenteId: idVisto,
                nickname: mio?.nickname ?? "",
                proprietario: mio?.proprietario ?? false,
                voto
              }
            ]
          };
        })
      );
    },
    [setDati, copia, idVisto]
  );

  // Dopo un'eliminazione la scheda deve sparire subito: aspettare il
  // ricarica() lascerebbe in elenco una riga che sul server non c'è
  // più, e cliccarla darebbe una pagina vuota.
  const rimuoviLocale = useCallback(
    (id) => {
      setDati((precedenti) => (precedenti ?? copia ?? []).filter((s) => s.id !== id));
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
      aggiornaLocale,
      aggiornaVoto,
      rimuoviLocale
    }),
    [serie, errore, inCorso, ricarica, aggiornaLocale, aggiornaVoto, rimuoviLocale]
  );

  return (
    <ContestoCollezione.Provider value={valore}>
      {children}
    </ContestoCollezione.Provider>
  );
}
