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
  porta: "M4 20h6V4l10 2v13l-10 2V4M13 12h.01"
};

export default function Icon({ nome, dimensione = 20, className = "", ...resto }) {
  const d = TRACCIATI[nome];

  if (!d) return null;

  return (
    <svg
      width={dimensione}
      height={dimensione}
      viewBox="0 0 24 24"
      fill="none"
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
