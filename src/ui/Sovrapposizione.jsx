import { createPortal } from "react-dom";

/**
 * Monta i figli direttamente su <body>, fuori dall'albero di <main>.
 *
 * <main> (Shell.jsx) porta `animate-rise-in`, e un'animazione che
 * sposta l'elemento gli mette addosso un transform. Un ancestor
 * trasformato diventa il riferimento dei suoi discendenti
 * `position: fixed`, che smettono di ancorarsi alla finestra e si
 * centrano invece sull'intera altezza della pagina — se la pagina è
 * più lunga dello schermo, il centro cade fuori dalla parte visibile,
 * di solito molto più in basso di dove si è appena premuto.
 *
 * Il transform residuo dopo l'animazione è stato tolto
 * (`tailwind.config.js`, `backwards` invece di `both`), ma non basta e
 * non basterebbe mai: finché l'animazione scorre il transform c'è
 * davvero, ed è proprio il momento in cui una pagina appena aperta
 * viene toccata. Ogni velo/modulo `fixed inset-0` di una pagina va
 * quindi portato qui, fuori dall'albero di <main>.
 */
export default function Sovrapposizione({ children }) {
  return createPortal(children, document.body);
}
