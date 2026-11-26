/**
 * Lo stato di una serie della collezione, detto con una FORMA oltre che
 * con un colore (P2-02): chi non distingue il rosso dal verde — circa
 * un uomo su dodici — non può leggere «completa» e «mancano volumi» da
 * un anello soltanto, e guardata in scala di grigi la schermata non
 * deve cambiare significato.
 *
 *   ✓  Completa                    (verde: conclusa e ce l'hai tutta)
 *   =  In pari con le uscite       (viola: hai tutto quello che è uscito)
 *   !  Mancano volumi              (rosso)
 *
 * Il glifo sta nella legenda e accanto a ogni serie, sempre lo stesso.
 * L'anello di completamento resta com'è: dice QUANTO, non COME STAI.
 */
import { STATI_SERIE } from "../dati/statoSerie";

/** Il glifo accanto a una serie. */
export function GlifoStato({ stato, className = "" }) {
  const { nome, glifo, testo } = STATI_SERIE[stato];

  return (
    <span role="img" aria-label={nome} title={nome} className={`font-numeric font-bold ${testo} ${className}`}>
      {glifo}
    </span>
  );
}

/** Il segno della legenda: un cerchietto con dentro il glifo. */
export function SegnoLegenda({ stato }) {
  const { glifo, bordo, testo } = STATI_SERIE[stato];

  return (
    <span
      aria-hidden="true"
      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 font-numeric text-[0.625rem] font-bold leading-none ${bordo} ${testo}`}
    >
      {glifo}
    </span>
  );
}
