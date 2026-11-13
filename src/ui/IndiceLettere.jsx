import { useState } from "react";
import { idLettera } from "../dati/lettere";

/**
 * L'indice A–Z sul bordo destro, come la rubrica del telefono: si tocca
 * una lettera, o si trascina il dito lungo la colonna, e la lista salta
 * al capitolo. Con duecento serie è l'unico modo di arrivare alla «T»
 * senza scorrere per dieci schermate.
 *
 * Le sezioni da raggiungere hanno `id={idLettera(lettera)}`. I colori si
 * passano da fuori perché la colonna sta sia sulla collezione dei manga
 * sia sulla videoteca, che hanno due tavolozze.
 */
export default function IndiceLettere({
  lettere,
  fondo = "bg-void/50",
  testo = "text-ink-muted",
  attivo = "text-brass-300"
}) {
  const [corrente, setCorrente] = useState(null);

  // Un ordine con un'eccezione può ripetere una lettera: la colonna no.
  const uniche = [...new Set(lettere)];

  function vaiA(l) {
    setCorrente(l);
    document.getElementById(idLettera(l))?.scrollIntoView({ block: "start" });
  }

  function alTrascinamento(e) {
    if (e.buttons === 0 && e.pointerType === "mouse") return;

    const l = document.elementFromPoint(e.clientX, e.clientY)?.getAttribute?.("data-lettera");

    if (l && l !== corrente) vaiA(l);
  }

  return (
    <nav
      aria-label="Indice alfabetico"
      onPointerDown={alTrascinamento}
      onPointerMove={alTrascinamento}
      onPointerUp={() => setCorrente(null)}
      onPointerCancel={() => setCorrente(null)}
      className={`fixed right-0.5 top-1/2 z-sticky flex -translate-y-1/2 touch-none select-none flex-col items-center rounded-full py-1.5 backdrop-blur-sm ${fondo}`}
    >
      {uniche.map((l) => (
        <button
          key={l}
          type="button"
          data-lettera={l}
          onClick={() => vaiA(l)}
          aria-label={`Vai alla ${l}`}
          className={`grid h-[1.15rem] w-6 place-items-center font-numeric text-micro font-semibold leading-none
            ${corrente === l ? attivo : testo}`}
        >
          {l}
        </button>
      ))}
    </nav>
  );
}
