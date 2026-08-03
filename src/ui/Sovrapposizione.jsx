import { createPortal } from "react-dom";

/**
 * Monta i figli direttamente su <body>, fuori dall'albero di <main>.
 *
 * <main> (Shell.jsx) porta `animate-rise-in`: l'animazione finisce su
 * un transform diverso da "none", che quindi resta anche a riposo. Un
 * ancestor con un transform del genere diventa il riferimento per i
 * suoi discendenti `position: fixed`, che smettono di ancorarsi alla
 * finestra e si centrano invece sull'intera altezza della pagina — se
 * la pagina è più lunga dello schermo, il centro cade fuori dalla
 * parte visibile. Ogni velo/modulo `fixed inset-0` di una pagina va
 * quindi portato qui, fuori dall'albero di <main>.
 */
export default function Sovrapposizione({ children }) {
  return createPortal(children, document.body);
}
