import { ricordaUtente, utenteDalToken, utenteRicordato } from "../dati/sessione";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error(
    "VITE_API_URL non configurato. In locale: crea un file .env partendo da .env.example. " +
      "Su Vercel: impostalo nelle Environment Variables."
  );
}

/* ==================================================
   TOKEN
   ================================================== */

export function getToken() {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

// I `catch` vuoti sono voluti: in navigazione privata, o con i dati
// dei siti bloccati, `localStorage` solleva un'eccezione. Non poter
// ricordare il token non è un errore da mostrare — significa solo che
// l'accesso durerà quanto la scheda del browser.
export function setToken(token) {
  try {
    localStorage.setItem("token", token);
  } catch {
    /* archiviazione non disponibile: si prosegue senza ricordare */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem("token");
  } catch {
    /* niente da ripulire se non si è potuto scrivere */
  }
}

/* ==================================================
   CLIENT
   ================================================== */

export class ApiError extends Error {
  constructor(message, status, dettagli, motivo = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    // Perché è andata male, in una parola sola che il codice possa
    // confrontare. Serve per i «no» che non sono guasti: `biblioteca`
    // vuol dire "sei entrato benissimo, ma questa stanza non è tua", e
    // va trattato in modo opposto a un token scaduto — l'uno si spiega,
    // l'altro si risolve chiedendo di nuovo la password.
    this.motivo = motivo;
    // Quello che il server sa e il messaggio generico non dice: il nome
    // del vincolo violato, la colonna che dà fastidio. Senza, davanti a
    // un "Errore server" tocca rifare a mano la stessa richiesta per
    // scoprire cosa non è andato.
    this.dettagli = dettagli;
  }
}

async function request(path, { method = "GET", body, auth = false, signal } = {}) {
  const headers = {};

  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;

  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Per le ricerche che si aggiornano mentre si scrive: la richiesta
      // della lettera prima va annullata, o si finisce per mostrare la
      // risposta più lenta invece della più recente.
      signal
    });
  } catch (e) {
    // Una richiesta annullata non è un guasto: chi ha annullato sa
    // perché, e trasformarla in «impossibile contattare il server»
    // farebbe comparire un errore rosso ogni volta che si scrive una
    // lettera in più.
    if (e?.name === "AbortError") throw e;

    // fetch fallisce solo se la rete è giù o il server non risponde
    throw new ApiError("Impossibile contattare il server", 0);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  // Il token è scaduto o non è valido: lo butto via, così la UI
  // può rimandare al login invece di riprovare all'infinito.
  //
  // Non ogni 403 è un token morto, però: "riservato al proprietario" e
  // "in attesa di approvazione" arrivano con lo stesso stato e sono
  // risposte legittime a chi è entrato benissimo. Buttare la sessione
  // lì significherebbe sloggiare qualcuno per avergli detto di no.
  const sessioneCaduta =
    res.status === 401 || (res.status === 403 && /token/i.test(payload?.error || ""));

  if (sessioneCaduta) {
    clearToken();
    ricordaUtente(null);
  }

  if (!res.ok) {
    throw new ApiError(
      payload?.error || `Errore ${res.status}`,
      res.status,
      payload?.details,
      payload?.motivo ?? null
    );
  }

  return payload;
}

/* ==================================================
   COPERTINE
   ================================================== */

/**
 * L'indirizzo di una copertina passando dal ponte del backend.
 *
 * Serve perché né AniList né AnimeClick mandano gli header CORS:
 * disegnare una di quelle immagini su una canvas la rende
 * illeggibile, quindi non si potrebbero ricavare i colori del dorso.
 * In più il ponte tiene una copia in cache, e AnimeClick da sola
 * impiega secondi a rispondere.
 */
export function urlCopertina(originale) {
  if (!originale) return null;

  // Un'immagine già nostra o già in formato dati non va rimbalzata.
  if (originale.startsWith("data:") || originale.startsWith("/")) return originale;

  return `${API_URL}/api/cover?url=${encodeURIComponent(originale)}`;
}

/* ==================================================
   MANGA
   ================================================== */

export const getManga = () => request("/api/manga");

/**
 * Il pezzo di indirizzo che dice di chi sono i dati che si chiedono.
 *
 * Vale solo per le letture personali — cronologia e segnalibri. Chi
 * guarda senza essere entrato non lo manda, e il server risponde con
 * quelle del proprietario: da fuori la biblioteca è la sua, come è
 * sempre stata.
 *
 * In scrittura non serve e non conta: là chi sei lo dice il token, e
 * un numero nell'indirizzo non deve poter cambiare la risposta.
 */
function diChi(extra = "", utenteId = null) {
  // Chiesto esplicitamente: è il caso della collezione filtrata per
  // «lette da Nanaki» e della scheda che si apre da lì. Vale solo in
  // lettura, e solo perché il server lo consente in lettura — provare
  // a scrivere con un numero nell'indirizzo non porta da nessuna parte.
  const id = utenteId ?? utenteRicordato()?.id;

  if (!id) return extra ? `?${extra}` : "";

  return `?utente=${id}${extra ? `&${extra}` : ""}`;
}

// La vista di riepilogo calcola completamento, spesa e volumi
// mancanti direttamente in SQL: meglio che rifare i conti in ogni
// pagina, e i numeri restano gli stessi ovunque.
export const getRiepilogo = () => request("/api/manga/riepilogo");

export const getStatistiche = () => request("/api/manga/statistiche");

export const updateManga = (id, data) =>
  request(`/api/manga/${id}`, { method: "PUT", body: data, auth: true });

// Una serie nuova, direttamente in collezione — non nella wishlist.
// Serve solo il titolo; il resto è come per updateManga.
export const creaManga = (data) =>
  request("/api/manga", { method: "POST", body: data, auth: true });

// Cancella la scheda e tutto ciò che le è legato (acquisti, prezzi,
// letture). Risponde con quanto se n'è andato insieme: senza cestino,
// è l'unico modo di sapere cos'è successo davvero.
export const eliminaManga = (id) =>
  request(`/api/manga/${id}`, { method: "DELETE", auth: true });

export const updateRating = (id, rating) =>
  request("/api/manga/updateRating", {
    method: "POST",
    body: { id, rating },
    auth: true
  });

export const enrichManga = (titolo, autore) =>
  request("/api/manga/enrich", { method: "POST", body: { titolo, autore } });

/**
 * I titoli che i lettori italiani accostano a una serie, letti da
 * AnimeClick.
 *
 * Passa dal server perché AnimeClick non manda gli header CORS, e
 * perché una risposta costa tre richieste al loro sito: là restano in
 * cache per un giorno. L'`id` è quello già verificato in tabella per il
 * controllo dei volumi italiani — quando c'è, il server salta la
 * ricerca per titolo e con essa il rischio di agganciare un omonimo.
 */
/**
 * Le opere di un autore uscite in Italia, da AnimeClick.
 *
 * AniList conosce la bibliografia intera, ma metà di quei titoli qui
 * non è mai arrivato e non si può comprare: la domanda vera la sa solo
 * chi tiene il catalogo italiano.
 */
export function getOpereAutore(nome, riferimento) {
  const parametri = new URLSearchParams({ nome });

  // L'id AnimeClick di una serie sua che abbiamo già: al server serve
  // solo se il nome, così com'è scritto da noi, non trova niente.
  if (riferimento) parametri.set("riferimento", String(riferimento));

  return request(`/api/autore/opere?${parametri.toString()}`);
}

export function getSimiliAnimeClick({ titolo, autore, id }) {
  const parametri = new URLSearchParams();

  if (titolo) parametri.set("titolo", titolo);
  if (autore) parametri.set("autore", autore);
  if (id) parametri.set("id", String(id));

  return request(`/api/simili/animeclick?${parametri.toString()}`);
}

/* ==================================================
   PERSONE
   ================================================== */

export const login = async (username, password) => {
  const data = await request("/api/utenti/login", {
    method: "POST",
    body: { username, password }
  });

  if (data?.token) {
    setToken(data.token);

    // Chi sei viene messo da parte insieme al token: `anticipo.js`
    // chiede la collezione prima che React esista e non può
    // decodificare niente, gli serve già pronto.
    ricordaUtente(data.utente ?? utenteDalToken(data.token));
  }

  return data;
};

export function esci() {
  clearToken();
  ricordaUtente(null);
}

/**
 * Chiede di entrare. Non fa entrare: crea una richiesta che il
 * proprietario vedrà in Gestione e potrà accettare.
 */
export const registrazione = ({ username, nickname, password }) =>
  request("/api/utenti/registrazione", {
    method: "POST",
    body: { username, nickname, password }
  });

/** I soprannomi di chi può votare, per scrivere "Voto Nicer". */
export const getLettori = () => request("/api/utenti/pubblici");

/* ---- La faccia e lo striscione ----

   Le immagini di profilo NON viaggiano dentro il JSON: hanno un
   indirizzo loro. È la scelta che tiene leggero il Cineforum, dove la
   stessa faccia comparirebbe quindici volte per pagina — così invece
   il browser la scarica una volta e se la tiene.

   ⚠️ Il `?v=` è obbligatorio e non è un vezzo: quelle immagini si
   servono con un anno di cache e `immutable`, quindi senza qualcosa
   che cambi nell'indirizzo chi si cambia la foto continuerebbe a
   vedere quella di prima — e a rifarlo altre tre volte convinto che
   il sito non salvi. Il valore è il momento in cui è stata messa. */

export function urlFaccia(utenteId, quando) {
  if (!utenteId || !quando) return null;

  return `${API_URL}/api/utenti/${utenteId}/faccia?v=${quando}`;
}

export function urlStriscione(immagineId) {
  if (!immagineId) return null;

  // Qui il `v` non serve: l'identificativo dell'immagine è già
  // irripetibile — cambiarla vuol dire un'altra riga, quindi un altro
  // indirizzo.
  return `${API_URL}/api/utenti/striscione/${immagineId}`;
}

export const salvaFaccia = (immagine) =>
  request("/api/utenti/io/faccia", { method: "PUT", body: { immagine }, auth: true });

export const togliFaccia = () =>
  request("/api/utenti/io/faccia", { method: "DELETE", auth: true });

/**
 * Lo striscione si riscrive per intero.
 *
 * `immagini` è l'elenco nell'ordine voluto: un numero è un'immagine
 * già lì che resta, un data URI è una nuova. Un solo indirizzo per
 * aggiungere, togliere e riordinare — sono la stessa cosa vista da
 * tre lati.
 */
export const salvaStriscione = (immagini) =>
  request("/api/utenti/io/striscione", { method: "PUT", body: { immagini }, auth: true });

/** Le richieste di accesso ancora in sospeso (solo il proprietario). */
export const getRichiesteAccesso = () => request("/api/utenti/richieste", { auth: true });

export const getUtenti = () => request("/api/utenti", { auth: true });

export const decidiAccesso = (id, approva) =>
  request(`/api/utenti/${id}/${approva ? "approva" : "rifiuta"}`, {
    method: "POST",
    auth: true
  });

/**
 * Apre o chiude la biblioteca a qualcuno.
 *
 * Accettare una richiesta dà la videoteca e basta: questa è l'altra
 * porta, e la apre solo il proprietario, una persona alla volta, dalla
 * Gestione. Non esiste un modo di prendersela da soli.
 */
export const impostaAccessoBiblioteca = (id, dentro) =>
  request(`/api/utenti/${id}/biblioteca`, {
    method: "POST",
    body: { dentro },
    auth: true
  });

/* ==================================================
   WISHLIST
   ================================================== */

export const getWishlist = () => request("/api/wishlist/all");

/* I desideri si leggono da fuori e si scrivono da casa: sono la lista
   della spesa della collezione di carta, e quello che ci finisce sopra
   poi entra in biblioteca. Il `auth: true` è arrivato con la 018 —
   prima queste tre erano le uniche rotte del sito che non chiedevano
   niente a nessuno. */

export const addToWishlist = (item) =>
  request("/api/wishlist", { method: "POST", body: item, auth: true });

export const updateWishlistItem = (id, item) =>
  request(`/api/wishlist/${id}`, { method: "PUT", body: item, auth: true });

export const deleteWishlistItem = (id) =>
  request(`/api/wishlist/${id}`, { method: "DELETE", auth: true });

/**
 * Sposta un desiderio in collezione.
 *
 * I dettagli li dà chi ha comprato: quanti volumi ha preso e di quale
 * edizione. Il desiderio non può saperlo — "Berserk" sono 42 volumi
 * nella serie rossa e 14 nella Deluxe — e senza sarebbe una serie in
 * collezione con zero volumi in casa.
 */
export const purchaseWishlistItem = (id, dettagli) =>
  request(`/api/wishlist-actions/purchase/${id}`, {
    method: "POST",
    body: dettagli ?? {},
    auth: true
  });

/* ==================================================
   LETTURA
   ================================================== */

// Le letture sono di chi le ha fatte: in lettura si dice di chi
// (`diChi`), in scrittura lo dice il token e basta.
export const getReadingHistory = (limite = 60) =>
  request(`/api/reading-history${diChi(`limit=${limite}`)}`);

// La cronologia vista per scaffale: una riga per serie, con dentro
// i volumi letti. Il raggruppamento lo fa il database.
//
// `utenteId` serve a guardare quella di un altro: senza, la scheda di
// una serie aperta dalla collezione di Nanaki mostrava i volumi letti
// da CHI GUARDA — cioè tutti spenti, come se lei non l'avesse mai
// aperta.
export const getStoricoPerSerie = (utenteId = null) =>
  request(`/api/reading-history/per-serie${diChi("", utenteId)}`);

export const addReadingHistory = (entry) =>
  request("/api/reading-history", { method: "POST", body: entry, auth: true });

// Serve a correggere un volume segnato per sbaglio: senza questo
// lo storico accumula errori e si smette di fidarsene.
export const deleteReadingHistory = (id) =>
  request(`/api/reading-history/${id}`, { method: "DELETE", auth: true });

// La stessa correzione, ma detta come la si pensa stando sul libro
// aperto: "il 5 non l'ho letto". Senza, tornare indietro di un volume
// vuol dire ritrovarlo in fondo alla cronologia.
export const deleteReadingHistoryVolume = (mangaId, volume) =>
  request(`/api/reading-history/serie/${mangaId}/volume/${volume}`, {
    method: "DELETE",
    auth: true
  });

// "Questa l'avevo già letta tutta": segna in un colpo i volumi da 1 a
// N che mancano. Una serie da venticinque letta prima di iscriversi
// erano venticinque click e venticinque richieste per dire una cosa
// sola.
export const segnaLettiFinoA = (mangaId, volume) =>
  request(`/api/reading-history/serie/${mangaId}/fino-a/${volume}`, {
    method: "POST",
    auth: true
  });

// E il contrario: togliere un'intera serie da quelle lette.
export const deleteReadingHistorySerie = (mangaId) =>
  request(`/api/reading-history/serie/${mangaId}`, { method: "DELETE", auth: true });

export const getReadingSessions = () => request(`/api/reading-sessions${diChi()}`);

export const saveReadingSession = (session) =>
  request("/api/reading-sessions", { method: "POST", body: session, auth: true });

export const updateReadingSession = (mangaId, volume) =>
  request(`/api/reading-sessions/${mangaId}`, {
    method: "PUT",
    body: { volume },
    auth: true
  });

export const deleteReadingSession = (mangaId) =>
  request(`/api/reading-sessions/${mangaId}`, { method: "DELETE", auth: true });

// Mollare una serie non è un fatto della serie ma di chi la stava
// leggendo: era una colonna di "Manga", ed è per questo che una serie
// droppata da uno spariva anche dall'elenco dell'altra. Le droppate si
// leggono dalle schede (campo `Droppate`), qui si scrivono.
export const droppaSerie = (mangaId) =>
  request(`/api/letture-droppate/${mangaId}`, { method: "POST", auth: true });

export const riprendiSerie = (mangaId) =>
  request(`/api/letture-droppate/${mangaId}`, { method: "DELETE", auth: true });

/* ==================================================
   NOTE
   ================================================== */

// Non c'è una lettura: le note arrivano attaccate alle schede
// (`Note` in /api/manga), perché sono una cosa che si sa dell'opera e
// non un elenco a sé. Qui si scrive soltanto — e solo le proprie.
export const creaNota = (mangaId, testo) =>
  request("/api/note", {
    method: "POST",
    body: { manga_id: mangaId, testo },
    auth: true
  });

export const modificaNota = (id, testo) =>
  request(`/api/note/${id}`, { method: "PUT", body: { testo }, auth: true });

export const eliminaNota = (id) =>
  request(`/api/note/${id}`, { method: "DELETE", auth: true });

/* ==================================================
   KACHINUKI-SEN
   ================================================== */

/**
 * Le partite giocate, dalla più recente.
 *
 * Si vedono tutte, di chiunque abbia giocato, e senza essere entrati:
 * la cronologia è un albo appeso al muro, non un diario. Salvare
 * invece vuole il token — una partita è di chi l'ha giocata, e chi
 * l'ha giocata lo dice la firma, non l'indirizzo.
 */
export const getTornei = (limite = 40) => request(`/api/tornei?limite=${limite}`);

export const getTorneo = (id) => request(`/api/tornei/${id}`);

export const salvaTorneo = (partita) =>
  request("/api/tornei", { method: "POST", body: partita, auth: true });

export const eliminaTorneo = (id) =>
  request(`/api/tornei/${id}`, { method: "DELETE", auth: true });

/* ==================================================
   VIDEOTECA
   ==================================================

   Gli anime visti. Vale la stessa regola del resto del sito: in
   lettura si può guardare la videoteca di un altro (`diChi()`), in
   scrittura chi sei lo dice il token e nient'altro.

   Qui però non c'è niente in comune: un anime non si possiede, quindi
   progresso, voti e note sono di ciascuno — non esiste l'equivalente
   dei «volumi posseduti». Nemmeno l'elenco: la videoteca è di chi la
   guarda, e ogni account ha la sua. */

/**
 * La videoteca di qualcuno.
 *
 * Senza argomenti è la propria (o quella del padrone di casa, per chi
 * guarda senza entrare). Con un identificativo è quella di un altro:
 * è così che la pagina personale di Nanaki mostra le sue copertine a
 * chiunque apra `/videoteca/chi/Nanaki`, e non è un permesso nuovo —
 * il server accetta `?utente=` in lettura da quando i lettori sono
 * due, e in scrittura continua a non guardarlo.
 */
export const getVideoteca = (utenteId = null) => request(`/api/anime${diChi("", utenteId)}`);

/** La serie con tutte le sue stagioni: l'indirizzo ne porta una, torna il gruppo. */
export const getAnime = (id) => request(`/api/anime/${id}${diChi()}`);

/**
 * Toglie una serie dalla videoteca di chi ha premuto.
 *
 * Non è una cancellazione dal catalogo, se non quando non la guarda
 * più nessuno: spariscono le tue spunte, il tuo voto e le tue note, e
 * la scheda resta a chi la sta ancora guardando.
 */
export const togliDallaVideoteca = (id) =>
  request(`/api/anime/${id}`, { method: "DELETE", auth: true });

/* ---- I gruppi: le stagioni della stessa serie ----
   AnimeClick tiene Frieren in una scheda sola e Isekai Farming in due.
   Quando la seconda strada non si riconosce da sé, queste tre chiamate
   la sistemano a mano. */

export const accorpaStagione = (id, conId) =>
  request(`/api/anime/${id}/gruppo`, { method: "PUT", body: { con: conId }, auth: true });

export const staccaStagione = (id) =>
  request(`/api/anime/${id}/gruppo`, { method: "PUT", body: { stacca: true }, auth: true });

export const rinominaStagione = (id, { etichetta, ordine }) =>
  request(`/api/anime/${id}/gruppo`, {
    method: "PUT",
    body: { etichetta, ordine },
    auth: true
  });

export const rinominaGruppoAnime = (gruppoId, titolo) =>
  request(`/api/anime/gruppi/${gruppoId}`, { method: "PUT", body: { titolo }, auth: true });

/* ---- I tagli: le stagioni dentro una scheda sola ----
   L'altra faccia del problema. Frieren è UNA scheda con dentro 38
   puntate che sono due stagioni (28 + 10) numerate di seguito, e
   AnimeClick non segna il confine da nessuna parte: lo dà AniList, che
   tiene un media per stagione. `tagli` sono i numeri delle puntate da
   cui comincia una stagione nuova — per Frieren, [29]. */

export const impostaTagliStagioni = (id, tagli) =>
  request(`/api/anime/${id}/stagioni`, { method: "PUT", body: { tagli }, auth: true });

export const cercaTagliStagioni = (id) =>
  request(`/api/anime/${id}/stagioni/cerca`, { method: "POST", auth: true });

/** Le uscite dei prossimi giorni, già in ora italiana. */
export const getCalendarioAnime = (giorni = 14) =>
  request(`/api/anime/calendario${diChi(`giorni=${giorni}`)}`);

/**
 * I candidati su AnimeClick per un titolo.
 *
 * Restituisce una lista da far scegliere, mai una risposta sola: la
 * ricerca di AnimeClick ordina per titolo e non per pertinenza, e
 * "one piece" propone per primo un crossover con Dragon Ball.
 *
 * `segnale` serve alla ricerca che si aggiorna mentre si scrive: la
 * richiesta della lettera prima si annulla, così l'ultima risposta che
 * arriva è sempre quella dell'ultima cosa scritta.
 */
export const cercaAnime = (titolo, segnale) =>
  request(`/api/anime/cerca?titolo=${encodeURIComponent(titolo)}`, {
    auth: true,
    signal: segnale
  });

/**
 * Di quante parti è fatta la serie a cui appartiene questa scheda.
 *
 * È la risposta a «cercare il titolo una volta sola»: si sceglie una
 * scheda e questo dice quali sono le sue stagioni, i suoi film e i
 * suoi OAV, ognuno con scritto se conviene prenderlo e perché. Non
 * aggiunge niente — è la proposta che si vede prima di premere.
 */
export const getFranchiseAnime = (animeclickId, segnale) =>
  request(`/api/anime/franchise/${animeclickId}`, { auth: true, signal: segnale });

/**
 * Cosa racconta una delle parti proposte, prima di aggiungerla.
 *
 * La proposta elenca dei titoli, e certi titoli non dicono niente —
 * «Koyomimonogatari», «Zoku Owarimonogatari». La trama non sta nella
 * pagina delle relazioni: va chiesta scheda per scheda, quindi si
 * chiede solo quella che si guarda.
 */
export const getAnteprimaAnime = (animeclickId, segnale) =>
  request(`/api/anime/anteprima/${animeclickId}`, { auth: true, signal: segnale });

/**
 * Aggiunge la serie alla videoteca. Con `parti`, la aggiunge INTERA.
 *
 * ⚠️ Può rispondere con `restanti`: le parti che non sono entrate nel
 * tempo di una richiesta. Non è un errore, è una serie lunga — si
 * richiama con le stesse parti finché quell'elenco non è vuoto.
 */
export const agganciaAnime = (animeclickId, { parti, nome } = {}) =>
  request("/api/anime", {
    method: "POST",
    body: { animeclick_id: animeclickId, parti, nome },
    auth: true
  });

/**
 * Ripassa la videoteca e rimette insieme le stagioni sparse.
 *
 * Serve a quello che c'era prima che il riconoscimento migliorasse:
 * una videoteca riempita una serie per volta si ritrova Shakugan no
 * Shana in tre copertine. Non aggiunge e non toglie niente.
 */
export const riunisciVideoteca = () =>
  request("/api/anime/riunisci", { method: "POST", auth: true });

/** Rilegge scheda ed episodi: serve alle serie in corso. */
export const rileggiAnime = (id) =>
  request(`/api/anime/${id}/rileggi`, { method: "POST", auth: true });

export const collegaAnimeAlManga = (id, mangaId) =>
  request(`/api/anime/${id}/manga`, {
    method: "PUT",
    body: { manga_id: mangaId },
    auth: true
  });

export const impostaVisione = (id, stato) =>
  request(`/api/anime/${id}/visione`, { method: "PUT", body: { stato }, auth: true });

/**
 * Spunta un episodio. Con `fino` spunta anche tutti quelli prima —
 * il gesto di chi torna dopo una serata e non vuole toccare otto
 * caselle una per una.
 */
export const segnaEpisodio = (id, numero, { fino = false } = {}) =>
  request(`/api/anime/${id}/episodi/${numero}`, {
    method: "POST",
    body: { fino },
    auth: true
  });

export const togliEpisodio = (id, numero) =>
  request(`/api/anime/${id}/episodi/${numero}`, { method: "DELETE", auth: true });

export const votaAnime = (id, voto) =>
  request(`/api/anime/${id}/voto`, { method: "PUT", body: { voto }, auth: true });

export const togliVotoAnime = (id) =>
  request(`/api/anime/${id}/voto`, { method: "DELETE", auth: true });

/**
 * Un commento: con `numeroEpisodio` parla di quella puntata, senza
 * parla della serie intera.
 */
export const creaNotaAnime = (id, { testo, numeroEpisodio = null, spoiler = false }) =>
  request(`/api/anime/${id}/note`, {
    method: "POST",
    body: { testo, numero_episodio: numeroEpisodio, spoiler },
    auth: true
  });

export const modificaNotaAnime = (noteId, { testo, spoiler }) =>
  request(`/api/anime/note/${noteId}`, {
    method: "PUT",
    body: { testo, spoiler },
    auth: true
  });

export const eliminaNotaAnime = (noteId) =>
  request(`/api/anime/note/${noteId}`, { method: "DELETE", auth: true });

/**
 * Il ripiano in vetrina: mettere e togliere sono lo stesso indirizzo.
 *
 * Non è «le ho dato cinque stelle» — quella è la classifica, e si
 * ricava dai voti. I preferiti sono le poche serie che uno sceglie di
 * mostrare in fondo alla propria pagina.
 */
export const preferisciAnime = (id) =>
  request(`/api/anime/${id}/preferito`, { method: "POST", auth: true });

/* ==================================================
   CINEFORUM
   ==================================================

   La piazza della videoteca: quello che hanno fatto tutti, senza
   doversi seguire.

   Vale la regola di sempre e conviene ripeterla, perché qui si vede
   più che altrove: LEGGERE è di tutti, anche di chi non è entrato —
   è il senso della cosa — e SCRIVERE lo dice solo il token. */

/**
 * Il feed. `prima` è l'istante da cui riprendere, e arriva dalla
 * risposta precedente invece di essere ricalcolato qui: due post
 * possono cadere nello stesso millisecondo, e ripartire da «l'ultimo
 * che ho visto» ne salterebbe uno.
 */
export const getCineforum = ({ prima = null, quanti = null, utente = null } = {}) => {
  const parametri = new URLSearchParams();

  if (prima) parametri.set("prima", new Date(prima).toISOString());
  if (quanti) parametri.set("quanti", String(quanti));
  if (utente) parametri.set("utente", String(utente));

  const coda = parametri.toString();

  return request(`/api/cineforum${coda ? `?${coda}` : ""}`);
};

export const scriviMessaggio = ({ testo, animeId = null }) =>
  request("/api/cineforum/messaggi", { method: "POST", body: { testo, animeId }, auth: true });

export const modificaMessaggio = (id, testo) =>
  request(`/api/cineforum/messaggi/${id}`, { method: "PUT", body: { testo }, auth: true });

export const eliminaMessaggio = (id) =>
  request(`/api/cineforum/messaggi/${id}`, { method: "DELETE", auth: true });

/** Il cuore commuta: lo stesso bottone lo mette e lo toglie. */
export const cuoreCineforum = (chiave) =>
  request("/api/cineforum/cuore", { method: "POST", body: { chiave }, auth: true });

export const rispondiCineforum = (chiave, testo) =>
  request("/api/cineforum/risposte", { method: "POST", body: { chiave, testo }, auth: true });

export const modificaRisposta = (id, testo) =>
  request(`/api/cineforum/risposte/${id}`, { method: "PUT", body: { testo }, auth: true });

export const eliminaRisposta = (id) =>
  request(`/api/cineforum/risposte/${id}`, { method: "DELETE", auth: true });

/* ---- Le pagine delle persone ----
   Il soprannome è l'indirizzo pubblico di ciascuno: si cerca per
   nome, non per numero, e l'indirizzo che ne esce si può mandare. */

export const getProfiloVideoteca = (nickname) =>
  request(`/api/cineforum/profilo/${encodeURIComponent(nickname)}`);

export const getCommentiDi = (nickname) =>
  request(`/api/cineforum/commenti/${encodeURIComponent(nickname)}`);

export const getConfronto = (a, b) =>
  request(`/api/cineforum/confronto/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);

/** Chi c'è, con quante serie ha: serve alla ricerca per soprannome. */
export const getPersone = () => request("/api/cineforum/chi");

/**
 * Il soprannome di chi guarda.
 *
 * La barra punta a `/videoteca/io`, che è un indirizzo fisso perché
 * si disegna prima di sapere chi sei; questa chiamata è come quella
 * pagina scopre di chi deve mostrare la videoteca. Chi non è entrato
 * riceve il padrone di casa, come ovunque nel sito.
 */
export const getIoVideoteca = () => request("/api/cineforum/io", { auth: true });

/* ==================================================
   MERCATO
   ================================================== */

// Niente parametro "months": la Browse API di eBay vede solo gli
// annunci attivi, non le vendite passate, quindi non esiste una
// finestra temporale da chiedere.
//
// `edizione`/`altreEdizioni` servono a non mischiare i prezzi di
// edizioni diverse della stessa opera (es. Perfect Edition vs
// classica); `volumiTotali` al server per riconoscere se un annuncio
// sembra la serie completa.
export function getMarketPrice({ titolo, edizione, altreEdizioni, volumiTotali }) {
  const parametri = new URLSearchParams({ query: titolo });

  if (edizione) parametri.set("edizione", edizione);
  if (altreEdizioni?.length) parametri.set("altreEdizioni", altreEdizioni.join(","));
  if (volumiTotali) parametri.set("volumiTotali", String(volumiTotali));

  return request(`/api/marketplace/avg-price?${parametri.toString()}`);
}
