/**
 * Le copertine, rese utilizzabili da WebGL.
 *
 * IL PROBLEMA
 * Una texture WebGL può nascere solo da un'immagine "pulita": o è
 * dello stesso dominio del sito, o il server che la serve dichiara
 * esplicitamente che si può usare (intestazione CORS). Nessuno dei tre
 * host delle nostre copertine — s4.anilist.co, myanimelist.net,
 * www.animeclick.it — la manda. Provato: tutte e tre rifiutate.
 *
 * Nella griglia in due dimensioni non importa, perché un `<img>`
 * normale può mostrare qualsiasi immagine; è la lettura dei pixel che
 * richiede il permesso, e il 3D quei pixel deve leggerli.
 *
 * LA SOLUZIONE
 * Le immagini vengono servite dal nostro stesso indirizzo. Non è un
 * download in più: è la stessa richiesta, fatta passare per un
 * inoltro. In sviluppo lo fa Vite (`vite.config.js`), in produzione
 * Vercel (`vercel.json`) — nessuno dei due tocca il backend su Render,
 * che resterebbe il collo di bottiglia.
 *
 * Diventando l'immagine dello stesso dominio, il permesso non serve
 * più: non c'è nessun confine da attraversare.
 */

// Solo questi tre. Un inoltro che accetta qualsiasi indirizzo è un
// proxy aperto: chiunque potrebbe usare il nostro dominio per servire
// roba sua, e la reputazione del sito è nostra, non sua.
const INOLTRI = {
  "s4.anilist.co": "/copertine/anilist",
  "myanimelist.net": "/copertine/mal",
  "cdn.myanimelist.net": "/copertine/mal-cdn",
  "www.animeclick.it": "/copertine/animeclick"
};

/**
 * Converte l'indirizzo di una copertina nella versione servita dal
 * nostro dominio. Un host che non conosciamo torna indietro invariato:
 * la texture non si caricherà e il libro terrà la sua carta colorata,
 * che è meglio di una richiesta a un indirizzo che non controlliamo.
 */
export function copertinaLocale(url) {
  if (!url) return null;

  try {
    const indirizzo = new URL(url, window.location.origin);

    // Già nostra (o già un percorso relativo): niente da fare.
    if (indirizzo.origin === window.location.origin) return url;

    const prefisso = INOLTRI[indirizzo.hostname];

    if (!prefisso) return null;

    return `${prefisso}${indirizzo.pathname}${indirizzo.search}`;
  } catch {
    return null;
  }
}

/** La tabella degli inoltri, per generare le configurazioni. */
export const HOST_INOLTRATI = INOLTRI;
