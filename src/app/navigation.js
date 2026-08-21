/**
 * La mappa della navigazione, in un posto solo.
 *
 * Averla come dato invece che sparsa nel markup permette di generare
 * barra laterale, barra inferiore mobile e scorciatoie da tastiera
 * dalla stessa fonte — così non possono andare fuori sincrono.
 *
 * ---------------------------------------------------------------
 * DUE MONDI
 *
 * Le sezioni non sono più una lista sola. Con la Videoteca sarebbero
 * diventate sette voci in barra — su telefono, sei linguette in 375
 * pixel, con "Collezione" già tagliata a "Collez." — e soprattutto la
 * videoteca sarebbe sembrata un reparto della biblioteca invece che un
 * posto suo.
 *
 * Quindi la barra si apre su un commutatore: BIBLIOTECA o VIDEOTECA.
 * Sotto stanno solo le voci del mondo acceso, quattro o cinque per
 * parte, e la barra non cresce più di così nemmeno quando arriverà
 * l'ottava sezione. Cambiando mondo cambiano anche i colori: il
 * passaggio si vede prima ancora di leggere le voci.
 */

export const MONDI = [
  {
    id: "biblioteca",
    etichetta: "Biblioteca",
    // Dove si arriva commutando: la stanza d'ingresso di là, la
    // griglia dei titoli di qua.
    casa: "/",
    tasto: "b"
  },
  {
    id: "videoteca",
    etichetta: "Videoteca",
    casa: "/videoteca",
    tasto: "v"
  }
];

export const SEZIONI = [
  {
    id: "home",
    mondo: "biblioteca",
    primaria: true,
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
    mondo: "biblioteca",
    primaria: true,
    percorso: "/collezione",
    etichetta: "Collezione",
    descrizione: "Tutte le serie, con filtri e ordinamenti",
    icona: "grid",
    tasto: "2"
  },
  {
    id: "lettura",
    mondo: "biblioteca",
    primaria: true,
    percorso: "/lettura",
    etichetta: "In lettura",
    descrizione: "Cosa stai leggendo adesso e cosa hai finito",
    icona: "bookmark",
    tasto: "3"
  },
  {
    id: "wishlist",
    mondo: "biblioteca",
    primaria: true,
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
    mondo: "biblioteca",
    percorso: "/statistiche",
    etichetta: "Numeri",
    descrizione: "Valore, spesa e primati della collezione",
    icona: "chart",
    tasto: "5"
  },
  {
    id: "kachinuki",
    mondo: "biblioteca",
    percorso: "/kachinuki",
    // Il nome giapponese e non "Torneo": è come si chiama il gioco, e
    // una voce di menu deve chiamarsi come la chiama chi la clicca. Che
    // cosa sia lo dice la descrizione, e lo dice la pagina.
    etichetta: "Kachinuki",
    descrizione: "Il torneo a eliminazione fra le serie in collezione",
    icona: "torneo",
    tasto: "6"
  },

  // ---- Videoteca ----
  // I numeri ripartono da 1: le scorciatoie valgono dentro il mondo
  // acceso, come i piani di un palazzo che hanno tutti la stanza 1.
  {
    id: "videoteca",
    mondo: "videoteca",
    primaria: true,
    percorso: "/videoteca",
    etichetta: "Videoteca",
    descrizione: "Tutti gli anime, con il punto in cui sei",
    icona: "pellicola",
    tasto: "1"
  },
  {
    id: "visione",
    mondo: "videoteca",
    primaria: true,
    percorso: "/visione",
    etichetta: "In visione",
    descrizione: "Cosa stai guardando adesso",
    icona: "bookmark",
    tasto: "2"
  },
  {
    id: "calendario",
    mondo: "videoteca",
    primaria: true,
    percorso: "/calendario",
    etichetta: "Calendario",
    descrizione: "Quando escono i prossimi episodi, in Italia",
    icona: "calendario",
    tasto: "3"
  }
];

// Separata dalle altre: è amministrazione, non navigazione quotidiana.
// Non appartiene a nessun mondo — si vede da tutti e due.
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

/** Le voci di un mondo, nell'ordine in cui stanno in barra. */
export function sezioniDi(mondo) {
  return SEZIONI.filter((s) => s.mondo === mondo);
}

/**
 * Le voci di tutti i giorni e quelle occasionali.
 *
 * Su schermo largo la barra è alta quanto la finestra e le tiene
 * tutte. Su telefono no: cinque linguette in 375 pixel sono il
 * massimo prima che le parole si taglino ("Collez.", "Cal."), quindi
 * in basso stanno solo le primarie e il resto si apre da «Altro».
 *
 * Quali siano primarie non è una classifica di importanza ma di
 * frequenza: la collezione si apre ogni giorno, il torneo qualche
 * volta al mese.
 */
export function primarieDi(mondo) {
  return sezioniDi(mondo).filter((s) => s.primaria);
}

export function secondarieDi(mondo) {
  return sezioniDi(mondo).filter((s) => !s.primaria);
}

/**
 * In quale mondo ci si trova, guardando l'indirizzo.
 *
 * La biblioteca è il valore di ripiego: è il mondo storico del sito, e
 * un indirizzo sconosciuto (o la pagina di errore) deve mostrare la
 * barra di sempre invece di ribaltare i colori senza motivo.
 */
export function mondoDi(percorso) {
  const sezione = SEZIONI.find(
    (s) => s.percorso !== "/" && percorso.startsWith(s.percorso)
  );

  return sezione?.mondo ?? "biblioteca";
}

/**
 * Il titolo che compare nella scheda del browser.
 * Un indirizzo condiviso deve dire cosa contiene.
 */
export function titoloPer(percorso) {
  if (percorso.startsWith("/serie/")) return "Scheda serie · MangaVault";

  // La scheda di un anime si manda a qualcuno più spesso di quanto si
  // salvi nei preferiti: deve dire di cosa parla, non solo dove sta.
  if (/^\/videoteca\/\d+/.test(percorso)) return "Scheda anime · Videoteca";

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
  // acceso "Kachinuki" mentre si guarda il tabellone di una partita, e
  // "Videoteca" dentro la scheda di un anime.
  return percorsoCorrente.startsWith(percorsoVoce);
}
