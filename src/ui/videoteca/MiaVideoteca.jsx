import { useMemo, useState } from "react";
import { Link } from "react-router";
import Icon from "../../app/Icon";
import Copertina from "../Copertina";
import Foglio from "../Foglio";
import Stelle from "./Stelle";
import {
  urlCopertina,
  impostaVisione,
  segnaEpisodio,
  togliEpisodio,
  togliVotoAnime,
  votaAnime
} from "../../services/api";
import { useAccessoProtetto } from "../../dati/accesso";
import { avvisa } from "../../dati/avvisi";
import NewBadge from "../NewBadge";
import { formatEpisodio } from "./formati";

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
 *   Viste          la classifica, prime dieci.
 *   In pausa, Mollate   chiuse in fondo, con «Riprendi».
 *
 * Il profilo con striscione e faccia non è sparito: è la pagina pubblica
 * (`/videoteca/chi/<nome>`), quella che vedono gli altri dal Cineforum.
 *
 * Le puntate si contano per SCHEDA, come le conta AnimeClick; quando una
 * scheda tiene dentro più stagioni (i `tagli`, vedi la 015) la riga dice
 * «St. 2 · ep. 1» invece di «ep. 15» (`formatEpisodio`, formati.js).
 */

const GIORNO_ORA = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome"
});

/** I numeri di una scheda per chi la guarda. */
function conti(a) {
  const elencate = Number(a.episodi_disponibili || 0);
  const uscite = a.prossimo_episodio ? Math.min(elencate, Number(a.prossimo_episodio) - 1) : elencate;
  const ultimo = Number(a.ultimo_visto || 0);
  const totale = Number(a.episodi_totali) || elencate || null;

  return { uscite, ultimo, totale, prossimo: ultimo + 1, nuovi: Math.max(0, uscite - ultimo) };
}

export default function MiaVideoteca({ righe, setRighe, ricarica }) {
  const [inGestione, setInGestione] = useState(null);
  const [occupato, setOccupato] = useState(null);
  const [problema, setProblema] = useState(null);
  const eseguiProtetto = useAccessoProtetto();

  const tutte = useMemo(() => (righe || []).map((a) => ({ ...a, ...conti(a) })), [righe]);

  const perStato = (stato) => tutte.filter((a) => a.stato_visione === stato);

  // Prima quello che si sta guardando davvero: l'ultima serie toccata (puntata
  // spuntata o stato cambiato, `ultima_attivita` dal backend) in cima. A parità,
  // o se la data manca (backend non ancora aggiornato), l'ordine di prima: chi ha
  // puntate nuove, dalla più vicina a essere in pari; poi chi è in pari, dalla
  // prossima uscita.
  const guardando = perStato("in_visione").sort((a, b) => {
    const ta = a.ultima_attivita ? new Date(a.ultima_attivita).getTime() : 0;
    const tb = b.ultima_attivita ? new Date(b.ultima_attivita).getTime() : 0;

    if (ta !== tb) return tb - ta;

    if (a.nuovi > 0 !== b.nuovi > 0) return a.nuovi > 0 ? -1 : 1;
    if (a.nuovi > 0) return a.nuovi - b.nuovi;

    return new Date(a.prossima_uscita || 8.64e15) - new Date(b.prossima_uscita || 8.64e15);
  });

  const viste = perStato("completa");
  const daVotare = viste.filter((a) => a.voto == null);
  // Niente numeri di posizione (P2-03): con tanti 5,0 a pari merito
  // l'ordine è alfabetico, e «1, 2, 3…» avrebbe fatto credere in una
  // classifica che non c'è. Il voto e l'ordine bastano.
  const classifica = viste
    .filter((a) => a.voto != null)
    .sort((a, b) => Number(b.voto) - Number(a.voto) || a.titolo.localeCompare(b.titolo, "it"));
  // «Sto guardando» in due: prima quello che ha una puntata pronta, poi quello
  // già in pari (richiudibile). L'ordine di `guardando` resta quello per ultima
  // attività dentro ciascun gruppo.
  const pronte = guardando.filter((a) => a.nuovi > 0);
  const inPari = guardando.filter((a) => a.nuovi === 0);
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
      // Se l'accesso è scaduto si riapre il modulo e l'azione riparte.
      await eseguiProtetto(azione);
    } catch (e) {
      // Modulo chiuso senza entrare: niente da dire, solo rimettere
      // la riga com'era.
      if (!e?.annullato) setProblema(errore);
      ricarica();
    } finally {
      setOccupato(null);
    }
  }

  // Ogni gesto che scrive si può disfare (P3-01): l'avviso «Annulla» dura
  // cinque secondi e riporta la riga com'era. Il «fino al N» no: disfarlo
  // sarebbero N richieste, e il foglio ⋮ ha già «non l'ho visto».
  const visto = (a, numero = a.prossimo, fino = false) => {
    const prima = {
      ultimo_visto: a.ultimo_visto,
      episodi_visti: a.episodi_visti,
      ultima_attivita: a.ultima_attivita
    };

    return agisci(
      `ep:${a.id}`,
      async () => {
        await segnaEpisodio(a.id, numero, { fino });
        cambiaRiga(a.id, {
          ultimo_visto: numero,
          episodi_visti: fino ? numero : Number(a.episodi_visti || 0) + 1,
          ultima_attivita: new Date().toISOString()
        });

        if (fino) return;

        avvisa({
          testo: `${a.titolo}, ${formatEpisodio(numero, a.tagli)} segnata`,
          azione: {
            etichetta: "Annulla",
            alTocco: () =>
              agisci(
                `ep:${a.id}`,
                async () => {
                  await togliEpisodio(a.id, numero);
                  cambiaRiga(a.id, prima);
                },
                `Non sono riuscito ad annullare la puntata di ${a.titolo}.`
              )
          }
        });
      },
      `La puntata di ${a.titolo} non è stata segnata.`
    );
  };

  const nonVisto = (a) => {
    const numero = a.ultimo;
    const prima = {
      ultimo_visto: a.ultimo_visto,
      episodi_visti: a.episodi_visti,
      ultima_attivita: a.ultima_attivita
    };

    return agisci(
      `ep:${a.id}`,
      async () => {
        await togliEpisodio(a.id, numero);
        cambiaRiga(a.id, { ultimo_visto: a.ultimo - 1 || null, ultima_attivita: new Date().toISOString() });

        avvisa({
          testo: `${a.titolo}, ${formatEpisodio(numero, a.tagli)} tolta dalle viste`,
          azione: {
            etichetta: "Annulla",
            alTocco: () =>
              agisci(
                `ep:${a.id}`,
                async () => {
                  await segnaEpisodio(a.id, numero);
                  cambiaRiga(a.id, prima);
                },
                `Non sono riuscito a rimettere la puntata di ${a.titolo}.`
              )
          }
        });
      },
      `Non sono riuscito a togliere la puntata di ${a.titolo}.`
    );
  };

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
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 flex items-baseline gap-2 px-1 text-sm font-semibold text-ink-bright">
                Da vedere adesso
                <span className="font-numeric text-xs font-normal text-ink-muted">{pronte.length}</span>
              </h3>

              {pronte.length ? (
                <ul className="grid grid-cols-1 gap-1.5">
                  {pronte.map((a) => (
                    <li key={a.id}>
                      <RigaGuardando
                        anime={a}
                        occupato={occupato === `ep:${a.id}`}
                        onVisto={() => visto(a)}
                        onGestisci={() => setInGestione(a.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-card bg-alcove px-4 py-4 text-sm text-ink-muted">
                  Niente da vedere adesso: sei in pari con tutto.
                </p>
              )}
            </div>

            {/* In pari: richiudibile. Aperta da sola solo quando sopra non c'è
                niente, così la lista non sembra vuota. */}
            {inPari.length > 0 && (
              <details open={pronte.length === 0} className="group">
                <summary className="mb-2 flex min-h-11 cursor-pointer list-none items-center justify-between px-1 text-sm font-semibold text-ink-bright">
                  <span className="flex items-baseline gap-2">
                    In pari
                    <span className="font-numeric text-xs font-normal text-ink-muted">{inPari.length}</span>
                  </span>
                  <span aria-hidden="true" className="text-ink-muted transition-transform duration-quick group-open:rotate-180">
                    ▾
                  </span>
                </summary>

                <ul className="grid grid-cols-1 gap-1.5">
                  {inPari.map((a) => (
                    <li key={a.id}>
                      <RigaGuardando
                        anime={a}
                        occupato={occupato === `ep:${a.id}`}
                        onVisto={() => visto(a)}
                        onGestisci={() => setInGestione(a.id)}
                      />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : (
          <p className="rounded-card bg-alcove px-4 py-5 text-sm text-ink-muted">
            Niente in visione. Aggiungi un titolo con «Aggiungi», o riprendine uno da «Tutti i titoli».
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

      {/* ═══════════ VISTE ═══════════ */}
      {classifica.length > 0 && (
        <Sezione titolo="Viste" conto={viste.length}>
          <Elenco>
            {classifica.slice(0, 10).map((a) => (
              <Riga key={a.id} anime={a} sotto={a.tipo === "film" ? "Film" : null}>
                <span className="shrink-0 font-numeric text-sm font-semibold text-ink-bright">
                  {String(a.voto).replace(".", ",")} <span className="text-brass-400">★</span>
                </span>
              </Riga>
            ))}
          </Elenco>
          {viste.length > 10 && (
            <Link to="/videoteca/io/tutto" className="mt-2 block px-1 text-sm font-medium text-link hover:underline">
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
          <details key={g.titolo} className="group rounded-card bg-alcove">
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
                <Riga key={a.id} anime={a} sotto={a.ultimo ? `ferma ${formatEpisodio(a.ultimo, a.tagli, { prep: "a" })}` : "mai cominciata"}>
                  <Piccolo onClick={() => stato(a, "in_visione")} disabilitato={occupato === `stato:${a.id}`}>
                    Riprendi
                  </Piccolo>
                </Riga>
              ))}
            </ul>
          </details>
        ))}
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
  return <ul className="divide-y divide-hairline rounded-card bg-alcove px-3.5">{children}</ul>;
}

function Riga({ anime, sotto, children }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
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
      className="shrink-0 rounded-card bg-glass-2 px-3 py-2 text-xs font-semibold text-ink-bright transition-transform duration-quick active:scale-95 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Una serie in «Sto guardando» (P2-04): compatta, perché è la lista che
 * si apre ogni giorno e con la card alta se ne vedevano tre e mezza per
 * schermata. Copertina 56×80, titolo, riga di stato, barra sottile; a
 * destra il tondo ✓ (44×44) che segna la prossima puntata. Il bottone a
 * tutta larghezza resta solo nella hero «Da riprendere» della Home.
 *
 * Tutti i tondi ✓ sono uguali: una regola, non un caso (prima solo la
 * prima card aveva il pulsante pieno, senza un motivo che si capisse).
 */
function RigaGuardando({ anime, occupato, onVisto, onGestisci }) {
  const { ultimo, nuovi, prossimo, uscite } = anime;

  // La barra dice una cosa sola: quante delle puntate USCITE hai visto
  // (P1-02). Prima era `ultimo ÷ episodi_totali`: contro il totale
  // dichiarato dalla scheda, che spesso è la lunghezza della stagione, e
  // «7 nuovi» stava accanto a una barra quasi piena. Stessa unità del
  // «N nuovi» (puntate della scheda, numero assoluto), quindi con nuovi > 0
  // non arriva mai al 100%. Se le uscite non si sanno, niente barra.
  const percento = uscite > 0 ? Math.min(100, Math.round((ultimo / uscite) * 100)) : null;

  const dove = ultimo ? `Sei ${formatEpisodio(ultimo, anime.tagli, { prep: "a" })}` : "Da cominciare";
  const stato = anime.prossima_uscita
    ? `in pari · ${GIORNO_ORA.format(new Date(anime.prossima_uscita))}`
    : uscite
      ? "in pari"
      : "nessuna puntata uscita";
  const copertina = urlCopertina(anime.cover_url, 128);
  const prossima = formatEpisodio(prossimo, anime.tagli);

  return (
    <div className="flex items-center gap-2.5 rounded-card bg-alcove p-2">
      <Link to={`/videoteca/${anime.id}`} aria-hidden="true" tabIndex={-1} className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-glass-2">
        {copertina && <img src={copertina} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Link to={`/videoteca/${anime.id}`} className="min-w-0 flex-1 truncate font-semibold text-ink-bright">
            {anime.titolo}
          </Link>

          {/* L'icona resta da 18 px, l'area che si tocca è 44×44: i
              margini negativi la fanno sporgere senza allungare la riga. */}
          <button
            type="button"
            onClick={onGestisci}
            aria-label={`Altre azioni per ${anime.titolo}`}
            className="-my-3 -mr-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted transition-colors duration-quick hover:bg-glass-2 hover:text-ink-bright"
          >
            <Icon nome="puntini" dimensione={18} />
          </button>
        </div>

        <p className="text-fine leading-snug text-ink-muted">
          {dove} · {nuovi > 0 ? <NewBadge count={nuovi} /> : stato}
        </p>

        {percento !== null && (
          <div
            role="progressbar"
            aria-label={`Visti ${ultimo} episodi su ${uscite} usciti`}
            aria-valuemin={0}
            aria-valuenow={ultimo}
            aria-valuemax={uscite}
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-bright/[0.08]"
          >
            <div className="h-full rounded-full bg-progresso" style={{ width: `${percento}%` }} />
          </div>
        )}
      </div>

      {nuovi > 0 && (
        <button
          type="button"
          onClick={onVisto}
          disabled={occupato}
          aria-label={`Segna come visto: ${prossima}`}
          title={`Segna come visto: ${prossima}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-brass-400/60 text-brass-300 transition-all duration-quick hover:bg-brass-400/10 active:scale-90 disabled:opacity-60"
        >
          {occupato ? (
            <span aria-hidden="true" className="font-numeric text-sm">…</span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Tutto quello che si fa a una serie oltre a «visto», in un posto solo.
 * Mollare chiede un secondo tocco; le altre scelte si disfano da sole
 * (una pausa si riprende, una «vista» si rimette in visione).
 */
function FoglioAnime({ anime, onChiudi, onVota, onFinoA, onNonVisto, onStato }) {
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
      etichetta: `${formatEpisodio(anime.ultimo, anime.tagli, { prep: "l" }).replace(/^l'/, "L'")} non l'ho visto`,
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
    <Foglio titolo={`Gestisci ${anime.titolo}`} titoloNascosto senzaMargini larghezza="sm:max-w-md" onChiudere={onChiudi}>
      <div className="px-5 pb-1">
          <div className="flex items-center gap-3.5">
            <div className="w-11 shrink-0">
              <Copertina src={anime.cover_url} alt="" inclina={false} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold text-ink-bright">{anime.titolo}</p>
              <p className="text-sm text-ink-muted">
                {anime.ultimo ? `Sei ${formatEpisodio(anime.ultimo, anime.tagli, { prep: "a" })}` : "Non ancora cominciata"}
                {anime.totale ? ` di ${anime.totale}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onChiudi}
              aria-label="Chiudi"
              className="bersaglio grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-glass-2 hover:text-ink-bright"
            >
              <Icon nome="close" dimensione={18} />
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-card bg-shelf px-4 py-3">
            <span className="text-sm font-medium text-ink-bright">Il tuo voto</span>
            <Stelle voto={anime.voto} alVoto={onVota} dimensione={22} />
          </div>

          {/* Il salto segna come viste TUTTE le puntate fino a quella:
              è il gesto di chi torna dopo una serata, o dopo una
              settimana di arretrati. */}
          <form onSubmit={vai} className="mt-3 flex items-center gap-2 rounded-card bg-shelf px-4 py-2.5">
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
              className="w-16 rounded-lg bg-alcove px-2 py-1.5 text-center font-numeric text-ink-bright placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brass-400"
            />
            <button type="submit" className="rounded-lg bg-glass-2 px-3 py-1.5 text-sm font-semibold text-ink-bright">
              Segna
            </button>
          </form>
          <p className="mt-1.5 px-1 text-xs text-ink-muted">Il numero è quello di AnimeClick, contato dall'inizio della scheda.</p>

          <ul className="mt-3 divide-y divide-hairline rounded-card bg-shelf">
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
    </Foglio>
  );
}
