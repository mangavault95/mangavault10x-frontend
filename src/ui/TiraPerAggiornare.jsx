import { useEffect, useRef } from "react";
import Icon from "../app/Icon";
import { vibra } from "../dati/tatto";
import { AGGIORNA } from "../dati/useRisorsa";

/**
 * Tirare giù la pagina per aggiornarla.
 *
 * Nell'app installata sulla schermata Home non c'è la barra di Safari, e
 * senza barra non c'è nemmeno il tasto per ricaricare: fino al 13/11/2026
 * l'unico modo di vedere un volume appena registrato dal bot era chiudere
 * l'app e riaprirla. Questo è il gesto che in ogni app fa quel lavoro.
 *
 * NON RICARICA LA PAGINA: chiede a chi ha dei dati sullo schermo di
 * richiederli (`AGGIORNA`, ascoltato da `dati/useRisorsa.js`). La pagina
 * resta dov'è, con i suoi filtri e la sua posizione, e cambia solo quello
 * che sul server è cambiato.
 *
 * Parte solo se la pagina è già in cima, se il dito scende più di quanto
 * si sposta di lato (le file che scorrono in orizzontale restano loro) e
 * se sopra non c'è un foglio aperto — lì lo stesso gesto chiude il foglio.
 *
 * Il tondo si muove scrivendo `transform` e `opacity` direttamente sul
 * nodo: a 120 Hz un render di React per fotogramma si vedrebbe.
 */

const SOGLIA = 64; // quanto deve scendere il tondo perché rilasciare aggiorni
const MASSIMO = 104; // oltre non scende: il resto del gesto è resistenza
const RIPOSO = 56; // dove si ferma a girare mentre i dati arrivano
const DURATA_MINIMA = 500; // sotto, il giro lampeggia e sembra un difetto

export default function TiraPerAggiornare() {
  const tondo = useRef(null);
  const freccia = useRef(null);

  useEffect(() => {
    const nodo = tondo.current;
    const icona = freccia.current;

    if (!nodo || !icona) return undefined;

    let gesto = null;
    let occupato = false;

    function metti(giu, animato) {
      nodo.style.transition = animato
        ? "transform var(--d-foglio) var(--e-posa), opacity var(--d-rapido) linear"
        : "none";
      nodo.style.transform = `translate3d(-50%, ${giu - 48}px, 0)`;
      nodo.style.opacity = String(Math.min(1, giu / (SOGLIA * 0.6)));
      // La freccia fa quasi un giro arrivando alla soglia: si capisce
      // quanto manca senza una scritta.
      icona.style.transform = `rotate(${Math.min(giu / SOGLIA, 1.2) * 300}deg)`;
    }

    function inizia(e) {
      if (occupato || e.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      // Un foglio aperto ferma la pagina mettendo il body `fixed`
      // (`ui/Sovrapposizione.jsx`): lì il gesto è suo.
      if (document.body.style.position === "fixed") return;

      const t = e.touches[0];

      gesto = { x0: t.clientX, y0: t.clientY, attivo: false, giu: 0, armato: false };
    }

    function muovi(e) {
      if (!gesto) return;

      const t = e.touches[0];
      const dx = t.clientX - gesto.x0;
      const dy = t.clientY - gesto.y0;

      if (!gesto.attivo) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

        // Verso l'alto, di lato, o con la pagina che nel frattempo è
        // scesa: non è questo gesto.
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
          gesto = null;
          return;
        }

        gesto.attivo = true;
        gesto.y0 = t.clientY;

        return;
      }

      // Metà della strada del dito, e mai oltre il massimo.
      gesto.giu = Math.max(0, Math.min(MASSIMO, dy * 0.5));

      const armato = gesto.giu >= SOGLIA;

      // Il colpetto dice «adesso puoi lasciare», senza dover guardare.
      if (armato && !gesto.armato) vibra();
      gesto.armato = armato;

      metti(gesto.giu, false);

      // Ferma il rimbalzo elastico di Safari, che tirerebbe giù anche la pagina.
      if (e.cancelable) e.preventDefault();
    }

    async function finisci() {
      const era = gesto;

      gesto = null;

      if (!era?.attivo) return;

      if (!era.armato) {
        metti(0, true);
        return;
      }

      occupato = true;
      metti(RIPOSO, true);
      icona.style.transform = "";
      icona.classList.add("animate-spin");

      // Chi ascolta aggiunge qui la sua richiesta: così il tondo gira
      // finché l'ultima non ha risposto, e non per un tempo a caso.
      const attese = [];

      window.dispatchEvent(new CustomEvent(AGGIORNA, { detail: { attese } }));

      await Promise.allSettled([...attese, new Promise((fatto) => setTimeout(fatto, DURATA_MINIMA))]);

      icona.classList.remove("animate-spin");
      metti(0, true);
      occupato = false;
    }

    window.addEventListener("touchstart", inizia, { passive: true });
    window.addEventListener("touchmove", muovi, { passive: false });
    window.addEventListener("touchend", finisci);
    window.addEventListener("touchcancel", finisci);

    return () => {
      window.removeEventListener("touchstart", inizia);
      window.removeEventListener("touchmove", muovi);
      window.removeEventListener("touchend", finisci);
      window.removeEventListener("touchcancel", finisci);
    };
  }, []);

  // Fuori schermo e trasparente finché non lo si tira: lo stile iniziale
  // sta qui e non in una classe perché poi lo riscrive il gesto.
  return (
    <div
      ref={tondo}
      aria-hidden="true"
      style={{ transform: "translate3d(-50%, -48px, 0)", opacity: 0 }}
      className="pointer-events-none fixed left-1/2 top-[env(safe-area-inset-top)] z-toast grid h-10 w-10 place-items-center rounded-full border border-soft bg-glass-3 text-brass-400 shadow-raised"
    >
      <span ref={freccia} className="grid place-items-center">
        <Icon nome="aggiorna" dimensione={18} />
      </span>
    </div>
  );
}
