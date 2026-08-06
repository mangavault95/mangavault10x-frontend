import { useSyncExternalStore } from "react";

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

const QUERY = "(hover: none)";

function iscriviti(rilegge) {
  const mq = window.matchMedia(QUERY);

  mq.addEventListener("change", rilegge);

  return () => mq.removeEventListener("change", rilegge);
}

const leggi = () => window.matchMedia(QUERY).matches;

// Sul server non c'è nessun dito: si parte dal caso col puntatore, che è
// anche quello che non toglie niente a nessuno se indovinato male.
const leggiSulServer = () => false;

export default function useTocco() {
  return useSyncExternalStore(iscriviti, leggi, leggiSulServer);
}
