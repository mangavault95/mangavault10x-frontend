/**
 * Kachinuki-sen — 勝ち抜き戦, "torneo a eliminazione".
 *
 * Due serie alla volta, si sceglie quella che si preferisce, chi vince
 * passa. Trentadue serie fanno trentuno scelte e un vincitore.
 *
 * Qui dentro c'è tutto il gioco: i temi, il sorteggio, il tabellone e
 * come si legge una partita finita. Non c'è React — questo file è
 * fatto di dati e di funzioni pure — perché la stessa partita deve
 * poter essere ricostruita da una copia messa da parte
 * nell'archiviazione locale, senza che nessun componente sia montato.
 *
 * LA PARTITA SI GIOCA TUTTA QUI, NEL BROWSER, e va al server una volta
 * sola quando è finita. Una richiesta per ogni scelta vorrebbe dire
 * aspettare Render trentuno volte, e questo è un gioco che si fa a
 * raffica. Il server poi non si fida: ricostruisce il tabellone da capo
 * prima di scriverlo (vedi services/tornei.js sul backend).
 */

import { CATEGORIE } from "./serie";
import { generiDiSerie } from "./generi";

/**
 * Quante serie si possono mandare in gara.
 *
 * Solo potenze di due: un tabellone che non lo è avrebbe bisogno di
 * qualcuno che passa il turno senza giocare, e "hai vinto perché non
 * avevi avversari" non è una cosa che si vuole leggere in cronologia.
 * L'elenco combacia col vincolo `taglia` in sql/010_kachinuki.sql.
 */
export const TAGLIE = [32, 64, 128];

/* ==================================================
   I TEMI
   ================================================== */

/**
 * Il tema non si sceglie: lo sorteggia il gioco.
 *
 * È la regola che tiene in piedi tutto il resto. Potendo scegliere si
 * finirebbe per giocare sempre "il manga migliore", che è la domanda a
 * cui si sa già rispondere; sorteggiandolo tocca decidere quale delle
 * due ha i disegni più belli, e quella è una partita diversa ogni
 * volta anche con le stesse serie in campo.
 *
 * `tra` restringe chi può scendere in campo. Senza, giocano tutte.
 */
const TEMI_FISSI = [
  {
    id: "manga",
    etichetta: "Il manga migliore",
    domanda: "Quale dei due è il manga migliore?"
  },
  {
    id: "disegni",
    etichetta: "Disegni migliori",
    domanda: "Quale dei due ha i disegni più belli?"
  },
  {
    id: "copertine",
    etichetta: "Copertine migliori",
    domanda: "Quale copertina è più bella?"
  },
  {
    id: "storia",
    etichetta: "Storia più innovativa",
    domanda: "Quale delle due storie è più originale?"
  },
  {
    id: "personaggi",
    etichetta: "Personaggi migliori",
    domanda: "Quale dei due ha i personaggi migliori?"
  },
  {
    id: "rilettura",
    etichetta: "Da rileggere per primo",
    domanda: "Quale dei due rileggeresti stasera?"
  },
  {
    id: "regalo",
    etichetta: "Da regalare",
    domanda: "Quale regaleresti a chi non ha mai letto un manga?"
  },
  {
    id: "colpo",
    etichetta: "Quello che ti è rimasto dentro",
    domanda: "Quale dei due ti ha colpito di più?"
  },
  {
    id: "vetrina",
    etichetta: "Da tenere in bella vista",
    domanda: "Quale dei due terresti in vetrina?"
  },
  {
    id: "pianto",
    etichetta: "Il più commovente",
    domanda: "Quale dei due ti ha commosso di più?"
  }
];

const TEMI_FILTRATI = [
  {
    id: "finale",
    etichetta: "Il finale migliore",
    domanda: "Quale dei due finisce meglio?",
    tra: (s) => s.stato === "conclusa"
  },
  {
    id: "attesa",
    etichetta: "Quella che aspetti di più",
    domanda: "Di quale aspetti con più impazienza il prossimo volume?",
    tra: (s) => s.stato === "in_corso"
  },
  {
    id: "breve",
    etichetta: "La serie breve migliore",
    domanda: "Quale delle due dice di più in pochi volumi?",
    tra: (s) => s.totali >= 1 && s.totali <= 5
  },
  {
    id: "lunga",
    etichetta: "La serie lunga migliore",
    domanda: "Per quale delle due rifaresti tutta la maratona?",
    tra: (s) => s.totali >= 20
  },
  {
    id: "classico",
    etichetta: "Il classico migliore",
    domanda: "Quale dei due classici regge meglio oggi?",
    tra: (s) => s.anno && s.anno < 2000
  },
  {
    id: "recente",
    etichetta: "La novità migliore",
    domanda: "Quale delle due uscite recenti è la migliore?",
    tra: (s) => s.anno && s.anno >= 2018
  },
  {
    id: "preferiti",
    etichetta: "Fra i preferiti",
    domanda: "Quale dei due preferiti preferisci?",
    tra: (s) => s.preferito
  }
];

/**
 * Un tema per ogni pubblico: "Il miglior seinen", "Il miglior shojo".
 *
 * Nascono dalla colonna `Categoria`, che è il motivo per cui quella
 * colonna esiste. `adulto` resta fuori: non è un pubblico ma
 * l'avvertimento che AnimeClick mette quando non ne dichiara nessuno,
 * e "il miglior pubblico adulto" non è una domanda.
 */
const TEMI_CATEGORIA = Object.keys(CATEGORIE)
  .filter((c) => c !== "adulto")
  .map((categoria) => ({
    id: `categoria-${categoria}`,
    etichetta: `Il miglior ${CATEGORIE[categoria].etichetta.toLowerCase()}`,
    domanda: `Quale dei due è il miglior ${CATEGORIE[categoria].etichetta.toLowerCase()}?`,
    tra: (s) => s.categoria === categoria
  }));

/**
 * I generi, scritti come si direbbero a voce.
 *
 * La colonna `Genere` parla il vocabolario di AniList, cioè inglese, e
 * "Il miglior Slice of Life" in mezzo a una frase italiana stona.
 * Tradurre a macchina non si può — non è un dizionario, è un modo di
 * dire per ognuno — quindi la lista è scritta a mano. Un genere che
 * non compare qui semplicemente non diventa un tema: meglio un tema in
 * meno che una domanda scritta male.
 */
const TEMI_GENERE = {
  Action: ["Il miglior manga d'azione", "Quale dei due mena meglio?"],
  Adventure: ["La miglior avventura", "Con quale dei due partiresti?"],
  Comedy: ["Il più divertente", "Quale dei due fa ridere di più?"],
  Drama: ["Il dramma migliore", "Quale dei due drammi è il migliore?"],
  Fantasy: ["Il miglior fantasy", "Quale dei due mondi è più bello?"],
  Horror: ["Il più spaventoso", "Quale dei due fa più paura?"],
  Mystery: ["Il miglior mistero", "Quale dei due misteri è più bello?"],
  Psychological: ["Il più psicologico", "Quale dei due ti entra più in testa?"],
  Romance: ["La miglior storia d'amore", "Quale delle due storie d'amore è la migliore?"],
  "Sci-Fi": ["La miglior fantascienza", "Quale dei due immagina meglio il futuro?"],
  "Slice of Life": ["Il miglior spaccato di vita", "In quale dei due vivresti?"],
  Sports: ["Il miglior manga sportivo", "Quale dei due sportivi è il migliore?"],
  Supernatural: ["Il miglior soprannaturale", "Quale dei due soprannaturali è il migliore?"],
  Thriller: ["Il miglior thriller", "Quale dei due tiene di più col fiato sospeso?"],
  Music: ["Il miglior manga sulla musica", "Quale dei due suona meglio?"],
  Ecchi: ["Il miglior ecchi", "Quale dei due la sa più lunga?"],
  School: ["La miglior scuola", "In quale delle due scuole ti iscriveresti?"],
  Suspense: ["Il più teso", "Quale dei due tiene più sulle spine?"],
  "Award Winning": ["Fra i premiati", "Quale dei due premi era meritato di più?"],
  "Girls Love": ["Il miglior girls love", "Quale dei due è il migliore?"],
  "Gender Bender": ["Il miglior scambio di ruoli", "Quale dei due gioca meglio con i ruoli?"]
};

const temiDiGenere = () =>
  Object.entries(TEMI_GENERE).map(([genere, [etichetta, domanda]]) => ({
    id: `genere-${genere.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    etichetta,
    domanda,
    tra: (s) => generiDiSerie(s).includes(genere)
  }));

/** Tutti i temi possibili, prima di guardare cosa c'è in collezione. */
export const TEMI = [...TEMI_FISSI, ...TEMI_FILTRATI, ...TEMI_CATEGORIA, ...temiDiGenere()];

/* ==================================================
   CHI PUÒ GIOCARE
   ================================================== */

/**
 * Le serie che possono scendere in campo.
 *
 * Una sola riga per opera: due edizioni della stessa cosa — Berserk e
 * Berserk Deluxe — sono lo stesso manga, e vederle una contro l'altra
 * al primo turno vorrebbe dire che la domanda del gioco non è più
 * quale preferisci ma quale scaffale hai comprato. Vince chi ha più
 * volumi in casa, cioè l'edizione che stai davvero leggendo.
 */
export function candidati(serie) {
  const perOpera = new Map();

  for (const s of serie || []) {
    if (!s?.id) continue;

    const opera = s.operaId ?? s.id;
    const gia = perOpera.get(opera);

    if (!gia || (s.posseduti ?? 0) > (gia.posseduti ?? 0)) perOpera.set(opera, s);
  }

  return [...perOpera.values()];
}

/** I temi che con questa collezione hanno abbastanza serie per giocare. */
export function temiPossibili(serie, taglia) {
  const campo = candidati(serie);

  return TEMI.filter((tema) => {
    const quante = tema.tra ? campo.filter(tema.tra).length : campo.length;

    return quante >= taglia;
  });
}

/**
 * Il sorteggio.
 *
 * `escluso` è il tema dell'ultima partita: giocare due volte di fila la
 * stessa domanda con un sorteggio da venti temi capita, e sembra che il
 * sorteggio non funzioni. Vale solo se resta dell'altro fra cui pescare.
 */
export function sorteggiaTema(serie, taglia, escluso = null) {
  const possibili = temiPossibili(serie, taglia);

  if (possibili.length === 0) return null;

  const altri = possibili.filter((t) => t.id !== escluso);
  const fra = altri.length ? altri : possibili;

  return fra[Math.floor(Math.random() * fra.length)];
}

/* ==================================================
   IL TABELLONE
   ================================================== */

/** Fisher-Yates su una copia: l'elenco di partenza non si tocca. */
function mescola(elenco) {
  const copia = [...elenco];

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

export const turniPer = (taglia) => Math.log2(taglia);

/**
 * Come si chiama il turno in cui sono rimasti in `quanti`.
 *
 * I nomi sono quelli del calcio perché sono quelli che si capiscono
 * senza spiegazione: "ottavi" dice quante partite mancano meglio di
 * "turno 4 di 7".
 */
export function nomeTurno(quanti) {
  const nomi = {
    2: "Finale",
    4: "Semifinali",
    8: "Quarti",
    16: "Ottavi",
    32: "Sedicesimi",
    64: "Trentaduesimi",
    128: "Sessantaquattresimi"
  };

  return nomi[quanti] || `Turno da ${quanti}`;
}

/**
 * Una partita nuova, già mescolata.
 *
 * Il tabellone nasce intero — tutte le sfide di tutti i turni — con i
 * posti dei turni successivi ancora vuoti: si riempiono man mano che
 * qualcuno passa. Averlo intero fin da subito è quello che permette di
 * dire "sfida 12 di 31" al primo click, e di rimettere in piedi la
 * partita da una copia salvata senza doverla ricostruire.
 */
export function creaPartita({ serie, taglia, tema }) {
  const campo = tema.tra ? candidati(serie).filter(tema.tra) : candidati(serie);

  if (campo.length < taglia) return null;

  const scelte = mescola(campo)
    .slice(0, taglia)
    .map((s) => ({ id: s.id, titolo: s.titolo, copertina: s.copertina }));

  const sfide = [];

  for (let turno = 1, quante = taglia / 2; quante >= 1; turno++, quante /= 2) {
    for (let posizione = 0; posizione < quante; posizione++) {
      sfide.push({
        turno,
        posizione,
        // Al primo turno si incontrano i vicini di sorteggio: 0 contro
        // 1, 2 contro 3. Dopo, i posti aspettano chi passa.
        casaId: turno === 1 ? scelte[posizione * 2].id : null,
        ospiteId: turno === 1 ? scelte[posizione * 2 + 1].id : null,
        vincitoreId: null
      });
    }
  }

  return {
    tema: tema.id,
    temaEtichetta: tema.etichetta,
    domanda: tema.domanda,
    taglia,
    serie: scelte,
    sfide,
    indice: 0,
    iniziataIl: new Date().toISOString()
  };
}

const indiceDi = (sfide, turno, posizione) =>
  sfide.findIndex((s) => s.turno === turno && s.posizione === posizione);

/** La sfida da giocare adesso, o null se la partita è finita. */
export const sfidaCorrente = (partita) => partita?.sfide[partita.indice] || null;

export const finita = (partita) => Boolean(partita) && partita.indice >= partita.sfide.length;

export const serieDi = (partita, id) =>
  partita?.serie.find((s) => s.id === id) || null;

/** Chi ha vinto tutto, quando è finita. */
export const vincitore = (partita) =>
  finita(partita) ? serieDi(partita, partita.sfide[partita.sfide.length - 1].vincitoreId) : null;

/**
 * Sceglie chi passa, e lo manda al turno dopo.
 *
 * Restituisce una partita nuova invece di modificare quella data: è
 * quello che permette a `annulla` di esistere e a React di accorgersi
 * che qualcosa è cambiato.
 */
export function scegli(partita, idVincitore) {
  const corrente = sfidaCorrente(partita);

  if (!corrente) return partita;
  if (idVincitore !== corrente.casaId && idVincitore !== corrente.ospiteId) return partita;

  const sfide = partita.sfide.map((s) => ({ ...s }));

  sfide[partita.indice].vincitoreId = idVincitore;

  // Chi vince la sfida (t, p) gioca la (t + 1, p / 2): a sinistra se
  // veniva da una posizione pari, a destra se dispari.
  const dopo = indiceDi(sfide, corrente.turno + 1, Math.floor(corrente.posizione / 2));

  if (dopo >= 0) {
    sfide[dopo][corrente.posizione % 2 === 0 ? "casaId" : "ospiteId"] = idVincitore;
  }

  return { ...partita, sfide, indice: partita.indice + 1 };
}

/**
 * Torna indietro di una scelta.
 *
 * Serve perché il gioco si fa a raffica e il dito parte da solo: senza,
 * un tocco sbagliato al primo turno resta scritto per sempre in una
 * cronologia che dovrebbe dire cosa preferisci davvero.
 */
export function annulla(partita) {
  if (!partita || partita.indice === 0) return partita;

  const indice = partita.indice - 1;
  const sfide = partita.sfide.map((s) => ({ ...s }));
  const tolta = sfide[indice];

  // Il posto che quel vincitore aveva preso al turno dopo torna vuoto.
  // Non c'è nulla da disfare oltre: si torna indietro di una sola
  // scelta, e quella sfida più avanti non è ancora stata giocata.
  const dopo = indiceDi(sfide, tolta.turno + 1, Math.floor(tolta.posizione / 2));

  if (dopo >= 0) sfide[dopo][tolta.posizione % 2 === 0 ? "casaId" : "ospiteId"] = null;

  sfide[indice].vincitoreId = null;

  return { ...partita, sfide, indice };
}

/* ==================================================
   LEGGERE UNA PARTITA
   ================================================== */

/** Le sfide raggruppate per turno, dal primo alla finale. */
export function perTurno(sfide, taglia) {
  const turni = [];

  for (let turno = 1; turno <= turniPer(taglia); turno++) {
    const dentro = sfide.filter((s) => s.turno === turno);

    turni.push({
      turno,
      nome: nomeTurno(taglia / 2 ** (turno - 1)),
      sfide: dentro
    });
  }

  return turni;
}

/**
 * La strada di una serie: tutte le sfide che ha giocato, in ordine.
 *
 * È la risposta alla domanda che uno si fa guardando un vincitore —
 * "chi ha battuto per arrivare fin lì?" — e per il vincitore sono
 * cinque righe su trentuno: il resto del tabellone è la storia degli
 * altri, e sta più giù.
 */
export function strada(sfide, id) {
  return sfide
    .filter((s) => s.casaId === id || s.ospiteId === id)
    .sort((a, b) => a.turno - b.turno);
}

/* ==================================================
   LA COPIA MESSA DA PARTE
   ================================================== */

/**
 * Una partita da centoventotto serie sono centoventisette scelte: chi
 * la comincia in metropolitana e chiude la scheda non deve ritrovarsi
 * da capo. Sta nell'archiviazione locale e non sul server perché una
 * partita a metà non è ancora niente — diventa un fatto solo quando
 * qualcuno ha vinto.
 */
const CHIAVE = "mangavault:kachinuki";

export function partitaMessaDaParte() {
  try {
    const grezzo = localStorage.getItem(CHIAVE);

    if (!grezzo) return null;

    const partita = JSON.parse(grezzo);

    // Una forma che non torna è roba di una versione precedente del
    // gioco: si butta invece di provare a farla funzionare.
    const sensata =
      TAGLIE.includes(partita?.taglia) &&
      partita.serie?.length === partita.taglia &&
      partita.sfide?.length === partita.taglia - 1 &&
      partita.indice >= 0 &&
      partita.indice < partita.sfide.length;

    return sensata ? partita : null;
  } catch {
    return null;
  }
}

export function mettiDaParte(partita) {
  try {
    // Una partita finita non si mette da parte: è già andata al server,
    // e ritrovarsela da riprendere all'apertura successiva sarebbe un
    // invito a rigiocare la finale che si è appena giocata.
    if (!partita || finita(partita)) localStorage.removeItem(CHIAVE);
    else localStorage.setItem(CHIAVE, JSON.stringify(partita));
  } catch {
    /* archiviazione non disponibile: la partita dura quanto la scheda */
  }
}

/* ==================================================
   VERSO IL SERVER
   ================================================== */

/** Quello che si manda a salvare: il verbale, senza lo stato del gioco. */
export function corpoDaPartita(partita) {
  return {
    tema: partita.tema,
    temaEtichetta: partita.temaEtichetta,
    taglia: partita.taglia,
    serie: partita.serie,
    sfide: partita.sfide.map(({ turno, posizione, casaId, ospiteId, vincitoreId }) => ({
      turno,
      posizione,
      casaId,
      ospiteId,
      vincitoreId
    }))
  };
}

/**
 * L'albo d'oro: quante volte ogni serie ha vinto un torneo.
 *
 * Si ricava dalle partite già in mano — quelle della cronologia — senza
 * chiedere niente in più al server: di ogni partita interessa solo chi
 * l'ha vinta, e quello c'è già.
 */
export function albo(partite) {
  const conteggi = new Map();

  for (const p of partite || []) {
    if (!p?.vincitore?.id) continue;

    const gia = conteggi.get(p.vincitore.id);

    if (gia) gia.vittorie++;
    else conteggi.set(p.vincitore.id, { ...p.vincitore, vittorie: 1 });
  }

  return [...conteggi.values()].sort(
    (a, b) => b.vittorie - a.vittorie || a.titolo.localeCompare(b.titolo, "it")
  );
}
