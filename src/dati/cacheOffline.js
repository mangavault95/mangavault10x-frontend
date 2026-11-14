/**
 * La copia offline delle risposte del server.
 *
 * Il service worker (`public/sw.js`) tiene ogni `GET /api/*` riuscito in
 * una cache chiamata `mv-dati`, per rispondere quando la rete non c'è.
 * La chiave è l'indirizzo, non la persona: `/api/anime` di chi è entrato
 * e `/api/anime` di chi no sono lo stesso indirizzo, e la copia dell'uno
 * si servirebbe all'altro. Su un telefono è raro, su un dispositivo che
 * due persone si passano no.
 *
 * Per questo, quando cambia CHI sta guardando (si esce, si entra, il
 * server non riconosce più l'accesso) la copia si butta via. Quello che
 * serve davvero si riscarica alla prima richiesta.
 *
 * Il nome è quello di `DATI` in `public/sw.js`: se cambia là, cambia qua.
 *
 * Limite: una richiesta partita un attimo PRIMA di uscire e finita DOPO
 * può rimettere dentro la sua risposta. È una finestra di qualche
 * centinaio di millisecondi, e vale solo per quella richiesta.
 */
const NOME = "mv-dati";

export async function svuotaCacheDati() {
  try {
    if (typeof caches === "undefined") return;

    await caches.delete(NOME);
  } catch {
    // Contesti senza Cache API (certi browser in navigazione privata):
    // niente copia da buttare, quindi niente da fare.
  }
}
