/**
 * Icone vettoriali, una famiglia sola.
 *
 * Prima l'interfaccia usava caratteri come "☰" e emoji: cambiano
 * aspetto da un sistema all'altro, non si possono colorare con i
 * token e non scalano bene. Questi tracciati hanno tutti lo stesso
 * spessore (1.6) e le stesse terminazioni arrotondate.
 */

const TRACCIATI = {
  shelf: "M4 19V5m5 14V5m5 14V5m5 14V5M3 19h18",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  bookmark: "M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z",
  star: "M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.9l6-.8z",
  chart: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  /**
   * Una striscia di pellicola: il marchio della videoteca.
   *
   * I fori di trascinamento sono trattini e non quadrati veri —
   * a venti pixel un quadratino da due unità con il bordo spesso 1,6
   * diventa una macchia piena, mentre il trattino resta un foro.
   */
  pellicola:
    "M4 5h16v14H4zM7.6 5v14M16.4 5v14M4 8.6h3.6M4 12h3.6M4 15.4h3.6M16.4 8.6H20M16.4 12H20M16.4 15.4H20",
  // Il calendario delle uscite: il mese, con i due anelli in cima.
  calendario: "M4 6h16v14H4zM4 10h16M8.5 4v3.6M15.5 4v3.6",
  close: "M6 6l12 12M18 6L6 18",
  back: "M15 19l-7-7 7-7",
  plus: "M12 5v14M5 12h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  // Una porta socchiusa: l'ingresso della biblioteca
  porta: "M4 20h6V4l10 2v13l-10 2V4M13 12h.01",
  /**
   * 本 — il kanji di «libro», stilizzato.
   *
   * Segna la biblioteca: la porta d'ottone che c'era prima diceva
   * «uscita», che è il contrario di dove porta. Fra i modi di scrivere
   * «libreria» in giapponese questo è l'unico che regge ventiquattro
   * pixel — 書 e 館 hanno dieci e sedici tratti e a questa misura
   * diventano una macchia, mentre 本 ne ha cinque e si legge anche
   * grande come un'unghia.
   *
   * I due tratti obliqui sono curvi e non dritti: sono pennellate, e un
   * kanji fatto di segmenti geometrici si riconosce ma sembra un
   * diagramma. Le altre tre aste restano dritte, come nella scrittura.
   *
   * Quanto si aprono non è estetica, è leggibilità: con una sferzata
   * stretta restavano dentro il tratto dell'asta verticale — che è
   * spesso 1,6 come tutti gli altri — e la metà alta del carattere
   * diventava una macchia piena. Aprendoli si staccano dopo tre unità, e
   * la traversina corta trova due unità di aria per parte invece di
   * annegarci dentro. A venti pixel un'unità è un pixel, e quei due
   * pixel sono la differenza fra un kanji e uno scarabocchio.
   */
  kanjiLibro: "M3.8 7.6h16.4M12 3v18M12 8.2Q8 12.6 3.4 19.8M12 8.2Q16 12.6 20.6 19.8M9 16.4h6",
  /**
   * Il portale: un torii le cui colonne sono due volumi in piedi.
   *
   * È il marchio di MangaVault. L'idea di partenza del sito è entrare da
   * una porta e trovarsi in un posto (vedi `ROADMAP.md`), e un torii è
   * l'unica porta al mondo che non ha ante e non si apre: segna un
   * passaggio, non lo chiude. Fatta di libri, dice anche di che passaggio
   * si tratta.
   *
   * QUI I LIBRI NON SI VEDONO, ED È VOLUTO. Il marchio esiste in due
   * misure: questa e quella grande sull'insegna della stanza
   * (`creaTexturaInsegna` in `tre/bancone.js`), dove le colonne hanno le
   * nervature del dorso e in mezzo si intravedono le pagine. A ventiquattro
   * unità quei dettagli sono mezzo pixel l'uno e diventano sporco: resta
   * la sagoma, che è la parte che si riconosce da lontano.
   *
   * L'architrave è curva verso l'alto (`Q`) e non dritta, perché è così
   * che è fatto il kasagi di un torii vero — ed è l'unico tratto che
   * distingue questa forma da una lettera greca.
   */
  portale: "M2.6 6.5Q12 4.4 21.4 6.5M5.4 9.9h13.2M7.7 6.8V20M16.3 6.8V20M4.4 20h15.2",
  /**
   * Un tabellone a eliminazione: quattro rami che diventano uno.
   *
   * Non una coppa, che direbbe "classifica" — il Kachinuki-sen non ha
   * punteggi né primati, ha degli scontri — e nemmeno due spade
   * incrociate, che a ventiquattro pixel sono una X. La forma del
   * tabellone si riconosce anche da chi non ha mai visto il gioco: due
   * cose entrano, una esce.
   */
  torneo: "M3 5h5v6H3M8 8h5M3 13h5v6H3M8 16h5M13 8v8M13 12h8",
  /**
   * I tre puntini: «qui c'è dell'altro».
   *
   * Sono cerchi chiusi e non tre trattini da un centesimo di unità
   * (`M12 6h.01`): a spessore 1,6 quel trattino esce come un punto da
   * un pixel e mezzo, che a sedici pixel di icona sparisce. Vanno
   * disegnati con `piena`, altrimenti restano tre anellini.
   *
   * In verticale e non in orizzontale, perché il menu si apre sotto: i
   * puntini indicano la direzione in cui sta la roba che nascondono.
   */
  puntini:
    "M12 5.1a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 1 0 0-2.7zM12 10.65a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 1 0 0-2.7zM12 16.2a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 1 0 0-2.7z",
  // Un cartellino prezzo: i desideri sono da comprare, non da segnare
  // come preferiti — per questo non riusa "star".
  cartellino: "M20.6 12.3 12.7 20.2a2 2 0 0 1-2.8 0l-6.1-6.1a2 2 0 0 1 0-2.8L11.7 3.3a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v5.3a2 2 0 0 1-.4 1.3ZM16.5 7.5h.01",

  /**
   * Il Cineforum: due fumetti sovrapposti.
   *
   * Non una pellicola — quella è già la videoteca, e due strisce di
   * pellicola diverse in barra sarebbero indistinguibili a venti
   * pixel. Non delle teste in fila: dicono «utenti», che è una parola
   * da pannello di controllo. Due fumetti dicono la cosa giusta, cioè
   * che lì dentro si parla.
   *
   * Quello dietro è tagliato dal davanti invece di essere disegnato
   * intero: due rettangoli arrotondati completi si leggono come una
   * finestra con l'ombra.
   */
  cineforum:
    "M8.5 4h9.9a2 2 0 0 1 2 2v6.4a2 2 0 0 1-2 2h-1.1v3.2l-3.4-3.2H8.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM6.5 8.4H4.6a2 2 0 0 0-2 2v4.9a2 2 0 0 0 2 2h.9V21l3-3.7",

  /**
   * Il cuore: la sola reazione che c'è.
   *
   * Va usato con `piena` quando è già tuo. Il contorno che cambia solo
   * colore si nota molto meno del passaggio da vuoto a pieno, ed è
   * l'unico segnale che dice se il gesto è andato a buon fine.
   */
  cuore:
    "M12 20.2s-7.6-4.4-7.6-9.5a4.2 4.2 0 0 1 7.6-2.5 4.2 4.2 0 0 1 7.6 2.5c0 5.1-7.6 9.5-7.6 9.5z",

  /**
   * Il confronto: due colonne di altezza diversa, con la linea di
   * mezzo che le separa.
   *
   * Non una bilancia — a questa misura il giogo e i due piatti
   * diventano tre macchie — e non due frecce contrapposte, che dicono
   * «scambia». Due barre a confronto è il disegno che chiunque abbia
   * visto un grafico riconosce.
   */
  confronto: "M12 3.5v17M5 9.5h3.4V19H5zM15.6 6h3.4v13h-3.4z",

  // Una freccia a destra: «qui c'è il seguito». Serve al riquadro
  // delle statistiche in cima alla pagina personale, che è
  // un'anteprima e deve dirlo.
  avanti: "M5 12h13M13 6.5l5.5 5.5-5.5 5.5",

  /**
   * Una matita: «questo si cambia».
   *
   * Sta sopra la faccia e sopra lo striscione, sempre in un tondino
   * scuro appoggiato sull'immagine. Non un ingranaggio — quello è
   * «impostazioni», cioè un altro posto dove andare — e non un più,
   * che vuol dire «aggiungi» e non «sostituisci».
   *
   * La punta è un triangolo chiuso e non due trattini: a quindici
   * pixel due segmenti che convergono diventano una macchia, mentre
   * la punta piena resta riconoscibile.
   */
  matita: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM14.5 6.5l3 3",

  /**
   * Quattro frecce dal centro: «questo si trascina».
   *
   * È il segno che i sistemi operativi usano da trent'anni per
   * spostare una cosa, e infatti si capisce senza etichetta. Sta
   * accanto alla matita sopra lo striscione — quella cambia
   * l'immagine, questo sceglie che pezzo se ne vede.
   *
   * Le punte si fermano a due unità dal bordo: a quindici pixel una
   * freccia che arriva fino in fondo tocca i lati del riquadro e il
   * disegno diventa un rettangolo con dentro una croce.
   */
  sposta:
    "M12 4.5v15M4.5 12h15M12 4.5 9.9 6.6M12 4.5l2.1 2.1M12 19.5l-2.1-2.1M12 19.5l2.1-2.1M4.5 12l2.1-2.1M4.5 12l2.1 2.1M19.5 12l-2.1-2.1M19.5 12l-2.1 2.1",

  /**
   * La campanella degli avvisi.
   *
   * Il batacchio è un archetto staccato e non un puntino: a diciotto
   * pixel un cerchietto pieno sotto la campana sembra sporco sullo
   * schermo, mentre la curva si legge per quello che è.
   */
  campanella:
    "M12 3.2a5.6 5.6 0 0 0-5.6 5.6c0 3.2-.8 4.9-1.5 5.8-.4.5 0 1.2.6 1.2h13a.8.8 0 0 0 .6-1.2c-.7-.9-1.5-2.6-1.5-5.8A5.6 5.6 0 0 0 12 3.2zM10 18.6a2 2 0 0 0 4 0",

  /**
   * Un cestino: togliere l'immagine che c'è.
   *
   * Solo il coperchio e la vasca, senza le righine dentro: a sedici
   * pixel quelle diventano tre puntini e il cestino sembra sporco.
   */
  cestino: "M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"
};

export default function Icon({ nome, dimensione = 20, className = "", piena = false, ...resto }) {
  const d = TRACCIATI[nome];

  if (!d) return null;

  return (
    <svg
      width={dimensione}
      height={dimensione}
      viewBox="0 0 24 24"
      // Piena serve per gli stati attivi (preferito segnato, stella
      // votata): un contorno che si limita a cambiare colore si nota
      // meno del passaggio da vuoto a pieno.
      fill={piena ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      // Decorativa: il significato lo dà l'etichetta accanto.
      aria-hidden="true"
      focusable="false"
      {...resto}
    >
      <path d={d} />
    </svg>
  );
}
