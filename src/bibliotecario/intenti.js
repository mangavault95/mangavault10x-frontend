import Fuse from "fuse.js";
import { ARGOMENTI, GENERI, RIEMPITIVI, RIFERIMENTI } from "./lessico";

/**
 * Capire la domanda senza un modello linguistico.
 *
 * Tre cose si riconoscono separatamente, e la separazione è tutto:
 *
 *   1. l'ARGOMENTO — di cosa vuoi sapere (la trama, il costo, cosa manca)
 *   2. il SOGGETTO — di quale serie
 *   3. il FILO     — se non nomini il soggetto, è quello di prima
 *
 * Il punto 3 è ciò che distingue un bibliotecario da una ricerca. Chi
 * chiede «parlami di Vagabond» e poi «quanto costa?» non sta facendo
 * due ricerche scollegate: sta continuando lo stesso discorso, e chi
 * sta al banco deve tenere il filo.
 *
 * Il limite resta dichiarato: se non riconosce, dice che non ha capito.
 * Non tira a indovinare.
 */

/* ==================================================
   NORMALIZZAZIONE
   ================================================== */

/** Via accenti, maiuscole e punteggiatura. */
export function appiattisci(testo) {
  return (testo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const contiene = (testo, ...parole) => parole.some((p) => testo.includes(p));

/**
 * Quel che resta della domanda dopo aver tolto il rumore: idealmente,
 * solo il nome di quello di cui si parla.
 *
 * Toglie due cose. I riempitivi ("quanti", "mi", "di"), e le parole
 * dell'argomento riconosciuto — se la domanda è stata capita come
 * "quanto costa", la parola "costa" ha già fatto il suo lavoro e da
 * qui in poi è rumore.
 *
 * La seconda parte non è un dettaglio: senza, ogni parola aggiunta al
 * lessico degli argomenti andava ricopiata a mano anche fra i
 * riempitivi, e dimenticarsene faceva scambiare il verbo per un
 * titolo. "quanto l'ho pagata?" cercava un manga chiamato *pagata*.
 * Così la dimenticanza non è più possibile.
 */
function ripulisciPerTitolo(piatto, argomento) {
  let testo = piatto;

  if (argomento) {
    const voce = ARGOMENTI.find((a) => a.id === argomento);

    // Le più lunghe per prime. "disegna" è una parola della lista, ma
    // è anche l'inizio di "disegnatore": toglierla per prima lascia
    // "tore" appeso, che poi sembra il pezzo di un titolo. Rimuovendo
    // prima "disegnatore" per intero non resta nulla da smontare.
    const parole = [...(voce?.parole || [])].sort((a, b) => b.length - a.length);

    for (const parola of parole) {
      testo = testo.split(parola).join(" ");
    }
  }

  return testo
    .split(" ")
    .filter((p) => p && !RIEMPITIVI.has(p))
    .join(" ")
    .trim();
}

/* ==================================================
   ARGOMENTO
   ================================================== */

/** Di cosa parla la domanda, indipendentemente da quale serie. */
export function argomentoDi(piatto) {
  for (const argomento of ARGOMENTI) {
    if (argomento.parole.some((p) => piatto.includes(p))) return argomento.id;
  }

  return null;
}

function generoNominato(piatto) {
  // Le radici più lunghe per prime: "sportiv" deve vincere su "sport".
  const radici = Object.keys(GENERI).sort((a, b) => b.length - a.length);

  for (const radice of radici) {
    if (piatto.includes(radice)) return GENERI[radice];
  }

  return null;
}

/* ==================================================
   SOGGETTO
   ================================================== */

export function creaIndiceTitoli(serie) {
  return new Fuse(serie, {
    keys: ["titolo"],
    threshold: 0.32,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 3
  });
}

/**
 * L'indice degli autori: nomi unici, riconosciuti per parola intera.
 *
 * La ricerca approssimata qui fa danni. Chiedendo "adachi" trovava
 * *Adachitoka* (che disegna Noragami) invece di *Mitsuru Adachi*: come
 * stringhe si somigliano moltissimo. E i cognomi giapponesi si
 * assomigliano di natura — Takahashi, Takahata, Takeuchi. Attribuire
 * una serie alla persona sbagliata fa perdere fiducia più in fretta di
 * un "non ho capito".
 */
export function creaIndiceAutori(serie) {
  const nomi = new Set();

  for (const s of serie) {
    if (s.autore) nomi.add(s.autore);
    if (s.disegnatore) nomi.add(s.disegnatore);
  }

  return [...nomi];
}

function autoreNominato(resto, nomi) {
  if (!nomi?.length || resto.length < 4) return null;

  const parole = resto.split(" ").filter((p) => p.length >= 4);

  if (!parole.length) return null;

  for (const nome of nomi) {
    const pezziNome = appiattisci(nome).split(" ");

    if (!parole.some((p) => pezziNome.includes(p))) continue;

    // `soloIlNome` distingue "urasawa" da "urasawa monster": nel primo
    // caso la domanda è tutta e solo il nome di una persona, e vince
    // l'autore anche se una serie se lo porta nel titolo.
    return { nome, soloIlNome: parole.every((p) => pezziNome.includes(p)) };
  }

  return null;
}

/**
 * Cerca una serie della collezione dentro la domanda.
 *
 * Solo nel testo ripulito dai riempitivi, mai nella frase intera:
 * provare anche sulla frase intera sembrava prudente e invece era la
 * fonte degli abbagli peggiori — "quanto vale la collezione"
 * somigliava abbastanza a *L'immortale* da far rispondere su quella.
 */
export function serieNominata(testo, indice) {
  if (!indice || !testo) return null;

  if (testo.length < 3) return null;

  const esito = indice.search(testo)[0];

  if (!esito) return null;

  /**
   * Le stringhe corte somigliano a tutto, e la somiglianza qui non
   * basta: "sto" (da "cosa sto leggendo") pescava *Dr.STONE*, "chi"
   * (da "chi la pubblica") pescava *Ga-CHI-akuta*. Nemmeno cercarle
   * come sottostringa risolve — "chi" dentro "Gachiakuta" c'è davvero.
   *
   * Sotto i cinque caratteri si pretende che la parola compaia INTERA
   * nel titolo: "gto" trova *GTO*, "chi" non trova niente.
   */
  if (testo.length < 5) {
    const pezziTitolo = appiattisci(esito.item.titolo).split(" ");

    return pezziTitolo.includes(testo)
      ? { serie: esito.item, punteggio: esito.score }
      : null;
  }

  if (esito.score > 0.34) return null;

  return { serie: esito.item, punteggio: esito.score };
}

/* ==================================================
   IL FILO DEL DISCORSO
   ================================================== */

// Gli argomenti che senza un soggetto non vogliono dire niente: "di
// cosa parla?" da solo è una domanda monca, "quante serie ho?" no.
const VOGLIONO_UN_SOGGETTO = new Set([
  "trama",
  "costo",
  "autore",
  "editore",
  "stato",
  "voto",
  "simile",
  "possiedo"
]);

// Gli argomenti che hanno anche una lettura globale sensata: "cosa mi
// manca" senza soggetto significa "in tutta la collezione", non
// "dell'ultima serie di cui abbiamo parlato".
const HANNO_LETTURA_GLOBALE = new Set([
  "mancanti",
  "valore",
  "volumi",
  "completare",
  "lettura"
]);

const PAROLE_GLOBALI = ["collezione", "in tutto", "in totale", "totale", "complessiv"];

function parlaDellaCollezione(piatto) {
  return PAROLE_GLOBALI.some((p) => piatto.includes(p));
}

function usaUnRiferimento(piatto) {
  const parole = piatto.split(" ");

  return RIFERIMENTI.some((r) =>
    r.includes(" ") ? piatto.includes(r) : parole.includes(r)
  );
}

/**
 * Va ripreso il soggetto di prima?
 *
 * Sì quando la domanda usa un pronome ("quanto costa?", "di cosa
 * parla?", "chi l'ha scritto?") o quando l'argomento da solo non sta
 * in piedi. No quando la domanda parla esplicitamente della
 * collezione intera.
 */
// "quanto mi manca?" chiede una quantità, e la quantità è di qualcosa:
// della serie di cui si sta parlando. "cosa mi manca?" chiede un
// elenco, e l'elenco è della collezione. La lingua distingue già i due
// casi con la prima parola.
const CHIEDE_UNA_QUANTITA = /^(quanto|quanti|quante|quanta)\b/;

// La prima persona rimanda a me e a quello che possiedo, non alla
// serie: "quanti volumi HO" è una domanda sulla collezione anche se
// stiamo parlando di Monster da dieci minuti.
const PRIMA_PERSONA = ["ho", "possiedo", "posseggo", "avrei", "avevo"];

const parlaDiMe = (piatto) => {
  const parole = piatto.split(" ");

  return PRIMA_PERSONA.some((p) => parole.includes(p));
};

function ereditaSoggetto(piatto, argomento, resto) {
  if (!argomento) return false;

  // "in tutto", "della collezione": parla esplicitamente dell'insieme.
  if (parlaDellaCollezione(piatto)) return false;

  /**
   * Se resta del testo dopo aver tolto riempitivi e parole
   * dell'argomento, la domanda sta nominando qualcosa — e va cercato,
   * non ereditato.
   *
   * Senza questo, "e di simile a Berserk?" dopo aver parlato di
   * Monster continuava a rispondere su Monster: Berserk non è in
   * collezione, quindi nessun titolo combaciava, quindi scattava
   * l'eredità. Ma un titolo era stato pronunciato eccome, e ignorarlo
   * è il peggiore dei fraintendimenti — risponde con sicurezza sulla
   * cosa sbagliata.
   */
  if (resto && resto.length >= 3) return false;

  // Un pronome, o un verbo alla terza persona: si riferisce a qualcosa
  // di cui si è già parlato. Ma la terza persona perde contro la prima
  // se ci sono entrambe — "quanti ne ho" parla di me.
  if (usaUnRiferimento(piatto) && !parlaDiMe(piatto)) return true;

  if (VOGLIONO_UN_SOGGETTO.has(argomento)) return true;

  if (HANNO_LETTURA_GLOBALE.has(argomento)) {
    // Doppia lettura: una domanda di quantità cade sul soggetto, una
    // domanda di elenco sulla collezione. Salvo che si parli di sé.
    return CHIEDE_UNA_QUANTITA.test(piatto) && !parlaDiMe(piatto);
  }

  return true;
}

/* ==================================================
   L'INTERPRETE
   ================================================== */

export const INTENTI = {
  SALUTO: "saluto",
  AIUTO: "aiuto",

  // Globali
  CONTA_SERIE: "conta_serie",
  CONTA_VOLUMI: "conta_volumi",
  VALORE: "valore",
  COSTO_COMPLETAMENTO: "costo_completamento",
  DA_COMPLETARE: "da_completare",
  IN_LETTURA: "in_lettura",
  CONSIGLIO: "consiglio",
  PRIMATO: "primato",
  PER_AUTORE: "per_autore",
  PER_GENERE: "per_genere",

  // Su una serie precisa
  SERIE_MANCANTI: "serie_mancanti",
  SERIE_POSSIEDO: "serie_possiedo",
  SERIE_TRAMA: "serie_trama",
  SERIE_COSTO: "serie_costo",
  SERIE_VOLUMI: "serie_volumi",
  SERIE_AUTORE: "serie_autore",
  SERIE_EDITORE: "serie_editore",
  SERIE_STATO: "serie_stato",
  SERIE_VOTO: "serie_voto",
  SERIE_INFO: "serie_info",
  SIMILE_A: "simile_a",

  FUORI_COLLEZIONE: "fuori_collezione",
  SOGGETTO_MANCANTE: "soggetto_mancante",
  NON_CAPITO: "non_capito"
};

// Argomento più soggetto danno l'intento. Averlo come tabella invece
// che come catena di `if` è ciò che permette di aggiungere un
// argomento nuovo senza rileggere tutta la funzione.
const PER_SOGGETTO = {
  mancanti: INTENTI.SERIE_MANCANTI,
  completare: INTENTI.SERIE_MANCANTI,
  trama: INTENTI.SERIE_TRAMA,
  costo: INTENTI.SERIE_COSTO,
  valore: INTENTI.SERIE_COSTO,
  volumi: INTENTI.SERIE_VOLUMI,
  autore: INTENTI.SERIE_AUTORE,
  editore: INTENTI.SERIE_EDITORE,
  stato: INTENTI.SERIE_STATO,
  voto: INTENTI.SERIE_VOTO,
  simile: INTENTI.SIMILE_A,
  possiedo: INTENTI.SERIE_POSSIEDO,
  lettura: INTENTI.SERIE_MANCANTI
};

/**
 * @param contesto  { soggetto } — l'ultima serie di cui si è parlato
 * @returns {{intento, serie?, soggettoEreditato?, genere?, quale?, testo?}}
 */
export function interpreta(domanda, { indiceTitoli, indiceAutori, contesto } = {}) {
  const piatto = appiattisci(domanda);

  if (!piatto) return { intento: INTENTI.NON_CAPITO };

  /* ---------- Convenevoli ---------- */

  if (/^(ciao|salve|buongiorno|buonasera|ehi|hey|yo)\b/.test(piatto)) {
    return { intento: INTENTI.SALUTO };
  }

  if (
    contiene(piatto, "aiuto", "cosa sai fare", "che sai fare", "come funzioni", "help") ||
    piatto === "?"
  ) {
    return { intento: INTENTI.AIUTO };
  }

  /* ---------- I tre riconoscimenti ---------- */

  const argomento = argomentoDi(piatto);
  const resto = ripulisciPerTitolo(piatto, argomento);
  const trovata = serieNominata(resto, indiceTitoli);
  const autore = autoreNominato(resto, indiceAutori);

  // Chi vince fra titolo e autore: un nome riconosciuto per parola
  // intera batte un titolo somigliante, ma non un titolo che combacia
  // quasi alla lettera.
  const serie =
    trovata && !autore?.soloIlNome && (!autore || trovata.punteggio < 0.1)
      ? trovata.serie
      : null;

  /* ---------- Il soggetto, esplicito o ripreso ---------- */

  let soggetto = serie;
  let ereditato = false;

  if (!soggetto && contesto?.soggetto && ereditaSoggetto(piatto, argomento, resto)) {
    soggetto = contesto.soggetto;
    ereditato = true;
  }

  if (soggetto && argomento && PER_SOGGETTO[argomento]) {
    return {
      intento: PER_SOGGETTO[argomento],
      serie: soggetto,
      soggettoEreditato: ereditato
    };
  }

  if (serie) {
    // "ho Vinland Saga?" è una domanda di possesso anche senza dire
    // "possiedo": la prima persona all'inizio della frase basta.
    if (/^(ho|hai|abbiamo)\b/.test(piatto)) {
      return { intento: INTENTI.SERIE_POSSIEDO, serie };
    }

    // Serie nominata senza un argomento chiaro: si dà la scheda.
    return { intento: INTENTI.SERIE_INFO, serie };
  }

  /* ---------- Argomento senza soggetto ----------
     "di cosa parla?" come primissima domanda: non è un fallimento, è
     una domanda a cui manca un pezzo, e chiederlo è meglio che tirare
     a indovinare.

     Ma solo se non è stato nominato NIENTE. Se resta del testo
     ("quanto costa berserk") il soggetto c'è, semplicemente non è in
     collezione: quello si cerca fuori, non si chiede. */

  if (
    argomento &&
    VOGLIONO_UN_SOGGETTO.has(argomento) &&
    !contesto?.soggetto &&
    resto.length < 3 &&
    !parlaDiMe(piatto)
  ) {
    return { intento: INTENTI.SOGGETTO_MANCANTE, quale: argomento };
  }

  /* ---------- Primati ---------- */

  if (contiene(piatto, "piu lunga", "piu lungo", "piu volumi")) {
    return { intento: INTENTI.PRIMATO, quale: "lunga" };
  }

  if (contiene(piatto, "vale di piu", "piu costosa", "piu cara", "costata di piu")) {
    return { intento: INTENTI.PRIMATO, quale: "valore" };
  }

  if (contiene(piatto, "piu bella", "voto piu alto", "migliore", "preferita")) {
    return { intento: INTENTI.PRIMATO, quale: "voto" };
  }

  /* ---------- Consigli ---------- */

  if (contiene(piatto, "consigli", "consiglia", "cosa leggo", "che leggo", "suggeri")) {
    return { intento: INTENTI.CONSIGLIO, genere: generoNominato(piatto) };
  }

  /* ---------- Globali ---------- */

  if (argomento === "completare" || contiene(piatto, "costa completare", "costerebbe")) {
    return { intento: INTENTI.COSTO_COMPLETAMENTO };
  }

  if (contiene(piatto, "cosa mi manca", "cosa manca", "da completare", "incomplete", "buchi")) {
    return { intento: INTENTI.DA_COMPLETARE };
  }

  if (argomento === "lettura") return { intento: INTENTI.IN_LETTURA };

  // Solo se non è rimasto nessun nome: "quanto costa berserk" parla di
  // Berserk, non del valore della collezione, e va cercato fuori.
  if ((argomento === "valore" || argomento === "costo") && resto.length < 3) {
    return { intento: INTENTI.VALORE };
  }

  if (contiene(piatto, "quante serie", "numero di serie", "quanti titoli")) {
    return { intento: INTENTI.CONTA_SERIE };
  }

  if (argomento === "volumi" || contiene(piatto, "quanti volumi", "quanti tomi")) {
    return { intento: INTENTI.CONTA_VOLUMI };
  }

  if (argomento === "mancanti") return { intento: INTENTI.DA_COMPLETARE };

  /* ---------- Genere e autore ---------- */

  const genere = generoNominato(piatto);

  if (genere) return { intento: INTENTI.PER_GENERE, genere };

  if (argomento === "autore" || autore) {
    return { intento: INTENTI.PER_AUTORE, testo: autore?.nome || resto };
  }

  /* ---------- Fuori collezione ---------- */

  if (resto.length >= 3) {
    return { intento: INTENTI.FUORI_COLLEZIONE, testo: resto, argomento };
  }

  return { intento: INTENTI.NON_CAPITO };
}
