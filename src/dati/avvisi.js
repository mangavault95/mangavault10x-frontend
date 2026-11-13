/**
 * Gli avvisi: la riga che compare in basso per dire «fatto» e offrire di
 * tornare indietro.
 *
 * Fino al 13/11/2026 ne esisteva uno solo, scritto dentro la Collezione
 * con il suo stato e il suo timer; le altre pagine non ne avevano, e
 * Kachinuki usava la finestra di sistema del browser. Adesso chiunque
 * chiama `avvisa(...)` e a mostrarlo pensa `ui/Avvisi.jsx`, montato una
 * volta nella cornice.
 *
 * È un magazzino minuscolo fuori da React, e non un Context, per una
 * ragione pratica: un avviso lo fa partire quasi sempre una funzione —
 * la risposta di una chiamata al server, a volte dopo che la pagina che
 * l'ha chiesta è già stata lasciata — e una funzione non ha hook.
 *
 * Uno alla volta: un avviso nuovo sostituisce il precedente. Due
 * ricevute impilate sopra la barra coprirebbero mezza pagina per dire
 * cose che fra cinque secondi non servono più.
 */

let corrente = null;
let contatore = 0;

const ascoltatori = new Set();

function pubblica(nuovo) {
  corrente = nuovo;
  ascoltatori.forEach((rilegge) => rilegge());
}

/**
 * @param {object} avviso
 * @param {string} avviso.testo    Cosa è successo, in poche parole.
 * @param {{etichetta: string, alTocco: Function}} [avviso.azione]
 *        Di solito «Annulla». Toccarla chiude l'avviso.
 * @param {"fatto"|"errore"} [avviso.tono]
 * @param {number} [avviso.durata] Millesimi prima che se ne vada da solo.
 * @returns {number} L'identificativo, per `togliAvviso`.
 */
export function avvisa({ testo, azione = null, tono = "fatto", durata = 5000 }) {
  contatore += 1;
  pubblica({ id: contatore, testo, azione, tono, durata });

  return contatore;
}

/** Senza `id` toglie quello che c'è; con `id` solo se è ancora lui. */
export function togliAvviso(id) {
  if (!corrente || (id != null && corrente.id !== id)) return;

  pubblica(null);
}

export function iscriviAvvisi(rilegge) {
  ascoltatori.add(rilegge);

  return () => ascoltatori.delete(rilegge);
}

export const avvisoCorrente = () => corrente;
