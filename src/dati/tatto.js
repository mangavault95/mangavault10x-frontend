/**
 * Il colpetto sotto il dito: la conferma che un'app dà senza farsi guardare.
 *
 * Serve ai gesti che si fanno di continuo e di cui non si aspetta l'esito
 * sullo schermo — un voto, un preferito, «preso», «finito il 23».
 *
 * DUE STRADE, PERCHÉ IL TELEFONO CHE CONTA NON HA QUELLA NORMALE
 *
 * `navigator.vibrate` è lo standard, e su iPhone non esiste: Safari non
 * l'ha mai avuto. Da iOS 17.4 però l'interruttore di sistema
 * (`<input type="checkbox" switch>`) dà il suo colpetto quando cambia
 * stato, anche se a toccarlo è la sua etichetta e anche se non si vede.
 * Quindi su iPhone si costruisce un interruttore invisibile, lo si fa
 * scattare e lo si butta via.
 *
 * ⚠️ È un comportamento di Safari, non una promessa di Apple: se un
 * giorno smette, questa funzione non fa niente e nessuno se ne accorge —
 * che è esattamente come deve fallire una cosa così. Per lo stesso
 * motivo va chiamata SUBITO nel gestore del tocco, prima di qualunque
 * `await`: Safari lo concede solo dentro il gesto dell'utente.
 */

function colpettoSafari() {
  const etichetta = document.createElement("label");
  const interruttore = document.createElement("input");

  interruttore.type = "checkbox";
  interruttore.setAttribute("switch", "");
  etichetta.setAttribute("aria-hidden", "true");
  etichetta.style.display = "none";
  etichetta.appendChild(interruttore);

  document.body.appendChild(etichetta);
  etichetta.click();
  etichetta.remove();
}

/**
 * @param {"leggero"|"conferma"} tipo
 *        `leggero` per un tocco che cambia qualcosa (un voto, un filtro);
 *        `conferma` per una cosa fatta e registrata (comprato, letto).
 *        Su iPhone i due sono uguali: l'interruttore ha un colpetto solo.
 */
export function vibra(tipo = "leggero") {
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(tipo === "conferma" ? [12, 50, 18] : 10);
      return;
    }

    // Solo dove si tocca: su un computer non c'è niente che possa vibrare,
    // e creare nodi a ogni click sarebbe lavoro per nessuno.
    if (window.matchMedia?.("(hover: none)").matches) colpettoSafari();
  } catch {
    // Un colpetto mancato non è un errore da raccontare a nessuno.
  }
}
