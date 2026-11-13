/**
 * Le conferme: «sei sicuro?» chiesto con un foglio del sito, non con la
 * finestra grigia del browser.
 *
 * Fino al 13/11/2026 Kachinuki chiamava `window.confirm`: una finestra di
 * sistema, col nome del sito in cima e due bottoni che non somigliano a
 * niente del resto — e che nell'app installata sulla Home tradisce subito
 * che sotto c'è una pagina web.
 *
 * Si usa come si usava quella, con un `await` davanti:
 *
 *   if (!(await chiedi({ titolo: "Lasciare la partita?", conferma: "Lascia" }))) return;
 *
 * Fuori da React per la stessa ragione di `dati/avvisi.js`: la domanda la
 * fa una funzione, e una funzione non ha hook. A mostrarla è
 * `ui/Conferme.jsx`, montato una volta nella cornice.
 */

let corrente = null;

const ascoltatori = new Set();

function pubblica(nuova) {
  corrente = nuova;
  ascoltatori.forEach((rilegge) => rilegge());
}

/**
 * @param {object} domanda
 * @param {string} domanda.titolo    La domanda, breve.
 * @param {string} [domanda.testo]   Cosa succede dicendo di sì.
 * @param {string} [domanda.conferma] Il verbo dell'azione («Cancella»), mai «OK».
 * @param {boolean} [domanda.pericolo] Se quello che si conferma non si può disfare.
 * @returns {Promise<boolean>} `true` solo se è stato toccato il bottone di conferma.
 */
export function chiedi({ titolo, testo = "", conferma = "Conferma", annulla = "Annulla", pericolo = false }) {
  // Una domanda rimasta aperta sotto una nuova vale come un no.
  corrente?.rispondi(false);

  return new Promise((risolvi) => {
    pubblica({
      titolo,
      testo,
      conferma,
      annulla,
      pericolo,
      rispondi: (esito) => {
        pubblica(null);
        risolvi(esito);
      }
    });
  });
}

export function iscriviConferme(rilegge) {
  ascoltatori.add(rilegge);

  return () => ascoltatori.delete(rilegge);
}

export const confermaCorrente = () => corrente;
