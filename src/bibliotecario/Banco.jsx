import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { creaIndiceAutori, creaIndiceTitoli, interpreta } from "./intenti";
import { rispondi } from "./rispondi";
import { chiediTramaItaliana } from "./esterni";
import { useCollezione } from "../dati/collezione";
import useRisorsa from "../dati/useRisorsa";
import { getReadingSessions } from "../services/api";
import Copertina from "../ui/Copertina";
import Icon from "../app/Icon";

/**
 * Il pannello vero e proprio, in un file suo.
 *
 * È separato dal bottone perché si porta dietro Fuse e tutto
 * l'interprete: una ventina di kilobyte che chi non apre mai il banco
 * non ha motivo di scaricare. Il bottone sta nella cornice di ogni
 * pagina, questo arriva solo al primo click.
 */
export default function Pannello({ onChiudi }) {
  const { serie } = useCollezione();
  const { dati: sessioni } = useRisorsa(getReadingSessions);

  const [scambi, setScambi] = useState([]);
  const [domanda, setDomanda] = useState("");
  const [pensando, setPensando] = useState(false);

  /**
   * Il filo del discorso: l'ultima serie di cui si è parlato.
   *
   * È tutta la memoria che serve. Non uno storico della conversazione,
   * non un riassunto: solo *di cosa stiamo parlando*, che è quello che
   * permette a "e quanto costa?" di voler dire qualcosa.
   */
  const [soggetto, setSoggetto] = useState(null);

  const campo = useRef(null);
  const fondo = useRef(null);

  // Gli indici si ricostruiscono solo quando cambia la collezione, non
  // a ogni lettera scritta.
  const indiceTitoli = useMemo(() => creaIndiceTitoli(serie), [serie]);
  const indiceAutori = useMemo(() => creaIndiceAutori(serie), [serie]);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  useEffect(() => {
    function alTasto(e) {
      if (e.key === "Escape") onChiudi();
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [onChiudi]);

  // Ogni nuova risposta porta la conversazione in fondo, dove sta.
  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [scambi, pensando]);

  const chiedi = useCallback(
    async (testo) => {
      const pulita = testo.trim();

      if (!pulita || pensando) return;

      setDomanda("");
      setScambi((p) => [...p, { ruolo: "io", testo: pulita }]);
      setPensando(true);

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

        setScambi((p) => [...p, { ruolo: "banco", ...risposta }]);
      } catch (e) {
        setScambi((p) => [
          ...p,
          {
            ruolo: "banco",
            testo: "Mi si è rotto qualcosa mentre cercavo. " + (e.message || ""),
            errore: true
          }
        ]);
      } finally {
        setPensando(false);
      }
    },
    [indiceTitoli, indiceAutori, serie, sessioni, pensando, soggetto]
  );

  return (
    <>
      {/* Il velo scurisce la pagina e chiude al click: su mobile è
          l'unico modo comodo di uscire da un pannello a tutta altezza. */}
      <div
        className="fixed inset-0 z-overlay bg-void/60 backdrop-blur-sm animate-rise-in md:bg-void/40"
        onClick={onChiudi}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Il banco del bibliotecario"
        className="fixed inset-x-0 bottom-0 z-modal flex h-[85dvh] flex-col rounded-t-sheet border border-hairline bg-alcove/95 shadow-float backdrop-blur-2xl
                   animate-rise-in
                   md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:w-[27rem] md:rounded-none md:rounded-l-sheet md:border-y-0 md:border-r-0"
      >
        {/* ---------- Testata ---------- */}
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink-bright">
              Il banco
            </h2>

            {/* Di cosa stiamo parlando, sempre visibile. Senza questo,
                "quanto costa?" è una domanda al buio: non si saprebbe
                a quale serie sta rispondendo finché non arriva la
                risposta — e se ha capito male, troppo tardi. */}
            {soggetto ? (
              <p className="truncate text-xs text-ink-muted">
                Stiamo parlando di{" "}
                <span className="text-brass-400">{soggetto.titolo}</span>
              </p>
            ) : (
              <p className="text-xs text-ink-muted">
                Chiedi della tua collezione, o di un manga che non hai.
              </p>
            )}
          </div>

          <button
            onClick={onChiudi}
            aria-label="Chiudi il banco"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright"
          >
            <Icon nome="close" dimensione={18} />
          </button>
        </header>

        {/* ---------- Conversazione ---------- */}
        <div className="panel-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {scambi.length === 0 && <Benvenuto onScegli={chiedi} serie={serie.length} />}

          {scambi.map((s, i) =>
            s.ruolo === "io" ? (
              <Domanda key={i} testo={s.testo} />
            ) : (
              <Risposta key={i} risposta={s} onChiedi={chiedi} />
            )
          )}

          {pensando && <Attesa />}

          <div ref={fondo} />
        </div>

        {/* ---------- Campo ---------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            chiedi(domanda);
          }}
          className="border-t border-hairline p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center gap-2">
            <input
              ref={campo}
              value={domanda}
              onChange={(e) => setDomanda(e.target.value)}
              placeholder="Quanti volumi mi mancano di…"
              aria-label="La tua domanda"
              className="min-w-0 flex-1 rounded-card border border-hairline bg-glass-1 px-4 py-3 text-sm text-ink-bright
                         outline-none transition-colors duration-quick placeholder:text-ink-faint
                         hover:border-soft focus:border-brass-400/60"
            />

            <button
              type="submit"
              disabled={!domanda.trim() || pensando}
              aria-label="Chiedi"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-brass-400 text-void transition-all duration-quick
                         hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <span className="rotate-180">
                <Icon nome="back" dimensione={18} />
              </span>
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

/* ==================================================
   PEZZI DELLA CONVERSAZIONE
   ================================================== */

function Benvenuto({ onScegli, serie }) {
  const esempi = [
    "Cosa mi manca?",
    "Quanto costa completare tutto?",
    "Cosa sto leggendo?",
    "Consigliami qualcosa di horror",
    "Parlami di Vagabond"
  ];

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm leading-relaxed text-ink">
        Conosco le tue {serie} serie a memoria: cosa hai, cosa ti manca, quanto
        vale, dove sei arrivato. Per i manga che non hai chiedo ad AniList.
      </p>

      <div className="flex flex-wrap gap-2">
        {esempi.map((e) => (
          <button
            key={e}
            onClick={() => onScegli(e)}
            className="rounded-full border border-hairline bg-glass-1 px-3 py-1.5 text-xs text-ink-muted
                       transition-colors duration-quick hover:border-brass-400/40 hover:text-brass-300"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function Domanda({ testo }) {
  return (
    <p className="ml-auto max-w-[85%] rounded-panel rounded-br-md bg-brass-400/12 px-4 py-2.5 text-sm text-brass-100">
      {testo}
    </p>
  );
}

function Attesa() {
  return (
    <p className="text-sm text-ink-faint" role="status">
      <span className="inline-flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-ink-faint"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      <span className="sr-only">Sto cercando</span>
    </p>
  );
}

function Risposta({ risposta, onChiedi }) {
  return (
    <div className="max-w-[92%] space-y-3" aria-live="polite">
      {/* Quando il soggetto è stato ripreso dal discorso invece che
          nominato, si dichiara. È la differenza fra un bibliotecario
          che ha seguito il filo e uno che ha risposto a caso. */}
      {risposta.ripreso && (
        <p className="text-xs text-ink-faint">
          <span className="text-brass-500/70">↳</span> su {risposta.ripreso}
        </p>
      )}

      <p
        className={`whitespace-pre-line text-sm leading-relaxed ${
          risposta.errore ? "text-ember" : "text-ink"
        }`}
      >
        {risposta.testo}
      </p>

      {risposta.trama && (
        <p className="border-l-2 border-hairline pl-3 text-xs leading-relaxed text-ink-muted">
          {risposta.trama.slice(0, 320)}
          {risposta.trama.length > 320 && "…"}
        </p>
      )}

      {risposta.serie?.length > 0 && (
        <ul className="space-y-1.5">
          {risposta.serie.map((s) => (
            <li key={s.id}>
              <RigaSerie serie={s} dettaglio={risposta.dettaglio?.(s)} />
            </li>
          ))}
        </ul>
      )}

      {risposta.esterna && <SchedaEsterna manga={risposta.esterna} />}

      {risposta.daComprare?.length > 0 && (
        <DaComprare elenco={risposta.daComprare} onChiedi={onChiedi} />
      )}

      {risposta.altreEsterne?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="w-full text-xs text-ink-faint">Forse cercavi:</span>

          {risposta.altreEsterne.map((m) => (
            <button
              key={m.idEsterno}
              onClick={() => onChiedi(m.titolo)}
              className="rounded-full border border-hairline bg-glass-1 px-3 py-1 text-xs text-ink-muted transition-colors duration-quick hover:border-soft hover:text-ink-bright"
            >
              {m.titolo}
            </button>
          ))}
        </div>
      )}

      {risposta.suggerimenti?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {risposta.suggerimenti.map((s) => (
            <button
              key={s}
              onClick={() => onChiedi(s)}
              className="rounded-full border border-hairline bg-glass-1 px-3 py-1 text-xs text-ink-muted transition-colors duration-quick hover:border-brass-400/40 hover:text-brass-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cosa potresti comprare.
 *
 * Tenuto visivamente separato da quello che possiedi, e con
 * l'intestazione che lo dice: mescolare le due cose in un elenco solo
 * costringerebbe a controllare titolo per titolo quali hai già, che è
 * esattamente il lavoro che il bibliotecario dovrebbe risparmiarti.
 *
 * Non sono accostamenti inventati dal sito: sono quelli che i lettori
 * di AniList hanno votato, e la riga in fondo lo dichiara.
 */
function DaComprare({ elenco, onChiedi }) {
  return (
    <div className="space-y-2 rounded-panel border border-brass-400/15 bg-brass-400/[0.04] p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-brass-500/90">
        Da comprare — non ce l'hai
      </p>

      <ul className="space-y-1.5">
        {elenco.map((m) => (
          <li key={m.idEsterno}>
            <button
              onClick={() => onChiedi(m.titolo)}
              className="group flex w-full items-center gap-3 rounded-card border border-hairline bg-glass-1 p-2 pr-3 text-left
                         transition-colors duration-quick hover:border-soft hover:bg-glass-2"
            >
              <span className="w-9 shrink-0">
                <Copertina src={m.copertina} alt="" inclina={false} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink-bright transition-colors group-hover:text-brass-300">
                  {m.titolo}
                </span>

                <span className="block truncate text-xs text-ink-faint">
                  {[m.autore, m.volumi ? `${m.volumi} vol.` : m.stato]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>

              {m.voto && (
                <span className="shrink-0 font-numeric text-xs text-ink-muted">
                  {m.voto.toFixed(1)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <p className="text-[0.65rem] uppercase tracking-wider text-ink-faint">
        Accostamenti votati dai lettori su AniList
      </p>
    </div>
  );
}

/** Una serie della collezione: si clicca e si va alla scheda. */
function RigaSerie({ serie, dettaglio }) {
  return (
    <Link
      to={`/serie/${serie.id}`}
      className="group flex items-center gap-3 rounded-card border border-hairline bg-glass-1 p-2 pr-3
                 transition-colors duration-quick hover:border-soft hover:bg-glass-2"
    >
      <div className="w-9 shrink-0">
        <Copertina src={serie.copertina} alt="" inclina={false} />
      </div>

      <span className="min-w-0 flex-1 truncate text-sm text-ink-bright transition-colors group-hover:text-brass-300">
        {serie.titolo}
      </span>

      {dettaglio && (
        <span className="shrink-0 font-numeric text-xs text-ink-muted">{dettaglio}</span>
      )}
    </Link>
  );
}

/**
 * Un manga che non hai.
 *
 * La provenienza è scritta, e il collegamento porta alla fonte: se il
 * dato è sbagliato si deve poter risalire a chi l'ha detto. La trama
 * arriva in inglese da AniList; il bottone la fa tradurre dal backend,
 * ma solo se la chiedi — quella chiamata passa da Render ed è lenta al
 * primo colpo.
 */
function SchedaEsterna({ manga }) {
  const [trama, setTrama] = useState(null);
  const [traducendo, setTraducendo] = useState(false);
  const [fallita, setFallita] = useState(false);

  async function traduci() {
    setTraducendo(true);
    setFallita(false);

    const esito = await chiediTramaItaliana(manga.titolo, manga.autore);

    if (esito?.testo) setTrama(esito.testo);
    else setFallita(true);

    setTraducendo(false);
  }

  const righe = [
    manga.autore,
    manga.anno,
    manga.volumi ? `${manga.volumi} volumi` : manga.capitoli ? `${manga.capitoli} capitoli` : null,
    manga.stato,
    manga.voto ? `${manga.voto.toFixed(1)}/10 su AniList` : null
  ].filter(Boolean);

  return (
    <div className="space-y-3 rounded-panel border border-hairline bg-glass-1 p-3">
      <div className="flex gap-3">
        <div className="w-14 shrink-0">
          <Copertina src={manga.copertina} alt={manga.titolo} inclina={false} />
        </div>

        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight text-ink-bright">{manga.titolo}</p>

          <p className="text-xs leading-relaxed text-ink-muted">{righe.join(" · ")}</p>

          {manga.generi.length > 0 && (
            <p className="text-xs text-ink-faint">{manga.generi.slice(0, 4).join(", ")}</p>
          )}
        </div>
      </div>

      {(trama || manga.trama) && (
        <p className="border-l-2 border-hairline pl-3 text-xs leading-relaxed text-ink-muted">
          {(trama || manga.trama).slice(0, 400)}
          {(trama || manga.trama).length > 400 && "…"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!trama && manga.trama && (
          <button
            onClick={traduci}
            disabled={traducendo}
            className="rounded-full border border-hairline bg-glass-2 px-3 py-1 text-xs text-ink-muted transition-colors duration-quick hover:text-ink-bright disabled:opacity-50"
          >
            {traducendo ? "Traduco…" : "Trama in italiano"}
          </button>
        )}

        {manga.collegamento && (
          <a
            href={manga.collegamento}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full border border-hairline bg-glass-2 px-3 py-1 text-xs text-ink-muted transition-colors duration-quick hover:text-ink-bright"
          >
            Apri su AniList ↗
          </a>
        )}

        {fallita && (
          <span className="text-xs text-ember">
            La traduzione non è arrivata. Riprova fra poco.
          </span>
        )}
      </div>

      {/* Da dove viene il dato, sempre visibile. */}
      <p className="text-[0.65rem] uppercase tracking-wider text-ink-faint">
        Fonte: AniList{trama ? " · trama tradotta" : manga.trama ? " · trama in inglese" : ""}
      </p>
    </div>
  );
}
