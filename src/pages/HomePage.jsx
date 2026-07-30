import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Biblioteca from "../tre/scena";
import { Bottone } from "../ui/Controlli";
import { Errore, Vuoto } from "../ui/Stati";
import Icon from "../app/Icon";
import { useCollezione } from "../dati/collezione";
import { useBibliotecario } from "../bibliotecario/contesto";
import { completamento, euro, valoreSerie } from "../dati/serie";

/**
 * La home: una stanza, non un cruscotto.
 *
 * Prima questa pagina era uno Scaffale con numeri e liste che
 * duplicavano quello che Numeri e In lettura dicono già meglio. Ora è
 * la soglia vera del sito: una porta che si apre su una stanza dove lo
 * scaffale (a sinistra) è la biblioteca in tre dimensioni — non un
 * rimando a lei, la vecchia rotta `/biblioteca` è sparita — il bancone
 * (a destra) apre lo stesso banco del bottone fluttuante, e quattro
 * postazioni portano alle altre sezioni.
 *
 * React qui non disegna la stanza: la costruisce e la smonta `Biblioteca`
 * (in `tre/scena.js`), che vive nel suo canvas e nel suo ciclo di
 * animazione. React riceve indietro solo cosa sta guardando il mouse e
 * cosa è stato cliccato.
 */
export default function HomePage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();
  const { apri: apriBibliotecario } = useBibliotecario();
  const navigate = useNavigate();

  const stanza = useRef(null);
  const scena = useRef(null);

  const [mirata, setMirata] = useState(null);
  const [mirataOggetto, setMirataOggetto] = useState(null);
  const [posizione, setPosizione] = useState({ sezione: -1, totali: 1 });
  const [introFinita, setIntroFinita] = useState(false);
  const [guasto, setGuasto] = useState(null);

  // Letto una volta sola: non cambia mentre la pagina è aperta, e
  // governa sia l'apertura della porta (sotto) sia i movimenti di
  // camera dentro la scena 3D.
  const [menoMovimento] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const apri = useCallback((s) => navigate(`/serie/${s.id}`), [navigate]);

  const alAzione = useCallback(
    (azione) => {
      if (azione.tipo === "naviga") navigate(azione.percorso);
      else if (azione.tipo === "bibliotecario") apriBibliotecario();
      else if (azione.tipo === "scaffale") scena.current?.entraNelloScaffale();
    },
    [navigate, apriBibliotecario]
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
        alAzione,
        alMirareOggetto: setMirataOggetto,
        menoMovimento
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

      console.error("La stanza d'ingresso non è partita:", e);

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
  }, [apri, alAzione, menoMovimento]);

  // Le serie arrivano dopo la scena: appena ci sono, si costruisce lo
  // scaffale. Ricostruirlo a ogni render sarebbe uno spreco enorme,
  // quindi dipende solo dall'elenco.
  //
  // Il primo caricamento non passa `mantieni`: deve atterrare alla
  // soglia. Un aggiornamento successivo (es. una modifica da Gestione,
  // che tocca la stessa collezione già in memoria) lo passa invece —
  // altrimenti riporterebbe la telecamera alla soglia o alla sezione 0
  // anche a metà di una visita.
  useEffect(() => {
    if (!scena.current || !serie.length) return;

    const giaCostruita = scena.current.serie !== undefined;

    scena.current.impostaSerie(
      serie,
      giaCostruita
        ? { mantieni: scena.current.sezioneCorrente * scena.current.perSezione }
        : undefined
    );
  }, [serie]);

  /* -------------------- Tastiera -------------------- */

  useEffect(() => {
    function alTasto(e) {
      if (!scena.current) return;

      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo) return;

      if (posizione.sezione === -1) return; // niente frecce alla soglia

      if (e.key === "ArrowRight") {
        e.preventDefault();
        scena.current.avanti();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scena.current.indietro();
      } else if (e.key === "Escape") {
        e.preventDefault();
        scena.current.tornaAllaSoglia();
      }
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [posizione.sezione]);

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
              ? "Questo browser non può disegnare la stanza"
              : "La stanza non è riuscita ad aprire"
          }
          testo={
            guasto === "webgl"
              ? "Serve WebGL, che qui non è disponibile o è disattivato. Il sito resta comunque tutto raggiungibile da qui sotto."
              : "Qualcosa si è rotto durante la costruzione della scena; il dettaglio è nella console del browser. Il sito resta comunque raggiungibile da qui sotto."
          }
          azione={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/collezione">
                <Bottone>Collezione</Bottone>
              </Link>
              <Link to="/wishlist">
                <Bottone variante="secondario">Desideri</Bottone>
              </Link>
              <Link to="/lettura">
                <Bottone variante="secondario">In lettura</Bottone>
              </Link>
              <Link to="/statistiche">
                <Bottone variante="secondario">Numeri</Bottone>
              </Link>
              <Bottone variante="secondario" onClick={apriBibliotecario}>
                Chiedi al bibliotecario
              </Bottone>
            </div>
          }
        />
      </div>
    );
  }

  const inStanza = posizione.sezione === -1;

  return (
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
              {inStanza ? "La soglia" : "Lo scaffale"}
            </h1>

            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              {inCorso && !serie.length
                ? "Sto tirando su la stanza…"
                : inStanza
                  ? "La libreria è a sinistra, il bibliotecario a destra. Cammina cliccando."
                  : "Lo spessore di ogni volume è quanto ne possiedi. Passa sopra un libro, o clicca per aprirlo."}
            </p>
          </div>
        </div>

        {/* Cartellino del libro guardato, o etichetta dell'oggetto
            della stanza — mai insieme, dipende da dove ci si trova. */}
        <div className="flex items-end justify-between gap-4 md:pr-52">
          {inStanza ? (
            <EtichettaOggetto azione={mirataOggetto} />
          ) : (
            <Cartellino serie={mirata} />
          )}

          {!inStanza && (
            <Comandi
              posizione={posizione}
              onIndietro={() => scena.current?.indietro()}
              onAvanti={() => scena.current?.avanti()}
            />
          )}
        </div>
      </div>

      {/* La porta è un velo sopra tutto il resto, canvas compreso: il
          sito si deve aprire su un'anta chiusa, non su una stanza già
          visibile con una porta in mezzo. Sparisce del tutto (non solo
          scorre fuori vista) appena finita, così non resta a
          intercettare i click. */}
      {!introFinita && (
        <Porta menoMovimento={menoMovimento} onFinita={() => setIntroFinita(true)} />
      )}
    </div>
  );
}

/* ==================================================
   SOPRA IL VETRO
   ================================================== */

// Un po' più della durata della transizione CSS sotto: il timer che
// avvisa React deve scattare dopo che le ante hanno davvero finito di
// scorrere, mai prima.
const PORTA_DURATA_MS = 1100;

/**
 * L'apertura della porta, in CSS e non in WebGL.
 *
 * Una porta a cardine vista da una telecamera quasi frontale non si
 * "apre" mai per davvero: resta un pannello ruotato in mezzo
 * all'inquadratura, qualunque angolo si scelga. Due ante che scorrono
 * fuori dallo schermo, sopra il canvas, si aprono per davvero e non
 * lasciano macerie da smaltire nella scena 3D.
 */
function Porta({ menoMovimento, onFinita }) {
  const [aperta, setAperta] = useState(menoMovimento);

  useEffect(() => {
    if (menoMovimento) {
      onFinita();
      return undefined;
    }

    // Un fotogramma di ritardo: si parte chiusa, poi si passa ad
    // aperta. Impostarla già aperta al primo render salterebbe la
    // transizione invece di farla partire.
    const apri = requestAnimationFrame(() => setAperta(true));

    return () => cancelAnimationFrame(apri);
  }, [menoMovimento, onFinita]);

  useEffect(() => {
    if (!aperta || menoMovimento) return undefined;

    const timer = setTimeout(onFinita, PORTA_DURATA_MS);

    return () => clearTimeout(timer);
  }, [aperta, menoMovimento, onFinita]);

  return (
    <div className="absolute inset-0 z-raised flex" aria-hidden="true">
      <Battente lato="sinistra" aperta={aperta} />
      <Battente lato="destra" aperta={aperta} />

      <button
        onClick={onFinita}
        className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-hairline bg-glass-3 px-4 py-2 text-sm font-medium text-ink-bright backdrop-blur-xl transition-colors duration-quick hover:border-brass-400/40"
      >
        Salta
      </button>
    </div>
  );
}

/** Un'anta: un pannello di legno con una maniglia, imperniato sul bordo esterno. */
function Battente({ lato, aperta }) {
  const sinistra = lato === "sinistra";

  return (
    <div
      className={`relative h-full w-1/2 bg-gradient-to-b from-legno to-void transition-transform ease-[cubic-bezier(0.7,0,0.3,1)]
                  ${sinistra ? "border-r" : "border-l"} border-brass-400/25
                  ${aperta ? (sinistra ? "-translate-x-full" : "translate-x-full") : "translate-x-0"}`}
      style={{ transitionDuration: `${PORTA_DURATA_MS}ms` }}
    >
      {/* La maniglia, verso il centro della porta */}
      <span
        className={`absolute top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-2 border-brass-400/70 ${
          sinistra ? "right-6" : "left-6"
        }`}
      />
    </div>
  );
}

function etichettaAzione(azione) {
  if (!azione) return null;
  if (azione.tipo === "bibliotecario") return "Parla col bibliotecario";
  if (azione.tipo === "scaffale") return "Entra nello scaffale";

  const nomi = {
    "/wishlist": "Desideri",
    "/lettura": "In lettura",
    "/statistiche": "Numeri",
    "/admin": "Gestione"
  };

  return nomi[azione.percorso] ?? null;
}

/** L'etichetta di quello che si sta guardando nella stanza. */
function EtichettaOggetto({ azione }) {
  const nome = etichettaAzione(azione);

  return (
    <div
      aria-live="polite"
      className={`max-w-sm rounded-panel border border-hairline bg-glass-3 px-5 py-4 backdrop-blur-xl
                  transition-all duration-base ease-settle
                  ${nome ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <p className="font-display text-lg font-semibold leading-tight text-ink-bright">
        {nome || " "}
      </p>
    </div>
  );
}

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
