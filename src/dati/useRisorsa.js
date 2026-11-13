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
/**
 * L'evento con cui la pagina chiede a tutti di ricaricare i propri dati:
 * lo lancia il gesto «tira per aggiornare» (`ui/TiraPerAggiornare.jsx`).
 * Sta qui perché qui sta chi lo ascolta.
 */
export const AGGIORNA = "mangavault:aggiorna";

/**
 * ---------------------------------------------------------------
 * QUELLO CHE SI È GIÀ CHIESTO (`opzioni.chiave`)
 *
 * La videoteca la chiedono la home, la ricerca e la gestione; le
 * sessioni di lettura la home, la pagina Lettura, la scheda di una
 * serie e il banco. Ognuna la richiedeva per conto suo a ogni
 * apertura: passare da Adesso a Lettura a una serie riscaricava tre
 * volte la stessa risposta, e ogni volta si guardavano gli scheletri
 * — per decine di secondi, se Render stava dormendo.
 *
 * Con una `chiave` la risposta resta in memoria per la visita. Chi la
 * richiede dopo la trova SUBITO sullo schermo, e intanto la richiesta
 * parte lo stesso, in silenzio: se il server dice una cosa diversa lo
 * schermo si aggiorna, se non risponde resta quello che c'era. È la
 * stessa idea di `anticipo.js` per la collezione, senza il disco.
 *
 * Tre regole per chi la usa:
 *
 *   - la chiave deve dire TUTTO ciò da cui dipende la risposta (il
 *     mese, il lettore, i giorni): due domande diverse con la stessa
 *     chiave si scambierebbero le risposte;
 *   - stessa chiave, stessa `trasforma` (o nessuna): in memoria ci va
 *     il dato già trasformato;
 *   - solo in memoria, e svuotata a ogni cambio di persona
 *     (`svuotaRisorse`, chiamata da SessioneProvider): quello che vede
 *     uno non deve comparire all'altro nemmeno per un istante.
 *
 * Due richieste uguali partite insieme ne fanno una sola (`inVolo`).
 */
const ricordate = new Map();
const inVolo = new Map();

export function svuotaRisorse() {
  ricordate.clear();
  inVolo.clear();
}

function chiedi(chiave, carica) {
  if (!chiave) return carica();

  const gia = inVolo.get(chiave);

  if (gia) return gia;

  const promessa = carica().finally(() => {
    if (inVolo.get(chiave) === promessa) inVolo.delete(chiave);
  });

  inVolo.set(chiave, promessa);

  return promessa;
}

export default function useRisorsa(carica, { trasforma, attivo = true, chiave = null } = {}) {
  // Se c'è già, si parte da lì: niente scheletri, e `inCorso` spento —
  // la richiesta di conferma è un dettaglio che lo schermo non mostra.
  const [dati, impostaDati] = useState(() => (chiave && ricordate.has(chiave) ? ricordate.get(chiave) : null));
  const [errore, setErrore] = useState(null);
  const [inCorso, setInCorso] = useState(() => attivo && !(chiave && ricordate.has(chiave)));

  const chiaveRef = useRef(chiave);

  // Chi ritocca i dati a mano (la spunta messa prima che il server
  // risponda) ritocca anche il ricordo: altrimenti la pagina dopo
  // ripartirebbe dalla versione di prima del tocco.
  const setDati = useCallback((valore) => {
    impostaDati((prima) => {
      const dopo = typeof valore === "function" ? valore(prima) : valore;

      if (chiaveRef.current) ricordate.set(chiaveRef.current, dopo);

      return dopo;
    });
  }, []);

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
    chiaveRef.current = chiave;
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

  // `inSilenzio`: i dati si richiedono ma `inCorso` non si accende. Serve
  // al «tira per aggiornare», dove quello che c'è sullo schermo deve
  // restare al suo posto finché non arriva il nuovo — far ricomparire gli
  // scheletri sopra una pagina già piena sarebbe un passo indietro.
  const esegui = useCallback(async ({ inSilenzio = false } = {}) => {
    if (!attivo) return;

    const mia = ++richiestaCorrente.current;
    const miaChiave = chiaveRef.current;

    if (!inSilenzio) setInCorso(true);
    setErrore(null);

    try {
      const risposta = await chiedi(miaChiave, () => caricaRef.current());
      const pronta = trasformaRef.current ? trasformaRef.current(risposta) : risposta;

      // Nel ricordo ci va comunque, anche se nel frattempo la pagina è
      // stata chiusa: la risposta è buona, e la prossima che la chiede
      // la trova.
      if (miaChiave) ricordate.set(miaChiave, pronta);

      if (!montato.current || mia !== richiestaCorrente.current) return;

      impostaDati(pronta);
    } catch (e) {
      if (!montato.current || mia !== richiestaCorrente.current) return;

      // Una conferma silenziosa che fallisce sopra un dato che c'è già
      // non è un errore da mostrare: sullo schermo resta la copia di
      // prima, che è meglio di un riquadro rosso al suo posto.
      if (inSilenzio && miaChiave && ricordate.has(miaChiave)) return;

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
    //
    // Se la risposta era già in memoria la richiesta parte in silenzio:
    // lo schermo è già pieno, e riaccendere `inCorso` vorrebbe dire
    // rimettere gli scheletri sopra dati buoni.
    esegui({ inSilenzio: Boolean(chiaveRef.current && ricordate.has(chiaveRef.current)) });
  }, [esegui]);

  useEffect(() => {
    // La promessa finisce in `attese`: chi ha lanciato l'evento sa così
    // quando l'ultima richiesta ha risposto, e fino ad allora fa girare
    // il suo indicatore.
    function alGesto(e) {
      e.detail?.attese?.push(esegui({ inSilenzio: true }));
    }

    window.addEventListener(AGGIORNA, alGesto);

    return () => window.removeEventListener(AGGIORNA, alGesto);
  }, [esegui]);

  // `ricarica` non passa argomenti a `esegui`: è usata spesso come
  // `onClick={ricarica}`, e l'evento del click non deve arrivarle come
  // se fosse un'opzione.
  const ricarica = useCallback(() => esegui(), [esegui]);

  return { dati, errore, inCorso, ricarica, setDati };
}
