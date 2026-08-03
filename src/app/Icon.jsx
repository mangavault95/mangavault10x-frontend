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
  // Un cartellino prezzo: i desideri sono da comprare, non da segnare
  // come preferiti — per questo non riusa "star".
  cartellino: "M20.6 12.3 12.7 20.2a2 2 0 0 1-2.8 0l-6.1-6.1a2 2 0 0 1 0-2.8L11.7 3.3a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v5.3a2 2 0 0 1-.4 1.3ZM16.5 7.5h.01"
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
