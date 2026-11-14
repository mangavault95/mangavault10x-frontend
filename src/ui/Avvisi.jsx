import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Icon from "../app/Icon";
import { avvisoCorrente, iscriviAvvisi, togliAvviso } from "../dati/avvisi";

/**
 * Dove gli avvisi si vedono (chi li fa partire: `dati/avvisi.js`).
 *
 * Sta sopra la barra bassa, alla stessa altezza del tondo «aggiungi»: è
 * la fascia che il pollice raggiunge senza cambiare presa, ed è lì che
 * deve stare «Annulla». Su schermo largo scende nell'angolo in basso.
 *
 * `role="status"` e non `alert`: è una ricevuta, non un'emergenza, e un
 * lettore di schermo la legge quando ha finito la frase in corso.
 */
export default function Avvisi() {
  const avviso = useSyncExternalStore(iscriviAvvisi, avvisoCorrente, () => null);

  useEffect(() => {
    if (!avviso) return undefined;

    const t = setTimeout(() => togliAvviso(avviso.id), avviso.durata);

    return () => clearTimeout(t);
  }, [avviso]);

  if (!avviso) return null;

  const errore = avviso.tono === "errore";

  // Su <body> e non dentro la pagina: mentre una finestra è aperta la
  // pagina è `inert` (vedi `Sovrapposizione.jsx`), e un avviso rimasto
  // lì dentro si vedrebbe ma non si potrebbe toccare.
  return createPortal(
    <div
      // La chiave fa ripartire entrata e tempo quando un avviso ne
      // sostituisce un altro: senza, il secondo erediterebbe la riga già
      // mezza consumata del primo.
      key={avviso.id}
      role="status"
      className="avviso-entra fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-toast mx-auto flex min-h-[3.25rem] max-w-md items-center gap-3 overflow-hidden rounded-card border border-soft bg-glass-3 pl-4 pr-1.5 shadow-raised md:bottom-6"
    >
      <span
        aria-hidden="true"
        className={`avviso-spunta grid h-6 w-6 shrink-0 place-items-center rounded-full text-void ${
          errore ? "bg-ember" : "bg-jade"
        }`}
      >
        <Icon nome={errore ? "close" : "spunta"} dimensione={14} />
      </span>

      <p className="min-w-0 flex-1 truncate py-3 text-sm font-semibold text-ink-bright">{avviso.testo}</p>

      {avviso.azione ? (
        <button
          type="button"
          onClick={() => {
            const { alTocco } = avviso.azione;

            togliAvviso(avviso.id);
            alTocco?.();
          }}
          className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-bold text-ciano focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciano"
        >
          {avviso.azione.etichetta}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => togliAvviso(avviso.id)}
          aria-label="Chiudi"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciano"
        >
          <Icon nome="close" dimensione={16} />
        </button>
      )}

      <span
        aria-hidden="true"
        style={{ animationDuration: `${avviso.durata}ms` }}
        className={`avviso-tempo absolute inset-x-0 bottom-0 h-0.5 origin-left ${errore ? "bg-ember/70" : "bg-ciano/70"}`}
      />
    </div>,
    document.body
  );
}
