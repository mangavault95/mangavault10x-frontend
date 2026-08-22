import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Pagina, { Pannello, Sezione } from "../ui/Pagina";
import { Bottone } from "../ui/Controlli";
import Copertina from "../ui/Copertina";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import { Duello } from "../ui/Tabellone";
import Icon from "../app/Icon";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import useRisorsa from "../dati/useRisorsa";
import { getTornei, salvaTorneo } from "../services/api";
import { dataIt, plurale } from "../dati/serie";
import {
  TAGLIE,
  albo,
  annulla,
  candidati,
  corpoDaPartita,
  creaPartita,
  finita,
  mettiDaParte,
  nomeTurno,
  partitaMessaDaParte,
  scegli,
  serieDi,
  sfidaCorrente,
  sorteggiaTema,
  temiPossibili,
  turniPer,
  vincitore
} from "../dati/kachinuki";

/**
 * Kachinuki-sen — 勝ち抜き戦.
 *
 * Un torneo a eliminazione fra le serie che si hanno in casa: due alla
 * volta, si sceglie quella che si preferisce, e alla fine ne resta una.
 * Non serve a niente ed è il punto: è l'unica pagina del sito dove non
 * si registra, non si conta e non si compra nulla.
 *
 * Tre schermate in una rotta sola — si sceglie, si gioca, si guarda chi
 * ha vinto — perché sono tre momenti della stessa cosa e non tre posti:
 * un indirizzo per la sfida numero 12 non vorrebbe dire niente per chi
 * ci arrivasse da fuori. Le partite finite invece un indirizzo ce
 * l'hanno (`/kachinuki/:id`), perché quelle si mandano a qualcuno.
 */
export default function KachinukiPage() {
  const { serie, inCorso, errore } = useCollezione();
  const { utente, bibliotecaSolaLettura } = useSessione();
  const eseguiProtetto = useAccessoProtetto();

  const { dati: partite, inCorso: caricoPartite, ricarica } = useRisorsa(getTornei);

  const [partita, setPartita] = useState(null);

  // La partita lasciata a metà l'altra volta. Si legge una volta sola
  // al primo render: è roba di archiviazione, non cambia da sé.
  const [ripresa, setRipresa] = useState(partitaMessaDaParte);

  // A ogni scelta la partita va messa da parte: centoventisette scelte
  // sono lunghe, e chiudere la scheda a metà non deve costare tutto.
  useEffect(() => {
    if (partita) mettiDaParte(partita);
  }, [partita]);

  /* ---- Il salvataggio ---- */

  const [salvataggio, setSalvataggio] = useState({ stato: "attesa" });

  // Il salvataggio parte da un click — l'ultima scelta della partita —
  // e non da un effetto sul «la partita è finita»: in StrictMode gli
  // effetti girano due volte, e la stessa vittoria finirebbe in
  // cronologia due volte. Il guardiano resta comunque, perché il
  // bottone «salva» può essere premuto due volte di fila.
  const giaMandata = useRef(false);

  const salva = useCallback(
    async (finita_) => {
      if (giaMandata.current) return;

      // Giocare è di tutti: il torneo attraversa la collezione, che si
      // vede da fuori. Tenerne una in cronologia no — è una partita di
      // qualcuno, e in biblioteca «qualcuno» sono i due di casa. Si
      // dice prima invece di lasciare che il colpo di scena finale sia
      // un rifiuto del server.
      if (bibliotecaSolaLettura) {
        setSalvataggio({ stato: "solaLettura" });
        return;
      }

      giaMandata.current = true;
      setSalvataggio({ stato: "inCorso" });

      try {
        const esito = await eseguiProtetto(() => salvaTorneo(corpoDaPartita(finita_)));

        setSalvataggio({ stato: "fatto", id: esito.id });
        ricarica();
      } catch (e) {
        giaMandata.current = false;

        // Accesso annullato: ha detto di no, non è un guasto. Si torna
        // in attesa, col bottone lì dov'era.
        setSalvataggio(
          e?.annullato ? { stato: "attesa" } : { stato: "errore", messaggio: e?.message }
        );
      }
    },
    [eseguiProtetto, ricarica, bibliotecaSolaLettura]
  );

  /* ---- Le mosse ---- */

  const comincia = useCallback(
    (taglia) => {
      // Il tema non si sceglie: lo sorteggia il gioco. Quello
      // dell'ultima partita giocata resta fuori dal sorteggio, o
      // ricapiterebbe abbastanza spesso da far sembrare che il
      // sorteggio non funzioni.
      const tema = sorteggiaTema(serie, taglia, partite?.[0]?.tema);

      if (!tema) return;

      giaMandata.current = false;
      setSalvataggio({ stato: "attesa" });
      setRipresa(null);
      setPartita(creaPartita({ serie, taglia, tema }));
    },
    [serie, partite]
  );

  /**
   * Una scelta.
   *
   * Se era l'ultima e si è entrati, la partita parte subito verso il
   * server: è la fine di una partita, non un modulo da compilare. Chi
   * guarda senza essere entrato vede il vincitore lo stesso e decide
   * dopo — quello che non si fa è aprire un accesso in faccia a
   * qualcuno che ha appena finito di giocare.
   */
  const scegliVincitore = useCallback(
    (id) => {
      const dopo = scegli(partita, id);

      setPartita(dopo);

      if (finita(dopo) && utente) salva(dopo);
    },
    [partita, utente, salva]
  );

  const abbandona = useCallback(() => {
    if (!window.confirm("Vuoi davvero lasciare questa partita? Non resterà niente.")) return;

    mettiDaParte(null);
    setRipresa(null);
    setPartita(null);
  }, []);

  if (errore) return <Errore errore={errore} />;

  /* ---- Si gioca ---- */

  if (partita && !finita(partita)) {
    return (
      <Partita
        partita={partita}
        onScegli={scegliVincitore}
        onAnnulla={() => setPartita((p) => annulla(p))}
        onAbbandona={abbandona}
      />
    );
  }

  /* ---- Ha vinto qualcuno ---- */

  if (partita) {
    return (
      <Esito
        partita={partita}
        utente={utente}
        salvataggio={salvataggio}
        onSalva={() => salva(partita)}
        onAncora={() => comincia(partita.taglia)}
        onBasta={() => setPartita(null)}
      />
    );
  }

  /* ---- L'ingresso ---- */

  return (
    <Ingresso
      serie={serie}
      inCorso={inCorso}
      partite={partite}
      caricoPartite={caricoPartite}
      ripresa={ripresa}
      onComincia={comincia}
      onRiprendi={() => {
        setPartita(ripresa);
        setRipresa(null);
      }}
      onScorda={() => {
        mettiDaParte(null);
        setRipresa(null);
      }}
    />
  );
}

/* ==================================================
   L'INGRESSO
   ================================================== */

function Ingresso({
  serie,
  inCorso,
  partite,
  caricoPartite,
  ripresa,
  onComincia,
  onRiprendi,
  onScorda
}) {
  const quante = useMemo(() => candidati(serie).length, [serie]);

  return (
    <Pagina
      occhiello="勝ち抜き戦"
      titolo="Kachinuki-sen"
      sommario={
        "Un torneo a eliminazione fra le serie che hai in casa: due alla volta, " +
        "passa quella che preferisci. Il tema lo sorteggia il gioco — tu scegli " +
        "soltanto quante serie mandare in gara."
      }
    >
      <div className="space-y-10">
        {ripresa && (
          <Ripresa partita={ripresa} onRiprendi={onRiprendi} onScorda={onScorda} />
        )}

        <Sezione titolo="Quante serie in gara?">
          {inCorso ? (
            <CaricamentoElenco quante={1} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TAGLIE.map((taglia) => (
                  <SceltaTaglia
                    key={taglia}
                    taglia={taglia}
                    serie={serie}
                    abbastanza={quante >= taglia}
                    onComincia={onComincia}
                  />
                ))}
              </div>

              <p className="text-xs text-ink-faint">
                {quante < TAGLIE[0]
                  ? `In collezione ci sono ${plurale(quante, "serie giocabile", "serie giocabili")}: ` +
                    `per il torneo più piccolo ne servono ${TAGLIE[0]}.`
                  : `Le due edizioni della stessa opera contano per una: in gara possono ` +
                    `scendere ${plurale(quante, "serie", "serie")}.`}
              </p>
            </>
          )}
        </Sezione>

        <Cronologia partite={partite} inCorso={caricoPartite} />
      </div>
    </Pagina>
  );
}

/**
 * Una taglia da scegliere, col suo prezzo scritto sopra: quante scelte
 * costa, e fra quanti temi si sorteggia.
 *
 * Il numero di temi cambia con la taglia, e non è un dettaglio: un
 * torneo da 128 può giocarsi solo con i temi aperti a tutta la
 * collezione, mentre a 32 entrano anche «il miglior seinen» e «il
 * miglior thriller», che di serie ne hanno molte meno. Dirlo qui
 * spiega da solo perché le partite piccole sono più varie.
 */
function SceltaTaglia({ taglia, serie, abbastanza, onComincia }) {
  const temi = useMemo(
    () => (abbastanza ? temiPossibili(serie, taglia).length : 0),
    [serie, taglia, abbastanza]
  );

  return (
    <button
      onClick={() => onComincia(taglia)}
      disabled={!abbastanza || temi === 0}
      className="group rounded-panel border border-hairline bg-glass-1 p-5 text-left backdrop-blur-xl
                 transition-all duration-quick ease-settle
                 hover:border-brass-400/60 hover:bg-glass-2
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf
                 disabled:pointer-events-none disabled:opacity-40
                 active:scale-[0.98]"
    >
      <span className="flex items-baseline gap-2">
        <span className="font-numeric text-3xl font-bold text-brass-400">{taglia}</span>
        <span className="text-sm text-ink-muted">serie</span>
      </span>

      <span className="mt-2 block text-xs text-ink-muted">
        {taglia - 1} scelte · {turniPer(taglia)} turni
      </span>

      <span className="mt-1 block text-xs text-ink-faint">
        {abbastanza
          ? `sorteggiato fra ${plurale(temi, "tema", "temi")}`
          : "non hai abbastanza serie"}
      </span>
    </button>
  );
}

/** La partita lasciata a metà: si riprende o si butta, niente altro. */
function Ripresa({ partita, onRiprendi, onScorda }) {
  return (
    <Pannello className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-brass-500/80">
          Partita lasciata a metà
        </p>

        <p className="mt-1 font-display text-lg font-semibold text-ink-bright">
          {partita.temaEtichetta}
        </p>

        <p className="mt-0.5 text-xs text-ink-muted">
          Torneo da {partita.taglia} · sei alla sfida {partita.indice + 1} di{" "}
          {partita.sfide.length}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Bottone variante="fantasma" onClick={onScorda}>
          Buttala
        </Bottone>
        <Bottone onClick={onRiprendi}>Riprendi</Bottone>
      </div>
    </Pannello>
  );
}

/* ==================================================
   LA PARTITA
   ================================================== */

function Partita({ partita, onScegli, onAnnulla, onAbbandona }) {
  const sfida = sfidaCorrente(partita);

  const casa = serieDi(partita, sfida.casaId);
  const ospite = serieDi(partita, sfida.ospiteId);

  const inCampo = partita.taglia / 2 ** (sfida.turno - 1);
  const fatte = partita.indice;
  const totali = partita.sfide.length;

  // Tornare indietro deve funzionare anche da tastiera: il gioco si fa
  // a raffica e il dito parte da solo, ma le mani sui tasti pure.
  useEffect(() => {
    function alTasto(e) {
      if (e.key !== "Backspace" || e.metaKey || e.ctrlKey || e.altKey) return;

      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo || e.target.isContentEditable) return;

      e.preventDefault();
      onAnnulla();
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [onAnnulla]);

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-8 sm:py-8">
      {/* ---- Dove siamo ---- */}
      <header className="mb-5 sm:mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brass-500/80">
            {partita.temaEtichetta}
          </p>

          <p className="font-numeric text-xs text-ink-muted">
            {nomeTurno(inCampo)} · sfida {fatte + 1} di {totali}
          </p>
        </div>

        {/* Il binario resta visibile anche a barra corta: alla prima
            sfida su centoventisette una barra invisibile sembrerebbe
            una barra rotta. */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            role="progressbar"
            aria-valuenow={fatte}
            aria-valuemin={0}
            aria-valuemax={totali}
            aria-label="Sfide giocate"
            className="h-full rounded-full bg-brass-400 transition-[width] duration-base ease-settle"
            style={{ width: `${Math.max(1, (fatte / totali) * 100)}%` }}
          />
        </div>
      </header>

      {/* La chiave rifà l'animazione di entrata a ogni sfida: senza,
          due copertine si sostituiscono sul posto e il passaggio da una
          sfida all'altra non si vede — si finisce per cliccare due
          volte sulla stessa metà dello schermo senza accorgersene. */}
      <div key={`${sfida.turno}-${sfida.posizione}`} className="animate-rise-in">
        <Duello casa={casa} ospite={ospite} domanda={partita.domanda} onScegli={onScegli} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <Bottone variante="fantasma" onClick={onAnnulla} disabled={partita.indice === 0}>
          <Icon nome="back" dimensione={16} />
          Torna indietro
        </Bottone>

        <Bottone variante="fantasma" onClick={onAbbandona}>
          Lascia la partita
        </Bottone>
      </div>
    </div>
  );
}

/* ==================================================
   L'ESITO
   ================================================== */

/** Chi ha vinto, e la partita che finisce in cronologia. */
function Esito({ partita, utente, salvataggio, onSalva, onAncora, onBasta }) {
  const campione = vincitore(partita);
  const finale = partita.sfide[partita.sfide.length - 1];
  const sconfitto = serieDi(
    partita,
    finale.casaId === campione.id ? finale.ospiteId : finale.casaId
  );

  return (
    <Pagina occhiello={partita.temaEtichetta} titolo="Abbiamo un vincitore">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="w-44 shrink-0 animate-rise-in sm:w-56">
            <Copertina src={campione.copertina} alt={campione.titolo} inclina={false} priorita />
          </div>

          <div className="min-w-0 text-center sm:pt-6 sm:text-left">
            <p className="font-display text-2xl font-semibold text-brass-300 sm:text-4xl">
              {campione.titolo}
            </p>

            <p className="mt-3 text-sm text-ink-muted">
              Ha battuto <span className="text-ink-bright">{sconfitto.titolo}</span> in
              finale, dopo {turniPer(partita.taglia)} turni contro {partita.taglia - 1}{" "}
              avversarie.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Bottone onClick={onAncora}>Un'altra partita</Bottone>

              <Link
                to={`/serie/${campione.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-card border border-soft bg-glass-2 px-4 py-2.5 text-sm font-semibold text-ink-bright transition-colors hover:bg-glass-3"
              >
                Apri la scheda
              </Link>

              <Bottone variante="fantasma" onClick={onBasta}>
                Torna al gioco
              </Bottone>
            </div>
          </div>
        </div>

        <Salvataggio salvataggio={salvataggio} utente={utente} onSalva={onSalva} />
      </div>
    </Pagina>
  );
}

function Salvataggio({ salvataggio, utente, onSalva }) {
  if (salvataggio.stato === "fatto") {
    return (
      <Pannello className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-ink-muted">La partita è finita in cronologia.</p>

        <Link
          to={`/kachinuki/${salvataggio.id}`}
          className="text-sm font-semibold text-brass-400 hover:text-brass-300"
        >
          Guarda il tabellone →
        </Link>
      </Pannello>
    );
  }

  if (salvataggio.stato === "inCorso") {
    return (
      <p className="text-center text-sm text-ink-faint" aria-live="polite">
        Sto salvando la partita…
      </p>
    );
  }

  // Giocata sì, in cronologia no: senza il bottone, che qui sarebbe
  // solo un modo di far arrivare un «no» un secondo più tardi.
  if (salvataggio.stato === "solaLettura") {
    return (
      <Pannello className="p-4">
        <p className="text-sm text-ink-muted">
          La cronologia delle partite è di casa: questa resta qui, fra te e
          lo schermo.
        </p>
      </Pannello>
    );
  }

  return (
    <Pannello className="flex flex-wrap items-center justify-between gap-3 p-4">
      <p className="text-sm text-ink-muted">
        {salvataggio.stato === "errore"
          ? `Non sono riuscito a salvarla: ${salvataggio.messaggio}`
          : utente
            ? "Questa partita non è ancora in cronologia."
            : "Entra per tenere questa partita in cronologia."}
      </p>

      <Bottone variante="secondario" onClick={onSalva}>
        {salvataggio.stato === "errore" ? "Riprova" : "Salva la partita"}
      </Bottone>
    </Pannello>
  );
}

/* ==================================================
   LE PARTITE GIÀ GIOCATE
   ================================================== */

function Cronologia({ partite, inCorso }) {
  const primati = useMemo(() => albo(partite).slice(0, 5), [partite]);

  if (inCorso) return <CaricamentoElenco quante={3} />;

  if (!partite?.length) {
    return (
      <Sezione titolo="Le partite giocate">
        <Vuoto
          titolo="Nessuna partita, per ora"
          testo="Le partite finite restano qui: il tema, chi ha giocato, e il tabellone completo di chi ha incontrato chi."
        />
      </Sezione>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_18rem]">
      <Sezione titolo="Le partite giocate">
        <ul className="space-y-2">
          {partite.map((p) => (
            <li key={p.id}>
              <Link
                to={`/kachinuki/${p.id}`}
                className="flex items-center gap-4 rounded-panel border border-hairline bg-glass-1 p-3 backdrop-blur-xl
                           transition-colors duration-quick hover:border-soft hover:bg-glass-2
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
              >
                <span className="w-12 shrink-0 sm:w-14">
                  <Copertina
                    src={p.vincitore.copertina}
                    alt={p.vincitore.titolo}
                    inclina={false}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-semibold text-ink-bright sm:text-base">
                    {p.vincitore.titolo}
                  </span>

                  <span className="mt-0.5 block truncate text-xs text-ink-muted">
                    {p.temaEtichetta} · torneo da {p.taglia}
                  </span>

                  <span className="mt-0.5 block truncate text-xs text-ink-faint">
                    {p.giocatore.nickname} · {dataIt(p.giocatoIl)}
                  </span>
                </span>

                <span className="shrink-0 text-ink-faint">
                  <Icon nome="torneo" dimensione={18} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Sezione>

      {primati.length > 1 && (
        <Sezione titolo="Albo d'oro">
          <Pannello className="p-4">
            <ol className="space-y-2.5">
              {primati.map((v, posto) => (
                <li key={v.id} className="flex items-baseline gap-3">
                  <span className="w-4 shrink-0 font-numeric text-xs text-brass-500/80">
                    {posto + 1}
                  </span>

                  <Link
                    to={`/serie/${v.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-ink transition-colors hover:text-brass-300"
                  >
                    {v.titolo}
                  </Link>

                  <span className="shrink-0 font-numeric text-xs text-ink-muted">
                    {v.vittorie}
                  </span>
                </li>
              ))}
            </ol>

            <p className="mt-4 text-xs text-ink-faint">
              Quante volte ognuna ha vinto un torneo, con qualunque tema.
            </p>
          </Pannello>
        </Sezione>
      )}
    </div>
  );
}
