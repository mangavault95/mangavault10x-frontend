import { useCallback, useSyncExternalStore } from "react";

/**
 * Si sta usando un dito o un puntatore?
 *
 * La domanda non è «che larghezza ha lo schermo»: un tablet da tredici
 * pollici è largo come un portatile e non ha nessun mouse, e un portatile
 * con lo schermo tattile ha tutti e due. Quello che cambia le schermate
 * non è la misura del vetro ma il fatto che **col dito non esiste passare
 * sopra le cose**: niente hover, quindi tutto quello che il sito rivela al
 * passaggio del mouse, col dito non esiste e basta.
 *
 * `(hover: none)` risponde esattamente a questo, ed è la domanda giusta da
 * fare: chi la usa per nascondere un'etichetta la nasconde a chi non
 * potrebbe comunque vederla, non a chi ha lo schermo piccolo.
 *
 * Non è un valore congelato al primo render: un tablet con la tastiera
 * agganciata cambia risposta mentre il sito è aperto, e la schermata deve
 * seguirlo. `useSyncExternalStore` è il modo di leggerlo senza il giro
 * effetto-più-stato, che disegnerebbe ogni volta un primo fotogramma con
 * la risposta sbagliata.
 */

const leggiSulServer = () => false;

function useMedia(query) {
  // `useCallback` non è un vezzo: `useSyncExternalStore` si disiscrive e
  // si riscrive ogni volta che la funzione cambia identità, e scritta
  // dentro il render ne cambia una a ogni disegno. Il risultato non è un
  // rallentamento, è una risposta che non arriva: chi era già montato non
  // si accorgeva del cambio finché non si ricaricava la pagina.
  const iscriviti = useCallback(
    (rilegge) => {
      const mq = window.matchMedia(query);

      mq.addEventListener("change", rilegge);

      return () => mq.removeEventListener("change", rilegge);
    },
    [query]
  );

  const leggi = useCallback(() => window.matchMedia(query).matches, [query]);

  // Sul server non c'è nessun dito e non c'è nessuno schermo: si parte dal
  // caso col puntatore su schermo largo, che è anche quello che non toglie
  // niente a nessuno se indovinato male.
  return useSyncExternalStore(iscriviti, leggi, leggiSulServer);
}

export default function useTocco() {
  return useMedia("(hover: none)");
}

/**
 * Lo schermo è stretto?
 *
 * La larghezza di norma si chiede al CSS (`sm:` `md:` `lg:`), e va
 * benissimo finché la domanda è *come si dispongono* le cose. Qui la
 * domanda è un'altra: se un blocco vada **montato o no**. Su un telefono
 * la vetrina in tre dimensioni e il carosello dei consigli stanno chiusi,
 * e chiusi devono costare zero — niente scena WebGL che gira dietro un
 * `display: none`, niente richiesta ad AniList per un carosello che
 * nessuno ha aperto. Questo il CSS non lo sa fare, e allora si chiede qui.
 *
 * La soglia è la stessa a cui compare la colonna dei filtri (`lg`): sotto
 * quella misura la pagina è una colonna sola, e tutto quello che sta prima
 * della griglia è tempo prima delle copertine.
 */
export function useStretto() {
  return useMedia("(max-width: 1023.98px)");
}
