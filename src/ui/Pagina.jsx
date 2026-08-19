/**
 * La cornice interna di ogni pagina.
 *
 * Tutte le schermate cominciano allo stesso modo: stesso margine,
 * stesso posto per il titolo, stessa distanza dal contenuto. Averlo
 * in un componente significa che una modifica alla spaziatura vale
 * per tutto il sito, e che nessuna pagina può "sfasarsi" dalle altre.
 */
export default function Pagina({ titolo, occhiello, sommario, azioni, children }) {
  return (
    <div className="mx-auto w-full max-w-[110rem] px-3 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-12">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 sm:mb-8 sm:gap-y-4">
        <div className="min-w-0">
          {occhiello && (
            <p className="mb-2 hidden text-xs font-medium uppercase tracking-[0.18em] text-brass-500/80 sm:block">
              {occhiello}
            </p>
          )}

          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-bright sm:text-4xl">
            {titolo}
          </h1>

          {sommario && (
            <p className="mt-1 max-w-2xl text-xs text-ink-muted sm:mt-2 sm:text-sm">{sommario}</p>
          )}
        </div>

        {azioni && <div className="flex flex-wrap items-center gap-2">{azioni}</div>}
      </header>

      {children}
    </div>
  );
}

/**
 * Un blocco dentro la pagina, con il suo titoletto.
 * Serve a dare gerarchia senza inventare uno stile diverso ogni volta.
 */
export function Sezione({ titolo, extra, children, className = "" }) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(titolo || extra) && (
        <div className="flex items-baseline justify-between gap-4">
          {titolo && (
            <h2 className="font-display text-xl font-semibold text-ink-bright">
              {titolo}
            </h2>
          )}
          {extra}
        </div>
      )}

      {children}
    </section>
  );
}

/** Il pannello di vetro: il contenitore standard dei contenuti. */
export function Pannello({ children, className = "" }) {
  return (
    <div
      className={`rounded-panel border border-hairline bg-glass-1 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
