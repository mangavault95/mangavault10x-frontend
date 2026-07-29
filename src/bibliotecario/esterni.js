/**
 * Le fonti per i manga che non hai.
 *
 * AniList si può interrogare direttamente dal browser: risponde con
 * CORS aperto e non chiede chiavi. Provato in produzione. Questo
 * significa che una domanda su un manga sconosciuto non passa da
 * Render, e non paga il risveglio del servizio gratuito — la risposta
 * arriva in mezzo secondo invece che in trenta.
 *
 * Le trame di AniList sono in inglese. Quando servono in italiano si
 * chiede al backend, che ha già il servizio di traduzione costruito
 * per l'arricchimento delle schede: vedi `chiediTramaItaliana`.
 */

import { enrichManga } from "../services/api";

const ANILIST = "https://graphql.anilist.co";

// Chiedo solo i campi che mostro davvero. Una query che scarica tutto
// "per sicurezza" fa aspettare l'utente per dati che nessuno legge.
const RICERCA = `
  query ($testo: String, $quanti: Int) {
    Page(perPage: $quanti) {
      media(search: $testo, type: MANGA, sort: SEARCH_MATCH) {
        id
        title { romaji english native }
        volumes
        chapters
        status
        genres
        averageScore
        startDate { year }
        coverImage { large }
        siteUrl
        description(asHtml: false)
        staff(perPage: 4) {
          edges { role node { name { full } } }
        }
      }
    }
  }
`;

/**
 * I manga che i lettori accostano a un dato titolo.
 *
 * Ricerca e raccomandazioni in una richiesta sola: partendo da un
 * titolo non ho l'identificativo AniList, e farne due (prima cerca,
 * poi chiedi) raddoppierebbe l'attesa per niente.
 *
 * `sort: RATING_DESC` mette per prime le associazioni su cui più
 * persone si sono trovate d'accordo, non quelle di un singolo utente.
 */
const RACCOMANDAZIONI = `
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      id
      title { romaji english }
      recommendations(perPage: 12, sort: RATING_DESC) {
        nodes {
          rating
          mediaRecommendation {
            id
            title { romaji english native }
            volumes
            chapters
            status
            genres
            averageScore
            startDate { year }
            coverImage { large }
            siteUrl
            description(asHtml: false)
            staff(perPage: 4) { edges { role node { name { full } } } }
          }
        }
      }
    }
  }
`;

const STATI = {
  FINISHED: "conclusa",
  RELEASING: "in corso",
  NOT_YET_RELEASED: "non ancora uscita",
  CANCELLED: "interrotta",
  HIATUS: "in pausa"
};

/**
 * AniList elenca lo staff con un ruolo scritto a mano libera
 * ("Story & Art", "Original Creator", "Art"). Non è un campo
 * strutturato, quindi si cerca la parola chiave invece di sperare in
 * un valore esatto.
 */
function estraiAutori(staff) {
  const bordi = staff?.edges || [];

  const perRuolo = (parole) =>
    bordi.find((b) => parole.some((p) => (b.role || "").toLowerCase().includes(p)))
      ?.node?.name?.full || null;

  const storia = perRuolo(["story", "creator", "author"]);
  const disegni = perRuolo(["art"]);

  return {
    autore: storia || disegni || bordi[0]?.node?.name?.full || null,
    disegnatore: disegni && disegni !== storia ? disegni : null
  };
}

// Le descrizioni AniList contengono markup HTML e note della redazione
// fra parentesi tonde a fine testo. Tolgo l'uno e lascio le altre:
// "(Fonte: ...)" è informazione onesta su da dove viene il testo.
function ripulisci(testo) {
  if (!testo) return null;

  return testo
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizza(media) {
  const { autore, disegnatore } = estraiAutori(media.staff);

  return {
    idEsterno: media.id,
    titolo: media.title.romaji || media.title.english || media.title.native,
    titoloInglese: media.title.english || null,
    autore,
    disegnatore,
    // `volumes` è null per quasi tutte le serie in corso: AniList non
    // conta i volumi finché l'edizione non è chiusa. Meglio dirlo che
    // inventare un numero.
    volumi: media.volumes ?? null,
    capitoli: media.chapters ?? null,
    stato: STATI[media.status] || null,
    generi: media.genres || [],
    voto: media.averageScore ? media.averageScore / 10 : null,
    anno: media.startDate?.year ?? null,
    copertina: media.coverImage?.large || null,
    collegamento: media.siteUrl || null,
    trama: ripulisci(media.description),
    tramaInItaliano: false
  };
}

async function interroga(query, variables) {
  const risposta = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables })
  });

  if (!risposta.ok) {
    throw new Error(
      risposta.status === 429
        ? "AniList sta limitando le richieste: riprova fra un minuto."
        : "AniList non ha risposto."
    );
  }

  const dati = await risposta.json();

  // Una ricerca senza risultati fa rispondere ad AniList con un errore
  // "Not Found" invece che con una lista vuota: non è un guasto, è un
  // "non c'è", e va distinto dai problemi veri.
  if (dati.errors?.length && !dati.data) {
    const soloNonTrovato = dati.errors.every((e) => e.status === 404);

    if (soloNonTrovato) return null;

    throw new Error("AniList ha rifiutato la richiesta.");
  }

  return dati.data;
}

export async function cercaFuori(testo, quanti = 5) {
  const dati = await interroga(RICERCA, { testo, quanti });

  return (dati?.Page?.media || []).map(normalizza);
}

/**
 * Cosa leggono quelli a cui è piaciuto un certo titolo.
 *
 * Non è un algoritmo mio: sono le associazioni che gli utenti di
 * AniList hanno votato. Vale la pena dirlo a chi legge la risposta —
 * è un consiglio di una comunità, non un giudizio del sito.
 *
 * Si passa dall'identificativo, non dal titolo. Chiedendo per titolo,
 * "Monster" pescava uno degli altri manga omonimi (ce ne sono
 * parecchi) e le raccomandazioni che tornavano non c'entravano niente:
 * per il capolavoro di Urasawa suggeriva una commedia romantica. Il
 * chiamante sceglie la voce giusta con `scegliCorrispondenza` e poi
 * chiede qui.
 */
export async function similiFuoriPerId(id) {
  const dati = await interroga(RACCOMANDAZIONI, { id });

  const nodi = dati?.Media?.recommendations?.nodes || [];

  return nodi
    .map((n) => n.mediaRecommendation)
    .filter(Boolean)
    .map(normalizza);
}

/**
 * Quale dei risultati di AniList è davvero la serie che ho in mano.
 *
 * L'autore è il discriminante buono: i titoli si ripetono di continuo
 * fra opere diverse, gli autori quasi mai per lo stesso titolo. Se non
 * si trova conferma si prende il primo risultato — è comunque quello
 * che AniList considera la corrispondenza migliore — ma il chiamante
 * sa che è una scelta al buio.
 */
export function scegliCorrispondenza(risultati, serie) {
  if (!risultati?.length) return null;

  const mioAutore = (serie.autore || "").toLowerCase();

  if (mioAutore) {
    const conferma = risultati.find((r) =>
      [r.autore, r.disegnatore]
        .filter(Boolean)
        .some((n) => n.toLowerCase().includes(mioAutore) || mioAutore.includes(n.toLowerCase()))
    );

    if (conferma) return { manga: conferma, sicuro: true };
  }

  return { manga: risultati[0], sicuro: false };
}

/**
 * La trama in italiano, chiesta al backend.
 *
 * Passa da Render, quindi è lenta al primo colpo dopo un periodo di
 * inattività: si chiama solo quando l'utente chiede espressamente di
 * quel titolo, mai in blocco sui risultati di una ricerca.
 */
export async function chiediTramaItaliana(titolo, autore) {
  try {
    const dati = await enrichManga(titolo, autore);

    if (dati?.error || !dati?.trama) return null;

    return { testo: dati.trama, inItaliano: Boolean(dati.tramaInItaliano) };
  } catch {
    return null;
  }
}
