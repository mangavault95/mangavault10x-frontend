import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Biblioteca from "../tre/scena";
import { Bottone } from "../ui/Controlli";
import { Errore, Vuoto } from "../ui/Stati";
import Icon from "../app/Icon";
import { useCollezione } from "../dati/collezione";
import { completamento, euro, valoreSerie } from "../dati/serie";

/**
 * La biblioteca: la collezione come stanza invece che come griglia.
 *
 * React qui non disegna niente di quello che si vede nel riquadro. Si
 * limita a tenere in vita la scena (in `tre/scena.js`), a passarle le
 * serie, e a disegnare sopra il vetro l'unica parte che deve restare
 * testo vero: il cartellino del libro guardato, i comandi, il conto
 * delle sezioni. Scritte disegnate dentro il 3D sarebbero
 * irraggiungibili da un lettore di schermo e sfocate a ogni zoom.
 *
 * Chi non ha WebGL, o ha chiesto meno animazioni, non resta a bocca
 * asciutta: c'è sempre la collezione in due dimensioni, e lo dice.
 */
export default function BibliotecaPage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();
  const navigate = useNavigate();

  const stanza = useRef(null);
  const scena = useRef(null);

  const [mirata, setMirata] = useState(null);
  const [posizione, setPosizione] = useState({ sezione: 0, totali: 1 });
  const [guasto, setGuasto] = useState(null);

  // Il click su un libro porta alla sua scheda: la biblioteca è un
  // modo di scegliere, non un vicolo cieco.
  const apri = useCallback(
    (s) => navigate(`/serie/${s.id}`),
    [navigate]
  );

  /* -------------------- Vita della scena -------------------- */

  useEffect(() => {
    if (!stanza.current) return undefined;

    let istanza;

    try {
      istanza = new Biblioteca(stanza.current, {
        alMirare: setMirata,
        alScegliere: apri,
        alCambiareSezione: (sezione, totali) => setPosizione({ sezione, totali }),
        menoMovimento: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      });
    } catch (e) {
      // Il caso previsto è WebGL assente — schede video vecchie,
      // macchine virtuali, accelerazione disattivata. Ma qualunque
      // altro errore finirebbe qui dentro, e dare la colpa a WebGL
      // quando il problema è un altro manda a caccia nel posto
      // sbagliato: distinguo i due casi e lascio l'errore vero in
      // console.
      const supportato = Boolean(
        document.createElement("canvas").getContext("webgl2") ||
          document.createElement("canvas").getContext("webgl")
      );

      console.error("Biblioteca 3D non avviata:", e);

      // Il render in più qui è esattamente lo scopo: la scena non è
      // partita, va sostituita con il ripiego. Non è la catena
      // involontaria contro cui la regola mette in guardia.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuasto(supportato ? "imprevisto" : "webgl");

      return undefined;
    }

    scena.current = istanza;

    // Solo in sviluppo: una maniglia per ispezionare la scena dalla
    // console del browser (`__biblioteca.renderer.info`, `vaiA(3)`).
    // Vite toglie del tutto questo blocco dalla build di produzione.
    if (import.meta.env.DEV) window.__biblioteca = istanza;

    return () => {
      istanza.distruggi();
      scena.current = null;

      if (import.meta.env.DEV) delete window.__biblioteca;
    };
  }, [apri]);

  // Le serie arrivano dopo la scena: appena ci sono, si costruisce
  // lo scaffale. Ricostruirlo a ogni render sarebbe uno spreco enorme,
  // quindi dipende solo dall'elenco.
  useEffect(() => {
    if (!scena.current || !serie.length) return;

    scena.current.impostaSerie(serie);
  }, [serie]);

  /* -------------------- Tastiera -------------------- */

  useEffect(() => {
    function alTasto(e) {
      if (!scena.current) return;

      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        scena.current.avanti();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scena.current.indietro();
      } else if (e.key === "Escape") {
        navigate("/collezione");
      }
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [navigate]);

  /* -------------------- Ripieghi -------------------- */

  if (errore) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Errore errore={errore} riprova={ricarica} />
      </div>
    );
  }

  if (guasto) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Vuoto
          titolo={
            guasto === "webgl"
              ? "Questo browser non può disegnare la biblioteca"
              : "La biblioteca non è riuscita ad aprire"
          }
          testo={
            guasto === "webgl"
              ? "Serve WebGL, che qui non è disponibile o è disattivato. La collezione resta consultabile per intero nella vista normale."
              : "Qualcosa si è rotto durante la costruzione della scena; il dettaglio è nella console del browser. Nel frattempo la collezione è tutta lì."
          }
          azione={
            <Link to="/collezione">
              <Bottone>Vai alla collezione</Bottone>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    // Su mobile la cornice riserva 6rem in fondo per la barra di
    // navigazione: il riquadro deve togliersele, altrimenti la pagina
    // scrolla di quei sei centimetri e la scena "balla".
    <div className="relative h-[calc(100dvh-6rem)] w-full overflow-hidden md:h-dvh">
      {/* Il canvas dentro non lo mette React: lo crea e lo toglie la
          scena, che deve poterne avere uno nuovo a ogni montaggio. */}
      <div ref={stanza} className="h-full w-full" />

      {/* ---------- Sopra il vetro ---------- */}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-8">
        {/* Testata */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brass-500/80">
              MangaVault
            </p>

            <h1 className="font-display text-2xl font-semibold text-ink-bright sm:text-3xl">
              La biblioteca
            </h1>

            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              {inCorso && !serie.length
                ? "Sto tirando su gli scaffali…"
                : "Lo spessore di ogni volume è quanto ne possiedi. Passa sopra un libro, o clicca per aprirlo."}
            </p>
          </div>

          <Link to="/collezione" className="pointer-events-auto">
            <Bottone variante="secondario">
              <Icon nome="grid" dimensione={16} />
              Vista normale
            </Bottone>
          </Link>
        </div>

        {/* Cartellino del libro guardato.
            Il margine a destra su schermo largo lascia libero l'angolo
            dove sta il banco del bibliotecario: senza, il suo pulsante
            copriva la freccia per passare alla libreria successiva. */}
        <div className="flex items-end justify-between gap-4 md:pr-52">
          <Cartellino serie={mirata} />

          <Comandi
            posizione={posizione}
            onIndietro={() => scena.current?.indietro()}
            onAvanti={() => scena.current?.avanti()}
          />
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   SOPRA IL VETRO
   ================================================== */

/**
 * Il cartellino non scompare quando togli il mouse: si svuota
 * restando al suo posto. Un riquadro che appare e sparisce a ogni
 * passaggio del puntatore fa saltare la pagina sotto gli occhi.
 */
function Cartellino({ serie }) {
  const pct = serie ? completamento(serie) : null;

  return (
    <div
      aria-live="polite"
      className={`max-w-sm rounded-panel border border-hairline bg-glass-3 px-5 py-4 backdrop-blur-xl
                  transition-all duration-base ease-settle
                  ${serie ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      {serie ? (
        <>
          <p className="font-display text-lg font-semibold leading-tight text-ink-bright">
            {serie.titolo}
          </p>

          {serie.autore && (
            <p className="mt-0.5 text-sm text-ink-muted">{serie.autore}</p>
          )}

          <p className="mt-2 font-numeric text-xs text-ink-muted">
            {serie.posseduti}
            {serie.totali ? ` / ${serie.totali}` : ""} volumi
            {pct !== null && ` · ${pct}%`}
            {serie.costo ? ` · ${euro(valoreSerie(serie))}` : ""}
          </p>
        </>
      ) : (
        // Lo spazio resta occupato anche da vuoto, così i comandi
        // accanto non si spostano quando il cartellino compare.
        <p className="invisible font-display text-lg leading-tight">segnaposto</p>
      )}
    </div>
  );
}

function Comandi({ posizione, onIndietro, onAvanti }) {
  const { sezione, totali } = posizione;

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-card border border-hairline bg-glass-3 p-1.5 backdrop-blur-xl">
      <BottoneScorrimento
        etichetta="Sezione precedente"
        onClick={onIndietro}
        disabled={sezione <= 0}
      >
        <Icon nome="back" dimensione={18} />
      </BottoneScorrimento>

      <span className="min-w-[4.5rem] text-center font-numeric text-sm text-ink-muted">
        {sezione + 1} / {totali}
      </span>

      <BottoneScorrimento
        etichetta="Sezione successiva"
        onClick={onAvanti}
        disabled={sezione >= totali - 1}
      >
        <span className="rotate-180">
          <Icon nome="back" dimensione={18} />
        </span>
      </BottoneScorrimento>
    </div>
  );
}

function BottoneScorrimento({ etichetta, children, ...resto }) {
  return (
    <button
      aria-label={etichetta}
      title={`${etichetta} (frecce ← →)`}
      className="grid h-10 w-10 place-items-center rounded-lg text-ink-muted transition-all duration-quick
                 hover:bg-glass-1 hover:text-ink-bright active:scale-90
                 disabled:pointer-events-none disabled:opacity-25
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      {...resto}
    >
      {children}
    </button>
  );
}
