import { useRef } from "react";

/**
 * Chiude un velo solo se il click è iniziato *e* finito sul velo
 * stesso, non su quello che ci sta sopra.
 *
 * Il solo controllo `e.target === e.currentTarget` nel click non
 * basta: se il "mousedown" parte dentro il modulo — selezionando testo
 * in una textarea, trascinando lo slider di un campo numerico — e il
 * rilascio scivola fuori sul velo, il browser sintetizza comunque un
 * click sull'antenato comune, cioè il velo stesso, e il modulo si
 * chiude portandosi via quello che si stava scrivendo. Tracciare anche
 * il mousedown è l'unico modo per distinguere un click vero dal velo
 * da un trascinamento che ci è solo finito sopra.
 */
export default function useChiusuraVelo(onChiudere) {
  const giuSulVelo = useRef(false);

  return {
    onMouseDown: (e) => {
      giuSulVelo.current = e.target === e.currentTarget;
    },
    onClick: (e) => {
      if (giuSulVelo.current && e.target === e.currentTarget) onChiudere();
      giuSulVelo.current = false;
    }
  };
}
