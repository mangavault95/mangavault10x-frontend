/**
 * Il colore di chi legge.
 *
 * Le note si vedono in due, quindi la prima domanda davanti a una nota
 * è "chi l'ha scritta". Un nome in cima a ogni riga la risponde ma va
 * letto ogni volta; un colore la risponde prima di leggere. Il nome
 * resta comunque, piccolo, per chi il colore non lo distingue.
 *
 * Il colore arriva dal server come NOME ('ottone', 'lilla'…), non come
 * valore: il sito disegna solo con i token di `tailwind.config.js`, e
 * un `#rrggbb` che viene dal database sarebbe l'unico colore del sito
 * deciso fuori dal design system.
 *
 * Le classi vanno scritte per intero e non composte
 * (`text-lettore-${nome}`): Tailwind legge i sorgenti come testo e
 * genera solo le classi che ci trova scritte: una costruita a pezzi
 * non esisterebbe nel CSS, e la nota uscirebbe senza colore.
 */

const TAVOLOZZA = {
  ottone: {
    testo: "text-lettore-ottone",
    pallino: "bg-lettore-ottone",
    bordo: "border-lettore-ottone/30",
    fondo: "bg-lettore-ottone/10",
    anello: "focus-visible:ring-lettore-ottone",
    cerchio: "ring-lettore-ottone"
  },
  lilla: {
    testo: "text-lettore-lilla",
    pallino: "bg-lettore-lilla",
    bordo: "border-lettore-lilla/30",
    fondo: "bg-lettore-lilla/10",
    anello: "focus-visible:ring-lettore-lilla",
    cerchio: "ring-lettore-lilla"
  },
  menta: {
    testo: "text-lettore-menta",
    pallino: "bg-lettore-menta",
    bordo: "border-lettore-menta/30",
    fondo: "bg-lettore-menta/10",
    anello: "focus-visible:ring-lettore-menta",
    cerchio: "ring-lettore-menta"
  },
  corallo: {
    testo: "text-lettore-corallo",
    pallino: "bg-lettore-corallo",
    bordo: "border-lettore-corallo/30",
    fondo: "bg-lettore-corallo/10",
    anello: "focus-visible:ring-lettore-corallo",
    cerchio: "ring-lettore-corallo"
  },
  cielo: {
    testo: "text-lettore-cielo",
    pallino: "bg-lettore-cielo",
    bordo: "border-lettore-cielo/30",
    fondo: "bg-lettore-cielo/10",
    anello: "focus-visible:ring-lettore-cielo",
    cerchio: "ring-lettore-cielo"
  },
  rosa: {
    testo: "text-lettore-rosa",
    pallino: "bg-lettore-rosa",
    bordo: "border-lettore-rosa/30",
    fondo: "bg-lettore-rosa/10",
    anello: "focus-visible:ring-lettore-rosa",
    cerchio: "ring-lettore-rosa"
  }
};

// Un lettore senza colore non deve rendere invisibile la sua nota:
// succede solo fra la migrazione 012 e il primo riavvio del backend,
// ma succede.
const SENZA_COLORE = {
  testo: "text-ink",
  pallino: "bg-ink-muted",
  bordo: "border-soft",
  fondo: "bg-glass-2",
  anello: "focus-visible:ring-brass-400",
  cerchio: "ring-soft"
};

// `cerchio` non è `anello`: il primo è il colore di un contorno
// sempre visibile — l'anello attorno alla foto profilo — il secondo
// serve solo quando l'elemento riceve il fuoco da tastiera. Averli
// separati evita che un giorno il contorno compaia solo cliccando.
/** Le classi del colore di un lettore, dal nome del colore. */
export function coloreLettore(nome) {
  return TAVOLOZZA[nome] || SENZA_COLORE;
}

/**
 * Il nome del colore di una persona, cercandola fra i lettori noti.
 *
 * Le note se lo portano già dietro (`nota.colore`); questo serve dove
 * c'è solo un identificativo — la classifica, il filtro "lette da".
 */
export function coloreDi(lettori, utenteId) {
  const trovato = (lettori || []).find((l) => l.id === Number(utenteId));

  return coloreLettore(trovato?.colore);
}

/** Come si chiama chi ha quell'identificativo, o niente. */
export function nomeDi(lettori, utenteId) {
  return (lettori || []).find((l) => l.id === Number(utenteId))?.nickname ?? null;
}
