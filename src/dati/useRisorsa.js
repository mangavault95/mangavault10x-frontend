import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Un caricamento dal server, con i tre stati che servono davvero.
 *
 * Prima ogni pagina faceva `fetch(...).then(setState)`: nessuno stato
 * di errore (una rete giù lasciava la pagina vuota per sempre), nessun
 * modo di ricaricare, e un `setState` dopo lo smontaggio a ogni
 * cambio pagina veloce. Qui tutto questo è risolto una volta sola.
 *
 * @param carica  funzione che restituisce una Promise (di solito da services/api)
 * @param opzioni.trasforma  normalizzazione applicata al risultato
 * @param opzioni.attivo     se falso non parte (per caricamenti condizionati)
 */
export default function useRisorsa(carica, { trasforma, attivo = true } = {}) {
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);
  const [inCorso, setInCorso] = useState(attivo);

  // Le funzioni arrivano spesso come arrow inline: tenerle in un ref
  // evita che una nuova identità a ogni render faccia ripartire il
  // caricamento all'infinito.
  const caricaRef = useRef(carica);
  const trasformaRef = useRef(trasforma);

  // L'aggiornamento va in un effetto, non nel corpo del render: React
  // può abbandonare un render a metà, e scrivere in un ref durante il
  // render lascerebbe il valore di un tentativo buttato via.
  // `useLayoutEffect` perché deve essere già aggiornato quando parte
  // l'effetto di caricamento qui sotto.
  useLayoutEffect(() => {
    caricaRef.current = carica;
    trasformaRef.current = trasforma;
  });

  // Contatore di richieste: se ne parte una nuova prima che la
  // precedente risponda, la risposta vecchia viene scartata invece di
  // sovrascrivere quella giusta.
  const richiestaCorrente = useRef(0);
  const montato = useRef(true);

  useEffect(() => {
    montato.current = true;

    return () => {
      montato.current = false;
    };
  }, []);

  const esegui = useCallback(async () => {
    if (!attivo) return;

    const mia = ++richiestaCorrente.current;

    setInCorso(true);
    setErrore(null);

    try {
      const risposta = await caricaRef.current();

      if (!montato.current || mia !== richiestaCorrente.current) return;

      setDati(trasformaRef.current ? trasformaRef.current(risposta) : risposta);
    } catch (e) {
      if (!montato.current || mia !== richiestaCorrente.current) return;

      setErrore(e);
    } finally {
      if (montato.current && mia === richiestaCorrente.current) {
        setInCorso(false);
      }
    }
  }, [attivo]);

  useEffect(() => {
    // La regola vieta di cambiare stato dentro un effetto perché di
    // solito provoca un secondo render a catena. Qui non succede:
    // `inCorso` parte già a `attivo` e `errore` già a null, quindi al
    // montaggio le due chiamate scrivono i valori che ci sono già e
    // React le scarta. Contano solo quando `ricarica()` viene invocata
    // a mano, e lì il render in più è proprio quello che serve per
    // mostrare di nuovo il caricamento.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    esegui();
  }, [esegui]);

  return { dati, errore, inCorso, ricarica: esegui, setDati };
}
