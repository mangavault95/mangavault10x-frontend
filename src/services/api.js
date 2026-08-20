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
  constructor(message, status, dettagli) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    // Quello che il server sa e il messaggio generico non dice: il nome
    // del vincolo violato, la colonna che dà fastidio. Senza, davanti a
    // un "Errore server" tocca rifare a mano la stessa richiesta per
    // scoprire cosa non è andato.
    this.dettagli = dettagli;
  }
}

async function request(path, { method = "GET", body, auth = false } = {}) {
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
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
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
    throw new ApiError(payload?.error || `Errore ${res.status}`, res.status, payload?.details);
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
function diChi(extra = "") {
  const utente = utenteRicordato();

  if (!utente?.id) return extra ? `?${extra}` : "";

  return `?utente=${utente.id}${extra ? `&${extra}` : ""}`;
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

/** Le richieste di accesso ancora in sospeso (solo il proprietario). */
export const getRichiesteAccesso = () => request("/api/utenti/richieste", { auth: true });

export const getUtenti = () => request("/api/utenti", { auth: true });

export const decidiAccesso = (id, approva) =>
  request(`/api/utenti/${id}/${approva ? "approva" : "rifiuta"}`, {
    method: "POST",
    auth: true
  });

/* ==================================================
   WISHLIST
   ================================================== */

export const getWishlist = () => request("/api/wishlist/all");

export const addToWishlist = (item) =>
  request("/api/wishlist", { method: "POST", body: item });

export const updateWishlistItem = (id, item) =>
  request(`/api/wishlist/${id}`, { method: "PUT", body: item });

export const deleteWishlistItem = (id) =>
  request(`/api/wishlist/${id}`, { method: "DELETE" });

/**
 * Sposta un desiderio in collezione.
 *
 * I dettagli li dà chi ha comprato: quanti volumi ha preso e di quale
 * edizione. Il desiderio non può saperlo — "Berserk" sono 42 volumi
 * nella serie rossa e 14 nella Deluxe — e senza sarebbe una serie in
 * collezione con zero volumi in casa.
 */
export const purchaseWishlistItem = (id, dettagli) =>
  request(`/api/wishlist-actions/purchase/${id}`, { method: "POST", body: dettagli ?? {} });

/* ==================================================
   LETTURA
   ================================================== */

// Le letture sono di chi le ha fatte: in lettura si dice di chi
// (`diChi`), in scrittura lo dice il token e basta.
export const getReadingHistory = (limite = 60) =>
  request(`/api/reading-history${diChi(`limit=${limite}`)}`);

// La cronologia vista per scaffale: una riga per serie, con dentro
// i volumi letti. Il raggruppamento lo fa il database.
export const getStoricoPerSerie = () => request(`/api/reading-history/per-serie${diChi()}`);

export const addReadingHistory = (entry) =>
  request("/api/reading-history", { method: "POST", body: entry, auth: true });

// Serve a correggere un volume segnato per sbaglio: senza questo
// lo storico accumula errori e si smette di fidarsene.
export const deleteReadingHistory = (id) =>
  request(`/api/reading-history/${id}`, { method: "DELETE", auth: true });

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
