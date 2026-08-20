import { useEffect } from "react";
import { Link } from "react-router-dom";
import Copertina from "./Copertina";
import { nomeTurno, perTurno } from "../dati/kachinuki";

/**
 * I pezzi visibili del Kachinuki-sen: lo scontro da giocare e il
 * tabellone di una partita finita.
 *
 * Stanno insieme perché sono la stessa cosa vista da due distanze. Il
 * duello è una sfida sola, grande quanto lo schermo, da decidere; il
 * tabellone sono tutte le sfide in fila, già decise, da rileggere. Un
 * componente per file avrebbe separato due modi di disegnare la stessa
 * riga — «questa contro questa, ha vinto questa» — che devono restare
 * riconoscibili come la stessa cosa.
 */

/* ==================================================
   IL DUELLO
   ================================================== */

/**
 * Due copertine, una domanda, nessuna terza via.
 *
 * Le copertine sono grandi apposta: la scelta si fa guardando, non
 * leggendo, e un gioco di copertine con le copertine piccole non
 * avrebbe senso. Il titolo sta sotto, per quando l'immagine da sola
 * non basta a riconoscere quale edizione sia.
 *
 * Da tastiera: frecce per scegliere. Funzionano tutte e quattro — su
 * e giù come sinistra e destra — perché a chi arriva da un altro
 * gioco viene naturale l'una o l'altra coppia, e sbagliare freccia in
 * un gioco fatto di scelte rapide sembra che il gioco si sia
 * bloccato.
 */
export function Duello({ casa, ospite, domanda, onScegli }) {
  useEffect(() => {
    function alTasto(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo || e.target.isContentEditable) return;

      const primo = ["ArrowLeft", "ArrowUp", "1"].includes(e.key);
      const secondo = ["ArrowRight", "ArrowDown", "2"].includes(e.key);

      if (!primo && !secondo) return;

      e.preventDefault();
      onScegli(primo ? casa.id : ospite.id);
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [casa, ospite, onScegli]);

  return (
    <div className="relative">
      <p
        // Il turno cambia sotto la domanda e la domanda resta la
        // stessa: chi usa un lettore di schermo deve sentire i due
        // titoli nuovi, non solo il conteggio delle sfide.
        aria-live="polite"
        className="mb-5 text-center font-display text-lg font-semibold text-ink-bright sm:mb-8 sm:text-2xl"
      >
        {domanda}
      </p>

      {/* Tre decisioni in una riga di classi.

          AFFIANCATE anche sul telefono, non una sopra l'altra: la
          scelta si fa confrontando, e due cose da confrontare che non
          stanno nella stessa schermata obbligano a ricordarsi la prima
          mentre si guarda la seconda.

          `items-start` perché i titoli sotto le copertine occupano una
          riga o due: centrando la griglia le due copertine finirebbero
          a dieci pixel di sfasamento l'una dall'altra. Allineate in
          alto partono dallo stesso punto, e a ballare è la coda.

          LA LARGHEZZA LA DECIDE L'ALTEZZA DELLA FINESTRA. Su un
          monitor largo due copertine a metà schermo sono alte
          seicento pixel: si dovrebbe scorrere per vederle intere, e a
          ogni scelta da capo — in un gioco che si fa a raffica è la
          differenza fra giocare e faticare. Il conto è l'inverso di
          quello della copertina, che è alta una volta e mezza la sua
          larghezza: larghezza = altezza disponibile × 4/3, più la
          fessura in mezzo. Le 23rem tolte sono quello che sta sopra e
          sotto — domanda, titoli, bottoni — e sono misurate, non
          stimate. */}
      <div className="mx-auto grid w-full max-w-[max(18rem,calc((100dvh_-_23rem)*4/3_+_3.5rem))] grid-cols-2 items-start gap-7 sm:gap-14">
        <Sfidante serie={casa} onScegli={onScegli} tasto="←" conVs />
        <Sfidante serie={ospite} onScegli={onScegli} tasto="→" />
      </div>
    </div>
  );
}

function Sfidante({ serie, onScegli, tasto, conVs = false }) {
  return (
    <button
      onClick={() => onScegli(serie.id)}
      className="group block w-full text-left transition-transform duration-quick ease-spring
                 focus-visible:outline-none active:scale-[0.97]"
    >
      <span
        className="relative block rounded-panel border border-hairline p-1.5 transition-colors duration-base
                   group-hover:border-brass-400/60 group-focus-visible:border-brass-400 sm:p-2"
      >
        <Copertina src={serie.copertina} alt={serie.titolo} inclina={false} />

        {/* Il «vs» sta dentro la copertina di sinistra e non in una
            colonna sua, così `top-1/2` è la metà della COPERTINA e non
            la metà di copertina più titolo — che è venti pixel più in
            basso, e si vede. Lo spostamento a destra è mezza fessura
            (metà del `gap` qui sopra) meno mezza pastiglia: se la
            fessura cambia, cambia anche questo numero. */}
        {conVs && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-full top-1/2 z-raised -translate-y-1/2
                       translate-x-[calc(0.875rem_-_50%)] rounded-full border border-brass-400/40 bg-shelf
                       px-2.5 py-1 font-display text-xs font-bold text-brass-400 shadow-brass
                       sm:translate-x-[calc(1.75rem_-_50%)] sm:px-4 sm:py-1.5 sm:text-base"
          >
            vs
          </span>
        )}
      </span>

      <span className="mt-3 block px-1">
        <span className="line-clamp-2 font-display text-sm font-semibold text-ink-bright transition-colors group-hover:text-brass-300 sm:text-base">
          {serie.titolo}
        </span>

        {/* La scorciatoia si mostra solo dove esiste una tastiera: col
            dito è una riga di rumore sotto ogni copertina. */}
        <kbd className="mt-1.5 hidden rounded border border-soft bg-glass-1 px-1.5 py-0.5 font-numeric text-[0.65rem] text-ink-faint [@media(hover:hover)]:inline-block">
          {tasto}
        </kbd>
      </span>
    </button>
  );
}

/* ==================================================
   IL TABELLONE
   ================================================== */

/**
 * Tutti gli scontri di una partita, turno per turno.
 *
 * Non un albero: a centoventotto serie un albero vero sarebbe largo
 * sette colonne e alto sessantaquattro righe, illeggibile ovunque e
 * soprattutto su un telefono. Turni in sequenza, dal primo alla
 * finale, si leggono nello stesso ordine in cui sono stati giocati —
 * che è poi il modo in cui uno se li racconta.
 *
 * I turni si aprono e si chiudono da soli: la finale è la cosa che si
 * vuole vedere per prima, i sessantaquattresimi quasi mai.
 */
export function Tabellone({ sfide, taglia, nomeDi, collegabile, evidenzia }) {
  const turni = perTurno(sfide, taglia);

  return (
    <div className="space-y-4">
      {[...turni].reverse().map(({ turno, nome, sfide: dentro }) => (
        <details
          key={turno}
          // Aperti i turni corti (fino ai quarti), chiusi quelli
          // lunghi: otto sfide si guardano, sessantaquattro si aprono
          // se uno le vuole.
          open={dentro.length <= 4}
          className="group rounded-panel border border-hairline bg-glass-1 backdrop-blur-xl"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <span className="font-display text-base font-semibold text-ink-bright sm:text-lg">
              {nome}
            </span>

            <span className="flex items-center gap-3">
              <span className="font-numeric text-xs text-ink-faint">
                {dentro.length === 1 ? "1 sfida" : `${dentro.length} sfide`}
              </span>

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-ink-faint transition-transform duration-quick group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </summary>

          <ul className="space-y-1.5 border-t border-hairline px-2 py-2.5 sm:px-3">
            {dentro.map((s) => (
              <RigaSfida
                key={s.posizione}
                sfida={s}
                nomeDi={nomeDi}
                collegabile={collegabile}
                evidenzia={evidenzia}
              />
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

/**
 * Una sfida in una riga: chi ha giocato, e chi è passato.
 *
 * Chi ha vinto è scritto chiaro, chi ha perso è sbiadito e barrato.
 * Il colore da solo non basterebbe — una riga in cui l'unica
 * differenza fra vinto e perso è il grigio non si legge a chi
 * distingue male i toni — quindi la linea sul titolo dice la stessa
 * cosa una seconda volta.
 */
export function RigaSfida({ sfida, nomeDi, collegabile, evidenzia }) {
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-card px-2 py-1.5 sm:gap-3 sm:px-3">
      <InSfida
        id={sfida.casaId}
        nomeDi={nomeDi}
        collegabile={collegabile}
        vinta={sfida.vincitoreId === sfida.casaId}
        evidenziata={evidenzia === sfida.casaId}
      />

      <span aria-hidden="true" className="font-numeric text-[0.65rem] text-ink-faint">
        vs
      </span>

      <InSfida
        id={sfida.ospiteId}
        nomeDi={nomeDi}
        collegabile={collegabile}
        vinta={sfida.vincitoreId === sfida.ospiteId}
        evidenziata={evidenzia === sfida.ospiteId}
        aDestra
      />
    </li>
  );
}

function InSfida({ id, nomeDi, collegabile, vinta, evidenziata, aDestra = false }) {
  const titolo = nomeDi(id) || "Serie sconosciuta";

  // `min-w-0` non è decorativo: dentro una griglia o un flex un
  // elemento non scende mai sotto la larghezza del suo contenuto, e
  // senza questo `truncate` non taglierebbe niente — sarebbe la riga a
  // sfondare.
  const stile = `block min-w-0 truncate text-xs sm:text-sm ${aDestra ? "text-right" : ""} ${
    vinta
      ? evidenziata
        ? "font-semibold text-brass-300"
        : "font-medium text-ink-bright"
      : "text-ink-faint line-through decoration-ink-faint/60"
  }`;

  // Una serie cancellata dalla collezione resta nel verbale col suo
  // nome, ma non ha più una scheda da aprire: il collegamento sparisce
  // invece di portare a una pagina vuota.
  if (!collegabile?.has(id)) {
    return (
      <span className={stile} title={titolo}>
        {titolo}
      </span>
    );
  }

  return (
    <Link
      to={`/serie/${id}`}
      title={titolo}
      className={`${stile} rounded transition-colors hover:text-brass-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400`}
    >
      {titolo}
    </Link>
  );
}

/* ==================================================
   LA STRADA DEL VINCITORE
   ================================================== */

/**
 * Le sfide di una serie sola, dal primo turno alla finale.
 *
 * È la domanda che uno si fa guardando un vincitore — «e chi ha
 * battuto, per arrivare fin lì?» — e su trentuno sfide sono cinque
 * righe: il resto del tabellone è la storia degli altri.
 */
export function Strada({ sfide, id, taglia, nomeDi, collegabile }) {
  if (!sfide.length) return null;

  return (
    <ol className="space-y-1.5">
      {sfide.map((s) => {
        const avversarioId = s.casaId === id ? s.ospiteId : s.casaId;

        return (
          <li
            key={`${s.turno}-${s.posizione}`}
            className="flex items-center justify-between gap-3 rounded-card border border-hairline bg-glass-1 px-3 py-2"
          >
            <span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-wider text-brass-500/80">
              {nomeTurno(taglia / 2 ** (s.turno - 1))}
            </span>

            <span className="flex min-w-0 flex-1 items-baseline justify-end gap-1.5">
              <span className="shrink-0 text-xs text-ink-muted">ha battuto</span>

              <InSfida
                id={avversarioId}
                nomeDi={nomeDi}
                collegabile={collegabile}
                vinta
                aDestra
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
