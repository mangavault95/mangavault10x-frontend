/**
 * Il vocabolario della collezione.
 *
 * Il database parla PascalCase virgolettato (`"VolumiPosseduti"`),
 * eredità del vecchio import. Invece di trascinare quei nomi in ogni
 * componente, li traduco una volta sola qui: le pagine lavorano su
 * oggetti puliti e il giorno che una colonna cambia nome si tocca
 * questo file e basta.
 *
 * Qui vivono anche i conti che si ripetono ovunque — completamento,
 * volumi mancanti, valore — così due pagine non possono mostrare due
 * numeri diversi per la stessa cosa.
 */

/* ==================================================
   NORMALIZZAZIONE
   ================================================== */

// I generi arrivano come stringa separata da virgole, a volte con
// spazi doppi o virgole finali. Una lista pulita è più facile da
// filtrare e da mostrare come etichette.
export function separaGeneri(grezzo) {
  if (!grezzo) return [];

  return String(grezzo)
    .split(/[,;/]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

// Le colonne numeriche ora sono numeri veri lato database, ma la
// wishlist e le sessioni di lettura passano ancora stringhe: questa
// conversione difensiva evita "10" < "9".
function numero(valore) {
  if (valore === null || valore === undefined || valore === "") return null;

  const n = Number(valore);

  return Number.isFinite(n) ? n : null;
}

/**
 * I voti dati a una serie, uno per persona.
 *
 * Arrivano dal server già in ordine — prima il proprietario, poi gli
 * altri in ordine di iscrizione — e l'ordine conta: è quello in cui
 * compaiono sulla scheda, e non deve ballare da una serie all'altra.
 */
function normalizzaVoti(grezzo) {
  if (!Array.isArray(grezzo)) return [];

  return grezzo
    .map((v) => ({
      utenteId: numero(v.utenteId ?? v.utente_id),
      nickname: v.nickname || "?",
      proprietario: Boolean(v.proprietario),
      voto: numero(v.voto)
    }))
    .filter((v) => v.utenteId && v.voto);
}

/** Il voto di una persona, o quello del proprietario se non si sa chi guarda. */
export function votoDi(serie, utenteId) {
  const voti = serie?.voti || [];

  if (utenteId) {
    return voti.find((v) => v.utenteId === Number(utenteId))?.voto ?? null;
  }

  // Nessuno è entrato: la biblioteca è di chi ce l'ha, e il voto che
  // si vede in giro per il sito è il suo — come è sempre stato.
  return voti.find((v) => v.proprietario)?.voto ?? null;
}

export function normalizzaSerie(riga) {
  if (!riga) return null;

  const posseduti = numero(riga.VolumiPosseduti) ?? 0;
  const totali = numero(riga.VolumiTotali);
  const volumiItalia = numero(riga.VolumiItalia);

  return {
    id: riga.ID,
    titolo: riga.Titolo || "Senza titolo",
    autore: riga.Autore || null,
    disegnatore: riga.Disegnatore || null,
    editore: riga.Editore || null,
    generi: separaGeneri(riga.Genere),
    copertina: riga.CoverURL || null,
    trama: riga.Trama || null,

    posseduti,
    totali,
    volumiItalia,

    // I VOTI SONO DI QUALCUNO
    //
    // Era una colonna della serie (`Valutazione`), un numero solo.
    // Adesso i lettori sono due e i giudizi anche: qui arriva la lista
    // di chi ha votato, e `valutazione` — il campo che il resto del
    // sito legge da sempre — viene riempito più tardi con il voto di
    // chi sta guardando (vedi `CollezioneProvider`). Non si può fare
    // qui perché la collezione si normalizza una volta sola, mentre
    // chi guarda può cambiare senza ricaricare niente.
    voti: normalizzaVoti(riga.Voti),
    valutazione: null,

    costo: numero(riga.Costo),
    prezzoStimato: numero(riga.PrezzoStimato),
    valoreMercato: numero(riga.MarketValue),

    // `StatoSerie` è la colonna nuova; `Concluso` il vecchio flag 0/1.
    // Finché non tutte le schede sono state riviste servono entrambi.
    stato:
      riga.StatoSerie ||
      (riga.Concluso === true ? "conclusa" : riga.Concluso === false ? "in_corso" : null),

    preferito: Boolean(riga.Preferito),
    droppato: Boolean(riga.Droppato),
    dataAggiunta: riga.DataAggiunta || null,

    // Edizioni collegate: `operaId` punta alla riga "capogruppo",
    // `null` se questa riga non è collegata a nessun'altra edizione.
    // Vedi `edizioniSorelle` in `collezione.js` per trovare le altre.
    edizione: riga.Edizione || null,
    operaId: numero(riga.OperaId),

    // L'aggancio alla scheda AnimeClick, verificato a mano quando è
    // stato scritto (sql/006_animeclick.sql). Nato per contare i volumi
    // usciti in Italia, serve anche a chiedere i consigli dei lettori
    // italiani senza dover ricercare il titolo.
    animeClickId: numero(riga.AnimeClickID),

    // La riga originale resta a disposizione per la pagina Gestione,
    // che deve poter salvare i campi con i nomi che il server si aspetta.
    grezzo: riga
  };
}

export const normalizzaElenco = (righe) =>
  (Array.isArray(righe) ? righe : []).map(normalizzaSerie).filter(Boolean);

/* ==================================================
   CONTI DERIVATI
   ================================================== */

/**
 * Quanti volumi puoi davvero avere in mano oggi.
 *
 * `totali` è il totale della serie — in Giappone, quando lo sappiamo
 * da AniList — ma un lettore italiano non può comprare quello che
 * l'editore qui non ha ancora pubblicato. `volumiItalia` (da
 * AnimeClick, vedi services/providers/animeclick.js sul backend) è
 * l'ultimo volume uscito in Italia, ed è il numero giusto per dire
 * se manca qualcosa da recuperare o se sei semplicemente in pari con
 * l'editore italiano. Senza quel dato si ripiega sul totale.
 */
export function totaleDisponibile(serie) {
  return serie?.volumiItalia ?? serie?.totali ?? null;
}

/** Percentuale 0-100, oppure null se non sappiamo quanti volumi siano. */
export function completamento(serie) {
  const totale = totaleDisponibile(serie);

  if (!totale || totale <= 0) return null;

  return Math.min(100, Math.round((serie.posseduti / totale) * 100));
}

export function volumiMancanti(serie) {
  const totale = totaleDisponibile(serie);

  if (!totale) return null;

  return Math.max(0, totale - serie.posseduti);
}

/** Quanto vale lo scaffale: prezzo di copertina per volumi in casa. */
export function valoreSerie(serie) {
  if (!serie?.costo) return 0;

  return serie.costo * serie.posseduti;
}

/**
 * Fin dove si può arrivare col segnalibro.
 *
 * Non si legge un volume che non si ha in mano: il tetto è quello che
 * possiedi davvero. Per una serie conclusa e completa i due numeri
 * coincidono; per una in corso di cui hai 7 volumi su 30 usciti, il
 * tetto resta 7.
 *
 * Se i volumi posseduti non sono registrati si ripiega sul totale, e in
 * mancanza di entrambi non si mette alcun limite: meglio nessun vincolo
 * che un vincolo inventato su dati assenti.
 *
 * Sta qui e non dentro una pagina perché è il denominatore di ogni
 * conto sulle letture, e le pagine che ne fanno sono due: `/lettura`,
 * che ci limita i bottoni, e il volume aperto sul tavolino, che ci
 * scrive «sei al 4 di 7». Con due copie della regola una delle due
 * finirebbe per dire «13 di 12».
 */
export function tettoLettura(posseduti, totali) {
  if (posseduti > 0) return posseduti;
  if (totali > 0) return totali;

  return null;
}

/* ==================================================
   FORMATTAZIONE
   ================================================== */

const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2
});

export const euro = (valore) => EURO.format(Number(valore) || 0);

export const numeroIt = (valore) =>
  new Intl.NumberFormat("it-IT").format(Number(valore) || 0);

/**
 * Un voto come si scrive in italiano: 2.5 diventa «2,5».
 *
 * Gli interi restano interi — «4», non «4,0»: metà dei voti non ha
 * mezza stella, e uno zero decimale su ognuno farebbe sembrare la
 * pagina un foglio di calcolo.
 */
export function votoIt(voto) {
  if (voto === null || voto === undefined) return "";

  return String(voto).replace(".", ",");
}

export function dataIt(valore) {
  if (!valore) return null;

  const d = new Date(valore);

  if (Number.isNaN(d.getTime())) return null;

  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/** "3 volumi" / "1 volume": il plurale sbagliato si nota subito. */
export const plurale = (n, singolare, plurale_) =>
  `${numeroIt(n)} ${n === 1 ? singolare : plurale_}`;

export const ETICHETTE_STATO = {
  conclusa: "Conclusa",
  in_corso: "In corso",
  sospesa: "Sospesa",
  annullata: "Annullata"
};

/* ==================================================
   FILTRI
   ================================================== */

/**
 * I filtri sono dati, non `if` sparsi: la stessa lista genera i
 * bottoni, il valore nell'indirizzo e la selezione. Aggiungerne uno
 * significa aggiungere una riga qui.
 */
export const FILTRI = [
  {
    id: "tutte",
    etichetta: "Tutte",
    test: () => true
  },
  {
    id: "in-corso",
    etichetta: "In corso",
    descrizione: "Serie non ancora concluse dall'editore",
    test: (s) => s.stato === "in_corso"
  },
  {
    id: "concluse",
    etichetta: "Concluse",
    descrizione: "L'editore ha finito di pubblicarle",
    test: (s) => s.stato === "conclusa"
  },
  {
    id: "sospese",
    etichetta: "Sospese",
    descrizione: "In pausa dal lato dell'editore",
    test: (s) => s.stato === "sospesa"
  },
  {
    id: "annullate",
    etichetta: "Annullate",
    descrizione: "Interrotte prima della fine",
    test: (s) => s.stato === "annullata"
  },
  {
    id: "brevi",
    etichetta: "Serie brevi",
    descrizione: "Da 2 a 5 volumi",
    test: (s) => s.totali >= 2 && s.totali <= 5
  },
  {
    id: "autoconclusive",
    etichetta: "Autoconclusive",
    descrizione: "Un volume unico",
    test: (s) => s.totali === 1
  },
  {
    id: "preferiti",
    etichetta: "Preferiti",
    test: (s) => s.preferito
  }
];

export const filtroPerId = (id) =>
  FILTRI.find((f) => f.id === id) || FILTRI[0];

/* ==================================================
   ORDINAMENTI
   ================================================== */

// `localeCompare` con locale italiano: senza, "Ávila" finisce in fondo
// all'alfabeto e i titoli accentati si ordinano male.
const perTitolo = (a, b) => a.titolo.localeCompare(b.titolo, "it");

// I campi vuoti vanno sempre in fondo, in qualsiasi ordinamento:
// una scheda senza voto non è una scheda con voto zero.
function decrescenteConVuotiInFondo(estrai) {
  return (a, b) => {
    const va = estrai(a);
    const vb = estrai(b);

    if (va === null && vb === null) return perTitolo(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;

    return vb - va || perTitolo(a, b);
  };
}

export const ORDINAMENTI = [
  { id: "titolo", etichetta: "Titolo", confronta: perTitolo },
  {
    id: "recenti",
    etichetta: "Aggiunte di recente",
    confronta: decrescenteConVuotiInFondo((s) =>
      s.dataAggiunta ? new Date(s.dataAggiunta).getTime() : null
    )
  },
  {
    id: "voto",
    etichetta: "Voto",
    confronta: decrescenteConVuotiInFondo((s) => s.valutazione)
  },
  {
    id: "volumi",
    etichetta: "Volumi posseduti",
    confronta: decrescenteConVuotiInFondo((s) => s.posseduti)
  },
  {
    id: "valore",
    etichetta: "Valore",
    confronta: decrescenteConVuotiInFondo((s) => valoreSerie(s) || null)
  },
  {
    id: "completamento",
    etichetta: "Completamento",
    confronta: decrescenteConVuotiInFondo(completamento)
  }
];

export const ordinamentoPerId = (id) =>
  ORDINAMENTI.find((o) => o.id === id) || ORDINAMENTI[0];
