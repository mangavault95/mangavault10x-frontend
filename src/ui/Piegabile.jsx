import { useState } from "react";
import Icon from "../app/Icon";
import { useStretto } from "./tocco";

/**
 * Un blocco che sul telefono sta chiuso, e su schermo largo non esiste.
 *
 * Nasce da un conto fatto su un iPhone: nella Collezione la prima
 * copertina cominciava a 1362 pixel dall'alto. Su uno schermo alto 932
 * significa aprire la pagina e non vederne **nessuna** — prima vengono la
 * vetrina, i numeri e il carosello dei consigli, che su un monitor stanno
 * comodi in cima e su un telefono sono uno schermo e mezzo di anticamera.
 *
 * La cura non è toglierli: sono roba buona, e togliere pezzi al telefono
 * vuol dire avere due siti da tenere in piedi invece di uno. Si piegano.
 * Una riga sola, e chi vuole guardarli li apre.
 *
 * Su schermo largo il componente si fa da parte del tutto e restituisce i
 * suoi figli: nessun involucro, nessuna riga in più, la pagina è quella di
 * prima. Ed è per questo che la domanda va fatta in JavaScript e non con
 * `lg:hidden`: piegato, quello che c'è dentro non deve nemmeno esistere —
 * la vetrina è una scena WebGL e i consigli sono una richiesta ad AniList,
 * e pagarle per un cassetto che nessuno ha aperto sarebbe il contrario di
 * quello che si sta facendo qui.
 */
export default function Piegabile({ titolo, children }) {
  const stretto = useStretto();
  const [aperto, setAperto] = useState(false);

  if (!stretto) return children;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setAperto((a) => !a)}
        aria-expanded={aperto}
        className="flex w-full items-center justify-between gap-3 rounded-card border border-hairline bg-glass-1 px-4 py-3
                   text-left text-sm font-medium text-ink transition-colors duration-quick
                   active:bg-glass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      >
        <span>{titolo}</span>

        <span
          aria-hidden="true"
          className={`text-ink-muted transition-transform duration-base ease-settle ${
            aperto ? "-rotate-90" : "rotate-90"
          }`}
        >
          <Icon nome="back" dimensione={16} />
        </span>
      </button>

      {aperto && <div className="mt-4 space-y-5">{children}</div>}
    </div>
  );
}
