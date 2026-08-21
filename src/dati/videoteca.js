/**
 * Le stagioni tornano a essere una serie.
 *
 * Il server manda una riga per SCHEDA di AnimeClick, e AnimeClick non
 * è coerente con sé stessa: Frieren è una scheda sola con dentro due
 * stagioni numerate 1→38, Isekai Farming sono due schede che ripartono
 * da 1. In griglia, senza far niente, la prima serie occupa un
 * pannello e la seconda due — con due progressi diversi sulla stessa
 * cosa.
 *
 * Qui le righe che il server ha marcato con lo stesso `gruppo_id`
 * diventano un pannello solo. Una serie senza gruppo non è un caso
 * particolare: è un gruppo di una stagione, e chi disegna la griglia
 * non deve accorgersi della differenza.
 *
 * Sta in `dati/` e non accanto ai componenti perché è esattamente il
 * mestiere di questa cartella: tradurre le righe del database in quello
 * che le pagine si aspettano, una volta sola, in un punto solo.
 */

/**
 * Come si chiama una stagione quando nessuno gliel'ha detto.
 *
 * «Stagione 2» dalla posizione: le serie normali non chiedono nessun
 * lavoro a mano, e chi vuole scrivere «Il film» o «OAV» lo fa dalla
 * Gestione (`anime.etichetta`).
 */
export function etichettaStagione(stagione, indice) {
  if (stagione.etichetta) return stagione.etichetta;

  return `Stagione ${stagione.ordine || indice + 1}`;
}

/**
 * Lo stato della serie quando le sue stagioni non dicono la stessa cosa.
 *
 * Non è una media: è la domanda che si fa chi filtra. Una serie di cui
 * sto guardando la seconda stagione è «in visione» anche se la prima è
 * finita, e va trovata sotto quel filtro — non sotto «finita», dove
 * non la cercherebbe nessuno.
 */
const PRIORITA = ["in_visione", "da_vedere", "in_pausa", "droppata", "completa"];

function statoDelGruppo(stagioni) {
  const stati = new Set(stagioni.map((s) => s.stato_visione).filter(Boolean));

  if (stati.size === 0) return null;
  if (stati.size === 1) return [...stati][0];

  // «Finita» solo se lo sono tutte: una stagione ancora da vedere basta
  // a rendere la serie non finita.
  return PRIORITA.find((stato) => stati.has(stato)) ?? null;
}

function somma(righe, campo) {
  return righe.reduce((totale, riga) => totale + Number(riga[campo] || 0), 0);
}

/** Una serie come la si guarda in griglia: le sue stagioni messe insieme. */
function componi(stagioni) {
  const prima = stagioni[0];

  const visti = somma(stagioni, "episodi_visti");
  const disponibili = somma(stagioni, "episodi_disponibili");
  const dichiarati = somma(stagioni, "episodi_totali");

  // La prossima uscita è la più vicina fra tutte le stagioni: di norma
  // ce l'ha solo quella in corso, ma non è detto — un film annunciato
  // mentre la serie va avanti ne ha una sua.
  const uscite = stagioni
    .filter((s) => s.prossima_uscita)
    .sort((a, b) => new Date(a.prossima_uscita) - new Date(b.prossima_uscita));

  const voti = stagioni.map((s) => Number(s.voto)).filter((v) => v > 0);

  return {
    // La chiave della lista e l'indirizzo dove si va cliccando. Il
    // pannello porta alla prima stagione: la scheda le mostra comunque
    // tutte, e un indirizzo che cambia quando esce una stagione nuova
    // romperebbe i preferiti.
    chiave: prima.gruppo_id ? `gruppo-${prima.gruppo_id}` : `anime-${prima.id}`,
    id: prima.id,

    gruppoId: prima.gruppo_id ?? null,
    titolo: prima.gruppo_titolo || prima.titolo,
    cover_url: prima.gruppo_cover || prima.cover_url,

    tipo: prima.tipo,
    stato: prima.stato,
    anno_inizio: prima.anno_inizio,
    manga_id: stagioni.find((s) => s.manga_id)?.manga_id ?? null,

    stagioni,
    quanteStagioni: stagioni.length,

    episodi_visti: visti,
    episodi_disponibili: disponibili,
    episodi_totali: dichiarati || null,

    stato_visione: statoDelGruppo(stagioni),
    voto: voti.length ? voti.reduce((a, b) => a + b, 0) / voti.length : null,

    prossima_uscita: uscite[0]?.prossima_uscita ?? null,
    prossimo_episodio: uscite[0]?.prossimo_episodio ?? null
  };
}

/**
 * Da elenco di schede a elenco di serie.
 *
 * L'ordine di arrivo si rispetta: il server ordina già per titolo del
 * gruppo e poi per stagione, e rimescolare qui vorrebbe dire due
 * ordinamenti da tenere d'accordo.
 */
export function raggruppa(serie) {
  const gruppi = new Map();

  for (const scheda of serie) {
    const chiave = scheda.gruppo_id ? `gruppo-${scheda.gruppo_id}` : `anime-${scheda.id}`;

    if (!gruppi.has(chiave)) gruppi.set(chiave, []);

    gruppi.get(chiave).push(scheda);
  }

  return [...gruppi.values()].map(componi);
}
