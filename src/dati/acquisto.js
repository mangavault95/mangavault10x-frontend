import Fuse from "fuse.js";
import { ossoDelTitolo } from "./identita";

/**
 * «dandadan 23» → registra l'acquisto. Le regole del bot di Telegram,
 * dentro la casella Cerca (04/10/2026).
 *
 * È una copia ragionata di `interpretaRiga` in `mangavault10x-bot/src/
 * messaggio.js`, e deve restarle fedele: chi registra dal telefono a
 * volte dal bot e a volte dal sito non deve imparare due lingue.
 *
 * Si legge DA DESTRA: prima la data, poi il prezzo, poi i volumi, e
 * quello che resta è il titolo. Al contrario non funzionerebbe, perché i
 * titoli contengono numeri («Zatch Bell! 2») e spazi.
 *
 * Il prezzo si distingue da un volume per i decimali o il simbolo
 * dell'euro: «berserk 42 7» sono due volumi, «berserk 42 7€» è un volume
 * pagato 7 euro. È il TOTALE della riga, come sullo scontrino.
 */

const MASSIMO_VOLUMI = 60;

function giornoISO(data) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(data);
}

function leggiData(pezzo, oggi) {
  const t = pezzo.toLowerCase();

  if (t === "oggi") return giornoISO(oggi);

  if (t === "ieri") {
    const d = new Date(oggi);
    d.setDate(d.getDate() - 1);
    return giornoISO(d);
  }

  // Solo con le barre: «42-44» è un intervallo di volumi, non una data.
  const m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;

  const giorno = Number(m[1]);
  const mese = Number(m[2]);
  let anno = m[3] ? Number(m[3]) : oggi.getFullYear();

  if (anno < 100) anno += 2000;
  if (giorno < 1 || giorno > 31 || mese < 1 || mese > 12) return null;

  let data = new Date(Date.UTC(anno, mese - 1, giorno));

  // Senza anno scritto, una data nel futuro è dell'anno scorso.
  if (!m[3] && data > oggi) data = new Date(Date.UTC(anno - 1, mese - 1, giorno));

  return data.toISOString().slice(0, 10);
}

function leggiPrezzo(pezzo) {
  const m = pezzo.match(/^€?\s*(\d{1,4})(?:[.,](\d{1,2}))?\s*€?$/);
  if (!m) return null;

  // Un intero nudo è un volume, non un prezzo.
  if (!pezzo.includes("€") && m[2] === undefined) return null;

  return Number(m[1]) + Number(m[2] ? m[2].padEnd(2, "0") : 0) / 100;
}

function leggiVolumi(pezzo) {
  const m = pezzo.match(/^(?:vol\.?|v\.?)?(\d{1,4})(?:-(\d{1,4}))?$/i);
  if (!m) return null;

  const da = Number(m[1]);
  const a = m[2] === undefined ? da : Number(m[2]);

  if (da < 1 || a < da || a - da + 1 > MASSIMO_VOLUMI) return null;

  return Array.from({ length: a - da + 1 }, (_, i) => da + i);
}

/**
 * La frase capita, oppure `null` se non sembra un acquisto.
 *
 * A differenza del bot, qui una frase SENZA numeri non è un acquisto:
 * nella casella Cerca «berserk» vuol dire «cerca Berserk», non «ho
 * comprato il prossimo volume». Serve almeno un volume, un prezzo o una
 * data perché compaia la proposta.
 */
export function interpretaAcquisto(riga, oggi = new Date()) {
  const testo = String(riga || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*[-–—]\s*(\d)/g, "$1-$2");

  const pezzi = testo.split(" ");

  let data = null;
  let prezzo = null;
  const volumi = [];

  if (pezzi.length > 1) {
    const d = leggiData(pezzi[pezzi.length - 1], oggi);
    if (d) {
      data = d;
      pezzi.pop();
    }
  }

  if (pezzi.length > 1) {
    const p = leggiPrezzo(pezzi[pezzi.length - 1]);
    if (p !== null) {
      prezzo = p;
      pezzi.pop();
    }
  }

  while (pezzi.length > 1) {
    const v = leggiVolumi(pezzi[pezzi.length - 1]);
    if (!v) break;

    volumi.unshift(...v);
    pezzi.pop();
  }

  const titolo = pezzi.join(" ").trim();

  if (!/[a-zà-öø-ÿ]/i.test(titolo)) return null;
  if (!volumi.length && prezzo === null && data === null) return null;

  return {
    titolo,
    // Il titolo con i numeri in coda: «Zatch Bell! 2» è un titolo vero,
    // e va provato prima della lettura con i volumi.
    titoloIntero: testo,
    volumi: volumi.length ? [...new Set(volumi)].sort((a, b) => a - b) : null,
    prezzo,
    data
  };
}

/**
 * Quale serie della collezione è quella scritta. Stessa prudenza del
 * bot: una corrispondenza esatta o un candidato nettamente migliore
 * degli altri, altrimenti niente — registrare un volume sulla serie
 * sbagliata è peggio che chiedere di scriverla meglio.
 */
export function serieDellAcquisto(collezione, { titolo, titoloIntero }) {
  const elenco = collezione || [];
  const esatta = (testo) => {
    const t = ossoDelTitolo(testo);
    return t ? elenco.find((s) => ossoDelTitolo(s.titolo) === t) : null;
  };

  // «Zatch Bell! 2» come titolo intero vince sul volume 2 di Zatch Bell!:
  // ma allora non è un acquisto, è una ricerca.
  if (titoloIntero !== titolo && esatta(titoloIntero)) return null;

  const precisa = esatta(titolo);
  if (precisa) return precisa;

  const risultati = new Fuse(elenco, {
    keys: ["titolo"],
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.45,
    minMatchCharLength: 3
  })
    .search(titolo)
    .slice(0, 2);

  const [primo, secondo] = risultati;

  if (!primo) return null;

  // Gli stessi numeri del bot, misurati lì: «one pice» prende 0,23 su One
  // Piece, i due «Sword Art Online» quasi pari vanno chiesti.
  const netta = primo.score <= 0.28 && (!secondo || secondo.score - primo.score >= 0.1);

  return netta ? primo.item : null;
}
