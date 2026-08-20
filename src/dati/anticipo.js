import { getManga } from "../services/api";
import { normalizzaElenco } from "./serie";

/**
 * La collezione, chiesta prima che il sito esista.
 *
 *
 * PERCHÉ NON ASPETTARE REACT
 *
 * La collezione la chiedeva `CollezioneProvider`, cioè un effetto di un
 * componente: la richiesta partiva dopo che il browser aveva scaricato,
 * interpretato ed eseguito duecento chilobyte di JavaScript, e dopo che
 * React aveva montato l'albero. Nel frattempo la rete stava ferma.
 *
 * Qui invece parte al primo istante — questo modulo lo importa
 * `main.jsx` prima di ogni altra cosa — e il viaggio fino a Render si
 * sovrappone al lavoro del browser invece di venire dopo. Sono qualche
 * centinaio di millesimi, sempre, su ogni pagina.
 *
 *
 * PERCHÉ TENERNE UNA COPIA
 *
 * Il server sta su un piano gratuito che si addormenta: la prima
 * richiesta dopo un quarto d'ora di pace paga il risveglio della
 * macchina, che sono decine di secondi in cui il sito è una pagina
 * vuota. Non è una cosa che si possa ottimizzare da qui.
 *
 * Quello che si può fare è non avere bisogno di aspettarla. La
 * collezione dell'ultima visita resta nel browser: alla successiva le
 * pagine si disegnano subito con quella, mentre la richiesta vera parte
 * lo stesso e sostituisce i dati appena arriva. Chi torna sul sito non
 * vede più nessuna attesa; chi ci arriva la prima volta sta come prima.
 *
 * La copia va invalidata a mano quando cambia la forma dei dati (vedi
 * `normalizzaElenco` in `serie.js`): il numero qui sotto serve a questo,
 * e va alzato quando si aggiunge o si rinomina un campo.
 */

const CHIAVE = "mangavault:collezione";

// 2 = i voti sono diventati una lista di persone (`voti`) invece di un
// numero solo (`valutazione`). Una copia vecchia riportata su con la
// forma di prima mostrerebbe tutte le serie come non votate.
//
// La copia non dipende da chi guarda ed è giusto così: dentro ci sono i
// voti di tutti, ed è il sito a pescarne uno.
//
// 3 = stessa cosa per le droppate (`droppate`, prima il booleano
// `droppato`). Una copia vecchia le darebbe tutte non droppate.
//
// 4 = sono arrivate le note e l'elenco di chi ha letto cosa
// (`note`, `lettori`). Una copia vecchia mostrerebbe ogni scheda senza
// note e il filtro "lette da" non selezionerebbe niente.
const VERSIONE = 4;

// Oltre una giornata la copia non si usa più nemmeno come primo
// disegno: meglio la barra di caricamento di una collezione di ieri
// presentata come quella di adesso.
const SCADENZA_MS = 24 * 60 * 60 * 1000;

let inVolo = null;

/**
 * Fa partire la richiesta. Chiamarla più volte non ne fa partire più di
 * una: la prima vince e le altre ricevono la stessa promessa.
 */
export function anticipaCollezione() {
  if (inVolo) return inVolo;

  inVolo = getManga().then(normalizzaElenco);

  // Se nessuno la ritira in tempo (una rete giù mentre React sta ancora
  // montando) il rifiuto resterebbe senza ascoltatori e il browser lo
  // segnalerebbe come errore non gestito. Questo ramo lo ascolta e non
  // fa niente: la promessa vera continua per la sua strada, rifiuto
  // compreso, verso chi la ritira.
  inVolo.catch(() => {});

  return inVolo;
}

/**
 * La richiesta anticipata, una volta sola. Dopo, e a ogni `ricarica()`,
 * si torna a chiedere al server per davvero.
 */
export function collezione() {
  const anticipata = inVolo;

  inVolo = null;

  return anticipata ?? getManga().then(normalizzaElenco);
}

/** Quella dell'ultima visita, se c'è ed è ancora fresca. */
export function copiaLocale() {
  try {
    const grezzo = localStorage.getItem(CHIAVE);

    if (!grezzo) return null;

    const { versione, quando, serie } = JSON.parse(grezzo);

    if (versione !== VERSIONE) return null;
    if (!Array.isArray(serie) || !serie.length) return null;
    if (Date.now() - quando > SCADENZA_MS) return null;

    return serie;
  } catch {
    // Archiviazione piena, spenta, o copia illeggibile: si fa senza.
    return null;
  }
}

/**
 * Mette via la collezione per la prossima visita.
 *
 * Non subito: sono quasi quattrocento chilobyte da trasformare in testo
 * e da scrivere su disco, e `localStorage` è sincrono — cioè blocca la
 * pagina mentre lo fa. Il momento in cui i dati arrivano è esattamente
 * quello in cui la pagina li sta disegnando, e rubarle dieci millesimi
 * lì significa vedere un salto. Si aspetta che il browser abbia un
 * momento libero: a nessuno importa *quando* la copia viene scritta.
 */
export function salvaCopiaLocale(serie) {
  if (!serie?.length) return;

  const scrivi = () => {
    try {
      localStorage.setItem(
        CHIAVE,
        JSON.stringify({ versione: VERSIONE, quando: Date.now(), serie })
      );
    } catch {
      /* niente copia: la prossima visita aspetterà la rete, come prima */
    }
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(scrivi, { timeout: 4000 });
  } else {
    setTimeout(scrivi, 1000);
  }
}
