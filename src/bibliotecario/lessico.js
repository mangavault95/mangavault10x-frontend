/**
 * Le parole: cosa significa cosa.
 *
 * Sta separato dalla logica perché è l'unica parte che si tocca spesso.
 * Quando il bibliotecario non capisce una domanda, nove volte su dieci
 * la correzione è una parola in più qui dentro, non una riga di codice
 * là fuori.
 *
 * Le chiavi sono RADICI, non parole intere: nessuno chiede "di genere
 * romantico", chiede "romantici", "romantiche", "qualcosa di
 * romantico". Fermarsi a `romantic` le prende tutte senza elencare
 * plurali e femminili uno per uno.
 */

/* ==================================================
   GENERI — italiano verso l'inglese di AniList
   ================================================== */

export const GENERI = {
  horror: "Horror",
  paura: "Horror",
  spavent: "Horror",
  azione: "Action",
  avventur: "Adventure",
  commedi: "Comedy",
  comic: "Comedy",
  divertent: "Comedy",
  drammatic: "Drama",
  dramma: "Drama",
  romantic: "Romance",
  amore: "Romance",
  sentimental: "Romance",
  fantasy: "Fantasy",
  fantascien: "Sci-Fi",
  sportiv: "Sports",
  sport: "Sports",
  mister: "Mystery",
  giallo: "Mystery",
  poliziesc: "Mystery",
  psicologic: "Psychological",
  soprannatural: "Supernatural",
  quotidian: "Slice of Life",
  storic: "Historical",
  musical: "Music",
  gastronomic: "Gourmet",
  culinari: "Gourmet",
  ecchi: "Ecchi",
  mecha: "Mecha",
  robot: "Mecha",
  thriller: "Thriller"
};

/* ==================================================
   ARGOMENTI — di cosa parla la domanda
   ==================================================

   Questa è la parte che rende il bibliotecario diverso da una
   ricerca. Prima esisteva un unico "parlami di X" che sputava una
   scheda con tutto dentro; ora la domanda dice *quale* cosa vuoi
   sapere, e la risposta risponde a quella.

   L'ordine conta: si prova dal più specifico al più generico, perché
   "quanto costa finire X" parla di completamento, non di prezzo di
   copertina, e le due frasi condividono la parola "costa".
*/

export const ARGOMENTI = [
  {
    id: "mancanti",
    // "quanto manca", "cosa mi manca di", "quanti me ne mancano"
    parole: ["manca", "mancan", "mancant", "resta", "restan", "rimane", "rimangon"]
  },
  {
    id: "completare",
    parole: ["completare", "finire", "chiudere", "terminare"]
  },
  {
    id: "trama",
    parole: [
      "trama",
      "di cosa parla",
      "di che parla",
      "che parla",
      "di cosa tratta",
      "tratta",
      "storia",
      "riassunto",
      "sinossi",
      "argomento"
    ]
  },
  {
    id: "costo",
    parole: ["costa", "costo", "prezzo", "speso", "spesa", "euro", "pagato", "pagata", "pagare"]
  },
  {
    id: "valore",
    parole: ["vale", "valore", "quotazione"]
  },
  {
    id: "volumi",
    parole: ["quanti volumi", "quanti tomi", "quante uscite", "lunghezza", "quanto e lunga", "quanto e lungo"]
  },
  {
    id: "autore",
    // Voci sciolte oltre alle frasi intere: "chi l'ha scritto" dopo la
    // normalizzazione diventa "chi l ha scritto", che non contiene
    // "chi ha scritto". Cercare anche il solo participio le prende
    // tutte senza inseguire ogni variante di apostrofo e pronome.
    parole: [
      "scritto",
      "scrive",
      "disegna",
      "disegnato",
      "autore",
      "autrice",
      "mangaka",
      "disegnatore",
      "disegnatrice"
    ]
  },
  {
    id: "editore",
    parole: ["editore", "chi pubblica", "chi la pubblica", "chi lo pubblica", "casa editrice", "edizione"]
  },
  {
    id: "stato",
    parole: ["e finita", "e conclusa", "e finito", "e concluso", "e in corso", "esce ancora", "conclusa", "concluso", "stato"]
  },
  {
    id: "voto",
    parole: ["voto", "quanto l ho votata", "che voto", "valutazione", "come l ho trovata"]
  },
  {
    id: "simile",
    parole: [
      "simile",
      "simili",
      "somiglia",
      "assomiglia",
      "stesso stile",
      "sulla falsariga",
      "tipo",
      "come ",
      "sullo stesso genere",
      "qualcosa del genere"
    ]
  },
  {
    id: "possiedo",
    parole: ["ce l ho", "ce lho", "posseggo", "possiedo", "in collezione", "gia comprato", "gia preso"]
  },
  {
    id: "lettura",
    parole: ["sto leggendo", "in lettura", "dove ero", "dove sono arrivato", "a che punto"]
  }
];

/* ==================================================
   RIEMPITIVI
   ==================================================

   Le parole che compaiono in ogni domanda e non aiutano a riconoscere
   un titolo. Toglierle prima del confronto evita che "quanti volumi mi
   mancano di monster" somigli a una serie che si chiama "Volumi".
*/

export const RIEMPITIVI = new Set(
  `quanti quante quanto quanta quali quale qual che cosa cos come dove quando perche
   chi cui l c ce n
   mi ti ci vi ne lo la le li gli il un uno una dei delle degli di da del della
   a al alla ai alle in nel nella su sul sulla per con tra fra e o ma se
   ho hai ha abbiamo avete hanno sono sei siamo siete essere stato stata
   volume volumi serie manga fumetto fumetti tomo tomi uscita uscite opera
   mancano manca mancante mancanti resta restano rimane rimangono
   possiedo posseduto comprato preso letto leggo leggendo leggere compro comprare
   parlami dimmi raccontami spiegami sai conosci info informazioni scheda
   collezione libreria scaffale casa
   ancora tutto tutti tutte gia poi solo anche piu meno molto tanto
   qualcosa qualche roba niente nulla altro altra altri altre nuovo nuova
   sto stai sta stiamo state stanno adesso ora oggi
   mio mia miei mie questo questa quello quella
   trama storia riassunto sinossi argomento tratta parla
   costa costo prezzo speso spesa euro vale valore
   autore autrice mangaka disegnatore disegnatrice editore edizione
   pubblica pubblicato pubblicata scritto scritta scrive scriveva
   disegna disegnato disegnata realizzato realizzata
   simile simili somiglia assomiglia stile genere
   finita finito conclusa concluso corso
   voto valutazione dato dai messo assegnato giudicato trovata trovato
   per favore grazie ciao ehi senti scusa allora ok`
    .split(/\s+/)
    .filter(Boolean)
);

/* ==================================================
   RIFERIMENTI AL DISCORSO
   ==================================================

   Le parole con cui si continua a parlare della stessa cosa senza
   ripeterne il nome. Riconoscerle è ciò che distingue un bibliotecario
   da un motore di ricerca: "quanto costa?" dopo "parlami di Vagabond"
   deve parlare ancora di Vagabond.
*/

export const RIFERIMENTI = [
  "lo",
  "la",
  "li",
  "le",
  "ne",
  "quello",
  "quella",
  "questo",
  "questa",
  "quest opera",
  "questa serie",
  "quella serie",
  "questo manga",
  "quel manga",
  "sua",
  "suo",
  "sue",
  "suoi",

  // La terza persona singolare. In italiano la distinzione è netta e
  // gratis: "quanti volumi HA" parla della serie, "quanti volumi HO"
  // parla della mia collezione. Stessa domanda, due lettere di
  // differenza, due risposte completamente diverse — e la lingua le
  // separa già per noi.
  "ha",
  "esce",
  "usciva",
  "costa",
  "vale",
  "parla",
  "tratta",
  "finisce"
];
