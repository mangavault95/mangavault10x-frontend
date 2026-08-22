import { coloreLettore } from "../../dati/lettori";

/**
 * La faccia di una persona, in videoteca.
 *
 * Un esagono e non un cerchio. Non è un vezzo: in questo sito nessuno
 * ha una foto — non c'è nessun posto da cui caricarla e non serve a
 * niente fra tre persone che si conoscono — quindi l'avatar è una
 * lettera dentro una forma. Il cerchio con la lettera dentro è il
 * ripiego di ogni applicazione esistente, e a forza di essere
 * ovunque non dice più «questo è qualcuno», dice «manca l'immagine».
 * L'esagono lo si riconosce a colpo d'occhio anche piccolo, e in
 * videoteca fa da marchio: è la forma che sta in cima a ogni pagina
 * personale.
 *
 * IL COLORE È QUELLO DEL LETTORE, lo stesso che distingue le note in
 * biblioteca (`utenti.colore`, migrazione 012). Non se ne inventa uno
 * nuovo: chi ha imparato che il lilla è Nanaki deve ritrovarlo qui.
 *
 * ⚠️ Le classi Tailwind restano scritte per intero in `dati/lettori.js`
 * e non composte a pezzi: una classe formata unendo stringhe non
 * finisce mai nel CSS prodotto, e l'esagono uscirebbe trasparente.
 */

// Un esagono con i lati piatti sopra e sotto e le punte ai fianchi.
// Scritto una volta: comparirebbe in tre file diversi, e tre poligoni
// leggermente diversi si notano quando stanno nella stessa schermata.
const FORMA = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

export default function Esagono({ nickname, colore, dimensione = 40, className = "" }) {
  const tinta = coloreLettore(colore);

  // La lettera scala con la forma: una lettera di dimensione fissa
  // dentro un esagono grande sembra un francobollo appiccicato in
  // mezzo, e dentro uno piccolo non ci sta.
  const corpo = Math.round(dimensione * 0.42);

  return (
    <span
      // Il nome per intero ai lettori di schermo: la lettera da sola
      // non dice chi è, e questa forma compare accanto a ogni post.
      role="img"
      aria-label={nickname || "Qualcuno"}
      title={nickname || undefined}
      className={`grid shrink-0 place-items-center font-display font-bold text-quaderno-inchiostro ${tinta.pallino} ${className}`}
      style={{
        width: dimensione,
        height: dimensione,
        clipPath: FORMA,
        fontSize: corpo,
        lineHeight: 1
      }}
    >
      <span aria-hidden="true">{(nickname || "?").trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}
