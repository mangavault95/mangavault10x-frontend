import { useState } from "react";
import Icon from "../../app/Icon";
import { nomiAutori } from "../../dati/autore";

/* ==================================================
   PEZZI DELLA PAGINA
   ================================================== */

/**
 * Chi l'ha fatta, un nome alla volta e cliccabile.
 *
 * Sono bottoni e non link: aprono un pannello sulla stessa pagina,
 * senza portare via da quello che si stava guardando. Il sottolineato
 * tratteggiato è il modo di dire che c'è dell'altro sotto senza fare la
 * figura di un link che porta fuori.
 */
export function Autori({ serie, onScegli }) {
  const nomi = nomiAutori(serie.autore, serie.disegnatore);

  if (!nomi.length) {
    return <p className="text-ink-muted">Autore non registrato</p>;
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
      {nomi.map((nome, i) => (
        <span key={nome} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">·</span>}

          <button
            type="button"
            onClick={() => onScegli(nome)}
            title={`Tutte le opere di ${nome}`}
            className="underline decoration-dotted decoration-ink-faint underline-offset-4 transition-colors duration-quick hover:text-ink-bright hover:decoration-brass-400"
          >
            {nome}
          </button>
        </span>
      ))}
    </p>
  );
}

export function Etichetta({ tono = "neutro", children }) {
  const toni = {
    neutro: "border-hairline bg-glass-1 text-ink-muted",
    jade: "border-jade/25 bg-jade/10 text-jade",
    lapis: "border-lapis/25 bg-lapis/10 text-lapis",
    ember: "border-ember/25 bg-ember/10 text-ember",
    brass: "border-brass-400/25 bg-brass-400/10 text-brass-300"
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toni[tono]}`}>
      {children}
    </span>
  );
}

export function Dato({ etichetta, valore }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-faint">{etichetta}</dt>
      <dd className="mt-1 text-sm text-ink-bright">{valore || "—"}</dd>
    </div>
  );
}

/**
 * Una sezione che si apre e si chiude dal titolo.
 *
 * Note ed eBay sono cose che si cercano di rado: aperte per tutte le
 * serie allungavano la scheda di due schermi su qualunque telefono. Il
 * titolo resta, con la freccia, così si sa che c'è e dove.
 */
export function SezioneChiudibile({ titolo, extra, apertaDiPartenza = false, children }) {
  const [aperta, setAperta] = useState(apertaDiPartenza);

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setAperta((a) => !a)}
        aria-expanded={aperta}
        // Aperta, l'intestazione resta attaccata in alto: per richiudere
        // la sezione non serve tornare su a cercarla.
        className={`flex w-full items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 ${
          aperta ? "sticky top-0 z-sticky -mx-4 bg-shelf/90 px-4 py-2 backdrop-blur-md sm:-mx-0 sm:px-0" : ""
        }`}
      >
        <h2 className="font-display text-xl font-semibold text-ink-bright">{titolo}</h2>

        <span className="flex items-center gap-3">
          {extra}
          <Icon
            nome="back"
            dimensione={18}
            className={`text-ink-faint transition-transform duration-quick ${aperta ? "rotate-90" : "-rotate-90"}`}
          />
        </span>
      </button>

      {aperta && children}
    </section>
  );
}

/** La trama, raccolta in quattro righe quando è lunga. */
export function Trama({ testo }) {
  const [aperta, setAperta] = useState(false);
  const lunga = testo.length > 280;

  return (
    <div className="max-w-3xl">
      <p
        className={`whitespace-pre-line text-[0.95rem] leading-relaxed text-ink ${
          lunga && !aperta ? "line-clamp-4" : ""
        }`}
      >
        {testo}
      </p>

      {lunga && (
        <button
          type="button"
          onClick={() => setAperta((a) => !a)}
          className="mt-2 text-sm font-medium text-brass-300 hover:underline"
        >
          {aperta ? "Mostra meno" : "Leggi tutto"}
        </button>
      )}
    </div>
  );
}

export function ScheletroScheda() {
  return (
    <div className="mx-auto w-full max-w-[80rem] px-5 py-12 sm:px-8 lg:px-12" role="status">
      <div className="grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr] lg:gap-12">
        <div className="aspect-cover w-44 rounded-card border border-hairline bg-glass-1 md:w-full" />

        <div className="space-y-4">
          <div className="h-10 w-3/4 rounded-lg bg-glass-1" />
          <div className="h-4 w-1/3 rounded bg-glass-1" />
          <div className="h-2 w-full max-w-md rounded bg-glass-1" />
        </div>
      </div>

      <span className="sr-only">Caricamento della scheda in corso</span>
    </div>
  );
}
