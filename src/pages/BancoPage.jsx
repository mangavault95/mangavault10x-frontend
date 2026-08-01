import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Approdo from "../ui/Approdo";
import Ritratto from "../bibliotecario/Ritratto";
import Copertina from "../ui/Copertina";
import Icon from "../app/Icon";
import { creaIndiceAutori, creaIndiceTitoli, interpreta } from "../bibliotecario/intenti";
import { rispondi } from "../bibliotecario/rispondi";
import { useCollezione } from "../dati/collezione";
import useRisorsa from "../dati/useRisorsa";
import { getReadingSessions } from "../services/api";

/**
 * Il banco, come si sta davvero a un banco.
 *
 * Stesso motore di risposte del pannello laterale — `interpreta` legge
 * la domanda, `rispondi` la evade — e nessun modello linguistico: quello
 * che sa lo sa perché è la tua collezione, e per i manga che non hai
 * chiede ad AniList. Cambia solo dove finiscono le parole.
 *
 * Nel pannello finiscono in una lista di scambi che scorre, come in una
 * chat: la forma giusta per chi sta lavorando in un'altra pagina e ha
 * aperto un cassetto di lato. Qui finiscono in una battuta alla volta,
 * sotto la faccia di chi la sta dicendo, e quello che è stato detto
 * prima sparisce. È la forma di una visual novel, ed è una scelta di
 * sostanza: una chat è una cosa che si consulta, una conversazione è una
 * cosa che si ha. Chi è arrivato qui ha appena camminato fino al banco.
 *
 *
 * IL TESTO SI SCRIVE, NON COMPARE
 *
 * Una battuta che appare tutta insieme si legge come un'etichetta. Una
 * che si scrive ha un ritmo, e il ritmo è quello che fa sembrare che
 * qualcuno stia parlando invece che rispondendo. Un click la finisce
 * subito — chi legge veloce non deve aspettare nessuno, e questa è la
 * regola numero uno di ogni visual novel scritta bene.
 *
 *
 * LE SCELTE
 *
 * I suggerimenti che il bibliotecario già produceva («e di simile?»,
 * «quanto costa?») qui sono le opzioni in fondo alla battuta, come le
 * scelte di dialogo di un gioco. Non sono una funzione nuova: sono la
 * stessa lista, messa dove uno se la aspetta. Il campo di testo resta —
 * si può sempre chiedere una cosa qualunque — ma non è più l'unico
 * modo di andare avanti, ed è la differenza fra parlare con qualcuno e
 * interrogare un motore di ricerca.
 */

// Millesimi per carattere. Sotto i 12 non si legge come parlato, sopra i
// 25 si aspetta.
const BATTITO = 16;

const APERTURE = [
  "Benvenuto. Sono al banco tutto il giorno: chiedimi quello che vuoi della tua collezione — o di un manga che non hai ancora.",
  "Eccoci. Conosco questa collezione a memoria: cosa c'è, cosa manca, quanto è costata e dove ti sei fermato.",
  "Buongiorno. Se cerchi qualcosa, o vuoi solo sapere quanto ti manca per finire una serie, sono qui."
];

const PRIMI_SPUNTI = [
  "Cosa mi manca?",
  "Quanto costa completare tutto?",
  "Cosa sto leggendo?",
  "Consigliami qualcosa di horror"
];

export default function BancoPage() {
  const { serie } = useCollezione();
  const { dati: sessioni } = useRisorsa(getReadingSessions);

  const [battuta, setBattuta] = useState(null);
  const [domanda, setDomanda] = useState("");
  const [pensando, setPensando] = useState(false);

  /**
   * Il filo del discorso: l'ultima serie di cui si è parlato.
   *
   * È tutta la memoria che serve, ed è la stessa del pannello. Senza,
   * «e quanto costa?» non vuol dire niente; con, è una conversazione.
   */
  const [soggetto, setSoggetto] = useState(null);

  const campo = useRef(null);

  const indiceTitoli = useMemo(() => creaIndiceTitoli(serie), [serie]);
  const indiceAutori = useMemo(() => creaIndiceAutori(serie), [serie]);

  // L'apertura si sceglie una volta per visita: cambiarla a ogni
  // ridisegno vorrebbe dire che il bibliotecario si presenta due volte
  // in modo diverso mentre lo si guarda.
  const [apertura] = useState(
    () => APERTURE[Math.floor(Math.random() * APERTURE.length)]
  );

  /**
   * Il saluto, finché non gli si è chiesto niente.
   *
   * Ricavato e non messo in stato: la collezione arriva dopo il primo
   * render, e depositarla nello stato con un effetto vorrebbe dire un
   * riquadro vuoto per un fotogramma, seguito da un saluto che si scrive
   * — cioè un balbettio. Così la prima battuta esiste dal momento in cui
   * c'è qualcosa da dire, e non prima.
   *
   * Dice quante serie sono perché è il modo più corto che ha di
   * dimostrare di aver davvero guardato.
   */
  const saluto = useMemo(
    () =>
      serie.length
        ? {
            testo: `${apertura}\n\nSono ${serie.length} serie, e le ho contate io.`,
            suggerimenti: PRIMI_SPUNTI
          }
        : null,
    [serie.length, apertura]
  );

  const inScena = battuta ?? saluto;

  const chiedi = useCallback(
    async (testo) => {
      const pulita = String(testo || "").trim();

      if (!pulita || pensando) return;

      setDomanda("");
      setPensando(true);
      setBattuta({ testo: null, io: pulita });

      try {
        const lettura = interpreta(pulita, {
          indiceTitoli,
          indiceAutori,
          contesto: { soggetto }
        });

        const risposta = await rispondi(lettura, { serie, sessioni });

        // Il soggetto si aggiorna solo se la risposta ne ha uno: una
        // domanda sulla collezione intera non deve far dimenticare la
        // serie di cui si stava parlando.
        if (risposta.soggetto) setSoggetto(risposta.soggetto);

        setBattuta({ ...risposta, io: pulita });
      } catch (e) {
        setBattuta({
          io: pulita,
          testo: "Mi si è rotto qualcosa mentre cercavo. " + (e.message || ""),
          errore: true
        });
      } finally {
        setPensando(false);
      }
    },
    [indiceTitoli, indiceAutori, serie, sessioni, pensando, soggetto]
  );

  return (
    <Approdo
      titolo="Il banco del bibliotecario"
      elenco={{ percorso: "/collezione", etichetta: "Sfoglia la collezione" }}
      className="bg-void"
      fondo={<Retrobanco />}
    >
      <div className="relative flex min-h-dvh flex-col">
        {/* ---------- Il personaggio ---------- */}
        <div className="relative flex flex-1 items-end justify-center pt-24 sm:justify-start sm:pl-[8vw]">
          <Ritratto
            pensando={pensando}
            className="h-[46vh] w-[52vw] max-w-[26rem] sm:h-[58vh] sm:w-[34vw]"
          />
        </div>

        {/* ---------- La battuta ---------- */}
        <div className="relative px-4 pb-6 sm:px-8 sm:pb-10">
          <div className="mx-auto w-full max-w-3xl">
            {inScena?.io && <Eco testo={inScena.io} />}

            <Riquadro
              battuta={inScena}
              pensando={pensando}
              soggetto={soggetto}
              onChiedi={chiedi}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                chiedi(domanda);
              }}
              className="mt-3 flex items-center gap-2"
            >
              <input
                ref={campo}
                value={domanda}
                onChange={(e) => setDomanda(e.target.value)}
                placeholder="Chiedi qualcosa al bibliotecario…"
                aria-label="La tua domanda"
                className="min-w-0 flex-1 rounded-full border border-hairline bg-void/70 px-5 py-3 text-sm text-ink-bright
                           outline-none backdrop-blur-xl transition-colors duration-quick placeholder:text-ink-faint
                           hover:border-soft focus:border-brass-400/60"
              />

              <button
                type="submit"
                disabled={!domanda.trim() || pensando}
                aria-label="Chiedi"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brass-400 text-void transition-all duration-quick
                           hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
              >
                <span className="rotate-180">
                  <Icon nome="back" dimensione={18} />
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </Approdo>
  );
}

/**
 * La parete dietro il banco.
 *
 * Non è una fotografia della stanza: è la stessa stanza dipinta con due
 * gradienti — il legno scuro in basso, l'intonaco caldo in alto, la luce
 * dei faretti sull'insegna. Basta a dire «siamo ancora lì dentro» e non
 * costa niente. Una vera immagine di sfondo sarebbe stata mezzo mega per
 * una superficie che sta sotto un personaggio e un riquadro di testo.
 */
function Retrobanco() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-legno">
      {/* L'intonaco e la luce dei due faretti sull'insegna */}
      <div className="absolute inset-x-0 top-0 h-[62%] bg-[linear-gradient(180deg,#3a2f24_0%,#241c15_100%)]" />
      <div className="absolute left-[12%] top-[-14%] h-[46rem] w-[46rem] rounded-full bg-brass-500/[0.16] blur-[150px]" />
      <div className="absolute right-[6%] top-[6%] h-[26rem] w-[26rem] rounded-full bg-brass-400/[0.08] blur-[120px]" />

      {/* Il piano del banco: una fascia più chiara con il suo spigolo */}
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,#2b211a_0%,#150f0b_100%)]" />
      <div className="absolute inset-x-0 bottom-[38%] h-px bg-brass-400/25" />

      {/* La boiserie: montanti verticali appena accennati, come là */}
      <div className="absolute inset-x-0 top-0 h-[62%] opacity-[0.18] bg-[repeating-linear-gradient(90deg,transparent_0_96px,rgba(0,0,0,0.9)_96px_99px)]" />

      <div className="absolute inset-0 bg-[radial-gradient(115%_100%_at_50%_42%,transparent_38%,rgba(6,7,11,0.85)_100%)]" />
    </div>
  );
}

/** Quello che hai appena chiesto, sopra la risposta e in piccolo. */
function Eco({ testo }) {
  return (
    <p className="mb-2 ml-auto w-fit max-w-[85%] rounded-full border border-hairline bg-brass-400/10 px-4 py-1.5 text-right text-xs text-brass-100">
      {testo}
    </p>
  );
}

/**
 * Il riquadro di dialogo: targhetta col nome, testo che si scrive,
 * scelte in fondo.
 */
function Riquadro({ battuta, pensando, soggetto, onChiedi }) {
  const { visibile, finito, finisci } = useMacchinaDaScrivere(battuta?.testo);

  return (
    <div
      className="relative animate-battuta rounded-panel border border-brass-400/25 bg-void/80 p-6 pt-7 shadow-float backdrop-blur-xl sm:p-8 sm:pt-9"
      onClick={finisci}
    >
      {/* La targhetta col nome, a cavallo del bordo alto */}
      <div className="absolute -top-3.5 left-6 flex items-center gap-2 rounded-full border border-brass-400/40 bg-brass-400 px-4 py-1 shadow-brass">
        <Icon nome="search" dimensione={13} />
        <span className="font-display text-sm font-semibold text-void">
          Il bibliotecario
        </span>
      </div>

      {/* Di cosa stiamo parlando. Senza, «quanto costa?» è una domanda al
          buio: non si saprebbe a quale serie sta rispondendo finché non
          arriva la risposta, e se ha capito male è troppo tardi. */}
      {soggetto && (
        <p className="absolute -top-3 right-6 rounded-full border border-hairline bg-void px-3 py-1 text-[0.65rem] text-ink-muted">
          si parla di <span className="text-brass-400">{soggetto.titolo}</span>
        </p>
      )}

      <div className="min-h-[6.5rem]">
        {pensando && !battuta?.testo ? (
          <Cerca />
        ) : (
          <p
            aria-live="polite"
            className={`whitespace-pre-line text-[0.95rem] leading-relaxed sm:text-base ${
              battuta?.errore ? "text-ember" : "text-ink-bright"
            }`}
          >
            {visibile}
            {/* Il cursore lampeggia solo mentre scrive: lasciarlo dopo
                farebbe sembrare che stia ancora per dire qualcosa. */}
            {!finito && (
              <span className="ml-0.5 inline-block h-[1.05em] w-[0.5ch] translate-y-[0.15em] animate-glow-pulse bg-brass-400" />
            )}
          </p>
        )}

        {finito && battuta?.ripreso && (
          <p className="mt-3 text-xs text-ink-faint">
            <span className="text-brass-500/70">↳</span> su {battuta.ripreso}
          </p>
        )}

        {finito && battuta?.trama && (
          <p className="mt-4 border-l-2 border-brass-400/30 pl-4 text-sm leading-relaxed text-ink-muted">
            {battuta.trama.slice(0, 340)}
            {battuta.trama.length > 340 && "…"}
          </p>
        )}
      </div>

      {finito && <Allegati battuta={battuta} onChiedi={onChiedi} />}

      {/* Il triangolino d'attesa in basso a destra: in ogni visual novel
          del mondo vuol dire «ho finito di parlare, tocca a te». */}
      {finito && (
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-4 animate-glow-pulse text-brass-400"
        >
          ▼
        </span>
      )}
    </div>
  );
}

/** Quello che la risposta si porta dietro: copertine, schede, scelte. */
function Allegati({ battuta, onChiedi }) {
  if (!battuta) return null;

  const scelte = battuta.suggerimenti || [];

  return (
    <>
      {battuta.serie?.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {battuta.serie.slice(0, 8).map((s) => (
            <li key={s.id}>
              <Link
                to={`/serie/${s.id}`}
                className="group flex w-40 items-center gap-2 rounded-card border border-hairline bg-glass-1 p-1.5 pr-3
                           transition-colors duration-quick hover:border-brass-400/40 hover:bg-glass-2"
              >
                <span className="w-8 shrink-0">
                  <Copertina src={s.copertina} alt="" inclina={false} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink-bright transition-colors group-hover:text-brass-300">
                    {s.titolo}
                  </span>

                  {battuta.dettaglio?.(s) && (
                    <span className="block truncate font-numeric text-[0.65rem] text-ink-muted">
                      {battuta.dettaglio(s)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {battuta.esterna && <SchedaEsterna manga={battuta.esterna} />}

      {battuta.daComprare?.length > 0 && (
        <div className="mt-5 rounded-card border border-brass-400/20 bg-brass-400/[0.05] p-3">
          <p className="text-[0.65rem] font-medium uppercase tracking-wider text-brass-500/90">
            Da comprare — non ce l'hai
          </p>

          <ul className="mt-2 flex flex-wrap gap-2">
            {battuta.daComprare.slice(0, 6).map((m) => (
              <li key={m.idEsterno}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChiedi(m.titolo);
                  }}
                  className="rounded-full border border-hairline bg-glass-1 px-3 py-1.5 text-xs text-ink-muted
                             transition-colors duration-quick hover:border-soft hover:text-ink-bright"
                >
                  {m.titolo}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-[0.6rem] uppercase tracking-wider text-ink-faint">
            Accostamenti votati dai lettori su AniList
          </p>
        </div>
      )}

      {(scelte.length > 0 || battuta.altreEsterne?.length > 0) && (
        <div className="mt-6 space-y-2 border-t border-hairline pt-4">
          <p className="text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">
            {battuta.altreEsterne?.length ? "Forse cercavi" : "Puoi chiedere"}
          </p>

          <div className="flex flex-wrap gap-2">
            {(battuta.altreEsterne?.length
              ? battuta.altreEsterne.map((m) => m.titolo)
              : scelte
            ).map((testo) => (
              <button
                key={testo}
                onClick={(e) => {
                  e.stopPropagation();
                  onChiedi(testo);
                }}
                className="rounded-full border border-brass-400/25 bg-brass-400/[0.06] px-4 py-2 text-sm text-brass-100
                           transition-all duration-quick ease-settle
                           hover:-translate-y-0.5 hover:border-brass-400/60 hover:bg-brass-400/15
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
              >
                {testo}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SchedaEsterna({ manga }) {
  const righe = [
    manga.autore,
    manga.anno,
    manga.volumi
      ? `${manga.volumi} volumi`
      : manga.capitoli
        ? `${manga.capitoli} capitoli`
        : null,
    manga.stato,
    manga.voto ? `${manga.voto.toFixed(1)}/10 su AniList` : null
  ].filter(Boolean);

  return (
    <div className="mt-5 flex gap-4 rounded-card border border-hairline bg-glass-1 p-3">
      <div className="w-16 shrink-0">
        <Copertina src={manga.copertina} alt={manga.titolo} inclina={false} />
      </div>

      <div className="min-w-0 space-y-1">
        <p className="font-medium leading-tight text-ink-bright">{manga.titolo}</p>
        <p className="text-xs leading-relaxed text-ink-muted">{righe.join(" · ")}</p>

        {manga.collegamento && (
          <a
            href={manga.collegamento}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
            className="inline-block text-xs text-brass-400 underline-offset-2 hover:underline"
          >
            Apri su AniList ↗
          </a>
        )}

        {/* Da dove viene il dato, sempre visibile. */}
        <p className="text-[0.6rem] uppercase tracking-wider text-ink-faint">
          Fonte: AniList
        </p>
      </div>
    </div>
  );
}

function Cerca() {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-faint" role="status">
      <span className="inline-flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-brass-400"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      Sto cercando…
    </p>
  );
}

/**
 * Il testo che si scrive da sé.
 *
 * Un intervallo e non un'animazione CSS: la larghezza di un carattere
 * non è costante in un font proporzionale, e i trucchi con `steps()` e
 * `width` funzionano solo su una riga di monospazio.
 *
 * Chi non vuole aspettare clicca — o chiede la prossima cosa, e la
 * battuta cambia comunque.
 */
function useMacchinaDaScrivere(testo) {
  // Il conto si porta dietro *di quale testo* è il conto. È quello che
  // permette di azzerarlo qui sotto durante il render invece che con un
  // effetto: azzerarlo dopo vorrebbe dire un fotogramma con la battuta
  // nuova troncata alla lunghezza della vecchia.
  const [scritti, setScritti] = useState({ di: null, quanti: 0 });

  const [saltaSubito] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const quanti = saltaSubito
    ? (testo?.length ?? 0)
    : scritti.di === testo
      ? scritti.quanti
      : 0;

  useEffect(() => {
    if (!testo || saltaSubito) return undefined;

    let n = 0;

    const passo = setInterval(() => {
      n += 1;
      setScritti({ di: testo, quanti: n });

      if (n >= testo.length) clearInterval(passo);
    }, BATTITO);

    return () => clearInterval(passo);
  }, [testo, saltaSubito]);

  return {
    visibile: testo ? testo.slice(0, quanti) : "",
    finito: !testo || quanti >= testo.length,
    finisci: () => testo && setScritti({ di: testo, quanti: testo.length })
  };
}
