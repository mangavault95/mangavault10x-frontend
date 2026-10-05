import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../app/Icon";
import Copertina from "../Copertina";
import Sovrapposizione from "../Sovrapposizione";
import useChiusuraVelo from "../useChiusuraVelo";
import Stelle from "./Stelle";
import {
  impostaVisione,
  segnaEpisodio,
  togliEpisodio,
  togliVotoAnime,
  votaAnime
} from "../../services/api";

/**
 * LA MIA VIDEOTECA — rifatta il 04/10/2026 come «In lettura».
 *
 * Prima la propria pagina era un profilo: striscione, faccia, quattro
 * caselle di statistiche e tre file di copertine (Serie, Film,
 * Preferiti). Bella da far vedere, scomoda da usare: per sapere a che
 * puntata eri dovevi cercare la serie fra le copertine.
 *
 * Adesso risponde a «cosa sto guardando e a che punto sono»:
 *
 *   Sto guardando  una riga per serie: «Ep. 19 · 4 nuovi» o «In pari ·
 *                  prossimo giovedì», e un tasto, «Visto l'ep. 20».
 *                  Il resto (voto, salti, pausa, molla, finita) sta nel
 *                  foglio dietro i tre puntini.
 *   Da votare      le viste senza voto, con le stelle sulla riga.
 *   Da vedere      la lista d'attesa, con «Inizia».
 *   Viste          la classifica, prime dieci.
 *   In pausa, Mollate   chiuse in fondo, con «Riprendi».
 *
 * Il profilo con striscione e faccia non è sparito: è la pagina pubblica
 * (`/videoteca/chi/<nome>`), quella che vedono gli altri dal Cineforum.
 *
 * Le puntate si contano per SCHEDA, come le conta AnimeClick; quando una
 * scheda tiene dentro più stagioni (i `tagli`, vedi la 015) la riga dice
 * «ep. 1 della st. 2» invece di «ep. 15».
 */

const GIORNO_ORA = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome"
});

/** Dove sta l'episodio `n` dentro le stagioni della scheda. */
function inStagione(n, tagli) {
  const t = (tagli || []).map(Number).filter(Boolean).sort((a, b) => a - b);

  if (!t.length) return { stagione: null, episodio: n };

  const stagione = 1 + t.filter((x) => x <= n).length;
  const inizio = stagione === 1 ? 1 : t[stagione - 2];

  return { stagione, episodio: n - inizio + 1 };
}

function etichettaEp(n, tagli) {
  const { stagione, episodio } = inStagione(n, tagli);

  return stagione ? `ep. ${episodio} della st. ${stagione}` : `ep. ${episodio}`;
}

/** I numeri di una scheda per chi la guarda. */
function conti(a) {
  const elencate = Number(a.episodi_disponibili || 0);
  const uscite = a.prossimo_episodio ? Math.min(elencate, Number(a.prossimo_episodio) - 1) : elencate;
  const ultimo = Number(a.ultimo_visto || 0);
  const totale = Number(a.episodi_totali) || elencate || null;

  return { uscite, ultimo, totale, prossimo: ultimo + 1, nuovi: Math.max(0, uscite - ultimo) };
}

export default function MiaVideoteca({ righe, setRighe, ricarica, persona }) {
  const [inGestione, setInGestione] = useState(null);
  const [occupato, setOccupato] = useState(null);
  const [problema, setProblema] = useState(null);

  const tutte = useMemo(() => (righe || []).map((a) => ({ ...a, ...conti(a) })), [righe]);

  const perStato = (stato) => tutte.filter((a) => a.stato_visione === stato);

  // Prima chi ha puntate nuove, dalla più vicina a essere in pari; poi
  // quelle in pari, dalla prossima uscita.
  const guardando = perStato("in_visione").sort((a, b) => {
    if (a.nuovi > 0 !== b.nuovi > 0) return a.nuovi > 0 ? -1 : 1;
    if (a.nuovi > 0) return a.nuovi - b.nuovi;

    return new Date(a.prossima_uscita || 8.64e15) - new Date(b.prossima_uscita || 8.64e15);
  });

  const viste = perStato("completa");
  const daVotare = viste.filter((a) => a.voto == null);
  const classifica = viste
    .filter((a) => a.voto != null)
    .sort((a, b) => Number(b.voto) - Number(a.voto) || a.titolo.localeCompare(b.titolo, "it"));
  const daVedere = perStato("da_vedere");
  const inPausa = perStato("in_pausa");
  const mollate = perStato("droppata");

  /** Aggiorna una riga sul posto: niente ricarico di tutta la videoteca per una casella. */
  function cambiaRiga(id, modifica) {
    setRighe((precedenti) => precedenti?.map((a) => (a.id === id ? { ...a, ...modifica } : a)));
  }

  async function agisci(chiave, azione, errore) {
    setProblema(null);
    setOccupato(chiave);

    try {
      await azione();
    } catch {
      setProblema(errore);
      ricarica();
    } finally {
      setOccupato(null);
    }
  }

  const visto = (a, numero = a.prossimo, fino = false) =>
    agisci(
      `ep:${a.id}`,
      async () => {
        await segnaEpisodio(a.id, numero, { fino });
        cambiaRiga(a.id, { ultimo_visto: numero, episodi_visti: fino ? numero : Number(a.episodi_visti || 0) + 1 });
      },
      `La puntata di ${a.titolo} non è stata segnata.`
    );

  const nonVisto = (a) =>
    agisci(
      `ep:${a.id}`,
      async () => {
        await togliEpisodio(a.id, a.ultimo);
        cambiaRiga(a.id, { ultimo_visto: a.ultimo - 1 || null });
      },
      `Non sono riuscito a togliere la puntata di ${a.titolo}.`
    );

  const stato = (a, nuovo) =>
    agisci(
      `stato:${a.id}`,
      async () => {
        await impostaVisione(a.id, nuovo);
        cambiaRiga(a.id, { stato_visione: nuovo });
      },
      `Non sono riuscito a cambiare lo stato di ${a.titolo}.`
    );

  const vota = (a, voto) =>
    agisci(
      `voto:${a.id}`,
      async () => {
        if (voto == null) await togliVotoAnime(a.id);
        else await votaAnime(a.id, voto);
        cambiaRiga(a.id, { voto });
      },
      `Il voto di ${a.titolo} non è stato salvato.`
    );

  const inFoglio = inGestione ? tutte.find((a) => a.id === inGestione) : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-9 px-4 pb-8 pt-4 sm:px-6">
      {/* «Tutti i titoli» e «Numeri» stanno nella riga delle sottosezioni,
          qui sopra, come «Collezione» e «Numeri» per i manga. */}
      <h1 className="font-display text-[2.1rem] font-extrabold leading-none tracking-tight text-ink-bright">Anime</h1>

      {problema && (
        <p role="alert" className="rounded-card border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          {problema}
        </p>
      )}

      {inFoglio && (
        <FoglioAnime
          anime={inFoglio}
          onChiudi={() => setInGestione(null)}
          onVota={(v) => vota(inFoglio, v)}
          onFinoA={(n) => visto(inFoglio, n, true)}
          onNonVisto={() => nonVisto(inFoglio)}
          onStato={(s) => stato(inFoglio, s)}
        />
      )}

      {/* ═══════════ STO GUARDANDO ═══════════ */}
      <Sezione titolo="Sto guardando" conto={guardando.length}>
        {guardando.length ? (
          <ul className="grid grid-cols-1 gap-2.5">
            {guardando.map((a, i) => (
              <li key={a.id}>
                <RigaGuardando
                  anime={a}
                  principale={i === 0 && a.nuovi > 0}
                  occupato={occupato === `ep:${a.id}`}
                  onVisto={() => visto(a)}
                  onGestisci={() => setInGestione(a.id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-alcove px-4 py-5 text-sm text-ink-muted">
            Niente in visione. Dai «Da vedere» qui sotto, o con «Aggiungi» in alto.
          </p>
        )}
      </Sezione>

      {/* ═══════════ DA VOTARE ═══════════ */}
      {daVotare.length > 0 && (
        <Sezione titolo="Da votare">
          <Elenco>
            {daVotare.map((a) => (
              <Riga key={a.id} anime={a} sotto={a.tipo === "film" ? "Film" : `${a.ultimo} puntate`}>
                <Stelle voto={a.voto} alVoto={(v) => vota(a, v)} disabilitato={occupato === `voto:${a.id}`} dimensione={20} />
              </Riga>
            ))}
          </Elenco>
        </Sezione>
      )}

      {/* ═══════════ DA VEDERE ═══════════ */}
      {daVedere.length > 0 && (
        <Sezione titolo="Da vedere" conto={daVedere.length}>
          <Elenco>
            {daVedere.slice(0, 6).map((a) => (
              <Riga key={a.id} anime={a} sotto={a.tipo === "film" ? "Film" : a.uscite ? `${a.uscite} puntate` : "Non ancora uscito"}>
                <Piccolo onClick={() => stato(a, "in_visione")} disabilitato={occupato === `stato:${a.id}`}>
                  Inizia
                </Piccolo>
              </Riga>
            ))}
          </Elenco>
          {daVedere.length > 6 && (
            <Link to="/videoteca/io/tutto" className="mt-2 block px-1 text-sm font-medium text-brass-300 hover:underline">
              Le altre {daVedere.length - 6} in «Tutti i titoli»
            </Link>
          )}
        </Sezione>
      )}

      {/* ═══════════ VISTE ═══════════ */}
      {classifica.length > 0 && (
        <Sezione titolo="Viste" conto={viste.length}>
          <Elenco>
            {classifica.slice(0, 10).map((a, i) => (
              <Riga key={a.id} anime={a} posizione={i + 1} sotto={a.tipo === "film" ? "Film" : null}>
                <span className="shrink-0 font-numeric text-sm font-semibold text-ink-bright">
                  {String(a.voto).replace(".", ",")} <span className="text-brass-400">★</span>
                </span>
              </Riga>
            ))}
          </Elenco>
          {viste.length > 10 && (
            <Link to="/videoteca/io/tutto" className="mt-2 block px-1 text-sm font-medium text-brass-300 hover:underline">
              Tutte le {viste.length} viste
            </Link>
          )}
        </Sezione>
      )}

      {/* ═══════════ IN PAUSA E MOLLATE ═══════════ */}
      {[
        { titolo: "In pausa", elenco: inPausa },
        { titolo: "Mollate", elenco: mollate }
      ]
        .filter((g) => g.elenco.length)
        .map((g) => (
          <details key={g.titolo} className="group rounded-2xl bg-alcove">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-ink-bright">
              <span>
                {g.titolo} <span className="font-numeric text-ink-muted">· {g.elenco.length}</span>
              </span>
              <span aria-hidden="true" className="text-ink-muted transition-transform duration-quick group-open:rotate-180">
                ▾
              </span>
            </summary>
            <ul className="divide-y divide-hairline border-t border-hairline px-3.5">
              {g.elenco.map((a) => (
                <Riga key={a.id} anime={a} sotto={a.ultimo ? `ferma all'${etichettaEp(a.ultimo, a.tagli)}` : "mai cominciata"}>
                  <Piccolo onClick={() => stato(a, "in_visione")} disabilitato={occupato === `stato:${a.id}`}>
                    Riprendi
                  </Piccolo>
                </Riga>
              ))}
            </ul>
          </details>
        ))}

      {persona?.nickname && (
        <p className="text-center text-sm">
          <Link
            to={`/videoteca/chi/${encodeURIComponent(persona.nickname)}`}
            className="text-ink-muted underline-offset-4 hover:text-ink-bright hover:underline"
          >
            Il tuo profilo pubblico, quello che vedono gli altri
          </Link>
        </p>
      )}
    </div>
  );
}

/* ==================================================
   I PEZZI
   ================================================== */

function Sezione({ titolo, conto, children }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink-bright">{titolo}</h2>
        {conto ? <span className="font-numeric text-sm text-ink-muted">{conto}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Elenco({ children }) {
  return <ul className="divide-y divide-hairline rounded-2xl bg-alcove px-3.5">{children}</ul>;
}

function Riga({ anime, sotto, posizione, children }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {posizione ? <span className="w-5 shrink-0 text-right font-numeric text-xs text-ink-faint">{posizione}</span> : null}
      <Link to={`/videoteca/${anime.id}`} className="w-9 shrink-0">
        <Copertina src={anime.cover_url} alt="" inclina={false} />
      </Link>
      <Link to={`/videoteca/${anime.id}`} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-bright">{anime.titolo}</span>
        {sotto ? <span className="block truncate text-xs text-ink-muted">{sotto}</span> : null}
      </Link>
      {children}
    </li>
  );
}

function Piccolo({ onClick, disabilitato, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabilitato}
      className="shrink-0 rounded-xl bg-glass-2 px-3 py-2 text-xs font-semibold text-ink-bright transition-transform duration-quick active:scale-95 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function RigaGuardando({ anime, principale, occupato, onVisto, onGestisci }) {
  const { ultimo, nuovi, totale, prossimo, uscite } = anime;
  const percento = totale ? Math.min(100, Math.round((ultimo / totale) * 100)) : null;

  const dove = ultimo ? `Sei all'${etichettaEp(ultimo, anime.tagli)}` : "Da cominciare";
  const stato =
    nuovi > 0
      ? `${nuovi} ${nuovi === 1 ? "nuovo" : "nuovi"}`
      : anime.prossima_uscita
        ? `in pari · ${GIORNO_ORA.format(new Date(anime.prossima_uscita))}`
        : "in pari";

  return (
    <div className="flex gap-3.5 rounded-2xl bg-alcove p-3.5">
      <Link to={`/videoteca/${anime.id}`} className="w-[3.25rem] shrink-0 self-start">
        <Copertina src={anime.cover_url} alt="" inclina={false} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link to={`/videoteca/${anime.id}`} className="block truncate font-semibold text-ink-bright">
              {anime.titolo}
            </Link>
            <p className="mt-0.5 text-[0.8rem] text-ink-muted">
              {dove} · <span className={nuovi > 0 ? "font-semibold text-brass-300" : ""}>{stato}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onGestisci}
            aria-label={`Gestisci ${anime.titolo}: voto, salti, pausa e altro`}
            className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors duration-quick hover:bg-glass-2 hover:text-ink-bright"
          >
            <Icon nome="puntini" dimensione={18} />
          </button>
        </div>

        {percento !== null && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-bright/[0.08]">
            <div className="h-full rounded-full bg-brass-400" style={{ width: `${percento}%` }} />
          </div>
        )}

        {nuovi > 0 ? (
          <button
            type="button"
            onClick={onVisto}
            disabled={occupato}
            className={`mt-3 h-10 w-full truncate rounded-xl px-3 text-sm font-semibold transition-transform duration-quick active:scale-[0.98] disabled:opacity-60 ${
              principale ? "bg-brass-400 text-void" : "bg-glass-2 text-ink-bright"
            }`}
          >
            {occupato ? "Segno…" : `Visto l'${etichettaEp(prossimo, anime.tagli)}`}
          </button>
        ) : (
          <p className="mt-2.5 text-xs text-ink-faint">
            {uscite ? `Hai visto tutte le ${uscite} uscite.` : "Non è ancora uscita nessuna puntata."}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Tutto quello che si fa a una serie oltre a «visto», in un posto solo.
 * Mollare chiede un secondo tocco; le altre scelte si disfano da sole
 * (una pausa si riprende, una «vista» si rimette in visione).
 */
function FoglioAnime({ anime, onChiudi, onVota, onFinoA, onNonVisto, onStato }) {
  const velo = useChiusuraVelo(onChiudi);
  const [confermando, setConfermando] = useState(false);
  const [salto, setSalto] = useState("");

  const fai = (azione) => {
    azione();
    onChiudi();
  };

  function vai(e) {
    e.preventDefault();

    const n = Number(salto);

    if (!Number.isInteger(n) || n < 1) return;

    fai(() => onFinoA(n));
  }

  const voci = [
    anime.ultimo > 0 && {
      chiave: "nonvisto",
      etichetta: `L'${etichettaEp(anime.ultimo, anime.tagli)} non l'ho visto`,
      descrizione: "Toglie l'ultima puntata segnata.",
      azione: onNonVisto
    },
    {
      chiave: "finita",
      etichetta: "L'ho finita",
      descrizione: "Passa fra le viste; da lì la voti.",
      azione: () => onStato("completa")
    },
    {
      chiave: "pausa",
      etichetta: "Metti in pausa",
      descrizione: "Esce da «Sto guardando» e dal calendario; si riprende dal fondo della pagina.",
      azione: () => onStato("in_pausa")
    }
  ].filter(Boolean);

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal flex items-end justify-center bg-void/60 backdrop-blur-sm sm:items-center sm:p-4"
        onKeyDown={(e) => {
          if (e.key === "Escape") onChiudi();
        }}
        {...velo}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Gestisci ${anime.titolo}`}
          className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-sheet bg-alcove p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-float animate-rise-in sm:rounded-sheet"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 shrink-0">
              <Copertina src={anime.cover_url} alt="" inclina={false} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold text-ink-bright">{anime.titolo}</p>
              <p className="text-sm text-ink-muted">
                {anime.ultimo ? `Sei all'${etichettaEp(anime.ultimo, anime.tagli)}` : "Non ancora cominciata"}
                {anime.totale ? ` di ${anime.totale}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onChiudi}
              aria-label="Chiudi"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-glass-2 hover:text-ink-bright"
            >
              <Icon nome="close" dimensione={18} />
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-shelf px-4 py-3">
            <span className="text-sm font-medium text-ink-bright">Il tuo voto</span>
            <Stelle voto={anime.voto} alVoto={onVota} dimensione={22} />
          </div>

          {/* Il salto segna come viste TUTTE le puntate fino a quella:
              è il gesto di chi torna dopo una serata, o dopo una
              settimana di arretrati. */}
          <form onSubmit={vai} className="mt-3 flex items-center gap-2 rounded-2xl bg-shelf px-4 py-2.5">
            <label htmlFor="salto-episodio" className="flex-1 text-sm font-medium text-ink-bright">
              Viste tutte fino all'ep.
            </label>
            <input
              id="salto-episodio"
              type="number"
              inputMode="numeric"
              min="1"
              max={anime.uscite || undefined}
              value={salto}
              onChange={(e) => setSalto(e.target.value)}
              placeholder={String(anime.uscite || anime.prossimo)}
              className="w-16 rounded-lg bg-alcove px-2 py-1.5 text-center font-numeric text-ink-bright placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brass-400"
            />
            <button type="submit" className="rounded-lg bg-glass-2 px-3 py-1.5 text-sm font-semibold text-ink-bright">
              Segna
            </button>
          </form>
          <p className="mt-1.5 px-1 text-xs text-ink-faint">Il numero è quello di AnimeClick, contato dall'inizio della scheda.</p>

          <ul className="mt-3 divide-y divide-hairline rounded-2xl bg-shelf">
            {voci.map((v) => (
              <li key={v.chiave}>
                <button type="button" onClick={() => fai(v.azione)} className="w-full px-4 py-3 text-left">
                  <span className="block text-sm font-semibold text-ink-bright">{v.etichetta}</span>
                  <span className="block text-xs text-ink-muted">{v.descrizione}</span>
                </button>
              </li>
            ))}

            <li>
              <button
                type="button"
                onClick={() => (confermando ? fai(() => onStato("droppata")) : setConfermando(true))}
                className="w-full px-4 py-3 text-left"
              >
                <span className="block text-sm font-semibold text-ember">{confermando ? "Sicuro? Tocca di nuovo" : "Mollala"}</span>
                <span className="block text-xs text-ink-muted">Finisce fra le mollate in fondo alla pagina, da dove si riprende.</span>
              </button>
            </li>

            <li>
              <Link to={`/videoteca/${anime.id}`} className="block px-4 py-3">
                <span className="block text-sm font-semibold text-ink-bright">Apri la scheda</span>
                <span className="block text-xs text-ink-muted">Puntate una per una, note, stagioni.</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </Sovrapposizione>
  );
}
