import { useRef, useState } from "react";
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
  const colonna = useRef(null);

  // Un ordine con un'eccezione può ripetere una lettera: la colonna no.
  const uniche = [...new Set(lettere)];

  function scorriA(l) {
    document.getElementById(idLettera(l))?.scrollIntoView({ block: "start" });
  }

  function alTrascinamento(e) {
    if (e.buttons === 0 && e.pointerType === "mouse") return;

    const r = colonna.current?.getBoundingClientRect();

    if (!r || !r.height || !uniche.length) return;

    const i = Math.min(uniche.length - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * uniche.length)));
    const l = uniche[i];

    if (l && l !== corrente) {
      setCorrente(l);
      scorriA(l);
    }
  }

  return (
    <>
      <nav
        aria-label="Indice alfabetico"
        onPointerDown={alTrascinamento}
        onPointerMove={alTrascinamento}
        onPointerUp={() => setCorrente(null)}
        onPointerCancel={() => setCorrente(null)}
        className="fixed right-0 top-1/2 z-sticky flex w-11 -translate-y-1/2 touch-none select-none justify-end"
      >
        <div ref={colonna} className={`flex flex-col items-center rounded-full py-1.5 backdrop-blur-sm ${fondo}`}>
          {uniche.map((l) => (
            <button
              key={l}
              type="button"
              data-lettera={l}
              onClick={() => scorriA(l)}
              aria-label={`Vai alla ${l}`}
              className={`grid h-[1.15rem] w-6 place-items-center font-numeric text-micro font-semibold leading-none
                ${corrente === l ? attivo : testo}`}
            >
              {l}
            </button>
          ))}
        </div>
      </nav>

      {/* La lettera sotto il dito, grande: il dito stesso la copre. */}
      {corrente && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-overlay grid place-items-center">
          <span className="grid h-20 w-20 place-items-center rounded-panel bg-glass-3 font-display text-4xl font-bold text-ink-bright shadow-float backdrop-blur">
            {corrente}
          </span>
        </div>
      )}
    </>
  );
}
