import {
  completamento,
  euro,
  numeroIt,
  plurale,
  valoreSerie,
  volumiMancanti
} from "./serie";

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

  // "Completa" richiede due cose insieme: hai tutto quello che è uscito
  // (completamento 100) E l'editore ha finito di pubblicarla. Una serie
  // in corso di cui possiedi ogni volume uscito finora non è completa,
  // è solo in pari — l'editore può pubblicarne un altro il mese prossimo.
  const complete = serie.filter(
    (s) => completamento(s) === 100 && s.stato === "conclusa"
  ).length;
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
 * I primati, in due gruppi che rispondono a due domande diverse.
 *
 * Erano un elenco solo, e mescolava cose che non si confrontano: «la
 * serie più lunga» parla di quello che è già sullo scaffale, «ne
 * mancano di più» della caccia ancora aperta. Divisi si leggono come
 * due bilanci separati; insieme erano una classifica di tutto e di
 * niente.
 *
 * «Più volumi» (quanti ne possiedi) è sparito perché vinceva sempre
 * insieme a «serie più lunga» (quanti ne esistono): chi ha la serie più
 * lunga ha quasi per forza anche più volumi di chiunque altro, e due
 * riquadri con la stessa copertina e quasi lo stesso numero sembrano un
 * errore, non due record.
 *
 * Ogni voce esce nella stessa forma — `titolo` è la cosa che ha vinto,
 * `dettaglio` il valore con cui ha vinto, `nota` il conto che lo spiega
 * — così chi la disegna non deve sapere di che primato si tratti.
 * `serie` è la scheda da aprire, e resta `null` per il primato che non
 * premia una serie ma una casa editrice.
 */
export function primati(serie) {
  if (!serie?.length) return [];

  // `direzione` sceglie se vince il valore più alto o più basso, senza
  // duplicare il resto del confronto: "ne mancano di più" e "prossima
  // da completare" sono la stessa domanda letta al contrario.
  const estremo = (elenco, direzione, { id, etichetta, estrai, scrivi }) => {
    const candidate = elenco.filter((s) => estrai(s) !== null && estrai(s) !== undefined);

    if (!candidate.length) return null;

    const vincitrice = candidate.reduce((a, b) =>
      direzione * estrai(b) > direzione * estrai(a) ? b : a
    );

    return { id, etichetta, titolo: vincitrice.titolo, serie: vincitrice, ...scrivi(vincitrice) };
  };

  const migliore = (elenco, voce) => estremo(elenco, 1, voce);
  const minore = (elenco, voce) => estremo(elenco, -1, voce);

  /* -------------------- La libreria -------------------- */

  const libreria = [
    migliore(serie, {
      id: "volume-caro",
      etichetta: "Volume più caro",
      estrai: (s) => s.costo || null,
      scrivi: (s) => ({
        dettaglio: euro(s.costo),
        nota: plurale(s.posseduti, "volume in casa", "volumi in casa")
      })
    }),
    migliore(serie, {
      id: "serie-lunga",
      etichetta: "Serie più lunga",
      estrai: (s) => s.totali,
      scrivi: (s) => ({
        dettaglio: `${numeroIt(s.totali)} volumi`,
        nota: `ne hai ${numeroIt(s.posseduti)}`
      })
    }),
    migliore(serie, {
      id: "serie-costosa",
      etichetta: "Serie più costosa",
      estrai: (s) => valoreSerie(s) || null,
      // Il conto in chiaro sotto il totale: è la moltiplicazione a fare
      // il primato, e senza si crederebbe a un prezzo di listino.
      scrivi: (s) => ({
        dettaglio: euro(valoreSerie(s)),
        nota: `${numeroIt(s.posseduti)} × ${euro(s.costo)}`
      })
    })
  ].filter(Boolean);

  /* -------------------- Le serie in corso -------------------- */

  // Un solo elenco per tutti e tre: qui la domanda è sempre "cosa manca",
  // e le serie complete non hanno voce in capitolo.
  const daFinire = serie.filter((s) => volumiMancanti(s) > 0);

  const mancaDiPiu = migliore(daFinire, {
    id: "manca-di-piu",
    etichetta: "Ne mancano di più",
    estrai: (s) => volumiMancanti(s),
    scrivi: (s) => ({
      dettaglio: plurale(volumiMancanti(s), "volume", "volumi"),
      nota: s.costo ? `${euro(volumiMancanti(s) * s.costo)} per finirla` : null
    })
  });

  let prossima = minore(daFinire, {
    id: "prossima",
    etichetta: "Prossima da completare",
    estrai: (s) => volumiMancanti(s),
    scrivi: (s) => ({
      dettaglio: plurale(volumiMancanti(s), "volume", "volumi"),
      nota: s.costo ? `${euro(volumiMancanti(s) * s.costo)} e la chiudi` : null
    })
  });

  // Con una sola serie incompleta il massimo e il minimo sono la stessa
  // riga: è lo stesso doppione che ha fatto togliere "più volumi".
  if (prossima && mancaDiPiu && prossima.serie.id === mancaDiPiu.serie.id) prossima = null;

  const inCorso = [mancaDiPiu, prossima, editorePiuAperto(daFinire)].filter(Boolean);

  return [
    { id: "libreria", titolo: "La libreria", sommario: "Quello che è già sullo scaffale", voci: libreria },
    { id: "in-corso", titolo: "Le serie in corso", sommario: "Quello che manca ancora", voci: inCorso }
  ].filter((g) => g.voci.length);
}

/**
 * L'unico primato che non premia una serie ma una casa editrice: quella
 * che ti ha lasciato più buchi da riempire.
 *
 * Vince per numero di serie aperte, non per volumi mancanti: dice quanti
 * fronti hai aperto con lo stesso editore, che è la cosa che si traduce
 * in ordini da fare. I volumi restano scritti sotto, perché una serie
 * cui manca un volume e una cui ne mancano venti non pesano uguale.
 */
function editorePiuAperto(daFinire) {
  const mappa = new Map();

  for (const s of daFinire) {
    if (!s.editore) continue;

    const conto = mappa.get(s.editore) || { quante: 0, volumi: 0 };

    conto.quante += 1;
    conto.volumi += volumiMancanti(s);

    mappa.set(s.editore, conto);
  }

  if (!mappa.size) return null;

  const [nome, conto] = [...mappa].reduce((a, b) => (b[1].quante > a[1].quante ? b : a));

  return {
    id: "editore-aperto",
    etichetta: "Editore da completare",
    titolo: nome,
    serie: null,
    dettaglio: plurale(conto.quante, "serie aperta", "serie aperte"),
    nota: `${numeroIt(conto.volumi)} volumi da prendere`
  };
}
