/**
 * La mappa della navigazione, in un posto solo.
 *
 * Averla come dato invece che sparsa nel markup permette di generare
 * barra laterale, barra inferiore mobile e scorciatoie da tastiera
 * dalla stessa fonte — così non possono andare fuori sincrono.
 */

export const SEZIONI = [
  {
    id: "home",
    percorso: "/",
    // "Scaffale" era il nome di quando la home era una vista della
    // collezione. Adesso è una biblioteca in cui si entra, con dentro
    // gli scaffali fra le altre cose, e chiamarla come una delle cose
    // che contiene faceva sembrare le altre quattro un altro sito.
    etichetta: "Biblioteca",
    descrizione: "La biblioteca: scaffali, banco, bacheca, tavolino",
    // Il portale, cioè il marchio del sito. Prima era 本, il kanji di
    // «libro»: giusto come idea ma è un'icona come le altre, e la voce
    // che riporta a casa dovrebbe essere l'unica a non esserlo.
    icona: "portale",
    tasto: "1"
  },
  {
    id: "collezione",
    percorso: "/collezione",
    etichetta: "Collezione",
    descrizione: "Tutte le serie, con filtri e ordinamenti",
    icona: "grid",
    tasto: "2"
  },
  {
    id: "lettura",
    percorso: "/lettura",
    etichetta: "In lettura",
    descrizione: "Cosa stai leggendo adesso e cosa hai finito",
    icona: "bookmark",
    tasto: "3"
  },
  {
    id: "wishlist",
    percorso: "/wishlist",
    // «Wishlist» e non «Desideri»: è il nome che si usa parlandone, e la
    // voce della barra deve chiamarsi come la chiama chi la clicca.
    etichetta: "Wishlist",
    descrizione: "Le serie che vuoi comprare",
    icona: "cartellino",
    tasto: "4"
  },
  {
    id: "statistiche",
    percorso: "/statistiche",
    etichetta: "Numeri",
    descrizione: "Valore, spesa e primati della collezione",
    icona: "chart",
    tasto: "5"
  },
  {
    id: "kachinuki",
    percorso: "/kachinuki",
    // Il nome giapponese e non "Torneo": è come si chiama il gioco, e
    // una voce di menu deve chiamarsi come la chiama chi la clicca. Che
    // cosa sia lo dice la descrizione, e lo dice la pagina.
    etichetta: "Kachinuki",
    descrizione: "Il torneo a eliminazione fra le serie in collezione",
    icona: "torneo",
    tasto: "6"
  }
];

// Separata dalle altre: è amministrazione, non navigazione quotidiana.
export const SEZIONE_ADMIN = {
  id: "admin",
  percorso: "/admin",
  etichetta: "Gestione",
  descrizione: "Modifica le schede della collezione",
  icona: "settings"
};

/**
 * Le quattro porte della stanza.
 *
 * Non sono sezioni e non stanno in nessun menu: ci si arriva solo
 * cliccando l'oggetto dentro la stanza d'ingresso. Qui figurano per una
 * ragione sola — un indirizzo condiviso deve dire cosa contiene anche
 * quando non è una voce di navigazione.
 */
const PORTE = {
  "/cassa": "Lo scontrino",
  "/bacheca": "La bacheca",
  "/tavolino": "Il tavolino",
  "/banco": "Il banco"
};

/**
 * Il titolo che compare nella scheda del browser.
 * Un indirizzo condiviso deve dire cosa contiene.
 */
export function titoloPer(percorso) {
  if (percorso.startsWith("/serie/")) return "Scheda serie · MangaVault";

  // Una partita ha un indirizzo suo, ed è il tipo di cosa che si manda
  // a qualcuno: la scheda deve dire di cosa si tratta.
  if (/^\/kachinuki\/\d+/.test(percorso)) return "Una partita · Kachinuki-sen";

  if (PORTE[percorso]) return `${PORTE[percorso]} · MangaVault`;

  const sezione = [...SEZIONI, SEZIONE_ADMIN].find((s) => s.percorso === percorso);

  return sezione ? `${sezione.etichetta} · MangaVault` : "MangaVault";
}

/**
 * Indica se una voce di menu è quella attiva.
 * La home combacia solo esattamente, le altre anche sulle
 * sotto-pagine, così "Collezione" resta acceso dentro una scheda serie.
 */
export function eAttiva(percorsoVoce, percorsoCorrente) {
  if (percorsoVoce === "/") return percorsoCorrente === "/";

  if (percorsoVoce === "/collezione") {
    return (
      percorsoCorrente.startsWith("/collezione") ||
      percorsoCorrente.startsWith("/serie/")
    );
  }

  // Le altre combaciano anche sulle sotto-pagine: è la regola che tiene
  // acceso "Kachinuki" mentre si guarda il tabellone di una partita.
  return percorsoCorrente.startsWith(percorsoVoce);
}
