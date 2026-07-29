import { useEffect, useRef } from "react";
import Icon from "../app/Icon";

/**
 * I comandi che compaiono in più pagine: ricerca, filtri, ordinamento.
 *
 * Sono qui perché una casella di ricerca che si comporta in modo
 * diverso da una pagina all'altra è un piccolo tradimento continuo.
 */

/**
 * Ricerca con scorciatoia: "/" porta il cursore qui da qualunque
 * punto della pagina, Esc svuota e restituisce il fuoco al contenuto.
 */
export function CampoRicerca({ valore, onCambia, segnaposto = "Cerca…", risultati }) {
  const campo = useRef(null);

  useEffect(() => {
    function alTasto(e) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;

      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo || e.target.isContentEditable) return;

      e.preventDefault();
      campo.current?.focus();
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, []);

  return (
    <div className="relative w-full sm:w-72">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
        <Icon nome="search" dimensione={16} />
      </span>

      <input
        ref={campo}
        type="search"
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onCambia("");
            e.currentTarget.blur();
          }
        }}
        placeholder={segnaposto}
        aria-label={segnaposto}
        className="w-full rounded-card border border-hairline bg-glass-1 py-2.5 pl-10 pr-10 text-sm text-ink-bright
                   placeholder:text-ink-faint outline-none backdrop-blur-xl transition-colors duration-quick
                   hover:border-soft focus:border-brass-400/60 focus:bg-glass-2
                   [&::-webkit-search-cancel-button]:appearance-none"
      />

      {!valore && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-soft bg-glass-1 px-1.5 py-0.5 font-numeric text-[0.65rem] text-ink-faint sm:block">
          /
        </kbd>
      )}

      {/* Il conteggio dei risultati va annunciato: chi usa un lettore
          di schermo non vede la griglia accorciarsi. */}
      {valore && (
        <p aria-live="polite" className="sr-only">
          {risultati === 1 ? "1 risultato" : `${risultati} risultati`}
        </p>
      )}
    </div>
  );
}

/**
 * I filtri come gruppo di pastiglie.
 *
 * `role="tablist"` non sarebbe corretto (non ci sono pannelli),
 * quindi restano bottoni con `aria-pressed`: lo stato acceso/spento
 * arriva anche a chi non vede il colore.
 */
export function Pastiglie({ opzioni, attiva, onCambia, conteggi }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {opzioni.map((o) => {
        const accesa = o.id === attiva;
        const quante = conteggi?.[o.id];

        return (
          <button
            key={o.id}
            onClick={() => onCambia(o.id)}
            aria-pressed={accesa}
            title={o.descrizione}
            className={`rounded-card border px-3.5 py-2 text-sm font-medium transition-all duration-quick ease-settle
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf
              active:scale-95
              ${
                accesa
                  ? "border-brass-400 bg-brass-400 text-void"
                  : "border-hairline bg-glass-1 text-ink-muted hover:border-soft hover:text-ink-bright"
              }`}
          >
            {o.etichetta}

            {quante !== undefined && (
              <span
                className={`ml-2 font-numeric text-xs ${
                  accesa ? "text-void/60" : "text-ink-faint"
                }`}
              >
                {quante}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Menu a tendina nello stile del resto: il `select` di sistema stona.
 *
 * L'etichetta sta fuori dal menu, non ripetuta dentro ogni voce:
 * un elenco che dice "Ordina: Titolo / Ordina: Voto / Ordina: …"
 * fa leggere la stessa parola sei volte per scegliere una volta.
 */
export function Tendina({ etichetta, valore, opzioni, onCambia }) {
  return (
    <label className="relative inline-flex items-center gap-2.5">
      <span className="hidden text-xs font-medium uppercase tracking-wider text-ink-muted sm:block">
        {etichetta}
      </span>

      <select
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
        aria-label={etichetta}
        className="appearance-none rounded-card border border-hairline bg-glass-1 py-2.5 pl-3.5 pr-9 text-sm text-ink-bright
                   outline-none backdrop-blur-xl transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
      >
        {opzioni.map((o) => (
          <option key={o.id} value={o.id} className="bg-alcove text-ink-bright">
            {o.etichetta}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute right-3 text-ink-faint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </label>
  );
}

/** Bottone principale, usato per le azioni che contano. */
export function Bottone({ variante = "primario", className = "", children, ...resto }) {
  const stili = {
    primario:
      "bg-brass-400 text-void hover:brightness-110 shadow-brass",
    secondario:
      "border border-soft bg-glass-2 text-ink-bright hover:bg-glass-3",
    fantasma: "text-ink-muted hover:bg-glass-1 hover:text-ink-bright",
    pericolo: "border border-ember/30 bg-ember/10 text-ember hover:bg-ember/20"
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-card px-4 py-2.5 text-sm font-semibold
        transition-all duration-quick ease-settle
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf
        disabled:pointer-events-none disabled:opacity-40
        active:scale-95 ${stili[variante]} ${className}`}
      {...resto}
    >
      {children}
    </button>
  );
}
