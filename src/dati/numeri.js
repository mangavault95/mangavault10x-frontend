import { completamento, euro, valoreSerie, volumiMancanti } from "./serie";

/**
 * I conti della collezione, in un posto solo.
 *
 * Stavano dentro `StatistichePage`, ed è stato giusto finché la
 * collezione si contava in un posto solo. Adesso i posti sono due — la
 * pagina dei Numeri, che si raggiunge dalla barra laterale, e lo
 * scontrino che batte il registratore di cassa della stanza — e sono
 * apposta due vedute diverse della stessa cosa.
 *
 * Diverse nella forma, non nei numeri: due copie della stessa somma
 * finiscono sempre per divergere, e il giorno che divergono il sito
 * mostra due valori della collezione a due click di distanza. Quindi il
 * conto è uno e sta qui; di là si decide solo come lo si scrive.
 *
 * Non passa dal server apposta: la collezione è già arrivata tutta
 * all'apertura del sito, e rifare il giro per sommare 189 righe sarebbe
 * uno spreco.
 */
export function riepilogo(serie) {
  if (!serie?.length) return null;

  const volumi = serie.reduce((t, s) => t + s.posseduti, 0);
  const valore = serie.reduce((t, s) => t + valoreSerie(s), 0);

  const conCosto = serie.filter((s) => s.costo);
  const prezzoMedio = conCosto.length
    ? conCosto.reduce((t, s) => t + s.costo, 0) / conCosto.length
    : 0;

  const complete = serie.filter((s) => completamento(s) === 100).length;
  const daCompletare = serie.filter((s) => volumiMancanti(s) > 0).length;
  const inCorsoEditore = serie.filter((s) => s.stato === "in_corso").length;

  // Quanto costerebbe finire tutto quello che hai cominciato: è il
  // numero che nessun'altra pagina dice, e quello che serve sapere
  // prima di aggiungere un'altra serie nuova.
  const perCompletare = serie.reduce((t, s) => {
    const mancanti = volumiMancanti(s);

    return t + (mancanti && s.costo ? mancanti * s.costo : 0);
  }, 0);

  // Zero non è un voto: nella collezione significa "non l'ho ancora
  // giudicato". Contarlo abbasserebbe la media di due punti buoni e
  // farebbe sembrare mediocre tutto quello che hai comprato.
  const votate = serie.filter((s) => s.valutazione > 0);
  const votoMedio = votate.length
    ? votate.reduce((t, s) => t + s.valutazione, 0) / votate.length
    : null;

  return {
    serie: serie.length,
    volumi,
    valore,
    prezzoMedio,
    complete,
    daCompletare,
    inCorsoEditore,
    perCompletare,
    votoMedio,
    volumiMancantiTotali: serie.reduce((t, s) => t + (volumiMancanti(s) || 0), 0)
  };
}

/**
 * I primati: una serie per categoria, quella che svetta.
 *
 * @param formatta  come scrivere il valore vinto. Lo scontrino lo vuole
 *                  corto e in maiuscolo, la pagina dei Numeri disteso.
 */
export function primati(serie) {
  if (!serie?.length) return [];

  const migliore = (etichetta, estrai, formatta) => {
    const candidate = serie.filter((s) => estrai(s) !== null && estrai(s) !== undefined);

    if (!candidate.length) return null;

    const vincitrice = candidate.reduce((a, b) => (estrai(b) > estrai(a) ? b : a));

    return { etichetta, serie: vincitrice, dettaglio: formatta(estrai(vincitrice)) };
  };

  return [
    migliore("Più volumi", (s) => s.posseduti || null, (v) => `${v} volumi`),
    migliore("Voto più alto", (s) => s.valutazione, (v) => `${v} / 5`),
    migliore("Serie più lunga", (s) => s.totali, (v) => `${v} volumi totali`),
    migliore("Vale di più", (s) => valoreSerie(s) || null, (v) => euro(v)),
    migliore("Ne mancano di più", (s) => volumiMancanti(s) || null, (v) => `${v} da prendere`)
  ].filter(Boolean);
}
