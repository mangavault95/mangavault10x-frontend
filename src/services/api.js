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
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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

  // Il token è scaduto o non è valido: lo butto via, così la UI
  // può rimandare al login invece di riprovare all'infinito.
  if (res.status === 401 || res.status === 403) {
    clearToken();
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(payload?.error || `Errore ${res.status}`, res.status);
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

export const updateRating = (id, rating) =>
  request("/api/manga/updateRating", {
    method: "POST",
    body: { id, rating },
    auth: true
  });

export const enrichManga = (titolo, autore) =>
  request("/api/manga/enrich", { method: "POST", body: { titolo, autore } });

export const login = async (username, password) => {
  const data = await request("/api/manga/login", {
    method: "POST",
    body: { username, password }
  });

  if (data?.token) setToken(data.token);

  return data;
};

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

export const purchaseWishlistItem = (id) =>
  request(`/api/wishlist-actions/purchase/${id}`, { method: "POST" });

/* ==================================================
   LETTURA
   ================================================== */

export const getReadingHistory = (limite = 60) =>
  request(`/api/reading-history?limit=${limite}`);

// La cronologia vista per scaffale: una riga per serie, con dentro
// i volumi letti. Il raggruppamento lo fa il database.
export const getStoricoPerSerie = () => request("/api/reading-history/per-serie");

export const addReadingHistory = (entry) =>
  request("/api/reading-history", { method: "POST", body: entry });

// Serve a correggere un volume segnato per sbaglio: senza questo
// lo storico accumula errori e si smette di fidarsene.
export const deleteReadingHistory = (id) =>
  request(`/api/reading-history/${id}`, { method: "DELETE" });

export const getReadingSessions = () => request("/api/reading-sessions");

export const saveReadingSession = (session) =>
  request("/api/reading-sessions", { method: "POST", body: session });

export const updateReadingSession = (mangaId, volume) =>
  request(`/api/reading-sessions/${mangaId}`, {
    method: "PUT",
    body: { volume }
  });

export const deleteReadingSession = (mangaId) =>
  request(`/api/reading-sessions/${mangaId}`, { method: "DELETE" });

/* ==================================================
   MERCATO
   ================================================== */

// Niente parametro "months": la Browse API di eBay vede solo gli
// annunci attivi, non le vendite passate, quindi non esiste una
// finestra temporale da chiedere.
export const getMarketPrice = (query) =>
  request(`/api/marketplace/avg-price?query=${encodeURIComponent(query)}`);
