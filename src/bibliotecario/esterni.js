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
import { stessoAutore } from "../dati/corrispondenzaAutore";

const ANILIST = "https://graphql.anilist.co";

// Chiedo solo i campi che mostro davvero. Una query che scarica tutto
// "per sicurezza" fa aspettare l'utente per dati che nessuno legge.
//
// Gli stessi campi servono a tutte e tre le domande qui sotto (cerca,
// raccomandazioni, temi affini): scritti una volta come frammento,
// perché tre copie da tenere allineate a mano invecchiano male.
const CAMPI = `
  fragment scheda on Media {
    id
    title { romaji english native }
    # Gli altri nomi con cui la stessa opera è uscita nel mondo, titolo
    # italiano compreso: "Aku no Hana" porta con sé "I Fiori del Male",
    # ed è l'unico modo di riconoscere nella collezione una serie che
    # AniList chiama in romaji.
    synonyms
    volumes
    chapters
    status
    genres
    averageScore
    startDate { year }
    coverImage { large }
    siteUrl
    description(asHtml: false)
    # I tag sono i temi veri — "Revenge", "Coming of Age", "Time Skip" —
    # con un rango che dice quanto pesano su quell'opera. I generi sono
    # sei etichette buone per scaffalare, questi raccontano di cosa
    # parla davvero un fumetto, ed è quello che serve per dire perché
    # due titoli si somigliano.
    tags { name rank category isGeneralSpoiler isMediaSpoiler }
    staff(perPage: 4) {
      edges { role node { name { full } } }
    }
  }
`;

const RICERCA = `
  ${CAMPI}
  query ($testo: String, $quanti: Int) {
    Page(perPage: $quanti) {
      media(search: $testo, type: MANGA, sort: SEARCH_MATCH) { ...scheda }
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
  ${CAMPI}
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      id
      title { romaji english }
      recommendations(perPage: 12, sort: RATING_DESC) {
        nodes {
          rating
          mediaRecommendation { ...scheda }
        }
      }
    }
  }
`;

/**
 * L'altra strada per "assomiglia a": i manga che trattano gli stessi
 * temi.
 *
 * Le raccomandazioni sopra sono il segnale migliore, ma esistono solo
 * dove qualcuno le ha scritte: su un titolo di nicchia tornano vuote e
 * la sezione sparisce. I temi invece ci sono sempre, e cercare per
 * quelli è una domanda diversa da "stesso genere" — non "altro Drama",
 * ma "altro che parla di vendetta in una scuola di provincia".
 *
 * `minimumTagRank` è la parte che conta: senza, basterebbe un tag
 * marginale votato da tre persone per far comparire un titolo che con
 * quel tema non c'entra quasi niente.
 */
const PER_TEMI = `
  ${CAMPI}
  query ($temi: [String], $escludi: Int, $quanti: Int) {
    Page(perPage: $quanti) {
      media(
        tag_in: $temi
        minimumTagRank: 60
        id_not: $escludi
        type: MANGA
        format_not_in: [NOVEL]
        isAdult: false
        sort: [SCORE_DESC]
      ) { ...scheda }
    }
  }
`;

/**
 * La bibliografia di una persona.
 *
 * Campi ridotti all'osso di proposito: sono quaranta opere in una
 * risposta sola, e chiedere per ognuna tag, trama e staff — come fa la
 * scheda `scheda` qui sopra — vorrebbe dire scaricare mezzo megabyte
 * per disegnare una griglia di copertine.
 *
 * `POPULARITY_DESC` mette in cima le opere per cui l'autore è
 * conosciuto: ordinate per data, un artbook o una storia breve del mese
 * scorso aprirebbero l'elenco al posto del capolavoro.
 */
const CAMPI_SOMMARIO = `
  fragment sommario on Media {
    id
    title { romaji english native }
    synonyms
    format
    volumes
    status
    averageScore
    startDate { year }
    coverImage { large }
    siteUrl
  }
`;

const OPERE_AUTORE = `
  ${CAMPI_SOMMARIO}
  query ($nome: String) {
    Staff(search: $nome) {
      id
      name { full native }
      staffMedia(type: MANGA, sort: [POPULARITY_DESC], perPage: 40) {
        edges {
          staffRole
          node { ...sommario }
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

/**
 * I temi di un'opera, tenendo solo quelli che descrivono la storia.
 *
 * AniList mette nello stesso elenco cose molto diverse: di cosa parla
 * l'opera ("Revenge", "Coming of Age"), dove è ambientata, ma anche chi
 * è il pubblico ("Shounen"), com'è disegnata ("Full Color") e chi c'è
 * nel cast ("Male Protagonist"). Per dire che due manga si somigliano
 * valgono le prime due: "protagonista maschile" accomuna metà del
 * fumetto giapponese e non significa niente.
 *
 * Gli spoiler restano fuori: un tema in comune è una riga da mostrare a
 * chi la serie non l'ha ancora letta.
 */
function temiDa(tags) {
  return (tags || [])
    .filter((t) => {
      const categoria = t.category || "";
      const tematico = categoria.startsWith("Theme") || categoria.startsWith("Setting");

      return tematico && (t.rank ?? 0) >= 60 && !t.isGeneralSpoiler && !t.isMediaSpoiler;
    })
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .map((t) => t.name);
}

function normalizza(media) {
  const { autore, disegnatore } = estraiAutori(media.staff);

  return {
    idEsterno: media.id,
    titolo: media.title.romaji || media.title.english || media.title.native,
    titoloInglese: media.title.english || null,
    sinonimi: media.synonyms || [],
    autore,
    disegnatore,
    // `volumes` è null per quasi tutte le serie in corso: AniList non
    // conta i volumi finché l'edizione non è chiusa. Meglio dirlo che
    // inventare un numero.
    volumi: media.volumes ?? null,
    capitoli: media.chapters ?? null,
    stato: STATI[media.status] || null,
    generi: media.genres || [],
    // In ordine di rilevanza: il primo è il tema più votato su
    // quell'opera, non il primo in ordine alfabetico.
    temi: temiDa(media.tags),
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
    .filter((n) => n.mediaRecommendation)
    // `affinita` è quanti lettori hanno confermato l'accostamento: un
    // voto solo e un accordo di duecento persone non sono la stessa
    // cosa, e chi ordina i risultati deve poterli distinguere.
    .map((n) => ({ ...normalizza(n.mediaRecommendation), affinita: n.rating ?? 0 }));
}

/**
 * I manga che condividono i temi dati, dal più votato in giù.
 *
 * `tag_in` li richiede *tutti* insieme, non uno qualsiasi (provato su
 * AniList: quattro temi di Punpun tornavano due soli titoli, tre ne
 * tornavano dieci). Quindi si passa una manciata dei più rilevanti e
 * non l'elenco intero: ogni tema in più stringe la rete invece di
 * allargarla, e con sette non torna più niente.
 */
export async function similiPerTemi(temi, { escludi = null, quanti = 12 } = {}) {
  if (!temi?.length) return [];

  const dati = await interroga(PER_TEMI, { temi, escludi, quanti });

  return (dati?.Page?.media || []).map(normalizza);
}

/**
 * Tutto quello che una persona ha scritto o disegnato.
 *
 * Fuori restano due cose. Le assistenze — "Assistant", cioè chi ha dato
 * una mano sulle chine di qualcun altro — non sono opere sue e
 * gonfierebbero la bibliografia di titoli che nessuno gli attribuisce.
 * E i romanzi (`NOVEL`): AniList tiene le light novel dentro `MANGA`,
 * ma in una collezione di fumetti sono un'altra cosa.
 *
 * Torna `null` — non un elenco vuoto — quando AniList non conosce
 * nessuno con quel nome: chi chiama deve poter distinguere "non l'ho
 * trovato" da "non ha scritto niente".
 */
export async function opereDiAutore(nome) {
  if (!nome) return null;

  const dati = await interroga(OPERE_AUTORE, { nome });
  const persona = dati?.Staff;

  if (!persona) return null;

  const opere = (persona.staffMedia?.edges || [])
    .filter((e) => e.node && e.node.format !== "NOVEL" && !/assistant/i.test(e.staffRole || ""))
    .map((e) => ({
      idEsterno: e.node.id,
      titolo: e.node.title.romaji || e.node.title.english || e.node.title.native,
      titoloInglese: e.node.title.english || null,
      sinonimi: e.node.synonyms || [],
      ruolo: e.staffRole || null,
      formato: e.node.format || null,
      volumi: e.node.volumes ?? null,
      stato: STATI[e.node.status] || null,
      voto: e.node.averageScore ? e.node.averageScore / 10 : null,
      anno: e.node.startDate?.year ?? null,
      copertina: e.node.coverImage?.large || null,
      collegamento: e.node.siteUrl || null
    }));

  return { nome: persona.name.full, nomeOriginale: persona.name.native || null, opere };
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

  const mioAutore = serie.autore || "";

  if (mioAutore) {
    const conferma = risultati.find((r) =>
      [r.autore, r.disegnatore].filter(Boolean).some((n) => stessoAutore(n, mioAutore))
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
