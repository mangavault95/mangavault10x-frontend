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
 * Questa pagina è la soglia del sito. A sinistra le librerie con le
 * copertine vere — cliccarle porta dentro lo scaffale in tre
 * dimensioni; a destra il banco, con il bibliotecario, il registratore
 * di cassa e la bacheca dei desideri.
 *
 * React qui non disegna la stanza: la costruisce e la smonta
 * `Biblioteca` (in `tre/scena.js`), che vive nel suo canvas e nel suo
 * ciclo di animazione. React riceve indietro solo cosa sta guardando il
 * mouse e cosa è stato cliccato.
 *
 *
 * PERCHÉ C'È ANCHE UN ELENCO DEI PUNTI
 *
 * Una stanza da esplorare col mouse è bella e inaccessibile: chi
 * naviga da tastiera non ha modo di sapere che il registratore di cassa
 * è un collegamento, e chi arriva col telefono non ha nemmeno un
 * puntatore da far passare sopra le cose. L'elenco in basso a destra
 * dice cosa c'è e dove sta, si usa con Tab, e passandoci sopra accende
 * il segno a terra del punto corrispondente — così insegna la stanza
 * invece di sostituirla.
 *
 *
 * IL TELEFONO È UN RIPIEGO CONSAPEVOLE
 *
 * Quello che qui sotto è marcato `sm:` / `md:` tiene in piedi la pagina
 * su schermo stretto, ma non è pensato per il telefono: la decisione in
 * vigore (vedi `ROADMAP.md`) è di rifinire la vista web da schermo largo
 * e affrontare il mobile in un giro dedicato. Non rompetelo, ma non è il
 * metro con cui giudicare una modifica.
 */

/**
 * I punti d'interesse della stanza. Sono la stessa cosa che `scena.js`
 * registra come bersagli cliccabili, elencata qui una volta sola: le
 * etichette del cartellino, le voci dell'elenco e le icone escono tutte
 * da qui, così non possono raccontare due storie diverse.
 */
const PUNTI = [
  {
    id: "scaffale",
    azione: { tipo: "scaffale" },
    icona: "shelf",
    nome: "Lo scaffale",
    dove: "Le librerie a sinistra",
    invito: "Entra fra i volumi"
  },
  {
    id: "bibliotecario",
    azione: { tipo: "bibliotecario" },
    icona: "search",
    nome: "Il bibliotecario",
    dove: "Dietro il banco",
    invito: "Fagli una domanda"
  },
  {
    id: "lettura",
    azione: { tipo: "naviga", percorso: "/lettura" },
    icona: "bookmark",
    nome: "In lettura",
    dove: "I volumi sul banco",
    invito: "Riprendi da dove eri"
  },
  {
    id: "statistiche",
    azione: { tipo: "naviga", percorso: "/statistiche" },
    icona: "chart",
    nome: "I numeri",
    dove: "Il registratore di cassa",
    invito: "Valore, spesa, primati"
  },
  {
    id: "wishlist",
    azione: { tipo: "naviga", percorso: "/wishlist" },
    icona: "cartellino",
    nome: "I desideri",
    dove: "La bacheca alla parete",
    invito: "Cosa manca alla collezione"
  }
];

const puntoPerAzione = (azione) => {
  if (!azione) return null;

  return (
    PUNTI.find(
      (p) => p.azione.tipo === azione.tipo && p.azione.percorso === azione.percorso
    ) ?? null
  );
};

export default function HomePage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();
  const { apri: apriBibliotecario } = useBibliotecario();
  const navigate = useNavigate();

  const stanza = useRef(null);
  const scena = useRef(null);

  const [mirata, setMirata] = useState(null);
  const [mirataOggetto, setMirataOggetto] = useState(null);
  const [posizione, setPosizione] = useState({
    sezione: -1,
    totali: 1,
    soglia: { indice: 0, totali: 1 }
  });
  const [introFinita, setIntroFinita] = useState(false);
  const [stanzaPronta, setStanzaPronta] = useState(false);
  const [guasto, setGuasto] = useState(null);

  // Letto una volta sola: non cambia mentre la pagina è aperta, e
  // governa sia l'apertura della porta (sotto) sia i movimenti di camera
  // dentro la scena 3D.
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

  const pronta = useCallback(() => setStanzaPronta(true), []);

  /* -------------------- Vita della scena -------------------- */

  useEffect(() => {
    if (!stanza.current) return undefined;

    let istanza;

    try {
      istanza = new Biblioteca(stanza.current, {
        alMirare: setMirata,
        alScegliere: apri,
        alCambiareSezione: (sezione, totali, soglia) =>
          setPosizione({ sezione, totali, soglia }),
        alAzione,
        alMirareOggetto: setMirataOggetto,
        alPronta: pronta,
        menoMovimento
      });
    } catch (e) {
      // Il caso previsto è WebGL assente — schede video vecchie,
      // macchine virtuali, accelerazione disattivata. Ma qualunque altro
      // errore finirebbe qui dentro, e dare la colpa a WebGL quando il
      // problema è un altro manda a caccia nel posto sbagliato:
      // distinguo i due casi e lascio l'errore vero in console.
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
  }, [apri, alAzione, pronta, menoMovimento]);

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

      // Alla soglia le frecce servono solo dove ci sono più postazioni
      // da cui guardare la stanza — cioè su schermo stretto.
      if (posizione.sezione === -1 && posizione.soglia?.totali <= 1) return;

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
  }, [posizione.sezione, posizione.soglia?.totali]);

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
  const puntoMirato = puntoPerAzione(mirataOggetto);
  const caricando = !stanzaPronta || (inCorso && !serie.length);

  return (
    <div className="relative h-[calc(100dvh-6rem)] w-full overflow-hidden md:h-dvh">
      {/* Il canvas dentro non lo mette React: lo crea e lo toglie la
          scena, che deve poterne avere uno nuovo a ogni montaggio. */}
      <div ref={stanza} className="h-full w-full" />

      {/* Una vignettatura che scurisce gli angoli. La stanza è chiara e
          l'interfaccia è chiara: senza, i pannelli di vetro poggiano su
          un fondo dello stesso valore e il testo perde contrasto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_38%,transparent_42%,rgba(6,7,11,0.42)_100%)]"
      />

      {/* ---------- Sopra il vetro ---------- */}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-5 sm:p-8">
        <Testata inStanza={inStanza} caricando={caricando} />

        {/* Lo spazio in basso a destra non è libero: ci sta il bottone
            fisso del bibliotecario (`Bibliotecario.jsx`), che vive nella
            cornice e non sa niente di questa pagina. Il margine glielo
            lascia qui chi arriva dopo. */}
        <div className="flex items-end justify-between gap-4 pb-16 md:pb-12">
          {inStanza ? (
            // Sul telefono non esiste "passarci sopra": un cartellino
            // che non si accende mai è solo spazio tolto alla stanza.
            <div className="hidden sm:block">
              <CartellinoPunto punto={puntoMirato} />
            </div>
          ) : (
            <CartellinoSerie serie={mirata} />
          )}

          {inStanza ? (
            <>
              <ElencoPunti
                onScegli={alAzione}
                onIndica={(punto) => scena.current?.evidenzia(punto?.azione ?? null)}
              />

              {/* Sul telefono l'elenco sparisce: dei cinque punti, tre
                  sono già nella barra in basso e uno nel bottone del
                  bibliotecario. Ripeterli ruberebbe metà schermo alla
                  stanza; resta il quinto, che nella barra non c'è. */}
              <div className="flex shrink-0 flex-col items-end gap-2 sm:hidden">
                {posizione.soglia?.totali > 1 && (
                  <GiraSoglia
                    soglia={posizione.soglia}
                    onIndietro={() => scena.current?.indietro()}
                    onAvanti={() => scena.current?.avanti()}
                  />
                )}

                <button
                  onClick={() => alAzione({ tipo: "scaffale" })}
                  className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-brass-400/35 bg-glass-3 py-3 pl-4 pr-5
                             shadow-float backdrop-blur-xl transition-transform duration-quick active:scale-95
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
                >
                  <Icon nome="shelf" dimensione={16} className="text-brass-400" />
                  <span className="text-sm font-medium text-ink-bright">
                    Entra nello scaffale
                  </span>
                </button>
              </div>
            </>
          ) : (
            <Comandi
              posizione={posizione}
              onIndietro={() => scena.current?.indietro()}
              onAvanti={() => scena.current?.avanti()}
              onUscire={() => scena.current?.tornaAllaSoglia()}
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

function Testata({ inStanza, caricando }) {
  return (
    <div className="max-w-sm rounded-panel border border-hairline bg-glass-3 px-5 py-4 backdrop-blur-xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-brass-500/90">
        MangaVault
      </p>

      <h1 className="font-display text-2xl font-semibold text-ink-bright sm:text-3xl">
        {inStanza ? "La soglia" : "Lo scaffale"}
      </h1>

      <p className="mt-1 text-sm text-ink-muted">
        {inStanza
          ? "Le librerie a sinistra, il banco a destra. Ci si sposta cliccando."
          : "Lo spessore di ogni volume è quanto ne possiedi. Passaci sopra, o clicca per aprirlo."}
      </p>

      {caricando && <BarraCaricamento />}
    </div>
  );
}

/**
 * Non una percentuale: i modelli arrivano da richieste separate e una
 * percentuale finta che si ferma al 90% è peggio di nessuna percentuale.
 * Una riga che scorre dice "sta succedendo qualcosa" ed è tutto quello
 * che serve sapere.
 */
function BarraCaricamento() {
  return (
    <div className="mt-3 flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="h-0.5 w-16 overflow-hidden rounded-full bg-glass-1"
      >
        <span className="block h-full w-full animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,#facc15,transparent)] bg-[length:200%_100%]" />
      </span>

      <span className="text-xs text-ink-faint">Sto tirando su la stanza…</span>
    </div>
  );
}

/** Cosa si sta guardando nella stanza. */
function CartellinoPunto({ punto }) {
  return (
    <div
      aria-live="polite"
      className={`max-w-xs rounded-panel border border-hairline bg-glass-3 px-5 py-4 backdrop-blur-xl
                  transition-all duration-base ease-settle
                  ${punto ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brass-400/30 bg-brass-400/10 text-brass-300">
          <Icon nome={punto?.icona ?? "shelf"} dimensione={18} />
        </span>

        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-tight text-ink-bright">
            {punto?.nome ?? " "}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">{punto?.invito ?? " "}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * L'elenco dei punti della stanza.
 *
 * Passandoci sopra (col mouse o col Tab) si accende il segno a terra
 * corrispondente: è il pezzo che trasforma un menu in una legenda.
 */
function ElencoPunti({ onScegli, onIndica }) {
  return (
    <nav
      aria-label="Punti della stanza"
      className="pointer-events-auto hidden shrink-0 flex-col gap-1 rounded-panel border border-hairline bg-glass-3 p-2 backdrop-blur-xl sm:flex"
      onMouseLeave={() => onIndica(null)}
    >
      {PUNTI.map((punto) => (
        <button
          key={punto.id}
          onClick={() => onScegli(punto.azione)}
          onMouseEnter={() => onIndica(punto)}
          onFocus={() => onIndica(punto)}
          onBlur={() => onIndica(null)}
          className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-quick
                     hover:bg-glass-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
        >
          <span className="text-ink-muted transition-colors duration-quick group-hover:text-brass-300">
            <Icon nome={punto.icona} dimensione={18} />
          </span>

          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink-bright">{punto.nome}</span>
            <span className="hidden text-xs text-ink-faint sm:block">{punto.dove}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}

/**
 * Il cartellino del libro guardato non scompare quando togli il mouse:
 * si svuota restando al suo posto. Un riquadro che appare e sparisce a
 * ogni passaggio del puntatore fa saltare la pagina sotto gli occhi.
 */
function CartellinoSerie({ serie }) {
  const pct = serie ? completamento(serie) : null;

  return (
    <div
      aria-live="polite"
      className={`max-w-sm rounded-panel border border-hairline bg-glass-3 px-5 py-4 backdrop-blur-xl
                  transition-all duration-base ease-settle
                  ${serie ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      {serie ? (
        <>
          <p className="font-display text-lg font-semibold leading-tight text-ink-bright">
            {serie.titolo}
          </p>

          {serie.autore && <p className="mt-0.5 text-sm text-ink-muted">{serie.autore}</p>}

          <p className="mt-2 font-numeric text-xs text-ink-muted">
            {serie.posseduti}
            {serie.totali ? ` / ${serie.totali}` : ""} volumi
            {pct !== null && ` · ${pct}%`}
            {serie.costo ? ` · ${euro(valoreSerie(serie))}` : ""}
          </p>
        </>
      ) : (
        // Lo spazio resta occupato anche da vuoto, così i comandi accanto
        // non si spostano quando il cartellino compare.
        <p className="invisible font-display text-lg leading-tight">segnaposto</p>
      )}
    </div>
  );
}

/**
 * Le frecce per girarsi nella stanza. Compaiono solo dove la stanza non
 * ci sta tutta in un'inquadratura — cioè su un telefono in verticale,
 * dove la scena ha due postazioni invece di una (vedi `POSTI_SOGLIA_*`
 * in `tre/scena.js`).
 */
function GiraSoglia({ soglia, onIndietro, onAvanti }) {
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-hairline bg-glass-3 p-1 backdrop-blur-xl">
      <BottoneScorrimento
        etichetta="Guarda le librerie"
        onClick={onIndietro}
        disabled={soglia.indice <= 0}
      >
        <Icon nome="back" dimensione={18} />
      </BottoneScorrimento>

      <BottoneScorrimento
        etichetta="Guarda il banco"
        onClick={onAvanti}
        disabled={soglia.indice >= soglia.totali - 1}
      >
        <span className="rotate-180">
          <Icon nome="back" dimensione={18} />
        </span>
      </BottoneScorrimento>
    </div>
  );
}

function Comandi({ posizione, onIndietro, onAvanti, onUscire }) {
  const { sezione, totali } = posizione;

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-card border border-hairline bg-glass-3 p-1.5 backdrop-blur-xl">
      <BottoneScorrimento
        etichetta="Torna alla soglia"
        scorciatoia="Esc"
        onClick={onUscire}
      >
        <Icon nome="porta" dimensione={18} />
      </BottoneScorrimento>

      <span aria-hidden="true" className="h-6 w-px bg-hairline" />

      <BottoneScorrimento
        etichetta="Sezione precedente"
        scorciatoia="←"
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
        scorciatoia="→"
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

function BottoneScorrimento({ etichetta, scorciatoia, children, ...resto }) {
  return (
    <button
      aria-label={etichetta}
      title={scorciatoia ? `${etichetta} (${scorciatoia})` : etichetta}
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

/* ==================================================
   LA PORTA
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

    // Un fotogramma di ritardo: si parte chiusa, poi si passa ad aperta.
    // Impostarla già aperta al primo render salterebbe la transizione
    // invece di farla partire.
    const apri = requestAnimationFrame(() => setAperta(true));

    return () => cancelAnimationFrame(apri);
  }, [menoMovimento, onFinita]);

  useEffect(() => {
    if (!aperta || menoMovimento) return undefined;

    const timer = setTimeout(onFinita, PORTA_DURATA_MS);

    return () => clearTimeout(timer);
  }, [aperta, menoMovimento, onFinita]);

  return (
    <div className="absolute inset-0 z-raised flex">
      <Battente lato="sinistra" aperta={aperta} />
      <Battente lato="destra" aperta={aperta} />

      {/* La luce che filtra dalla fessura: si allarga insieme alle ante
          e dice "di là c'è una stanza illuminata" prima ancora che la
          stanza si veda. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-1/2 w-40 -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(250,204,21,0.5),transparent)]
                    transition-opacity ease-out ${aperta ? "opacity-0" : "opacity-100"}`}
        style={{ transitionDuration: `${PORTA_DURATA_MS * 0.7}ms` }}
      />

      <button
        onClick={onFinita}
        className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-hairline bg-glass-3 px-4 py-2 text-sm font-medium text-ink-bright backdrop-blur-xl transition-colors duration-quick hover:border-brass-400/40"
      >
        Salta
      </button>
    </div>
  );
}

/** Un'anta: legno scuro, un pannello inciso e una maniglia d'ottone. */
function Battente({ lato, aperta }) {
  const sinistra = lato === "sinistra";

  return (
    <div
      aria-hidden="true"
      className={`relative h-full w-1/2 bg-gradient-to-b from-legno to-void transition-transform ease-[cubic-bezier(0.7,0,0.3,1)]
                  ${sinistra ? "border-r" : "border-l"} border-brass-400/25
                  ${aperta ? (sinistra ? "-translate-x-full" : "translate-x-full") : "translate-x-0"}`}
      style={{ transitionDuration: `${PORTA_DURATA_MS}ms` }}
    >
      {/* Il pannello inciso: due bordi rientrati fanno leggere l'anta
          come una porta invece che come metà schermo colorata. */}
      <span className="absolute inset-8 rounded-sm border border-brass-400/15 shadow-[inset_0_1px_0_rgba(250,204,21,0.08)]" />
      <span className="absolute inset-12 rounded-sm border border-brass-400/10" />

      {/* La maniglia, verso il centro della porta */}
      <span
        className={`absolute top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-2 border-brass-400/70 ${
          sinistra ? "right-6" : "left-6"
        }`}
      />
    </div>
  );
}
