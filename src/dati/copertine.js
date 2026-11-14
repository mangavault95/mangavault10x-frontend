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

// Solo questi quattro host, e di ciascuno SOLO i percorsi delle immagini.
//
// ⚠️ Un inoltro che accetta qualsiasi percorso è un proxy aperto, e fino al 14/11/2026 lo
// era: `/copertine/animeclick/<qualunque pagina>` serviva quella pagina SOTTO IL NOSTRO
// DOMINIO. Una pagina di un altro sito aperta con il nostro indirizzo gira «come se fosse
// MangaVault»: se contiene uno script, quello script legge il gettone d'accesso che sta
// nella memoria del browser e può modificare la collezione. In più era una porta verso
// AnimeClick che parte da Vercel senza la firma dichiarata (MangaVault/1.0).
//
// Oggi si inoltrano solo le cartelle da cui arrivano le copertine. Tutto il resto
// (`PERCORSI_AMMESSI`) non passa di qui: `copertinaLocale` lo manda al ponte del backend,
// che ha le sue regole. `scripts/controlla-copertine.mjs` (dentro `npm run controlla`) fa
// fallire la build se `vercel.json` si allarga di nuovo o si disallinea da questa tabella.
const INOLTRI = {
  "s4.anilist.co": "/copertine/anilist",
  "myanimelist.net": "/copertine/mal",
  "cdn.myanimelist.net": "/copertine/mal-cdn",
  "www.animeclick.it": "/copertine/animeclick"
};

export const PERCORSI_AMMESSI = {
  "s4.anilist.co": ["/file/anilistcdn/"],
  "myanimelist.net": ["/images/"],
  "cdn.myanimelist.net": ["/images/"],
  "www.animeclick.it": ["/immagini/", "/images/"]
};

/**
 * Converte l'indirizzo di una copertina nella versione servita dal
 * nostro dominio. Un host che non conosciamo, o un percorso che non è
 * una cartella di immagini, dà `null`: chi chiama ripiega sul ponte del
 * backend, che è meglio di una richiesta a un indirizzo che non controlliamo.
 */
export function copertinaLocale(url) {
  if (!url) return null;

  try {
    const indirizzo = new URL(url, window.location.origin);

    // Già nostra (o già un percorso relativo): niente da fare.
    if (indirizzo.origin === window.location.origin) return url;

    const prefisso = INOLTRI[indirizzo.hostname];

    if (!prefisso) return null;

    // Solo le cartelle delle immagini: una pagina di quei siti non passa dal nostro dominio.
    if (!PERCORSI_AMMESSI[indirizzo.hostname].some((cartella) => indirizzo.pathname.startsWith(cartella))) {
      return null;
    }

    return `${prefisso}${indirizzo.pathname}${indirizzo.search}`;
  } catch {
    return null;
  }
}

/** La tabella degli inoltri, per generare le configurazioni. */
export const HOST_INOLTRATI = INOLTRI;
