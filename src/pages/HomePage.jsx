import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Biblioteca from "../tre/scena";
import { Bottone } from "../ui/Controlli";
import { Errore, Vuoto } from "../ui/Stati";
import Icon from "../app/Icon";
import { dimenticaUscita, leggiUscita, segnaUscita } from "../app/passaggio";
import { useCollezione } from "../dati/collezione";
import { completamento, euro, valoreSerie } from "../dati/serie";

/**
 * La home: una stanza, non un cruscotto.
 *
 * Questa pagina è la soglia del sito. A sinistra le librerie con le
 * copertine vere — cliccarle non apre una vista, ci si va: la
 * telecamera attraversa la stanza, arriva a un passo dai volumi e di lì
 * sbuca dentro lo scaffale, che si allarga fino a mostrarli tutti (la
 * sequenza sta in `tre/avvicinamento.js`). A destra il banco, con il
 * bibliotecario, il registratore di cassa e la bacheca dei desideri.
 *
 * React qui non disegna la stanza: la costruisce e la smonta
 * `Biblioteca` (in `tre/scena.js`), che vive nel suo canvas e nel suo
 * ciclo di animazione. React riceve indietro solo cosa sta guardando il
 * mouse e cosa è stato cliccato.
 *
 *
 * SOPRA IL VETRO NON C'È NESSUN MENU
 *
 * C'erano un elenco dei cinque punti della stanza e il bottone del
 * bibliotecario, tutti e due in basso a destra, e insieme facevano
 * esattamente il danno che dovevano evitare: davanti a una scorciatoia
 * scritta, nessuno prova più a cliccare la cassa. Sono spariti — anche
 * il bottone "Chiedi", che qui si nasconde da solo (vedi
 * `bibliotecario/Bibliotecario.jsx`) e torna in ogni altra pagina.
 *
 * Le stesse mete restano tutte nella barra laterale della cornice, coi
 * tasti da 1 a 5, e il banco si apre da tastiera con "b": togliere il
 * menu dalla stanza non toglie niente a chi non usa il mouse. Quello che
 * la stanza si tiene per sé è la sola cosa che non esiste altrove —
 * entrare fra i volumi — e a tastiera ci si va con la freccia destra.
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
 * I cinque punti della stanza, e cosa c'è dietro ognuno.
 *
 * Le chiavi sono i nomi che `scena.js` si trova scritti sui bersagli
 * (`userData.punto`): la stanza sa solo *che cosa* è ogni oggetto, cosa
 * ci sia dall'altra parte lo sa questo elenco. Da qui escono sia il
 * cartellino che compare passandoci sopra, sia l'indirizzo dove si
 * finisce quando la telecamera è arrivata.
 *
 *
 * DUE PORTE PER LA STESSA STANZA
 *
 * Nessuno di questi indirizzi è quello della barra laterale, e non è una
 * duplicazione: sono gli stessi dati raccontati da due posti diversi.
 * Dalla barra i desideri sono un elenco con la ricerca e i moduli — è
 * l'attrezzo, e da lì ci si va per lavorare. Dalla bacheca appesa al
 * muro sono un muro di locandine appuntate — è il posto, e da lì ci si
 * va perché si stava girando per la stanza.
 *
 * Chi arriva dalla stanza ha appena visto la telecamera fermarsi davanti
 * a una bacheca di sughero: aprirgli una tabella con i filtri
 * romperebbe la cosa in due. Chi ha premuto «4» nella barra laterale
 * voleva la tabella.
 */
const PUNTI = {
  librerie: {
    icona: "shelf",
    nome: "Le librerie",
    invito: "Entra fra i volumi"
    // Nessun indirizzo: di là non c'è una pagina, c'è lo scaffale in tre
    // dimensioni, e a portarcisi pensa la scena da sé.
  },
  bibliotecario: {
    icona: "search",
    nome: "Il bibliotecario",
    invito: "Fagli una domanda",
    percorso: "/banco"
  },
  tavolino: {
    icona: "bookmark",
    nome: "Il tavolino",
    invito: "Riprendi da dove eri",
    percorso: "/tavolino"
  },
  cassa: {
    icona: "chart",
    nome: "Il registratore",
    invito: "Batti lo scontrino",
    percorso: "/cassa"
  },
  bacheca: {
    icona: "cartellino",
    nome: "La bacheca",
    invito: "Cosa manca alla collezione",
    percorso: "/bacheca"
  }
};

export default function HomePage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();
  const navigate = useNavigate();

  const stanza = useRef(null);
  const scena = useRef(null);

  // Da dove si sta rientrando, congelato al montaggio. Deve restare
  // fermo: è una dipendenza dell'effetto che costruisce la scena, e
  // vederlo passare a `null` a metà visita — quando il segno viene
  // dimenticato, poco più sotto — ricostruirebbe tutta la stanza.
  const [rientroDa] = useState(leggiUscita);

  const [mirata, setMirata] = useState(null);
  const [mirataOggetto, setMirataOggetto] = useState(null);
  const [posizione, setPosizione] = useState({
    sezione: -1,
    totali: 1,
    soglia: { indice: 0, totali: 1 }
  });
  // Chi rientra non trova nessuna porta: la stanza c'era già, e lui pure.
  const [introFinita, setIntroFinita] = useState(Boolean(rientroDa));
  const [stanzaPronta, setStanzaPronta] = useState(false);
  const [inViaggio, setInViaggio] = useState(false);
  const [guasto, setGuasto] = useState(null);

  // Letto una volta sola: non cambia mentre la pagina è aperta, e
  // governa sia l'apertura della porta (sotto) sia i movimenti di camera
  // dentro la scena 3D.
  const [menoMovimento] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const apri = useCallback((s) => navigate(`/serie/${s.id}`), [navigate]);

  /**
   * Si è arrivati addosso all'oggetto, ed è adesso che si va di là.
   *
   * Non è il click a portare qui: il click fa partire la telecamera, e
   * questa funzione la chiama la scena quando la telecamera si è
   * fermata e lo schermo è ormai buio. Il buio è la giuntura — di là la
   * pagina si riaccende da lì (vedi `ui/Approdo`).
   *
   * Prima di andarsene lascia detto da quale oggetto si è usciti, che è
   * come si fa a rientrarci dallo stesso (vedi `app/passaggio`).
   */
  const alAzione = useCallback(
    (punto) => {
      const percorso = PUNTI[punto]?.percorso;

      if (!percorso) return;

      segnaUscita(punto);
      navigate(percorso);
    },
    [navigate]
  );

  const pronta = useCallback(() => setStanzaPronta(true), []);

  // Un rientro si spende una volta sola: letto sopra, dimenticato qui.
  // Senza, tornando alla home dalla barra laterale si riemergerebbe da
  // un oggetto che in quel giro nessuno ha toccato.
  useEffect(() => dimenticaUscita(), []);

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
        alViaggiare: setInViaggio,
        rientroDa,
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
  }, [apri, alAzione, pronta, rientroDa, menoMovimento]);

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

      // Alla soglia, dove la stanza ci sta tutta in un'inquadratura, la
      // freccia destra entra fra i volumi: è l'unica meta che esiste
      // solo qui dentro, e da quando l'elenco dei punti non c'è più
      // sarebbe altrimenti raggiungibile soltanto col mouse.
      if (posizione.sezione === -1 && posizione.soglia?.totali <= 1) {
        if (e.key !== "ArrowRight") return;

        e.preventDefault();
        scena.current.avvicinatiA("librerie");

        return;
      }

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
              <Link to="/banco">
                <Bottone variante="secondario">Chiedi al bibliotecario</Bottone>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const inStanza = posizione.sezione === -1;
  const puntoMirato = mirataOggetto ? PUNTI[mirataOggetto] : null;
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

      {/* Il nome di quello che si sta guardando, attaccato al puntatore.
          Sul telefono non esiste passarci sopra, e un cartellino che non
          si accende mai è solo spazio tolto alla stanza. */}
      {inStanza && !inViaggio && (
        <div className="hidden sm:block">
          <CartellinoPuntatore punto={puntoMirato} area={stanza} />
        </div>
      )}

      {/* ---------- Sopra il vetro ---------- */}

      {/* Mentre si vola verso le librerie sopra il vetro non resta
          niente. Non è pudore grafico: i pannelli raccontano dove sei, e
          durante l'avvicinamento "dove sei" cambia due volte in due
          secondi — la testata passerebbe da "La soglia" a "Lo scaffale"
          a metà volo, e i comandi delle sezioni comparirebbero prima che
          ci sia una sezione. Meglio che si tolgano di mezzo e tornino a
          cose ferme. Con loro se ne va anche il puntatore: durante la
          sequenza sotto non c'è niente da cliccare. */}
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-5 transition-opacity ease-settle sm:p-8
                    ${
                      inViaggio
                        ? "opacity-0 duration-base [&_*]:!pointer-events-none"
                        : "opacity-100 duration-slow"
                    }`}
      >
        <Testata inStanza={inStanza} caricando={caricando} />

        <div className="flex items-end justify-between gap-4 pb-16 md:pb-0">
          {/* Alla soglia il cartellino non sta più qui: segue il
              puntatore (vedi `CartellinoPuntatore`, sotto il canvas).
              Resta lo spazio, così i comandi accanto non si spostano
              quando si passa da un mondo all'altro. */}
          {inStanza ? <span /> : <CartellinoSerie serie={mirata} />}

          {inStanza ? (
            // Il telefono non ha un puntatore da far passare sopra le
            // cose, e senza la stanza resterebbe un fondale. Finché il
            // mobile è quello che è (vedi `ROADMAP.md`) gli restano
            // queste due maniglie; su schermo largo non esistono.
            <div className="flex shrink-0 flex-col items-end gap-2 sm:hidden">
              {posizione.soglia?.totali > 1 && (
                <GiraSoglia
                  soglia={posizione.soglia}
                  onIndietro={() => scena.current?.indietro()}
                  onAvanti={() => scena.current?.avanti()}
                />
              )}

              <button
                onClick={() => scena.current?.avvicinatiA("librerie")}
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

      {/* Chi rientra da una pagina non trova la porta ma il buio, ed è
          lo stesso buio in cui la pagina che sta lasciando si è appena
          spenta: di qua e di là dello stacco lo schermo è nero, quindi
          lo stacco non c'è. Si alza quando la stanza è in piedi — cioè
          quando sotto c'è già la telecamera addosso all'oggetto da cui
          si era usciti, pronta ad arretrare. */}
      {rientroDa && <Buio alzato={stanzaPronta} />}
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

/**
 * Cosa si sta guardando, attaccato al puntatore.
 *
 * Stava in un pannello fisso in basso a sinistra, ed era la cosa
 * sbagliata per una stanza in cui si punta e si clicca: il nome
 * dell'oggetto compariva a mezzo schermo di distanza dall'oggetto, e per
 * leggerlo bisognava staccare gli occhi da quello che si stava
 * guardando. In ogni avventura grafica mai scritta quella riga sta
 * attaccata al cursore, e ci sta per questo motivo.
 *
 *
 * PERCHÉ NON PASSA DA REACT
 *
 * La posizione del mouse cambia decine di volte al secondo; farne uno
 * stato vorrebbe dire ridisegnare l'albero a ogni pixel, sopra una scena
 * WebGL che sta già usando tutto il tempo che ha. Il nodo si sposta a
 * mano dentro l'ascoltatore, e React si occupa solo di *cosa* c'è
 * scritto — che cambia una volta ogni tanto, quando il puntatore passa
 * da un mobile all'altro.
 *
 * Il cartellino sta in basso a destra del cursore, e si ribalta a
 * sinistra quando finirebbe oltre il bordo: contro il margine destro
 * della finestra è dove finisce il bancone, cioè uno dei cinque punti.
 */
const LARGHEZZA_CARTELLINO = 260;

function CartellinoPuntatore({ punto, area }) {
  const nodo = useRef(null);

  useEffect(() => {
    const contenitore = area.current;

    if (!contenitore) return undefined;

    const muovi = (e) => {
      const riquadro = contenitore.getBoundingClientRect();
      const x = e.clientX - riquadro.left;
      const y = e.clientY - riquadro.top;

      const ribalta = x + LARGHEZZA_CARTELLINO > riquadro.width;

      nodo.current?.style.setProperty("--x", `${x}px`);
      nodo.current?.style.setProperty("--y", `${y}px`);
      nodo.current?.style.setProperty("--verso", ribalta ? "-100%" : "0%");
    };

    contenitore.addEventListener("pointermove", muovi);

    return () => contenitore.removeEventListener("pointermove", muovi);
  }, [area]);

  return (
    <div
      ref={nodo}
      aria-live="polite"
      className="pointer-events-none absolute left-0 top-0 z-raised translate-x-[var(--x,50%)] translate-y-[var(--y,50%)]"
    >
      <div
        className={`ml-4 mt-4 flex w-fit max-w-[16rem] translate-x-[var(--verso,0%)] items-center gap-3
                    rounded-full border border-brass-400/30 bg-void/80 py-2 pl-2.5 pr-5 shadow-float backdrop-blur-xl
                    transition-all duration-base ease-settle
                    ${punto ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brass-400/15 text-brass-300">
          <Icon nome={punto?.icona ?? "shelf"} dimensione={16} />
        </span>

        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold leading-tight text-ink-bright">
            {punto?.nome ?? " "}
          </p>
          <p className="truncate text-xs text-brass-300/80">{punto?.invito ?? " "}</p>
        </div>
      </div>
    </div>
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

/**
 * Il nero da cui si rientra.
 *
 * Non è la porta con un altro vestito: la porta è un'entrata, questo è
 * il rovescio di un'uscita. Si alza e basta, senza ante e senza bottone
 * da saltare — sotto c'è già la stanza, e quello che si sta aspettando
 * non è un'animazione ma tre megabyte di modelli.
 */
function Buio({ alzato }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-raised bg-void transition-opacity duration-700 ease-settle
                  ${alzato ? "opacity-0" : "opacity-100"}`}
    />
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
