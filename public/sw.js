/**
 * Il guardiano offline di MangaVault.
 *
 * Scritto a mano invece di generarlo con Workbox: il sito ha quattro
 * dipendenze in tutto, e le regole che servono qui sono cinque decisioni,
 * non un framework. Quello che segue è tutto quello che c'è.
 *
 * L'origine dell'API arriva come parametro dell'indirizzo di questo file
 * (`/sw.js?api=...`, vedi `src/app/servizio.js`): un service worker non
 * vede `import.meta.env`, e scrivere l'indirizzo di Render qui dentro
 * significherebbe tenerlo in due posti che possono divergere.
 */

const API = new URL(self.location).searchParams.get("api") || "";

// Il guscio ha la versione: cambiando le regole qui sotto va buttato via.
const GUSCIO = "mv-guscio-v1";

// Le risorse no. I nomi dei file di Vite contengono l'impronta del
// contenuto, quindi una copia vecchia non è mai una copia sbagliata — ed
// è proprio quella che tiene in piedi le pagine caricate a richiesta
// subito dopo un deploy, quando il vecchio pezzo sul server non c'è più.
const RISORSE = "mv-risorse";
const COPERTINE = "mv-copertine";
const DATI = "mv-dati";

const TETTO = { [RISORSE]: 120, [COPERTINE]: 600, [DATI]: 60 };

// L'elenco del codice lo scrive `vite.config.js` in fase di build: i nomi
// dei file cambiano a ogni build e qui non si possono indovinare. In
// sviluppo resta vuoto, e in sviluppo il guardiano non si installa.
const CODICE = [/*__CODICE__*/];

/**
 * Uno per uno e non con `addAll`: quello fallisce tutto insieme, e un
 * file mancante lascerebbe l'app senza niente da parte invece che senza
 * una pagina.
 */
async function metti(nome, elenco) {
  const cache = await caches.open(nome);
  await Promise.all(elenco.map((file) => cache.add(file).catch(() => {})));
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    Promise.all([
      // "/" è la pagina che Vercel restituisce per qualunque indirizzo
      // (vedi la riscrittura in vercel.json): una copia sola vale per
      // tutte le rotte, al resto pensa il router.
      metti(GUSCIO, ["/", "/manifest.webmanifest", "/icona-180.png"]),
      // Il codice va con le risorse e non col guscio: è la stessa cache
      // dove finiscono i pezzi scaricati strada facendo, ed è lì che il
      // gestore più sotto andrà a cercarli.
      metti(RISORSE, CODICE)
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomi) =>
        Promise.all(
          nomi
            .filter((n) => n.startsWith("mv-") && ![GUSCIO, RISORSE, COPERTINE, DATI].includes(n))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Cerca in una cache ignorando l'intestazione `Vary`.
 *
 * Non è un dettaglio da manuale: i tag che Vite scrive nell'HTML hanno
 * l'attributo `crossorigin`, quindi la richiesta con cui il browser va a
 * prendere il codice porta con sé un'intestazione `Origin` — e quella con
 * cui questo file l'ha messo da parte no. Basta un server che risponda
 * `Vary: Origin` (`vite preview` lo fa) perché le due contino come
 * richieste diverse: la copia c'è, non la trova nessuno, e senza rete
 * resta una pagina bianca senza nemmeno un errore in console.
 */
function trova(cache, richiesta) {
  return cache.match(richiesta, { ignoreVary: true });
}

/** Le chiavi tornano in ordine di inserimento: le prime sono le più vecchie. */
async function sfoltisci(nome) {
  const cache = await caches.open(nome);
  const chiavi = await cache.keys();

  for (let i = 0; i < chiavi.length - TETTO[nome]; i++) await cache.delete(chiavi[i]);
}

async function primaLaCopia(richiesta, nome) {
  const cache = await caches.open(nome);
  const copia = await trova(cache, richiesta);

  if (copia) return copia;

  const risposta = await fetch(richiesta);

  if (risposta.ok) {
    await cache.put(richiesta, risposta.clone());
    sfoltisci(nome);
  }

  return risposta;
}

/**
 * Le copertine, che vanno prese in un modo tutto loro.
 *
 * Arrivano da un `<img>` senza attributo `crossorigin`, quindi il
 * browser le chiede in modalità `no-cors` e la risposta torna **opaca**:
 * stato 0, `ok` falso, corpo illeggibile. Non c'è modo di distinguere
 * una copertina da un 404, e Safari le conta nella quota con un peso
 * forfettario di megabyte l'una — poche centinaia di copertine e
 * l'archiviazione dell'app è piena.
 *
 * Rifarla da qui in modalità `cors` risolve tutt'e due: il ponte del
 * backend l'origine del sito la accetta, e quello che torna è una
 * risposta vera, con uno stato da guardare e il peso che ha davvero.
 * Se il permesso mancasse — un dominio di anteprima non ancora in
 * elenco — si torna alla richiesta originale senza tenerne copia:
 * meglio una copertina non conservata che una copertina che non appare.
 */
async function copertina(richiesta) {
  const cache = await caches.open(COPERTINE);
  const copia = await trova(cache, richiesta);

  if (copia) return copia;

  try {
    const risposta = await fetch(richiesta.url, { mode: "cors", credentials: "omit" });

    if (risposta.ok) {
      await cache.put(richiesta, risposta.clone());
      sfoltisci(COPERTINE);
    }

    return risposta;
  } catch {
    return fetch(richiesta);
  }
}

async function primaLaRete(richiesta, nome) {
  const cache = await caches.open(nome);

  try {
    const risposta = await fetch(richiesta);

    if (risposta.ok) {
      await cache.put(richiesta, risposta.clone());
      sfoltisci(nome);
    }

    return risposta;
  } catch (errore) {
    const copia = await trova(cache, richiesta);

    if (copia) return copia;

    throw errore;
  }
}

self.addEventListener("fetch", (e) => {
  const richiesta = e.request;

  // Si tocca solo la lettura. Aggiungere un volume mentre si è offline
  // non deve *sembrare* riuscito: che fallisca, e che si rifaccia dopo.
  if (richiesta.method !== "GET") return;

  const url = new URL(richiesta.url);

  if (!url.protocol.startsWith("http")) return;

  // Cambiare pagina: prima la rete, così un deploy si vede subito.
  // Senza rete, il guscio messo da parte all'installazione.
  if (richiesta.mode === "navigate") {
    e.respondWith(
      fetch(richiesta).catch(() => caches.match("/", { cacheName: GUSCIO, ignoreVary: true }))
    );
    return;
  }

  // Le copertine: sono immutabili e sono la parte pesante di ogni
  // schermata. Passano dal ponte del backend (`/api/cover`) o dalla
  // riscrittura di Vercel (`/copertine/*`), a seconda di chi le chiede.
  if (
    url.pathname.startsWith("/copertine/") ||
    (API && richiesta.url.startsWith(`${API}/api/cover`))
  ) {
    e.respondWith(copertina(richiesta));
    return;
  }

  // Il codice e i modelli: il nome contiene l'impronta del contenuto,
  // quindi la copia locale è sempre quella giusta e non serve chiedere.
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    e.respondWith(primaLaCopia(richiesta, RISORSE));
    return;
  }

  // I dati: prima la rete, sempre. La copia serve solo perché in metro la
  // collezione si possa comunque sfogliare, non per risparmiare una
  // richiesta a chi la rete ce l'ha.
  if (API && richiesta.url.startsWith(`${API}/api/`)) {
    e.respondWith(primaLaRete(richiesta, DATI));
    return;
  }
});
