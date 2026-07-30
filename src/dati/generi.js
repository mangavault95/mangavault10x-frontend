/**
 * Generi ed editori, ripuliti senza toccare il database.
 *
 * La colonna `Genere` arriva da fonti diverse nel tempo: quasi tutto è
 * in inglese (il vocabolario di AniList), ma una manciata di schede più
 * vecchie ha lo stesso genere scritto in italiano — "Avventura" invece
 * di "Adventure", eccetera. Stessa storia per gli editori, digitati a
 * mano in momenti diversi: "Panini" e "Panini S.p.A." sono la stessa
 * casa editrice.
 *
 * Contare "Adventure" e "Avventura" come due generi diversi sballa
 * qualunque filtro o classifica. La correzione vera sarebbe nella
 * colonna del database, ma è una scelta che spetta a Carmine — qui la
 * normalizzazione resta un livello di lettura sopra ai dati grezzi,
 * reversibile e senza scrivere nulla.
 */

// Sinonimi trovati davvero nei dati (verificati su tutta la collezione,
// non ipotizzati): la chiave è come appare grezzo, il valore è la forma
// che vince. Le forme già in inglese restano se stesse.
const SINONIMI_GENERE = {
  avventura: "Adventure",
  commedia: "Comedy",
  drammatico: "Drama",
  sentimentale: "Romance",
  psicologico: "Psychological",
  scolastico: "School"
};

const SINONIMI_EDITORE = {
  "panini s.p.a.": "Panini",
  "edizioni bd s.r.l.": "Edizioni BD"
};

const normalizzaChiave = (testo) => testo.trim().toLowerCase();

// Un identificativo stabile per l'indirizzo (`?generi=adventure,drama`):
// l'etichetta può cambiare capitalizzazione, l'id no. Esportata perché
// chi filtra deve poter trasformare un genere di una serie nello stesso
// id usato nella nuvola, senza duplicare questa regola altrove.
export const idDa = (etichetta) => normalizzaChiave(etichetta).replace(/[^a-z0-9]+/g, "-");

export function genereCanonico(grezzo) {
  if (!grezzo) return null;

  const pulito = grezzo.trim();
  if (!pulito) return null;

  return SINONIMI_GENERE[normalizzaChiave(pulito)] || pulito;
}

export function editoreCanonico(grezzo) {
  if (!grezzo) return null;

  const pulito = grezzo.trim();
  if (!pulito) return null;

  return SINONIMI_EDITORE[normalizzaChiave(pulito)] || pulito;
}

/** I generi di una serie, canonicalizzati e senza doppioni. */
export function generiDiSerie(serie) {
  const visti = new Set();
  const risultato = [];

  for (const g of serie?.generi || []) {
    const canonico = genereCanonico(g);
    if (!canonico || visti.has(canonico)) continue;

    visti.add(canonico);
    risultato.push(canonico);
  }

  return risultato;
}

/**
 * I generi dell'intera collezione, contati e ordinati per frequenza.
 * Alimenta la nuvola di generi nel pannello filtri: chi compare di più
 * pesa di più nella nuvola.
 */
export function elencoGeneri(serie) {
  const conteggi = new Map();

  for (const s of serie) {
    for (const g of generiDiSerie(s)) {
      conteggi.set(g, (conteggi.get(g) || 0) + 1);
    }
  }

  return [...conteggi.entries()]
    .map(([etichetta, quante]) => ({ id: idDa(etichetta), etichetta, quante }))
    .sort((a, b) => b.quante - a.quante || a.etichetta.localeCompare(b.etichetta, "it"));
}

/** Stessa idea per gli editori, per la tendina. */
export function elencoEditori(serie) {
  const conteggi = new Map();

  for (const s of serie) {
    const canonico = editoreCanonico(s.editore);
    if (!canonico) continue;

    conteggi.set(canonico, (conteggi.get(canonico) || 0) + 1);
  }

  return [...conteggi.entries()]
    .map(([etichetta, quante]) => ({ id: idDa(etichetta), etichetta, quante }))
    .sort((a, b) => b.quante - a.quante || a.etichetta.localeCompare(b.etichetta, "it"));
}

/** Il genere con più serie dentro un sottoinsieme: usato nell'analisi. */
export function generePrevalente(serie) {
  const elenco = elencoGeneri(serie);
  return elenco[0]?.etichetta || null;
}
