import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { chiudibile, euro, fraseMancanti, tettoLettura, volumiMancanti } from "../dati/serie";
import {
  addReadingHistory,
  dopoIlRipiego,
  getCalendarioAnime,
  getReadingSessions,
  getUsciteManga,
  getVideoteca,
  segnaEpisodio,
  updateReadingSession,
  urlCopertina
} from "../services/api";

/**
 * ADESSO — la home (04/10/2026).
 *
 * Prima la porta del sito era la stanza in 3D: bella la prima volta, e
 * una camminata da fare a ogni apertura per arrivare dove si sapeva già
 * di voler andare. Adesso la prima schermata risponde a «cosa faccio
 * adesso?», che è la domanda con cui si apre il telefono:
 *
 *   1. cosa riprendere a guardare, con un tasto per segnare la puntata
 *   2. le altre serie con puntate nuove
 *   3. cosa si sta leggendo, con +1 a portata di pollice
 *   4. cosa esce questa settimana: volumi E puntate, in una lista sola
 *   5. il prossimo acquisto: la serie a cui manca meno per essere completa
 *
 * (La stanza in 3D che stava qui prima è stata tolta il 05/10/2026.)
 *
 * Tutto quello che si legge qui è di chi guarda (chi non è entrato vede
 * quello del proprietario, come nel resto del sito). Ogni sezione si
 * disegna da sola e sparisce se non ha niente da dire: una home piena di
 * riquadri vuoti è peggio di una home corta.
 */

const GIORNI_SETTIMANA = 7;

export default function AdessoPage() {
  const { serie: collezione } = useCollezione();
  const { utente } = useSessione();
  const eseguiProtetto = useAccessoProtetto();

  const videoteca = useRisorsa(() => getVideoteca());
  const calendario = useRisorsa(() => getCalendarioAnime(GIORNI_SETTIMANA, 14));
  const sessioni = useRisorsa(() => getReadingSessions());
  const uscite = useRisorsa(() => getUsciteManga(GIORNI_SETTIMANA));

  const [inCorso, setInCorso] = useState(null);
  const [problema, setProblema] = useState(null);

  // L'istante di riferimento, preso una volta all'apertura: «uscito» e
  // «in arrivo» non devono cambiare idea a ogni ridisegno.
  const [adesso] = useState(() => Date.now());

  const anime = useMemo(() => animeInVisione(videoteca.dati), [videoteca.dati]);

  // Da riprendere: la serie con la puntata non vista uscita più di
  // recente. È quella di cui si ha voglia stasera; le altre aspettano
  // nella fila sotto.
  const daRiprendere = useMemo(() => {
    const perId = new Map(anime.map((a) => [Number(a.id), a]));

    const candidate = (calendario.dati || [])
      .filter((e) => new Date(e.uscita_italia).getTime() <= adesso)
      .filter((e) => perId.get(Number(e.anime_id))?.nuovi > 0)
      .sort((a, b) => new Date(b.uscita_italia) - new Date(a.uscita_italia));

    return candidate.length ? perId.get(Number(candidate[0].anime_id)) : anime.find((a) => a.nuovi > 0) || null;
  }, [anime, calendario.dati, adesso]);

  // Prima le serie con una puntata uscita da poco, dalla più fresca;
  // poi gli arretrati, da quello più vicino a essere in pari. Ordinate
  // solo per quante puntate mancano, in testa finivano One Piece (75) e
  // le serie lasciate a metà anni fa — vere, ma non quello che si
  // guarda stasera.
  const daGuardare = useMemo(() => {
    const recenti = new Map();

    for (const e of calendario.dati || []) {
      const t = new Date(e.uscita_italia).getTime();

      if (t <= adesso) recenti.set(Number(e.anime_id), Math.max(recenti.get(Number(e.anime_id)) || 0, t));
    }

    return anime
      .filter((a) => a.nuovi > 0 && a.id !== daRiprendere?.id)
      .sort((a, b) => {
        const ra = recenti.get(Number(a.id)) || 0;
        const rb = recenti.get(Number(b.id)) || 0;

        return rb - ra || a.nuovi - b.nuovi;
      });
  }, [anime, calendario.dati, daRiprendere, adesso]);

  const letture = useMemo(() => {
    const perId = new Map((collezione || []).map((s) => [String(s.id), s]));

    return (sessioni.dati || []).map((s) => {
      const serie = perId.get(String(s.manga_id));
      const posseduti = serie?.posseduti || 0;
      const totali = serie?.totali ?? (Number(s.volumitotali) || null);

      return {
        idSessione: s.id,
        mangaId: s.manga_id,
        titolo: serie?.titolo || s.titolo,
        autore: serie?.autore || s.autore,
        copertina: serie?.copertina || s.coverurl,
        volume: Number(s.volume) || 1,
        massimo: tettoLettura(posseduti, totali)
      };
    });
  }, [sessioni.dati, collezione]);

  const settimana = useMemo(
    () => usciteDellaSettimana(uscite.dati?.uscite, calendario.dati, anime, adesso),
    [uscite.dati, calendario.dati, anime, adesso]
  );

  const prossimoAcquisto = useMemo(() => acquistoPiuVicino(collezione), [collezione]);

  async function vistoProssimo(a) {
    setProblema(null);
    setInCorso(`anime:${a.id}`);

    try {
      await eseguiProtetto(() => segnaEpisodio(a.id, a.prossimo));
      videoteca.ricarica();
      calendario.ricarica();
    } catch (e) {
      if (!e?.annullato) setProblema("La puntata non è stata segnata. Riprova fra un attimo.");
    } finally {
      setInCorso(null);
    }
  }

  async function lettoProssimo(l) {
    setProblema(null);
    setInCorso(`lettura:${l.mangaId}`);

    const eUltimo = l.massimo ? l.volume >= l.massimo : false;

    try {
      await eseguiProtetto(async () => {
        await addReadingHistory({
          manga_id: l.mangaId,
          titolo: l.titolo,
          autore: l.autore,
          coverurl: l.copertina,
          volume: l.volume
        });

        if (!eUltimo) await updateReadingSession(l.mangaId, l.volume + 1);
      });

      sessioni.ricarica();
    } catch (e) {
      if (!e?.annullato) setProblema("Il volume non è stato registrato. Riprova fra un attimo.");
    } finally {
      setInCorso(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-6">
      <Testata nome={utente?.nickname} />

      <RichiamoMese adesso={adesso} />

      {problema && (
        <p role="alert" className="mx-4 mt-4 rounded-card border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          {problema}
        </p>
      )}

      {daRiprendere && (
        <DaRiprendere anime={daRiprendere} occupato={inCorso === `anime:${daRiprendere.id}`} onVisto={() => vistoProssimo(daRiprendere)} />
      )}

      {daGuardare.length > 0 && (
        <Sezione titolo="Da guardare" link={{ a: "/videoteca/io", testo: "Tutto" }}>
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {daGuardare.slice(0, 10).map((a) => (
              <li key={a.id} className="w-32 shrink-0">
                <Link to={`/videoteca/${a.id}`} className="group block focus-visible:outline-none">
                  <div className="relative">
                    <Immagine src={a.cover_url} alt="" className="aspect-[2/3] w-32 rounded-2xl" />
                    <span className="absolute left-2 top-2 rounded-lg bg-brass-400 px-1.5 py-0.5 font-numeric text-xs font-semibold text-void">
                      {a.nuovi} {a.nuovi === 1 ? "nuovo" : "nuovi"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-ink-bright">{a.titolo}</p>
                  <p className="mt-0.5 text-[0.8rem] text-ink-muted">Riprendi dall'ep. {a.prossimo}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Sezione>
      )}

      {letture.length > 0 && (
        <Sezione titolo="Continua a leggere" link={{ a: "/lettura", testo: "Tutte" }}>
          <LetturaPrincipale lettura={letture[0]} occupato={inCorso === `lettura:${letture[0].mangaId}`} onPiuUno={() => lettoProssimo(letture[0])} />

          {letture.length > 1 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {letture.slice(1, 3).map((l) => (
                <Link
                  key={l.idSessione}
                  to={`/serie/${l.mangaId}`}
                  className="flex items-center gap-2.5 rounded-2xl bg-alcove p-2.5 transition-colors duration-quick active:bg-glass-2"
                >
                  <Immagine src={l.copertina} alt="" className="h-12 w-8 shrink-0 rounded-md" larghezza={128} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-bright">{l.titolo}</p>
                    <p className="font-numeric text-xs text-ink-muted">
                      vol. {l.volume}
                      {l.massimo ? ` / ${l.massimo}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Sezione>
      )}

      {settimana.length > 0 && (
        <Sezione titolo="Esce questa settimana" link={{ a: "/calendario", testo: "Calendario" }}>
          <ul className="divide-y divide-hairline rounded-2xl bg-alcove px-3.5">
            {settimana.map((u) => (
              <li key={u.chiave}>
                <Link to={u.link} className="flex items-center gap-3 py-2.5">
                  <div className="w-10 shrink-0 text-center">
                    <p className="text-[0.7rem] uppercase text-ink-muted">{u.giornoSettimana}</p>
                    <p className="font-numeric text-lg font-semibold text-ink-bright">{u.giorno}</p>
                  </div>
                  <Immagine src={u.copertina} alt="" className="h-12 w-8 shrink-0 rounded-md" larghezza={128} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-bright">{u.titolo}</p>
                    <p className="truncate text-xs text-ink-muted">{u.dettaglio}</p>
                  </div>
                  {u.nota && <span className={`shrink-0 text-right text-xs ${u.notaColore}`}>{u.nota}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {uscite.dati?.errore && (
            <p className="mt-2 px-1 text-xs text-ink-muted">Le uscite dei volumi non sono arrivate: AnimeClick non risponde.</p>
          )}
        </Sezione>
      )}

      {prossimoAcquisto && (
        <Sezione titolo="Prossimo acquisto" link={{ a: "/wishlist", testo: "Da comprare" }}>
          <Link
            to={`/serie/${prossimoAcquisto.serie.id}`}
            className="flex items-center gap-3.5 rounded-2xl bg-alcove p-3.5 transition-colors duration-quick active:bg-glass-2"
          >
            <Immagine src={prossimoAcquisto.serie.copertina} alt="" className="h-[70px] w-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-bright">
                {prossimoAcquisto.serie.titolo} {prossimoAcquisto.volume}
              </p>
              <p className="text-[0.8rem] text-ink-muted">
                {(() => {
                  const frase = fraseMancanti(prossimoAcquisto.serie, prossimoAcquisto.mancanti);
                  return frase.charAt(0).toUpperCase() + frase.slice(1);
                })()}
                {prossimoAcquisto.serie.editore ? ` · ${prossimoAcquisto.serie.editore}` : ""}
                {prossimoAcquisto.serie.costo ? (
                  <>
                    {" · "}
                    <span className="font-numeric text-ink-bright">{euro(prossimoAcquisto.serie.costo)}</span>
                  </>
                ) : null}
              </p>
            </div>
          </Link>
        </Sezione>
      )}
    </div>
  );
}

/* ==================================================
   I CONTI
   ================================================== */

/**
 * Le serie in visione, con quante puntate nuove ha davanti chi guarda.
 *
 * «Uscite» e non «elencate»: AnimeClick elenca anche le puntate future
 * con il titolo già noto, e contarle come pronte direbbe «3 nuovi» per
 * puntate che escono la settimana prossima. Se si sa qual è la prossima
 * in uscita, quelle uscite sono quelle prima di lei.
 */
function animeInVisione(righe) {
  return (righe || [])
    .filter((a) => a.stato_visione === "in_visione")
    .map((a) => {
      const elencate = Number(a.episodi_disponibili || 0);
      const uscite = a.prossimo_episodio ? Math.min(elencate, Number(a.prossimo_episodio) - 1) : elencate;
      const ultimo = Number(a.ultimo_visto || 0);

      return { ...a, prossimo: ultimo + 1, nuovi: Math.max(0, uscite - ultimo) };
    })
    .sort((a, b) => b.nuovi - a.nuovi);
}

const FORMATO_GIORNO = new Intl.DateTimeFormat("it-IT", { weekday: "short", timeZone: "Europe/Rome" });
const FORMATO_NUMERO = new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: "Europe/Rome" });
const FORMATO_ORA = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/**
 * Volumi e puntate della settimana, in una lista sola e in ordine di
 * giorno. Le puntate sono solo quelle delle serie che si stanno
 * guardando: il calendario della videoteca le contiene già filtrate,
 * ma tiene anche quelle passate.
 */
function usciteDellaSettimana(volumi, puntate, anime, adesso) {
  const inVisione = new Set(anime.map((a) => Number(a.id)));
  const righe = [];

  for (const v of volumi || []) {
    if (v.stato === "gia") continue;

    const quando = new Date(`${v.data}T12:00:00`);

    righe.push({
      chiave: `v:${v.serie.id}:${v.numero}`,
      quando: quando.getTime(),
      giornoSettimana: FORMATO_GIORNO.format(quando).replace(".", ""),
      giorno: FORMATO_NUMERO.format(quando),
      titolo: `${v.serie.titolo} ${v.numero}`,
      dettaglio: [v.editore, "manga", v.serie.prezzo_stimato ? euro(v.serie.prezzo_stimato) : null]
        .filter(Boolean)
        .join(" · "),
      copertina: v.copertina || v.serie.copertina,
      link: `/serie/${v.serie.id}`,
      nota: v.stato === "prossimo" ? "è il prossimo" : `prima te ne ${v.mancanti === 1 ? "manca 1" : `mancano ${v.mancanti}`}`,
      notaColore: v.stato === "prossimo" ? "text-jade" : "text-ember"
    });
  }

  for (const p of puntate || []) {
    const quando = new Date(p.uscita_italia);

    if (quando.getTime() <= adesso || !inVisione.has(Number(p.anime_id))) continue;

    righe.push({
      chiave: `p:${p.anime_id}:${p.numero}`,
      quando: quando.getTime(),
      giornoSettimana: FORMATO_GIORNO.format(quando).replace(".", ""),
      giorno: FORMATO_NUMERO.format(quando),
      titolo: p.serie,
      dettaglio: [p.piattaforma, `ep. ${p.numero}`, FORMATO_ORA.format(quando)].filter(Boolean).join(" · "),
      copertina: p.cover_url,
      link: `/videoteca/${p.anime_id}`,
      nota: null
    });
  }

  return righe.sort((a, b) => a.quando - b.quando).slice(0, 12);
}

/**
 * Il prossimo volume da comprare: prima le serie che con quell'acquisto
 * si chiudono davvero (`chiudibile`), poi quelle in corso da rimettere in
 * pari; a parità vince quella a cui manca meno, e poi la più avanti —
 * chiudere Happiness al decimo vale più che chiudere una serie da due.
 */
function acquistoPiuVicino(collezione) {
  const candidate = (collezione || [])
    .filter((s) => !s.droppato)
    .map((s) => ({ serie: s, mancanti: volumiMancanti(s) }))
    .filter((c) => c.mancanti > 0 && c.mancanti <= 3)
    // Prima le serie che si chiudono davvero (conclusa e tutta uscita in
    // Italia), poi quelle in corso da rimettere in pari.
    .sort(
      (a, b) =>
        Number(chiudibile(b.serie)) - Number(chiudibile(a.serie)) ||
        a.mancanti - b.mancanti ||
        b.serie.posseduti - a.serie.posseduti
    );

  if (!candidate.length) return null;

  const scelta = candidate[0];

  return { ...scelta, volume: scelta.serie.posseduti + 1 };
}

/* ==================================================
   I PEZZI
   ================================================== */

const FORMATO_DATA = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Rome"
});

function Testata({ nome }) {
  // Solo la prima lettera: «Domenica 4 ottobre», non «Domenica 4 Ottobre».
  const data = FORMATO_DATA.format(new Date());
  const oggi = data.charAt(0).toUpperCase() + data.slice(1);

  return (
    <header className="flex items-end justify-between px-5 pb-1 pt-6">
      <div>
        <p className="text-[0.8rem] text-ink-muted">{oggi}</p>
        <h1 className="mt-0.5 font-display text-[2.5rem] font-extrabold leading-none tracking-tight text-ink-bright">Adesso</h1>
      </div>
      {nome && (
        <span
          aria-hidden="true"
          className="grid h-10 w-10 place-items-center rounded-full bg-brass-400 text-sm font-bold text-void"
        >
          {nome.slice(0, 2)}
        </span>
      )}
    </header>
  );
}

function Sezione({ titolo, link, children }) {
  return (
    <section className="px-4 pt-7">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink-bright">{titolo}</h2>
        {link && (
          <Link to={link.a} className="text-sm font-medium text-brass-300 hover:underline">
            {link.testo}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function DaRiprendere({ anime, occupato, onVisto }) {
  return (
    <section className="mx-4 mt-5 overflow-hidden rounded-3xl bg-alcove shadow-raised">
      <div className="flex gap-4 p-4">
        <Link to={`/videoteca/${anime.id}`} className="shrink-0">
          <Immagine src={anime.cover_url} alt={`Copertina di ${anime.titolo}`} className="h-[132px] w-[92px] rounded-xl shadow-raised" />
        </Link>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brass-300">Da riprendere</p>
          <Link to={`/videoteca/${anime.id}`} className="font-display text-[1.4rem] font-bold leading-tight text-ink-bright">
            {anime.titolo}
          </Link>
          <p className="text-sm text-ink">
            {anime.ultimo_visto
              ? `Sei all'ep. ${anime.ultimo_visto}. ${anime.nuovi === 1 ? "Ne è uscito un altro." : `Ne sono usciti altri ${anime.nuovi}.`}`
              : `${anime.nuovi} puntate da vedere.`}
          </p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onVisto}
          disabled={occupato}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brass-400 text-[0.95rem] font-semibold text-void shadow-brass transition-all duration-quick active:scale-[0.98] disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {occupato ? "Segno…" : `Visto l'ep. ${anime.prossimo}`}
        </button>
      </div>
    </section>
  );
}

function LetturaPrincipale({ lettura, occupato, onPiuUno }) {
  const percentuale = lettura.massimo ? Math.round(((lettura.volume - 1) / lettura.massimo) * 100) : null;
  const eUltimo = lettura.massimo ? lettura.volume >= lettura.massimo : false;

  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-alcove p-3.5">
      <Link to={`/serie/${lettura.mangaId}`} className="shrink-0">
        <Immagine src={lettura.copertina} alt={`Copertina di ${lettura.titolo}`} className="h-[84px] w-[58px] rounded-lg" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/serie/${lettura.mangaId}`} className="block truncate font-semibold text-ink-bright">
          {lettura.titolo}
        </Link>
        <p className="mt-0.5 text-[0.8rem] text-ink-muted">
          Stai leggendo il vol. <span className="font-numeric text-ink-bright">{lettura.volume}</span>
          {lettura.massimo ? ` di ${lettura.massimo}` : ""}
        </p>
        {percentuale !== null && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-bright/[0.08]">
            <div className="h-full rounded-full bg-brass-400" style={{ width: `${percentuale}%` }} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onPiuUno}
        disabled={occupato}
        aria-label={eUltimo ? `Finito ${lettura.titolo}` : `Finito il volume ${lettura.volume}, passa al ${lettura.volume + 1}`}
        className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.1rem] bg-brass-400 text-lg font-bold text-void transition-transform duration-quick active:scale-90 disabled:opacity-60"
      >
        {eUltimo ? "✓" : "+1"}
      </button>
    </div>
  );
}

/**
 * Nei primi dieci giorni del mese, una riga sola: il riassunto del mese
 * appena finito è pronto. Dopo il dieci sparisce — resta in «Tu».
 */
const NOME_DEL_MESE = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "Europe/Rome" });

function RichiamoMese({ adesso }) {
  const oggi = new Date(adesso);

  if (Number(new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: "Europe/Rome" }).format(oggi)) > 10) {
    return null;
  }

  const scorso = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 15);

  return (
    <Link
      to="/mese"
      className="mx-4 mt-4 flex items-center justify-between rounded-2xl bg-brass-400/12 px-4 py-3 text-sm text-ink-bright transition-colors duration-quick active:bg-brass-400/20"
    >
      <span>
        Il vostro <span className="font-semibold">{NOME_DEL_MESE.format(scorso)}</span>: com'è andato
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-brass-300">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}

/** Una copertina con il suo ripiego: un riquadro del colore della scheda. */
function Immagine({ src, alt, className = "", larghezza = 256 }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(src, larghezza);

  if (!indirizzo || rotta) return <div aria-hidden="true" className={`bg-glass-2 ${className}`} />;

  return (
    <img
      src={indirizzo}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={dopoIlRipiego(() => setRotta(true))}
      className={`object-cover ${className}`}
    />
  );
}
