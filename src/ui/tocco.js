import { useCallback, useRef, useSyncExternalStore } from "react";
import { vibra } from "../dati/tatto";

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

/**
 * Tenere premuto: il gesto delle azioni rapide.
 *
 * Restituisce i gestori da stendere sull'elemento (`{...tieni}`). Dopo
 * `ms` di dito fermo chiama `alTieni`; se nel frattempo il dito si
 * sposta di più di dieci pixel era uno scorrimento, e non succede niente.
 *
 * Tre dettagli che fanno la differenza fra un gesto e un incidente:
 *
 *   - IL CLICK CHE SEGUE VA MANGIATO. Sollevando il dito dopo un tocco
 *     lungo il browser manda comunque un click, e la carta — che è un
 *     link — aprirebbe la scheda sotto il foglio appena comparso. Si
 *     ferma in fase di cattura, prima che arrivi a chiunque.
 *   - IL TASTO DESTRO FA LO STESSO. Su un computer non c'è niente da
 *     tenere premuto: il menu contestuale è lo stesso gesto con un altro
 *     nome, e così la funzione non esiste solo col dito.
 *   - `alTocco` è il posto per ciò che l'elemento faceva già al primo
 *     contatto (la carta precarica la scheda): i gestori sono uno per
 *     evento, e senza questo l'uno cancellerebbe l'altro.
 */
export function useTieniPremuto(alTieni, { ms = 450, attivo = true, alTocco } = {}) {
  const stato = useRef({ timer: null, x: 0, y: 0, scattato: false });

  const ferma = useCallback(() => {
    clearTimeout(stato.current.timer);
    stato.current.timer = null;
  }, []);

  return {
    onTouchStart: (e) => {
      alTocco?.(e);

      if (!attivo || e.touches.length !== 1) return;

      const s = stato.current;

      s.scattato = false;
      s.x = e.touches[0].clientX;
      s.y = e.touches[0].clientY;

      clearTimeout(s.timer);
      s.timer = setTimeout(() => {
        s.scattato = true;
        vibra();
        alTieni();
      }, ms);
    },
    onTouchMove: (e) => {
      const s = stato.current;

      if (!s.timer) return;

      const t = e.touches[0];

      if (Math.abs(t.clientX - s.x) > 10 || Math.abs(t.clientY - s.y) > 10) ferma();
    },
    onTouchEnd: ferma,
    onTouchCancel: ferma,
    onContextMenu: (e) => {
      if (!attivo) return;

      e.preventDefault();

      // Su Android il tocco lungo manda anche questo evento: il foglio è
      // già aperto, non va aperto due volte.
      if (!stato.current.scattato) alTieni();
    },
    onClickCapture: (e) => {
      if (!stato.current.scattato) return;

      stato.current.scattato = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };
}
