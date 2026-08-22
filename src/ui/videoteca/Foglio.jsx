/**
 * La cornice della Videoteca — l'equivalente chiaro di `ui/Pagina.jsx`.
 *
 * Esiste un componente a parte e non una variante di quello della
 * biblioteca per una ragione sola: là ogni classe parla di ottone e di
 * vetro su fondo scuro, qui di inchiostro su carta. Mescolarli avrebbe
 * voluto dire un `if` in ogni riga di stile.
 *
 * Il vocabolario di questa sezione, tutto qui dentro:
 *   carta      il fondo          foglio    le schede
 *   riga       i bordi           inchiostro il testo
 *   tenue      i metadati        blu        l'accento
 */

/** L'intestazione e il margine di ogni schermata della videoteca. */
export default function PaginaVideoteca({ titolo, occhiello, sommario, azioni, children }) {
  // Senza titolo l'intestazione non si disegna affatto. Serve alle
  // pagine che hanno una testata loro — quella di una persona ha
  // l'esagono e il soprannome — dove un `<h1>` vuoto lascerebbe uno
  // scalino di margine e un titolo senza testo per i lettori di
  // schermo.
  if (!titolo && !occhiello && !azioni) {
    return (
      <div className="mx-auto w-full max-w-[110rem] px-3 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-12">
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[110rem] px-3 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-12">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 sm:mb-8">
        <div className="min-w-0">
          {occhiello && (
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-quaderno-tenue">
              {occhiello}
            </p>
          )}

          <h1 className="font-display text-2xl font-bold tracking-tight text-quaderno-inchiostro sm:text-4xl">
            {titolo}
          </h1>

          {sommario && (
            <p className="mt-1 max-w-2xl text-xs text-quaderno-tenue sm:mt-2 sm:text-sm">
              {sommario}
            </p>
          )}
        </div>

        {azioni && <div className="flex flex-wrap items-center gap-2">{azioni}</div>}
      </header>

      {children}
    </div>
  );
}

/** Una scheda appoggiata sulla carta. */
export function Scheda({ children, className = "" }) {
  return (
    <div
      className={`rounded-card border border-quaderno-riga bg-quaderno-foglio ${className}`}
    >
      {children}
    </div>
  );
}

/** Un blocco con il suo titoletto. */
export function Blocco({ titolo, extra, children, className = "" }) {
  return (
    <section className={`space-y-3 ${className}`}>
      {(titolo || extra) && (
        <div className="flex items-baseline justify-between gap-4">
          {titolo && (
            <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro sm:text-xl">
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

/**
 * Il bottone della sezione. `tono` distingue l'azione principale da
 * quelle di contorno: una sola cosa blu per schermata, il resto
 * bordato.
 */
export function Bottone({ tono = "quieto", className = "", ...props }) {
  const toni = {
    pieno: "bg-quaderno-blu text-white hover:bg-quaderno-blu/90",
    quieto:
      "border border-quaderno-riga bg-quaderno-foglio text-quaderno-inchiostro hover:bg-quaderno-carta",
    nudo: "text-quaderno-tenue hover:text-quaderno-inchiostro"
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-quick
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu focus-visible:ring-offset-2 focus-visible:ring-offset-quaderno-carta
        disabled:cursor-not-allowed disabled:opacity-50 ${toni[tono]} ${className}`}
      {...props}
    />
  );
}

/** Un'etichetta breve: lo stato di una visione, una piattaforma. */
export function Pillola({ children, tono = "tenue", className = "" }) {
  const toni = {
    tenue: "bg-quaderno-carta text-quaderno-tenue",
    blu: "bg-quaderno-blu-tenue text-quaderno-blu",
    contorno: "border border-quaderno-riga text-quaderno-tenue"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${toni[tono]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Il progresso, come lo legge chi guarda: la riga piena e i due numeri.
 *
 * `su` può mancare — una serie in corso non sa quante puntate avrà —
 * e allora la barra non si disegna: una barra senza fondo scala
 * mentirebbe sul quanto manca.
 */
export function Progresso({ visti = 0, su = null, className = "" }) {
  const completo = su ? Math.min(100, Math.round((visti / su) * 100)) : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-baseline justify-between font-numeric text-[0.7rem] text-quaderno-tenue">
        <span>
          {visti}
          {su ? ` / ${su}` : " visti"}
        </span>
        {completo !== null && <span>{completo}%</span>}
      </div>

      {completo !== null && (
        <div className="h-[3px] overflow-hidden rounded-full bg-quaderno-riga">
          <div className="h-full bg-quaderno-blu" style={{ width: `${completo}%` }} />
        </div>
      )}
    </div>
  );
}

/** Vuoto, caricamento, errore: le tre schermate che ogni pagina deve avere. */
export function Vuoto({ titolo, sommario, azioni }) {
  return (
    <Scheda className="px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold text-quaderno-inchiostro">{titolo}</p>

      {sommario && (
        <p className="mx-auto mt-2 max-w-md text-sm text-quaderno-tenue">{sommario}</p>
      )}

      {azioni && <div className="mt-5 flex justify-center gap-2">{azioni}</div>}
    </Scheda>
  );
}

export function Caricamento({ testo = "Un momento…" }) {
  return (
    <p className="py-14 text-center text-sm text-quaderno-tenue" role="status">
      {testo}
    </p>
  );
}

export function Errore({ errore, riprova }) {
  return (
    <Scheda className="px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-quaderno-inchiostro">
        Non sono riuscito a caricare
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm text-quaderno-tenue">
        {errore?.message || "Riprova fra un momento."}
      </p>

      {riprova && (
        <Bottone tono="pieno" onClick={riprova} className="mt-5">
          Riprova
        </Bottone>
      )}
    </Scheda>
  );
}
