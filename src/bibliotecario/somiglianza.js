/**
 * "Qualcosa di simile a questo."
 *
 * Due domande diverse si nascondono dentro la stessa frase, e vanno
 * distinte perché servono a due cose:
 *
 *   - simile CHE HAI GIÀ → cosa leggere stasera, gratis, subito
 *   - simile CHE NON HAI → cosa comprare
 *
 * La prima si risponde qui, con i dati in memoria. La seconda chiede
 * ad AniList quali manga la gente accosta a quello, e scarta quelli
 * che sono già sullo scaffale.
 *
 * Il punteggio non è un algoritmo raffinato ed è meglio così: chiunque
 * deve poter guardare i pesi qui sotto e capire perché il
 * bibliotecario ha proposto una certa serie. Una raccomandazione che
 * non si sa spiegare non si può nemmeno correggere.
 */

/* ==================================================
   I PESI
   ================================================== */

// I generi in comune contano più di tutto: sono la ragione principale
// per cui due manga "si somigliano" nel modo in cui lo intende chi
// chiede.
const PESO_GENERI = 0.55;

// Stesso autore è il segnale più forte in assoluto per singolo fatto:
// chi ha amato una serie di Urasawa vuole sapere delle altre.
const PESO_AUTORE = 0.3;

// Stesso editore dice pochissimo sul contenuto, ma qualcosa
// sull'edizione (formato, prezzo, reperibilità).
const PESO_EDITORE = 0.08;

// Lunghezza paragonabile: un lettore di autoconclusivi e uno di
// fiumi da cento volumi cercano cose diverse.
const PESO_LUNGHEZZA = 0.07;

/* ==================================================
   IL PUNTEGGIO
   ================================================== */

function quoteGeneri(a, b) {
  if (!a.generi?.length || !b.generi?.length) return 0;

  const insiemeB = new Set(b.generi);
  const comuni = a.generi.filter((g) => insiemeB.has(g)).length;

  if (!comuni) return 0;

  // Jaccard: due serie con tre generi in comune su quattro si
  // somigliano più di due che ne hanno tre su dodici.
  const unione = new Set([...a.generi, ...b.generi]).size;

  return comuni / unione;
}

function quotaLunghezza(a, b) {
  if (!a.totali || !b.totali) return 0;

  const rapporto = Math.min(a.totali, b.totali) / Math.max(a.totali, b.totali);

  // Sotto la metà si considerano di taglia diversa e non si dà niente.
  return rapporto >= 0.5 ? rapporto : 0;
}

const stessoNome = (x, y) => Boolean(x && y && x.toLowerCase() === y.toLowerCase());

export function punteggioSomiglianza(riferimento, candidata) {
  let punti = quoteGeneri(riferimento, candidata) * PESO_GENERI;

  const stessoAutore =
    stessoNome(riferimento.autore, candidata.autore) ||
    stessoNome(riferimento.autore, candidata.disegnatore) ||
    stessoNome(riferimento.disegnatore, candidata.autore);

  if (stessoAutore) punti += PESO_AUTORE;

  if (stessoNome(riferimento.editore, candidata.editore)) punti += PESO_EDITORE;

  punti += quotaLunghezza(riferimento, candidata) * PESO_LUNGHEZZA;

  return punti;
}

/**
 * Perché questa serie è stata proposta.
 *
 * La spiegazione non è un ornamento: senza, un consiglio è una
 * pretesa. Con, è un ragionamento che si può contestare — e magari
 * scoprire che due serie condividono un autore che non ricordavi.
 */
export function spiegaSomiglianza(riferimento, candidata) {
  const motivi = [];

  const stessoAutore =
    stessoNome(riferimento.autore, candidata.autore) ||
    stessoNome(riferimento.autore, candidata.disegnatore) ||
    stessoNome(riferimento.disegnatore, candidata.autore);

  if (stessoAutore) motivi.push(`stesso autore (${candidata.autore})`);

  const insieme = new Set(candidata.generi || []);
  const comuni = (riferimento.generi || []).filter((g) => insieme.has(g));

  if (comuni.length) motivi.push(comuni.slice(0, 3).join(", ").toLowerCase());

  if (!motivi.length && stessoNome(riferimento.editore, candidata.editore)) {
    motivi.push(`stesso editore (${candidata.editore})`);
  }

  return motivi.join(" · ") || null;
}

/* ==================================================
   NELLA COLLEZIONE
   ================================================== */

/**
 * Le serie più vicine a una data, fra quelle che possiedi.
 *
 * La soglia esiste per poter rispondere "niente che ci somigli
 * davvero" invece di proporre la quarta serie meno lontana. Un
 * bibliotecario che consiglia sempre qualcosa, anche quando non ha
 * niente di adatto, smette presto di essere utile.
 */
export function similiInCollezione(riferimento, tutte, quante = 4) {
  const SOGLIA = 0.18;

  return tutte
    .filter((s) => s.id !== riferimento.id)
    .map((s) => ({
      serie: s,
      punteggio: punteggioSomiglianza(riferimento, s),
      perche: spiegaSomiglianza(riferimento, s)
    }))
    .filter((v) => v.punteggio >= SOGLIA)
    .sort((a, b) => b.punteggio - a.punteggio)
    .slice(0, quante);
}

/**
 * Toglie dai suggerimenti esterni quello che hai già.
 *
 * Il confronto è sui titoli normalizzati perché le stesse opere hanno
 * nomi diversi da una fonte all'altra: "Vinland Saga" su AniList e in
 * collezione combaciano, ma "JoJo's Bizarre Adventure Part 1" e
 * "Le bizzarre avventure di JoJo" no — è un limite noto, e il peggio
 * che può capitare è suggerire di comprare qualcosa che hai già.
 */
export function scartaQuelloCheHai(esterni, collezione) {
  const miei = new Set(
    collezione.flatMap((s) =>
      [s.titolo, s.grezzo?.TitoloOriginale].filter(Boolean).map((t) => normalizzaTitolo(t))
    )
  );

  return esterni.filter((e) => {
    const nomi = [e.titolo, e.titoloInglese].filter(Boolean).map(normalizzaTitolo);

    return !nomi.some((n) => miei.has(n));
  });
}

function normalizzaTitolo(titolo) {
  return titolo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
