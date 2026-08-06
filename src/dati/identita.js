/**
 * "Questo fumetto ce l'ho già?"
 *
 * La domanda torna ovunque si mostri qualcosa che viene da fuori —
 * titoli simili, opere di un autore — e va risposta con l'identità, non
 * con la somiglianza. `costruisciCercaPosseduto` (in `consigli.js`)
 * ripiega sull'autore perché gli serve per **escludere** dai consigli
 * quello che hai già, e per buttare via roba prendere largo va
 * benissimo. Per attaccare l'etichetta "ce l'hai" a una copertina no:
 * sbagliare lì significa mostrare il titolo di un altro fumetto e
 * mandare alla scheda sbagliata. Provato — "I fiori del male" compariva
 * come "Happiness" solo perché l'autore è lo stesso Oshimi.
 *
 * Qui si confrontano i nomi, tutti quelli che un'opera ha: il titolo,
 * quello inglese e i sinonimi che AniList elenca, dove il titolo
 * dell'edizione italiana c'è quasi sempre. È così che "Oyasumi Punpun"
 * si riconosce in "Buonanotte Punpun", due stringhe che non hanno una
 * lettera in comune.
 *
 * Niente somiglianze approssimate: un seguito dello stesso autore
 * ("21st Century Boys" accanto a "20th Century Boys") passerebbe per la
 * stessa opera. Meglio un'etichetta in meno che una carta che porta
 * altrove.
 */

/**
 * Il titolo ridotto all'osso per confrontarlo: senza accenti, senza
 * punteggiatura, senza doppi spazi. "Buonanotte, PunPun" (come lo
 * scrive AnimeClick) e "Buonanotte Punpun" (come sta in collezione)
 * devono essere la stessa cosa.
 */
export function ossoDelTitolo(testo) {
  return (testo || "")
    // Gli accenti si staccano dalla lettera e si buttano: "Città" e
    // "Citta" sono lo stesso titolo scritto da due mani diverse.
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Tutti i nomi sotto cui un'opera esterna può presentarsi. */
export const nomiDi = (opera) =>
  [opera?.titolo, opera?.titoloInglese, ...(opera?.sinonimi || [])].filter(Boolean);

/**
 * Le due chiavi con cui un titolo si cerca: com'è, e senza spazi.
 *
 * La seconda serve perché le fonti spezzano le parole dove vogliono —
 * AnimeClick scrive "Dededededestruction" tutto attaccato dove noi
 * abbiamo "Dededede Destruction" — e per quella differenza una serie
 * che hai in casa risultava non posseduta. Due titoli che differiscono
 * solo per uno spazio sono lo stesso titolo: qui non si rischia niente.
 */
const chiaviDi = (nome) => {
  const osso = ossoDelTitolo(nome);

  return osso ? [osso, osso.replace(/ /g, "")] : [];
};

/**
 * Restituisce una funzione che, data un'opera esterna, trova la serie
 * in collezione che è la stessa opera — o `null`.
 *
 * Si costruisce una volta per elenco e si riusa: l'indice dei titoli
 * costa quanto la collezione, non quanto le opere da riconoscere.
 */
export function costruisciRiconoscitore(collezione) {
  const perTitolo = new Map();

  for (const s of collezione || []) {
    for (const chiave of chiaviDi(s.titolo)) {
      if (!perTitolo.has(chiave)) perTitolo.set(chiave, s);
    }
  }

  return (opera) => {
    for (const nome of nomiDi(opera)) {
      for (const chiave of chiaviDi(nome)) {
        const trovata = perTitolo.get(chiave);
        if (trovata) return trovata;
      }
    }

    return null;
  };
}
