import { useEffect, useRef } from "react";

/**
 * Quello che una finestra deve fare perché da tastiera e da lettore di
 * schermo sia una finestra e non solo un riquadro sopra la pagina:
 * Escape la chiude, e il fuoco ci entra.
 *
 * Per le finestre che hanno un disegno loro (la busta che vola, la
 * cartolina che esce) e quindi non possono passare da `Foglio`. Quelle
 * che ci passano non ne hanno bisogno: `Foglio` fa già tutto questo.
 *
 * Il resto — la pagina sotto che si ferma e non risponde, il fuoco che
 * torna al bottone di partenza — lo dà `Sovrapposizione`, e vale per
 * chiunque ci si appoggi. Qui resta quello che dipende dalla finestra:
 * da quale elemento si chiude, e dove prende il fuoco.
 *
 * Uso:
 *   const ref = useFinestra(chiudi);
 *   <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} …>
 *
 * @param chiudi  funzione che chiude
 * @param opzioni.attiva  falso per sospendere Escape (per esempio mentre
 *        la richiesta è in volo e chiudere vorrebbe dire abbandonarla)
 */
export default function useFinestra(chiudi, { attiva = true } = {}) {
  const ref = useRef(null);
  const chiudiRef = useRef(chiudi);
  const attivaRef = useRef(attiva);

  useEffect(() => {
    chiudiRef.current = chiudi;
    attivaRef.current = attiva;
  }, [chiudi, attiva]);

  useEffect(() => {
    const nodo = ref.current;

    // Se dentro c'è già un campo che ha preso il cursore (`autoFocus`) lo
    // si lascia dov'è: gli effetti dei figli girano prima di questo, e
    // spostare il fuoco sulla finestra chiuderebbe la tastiera appena
    // aperta. È la stessa regola di `Foglio`.
    if (nodo && !nodo.contains(document.activeElement)) nodo.focus({ preventScroll: true });

    function alTasto(e) {
      if (e.key === "Escape" && attivaRef.current) chiudiRef.current?.();
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, []);

  return ref;
}
