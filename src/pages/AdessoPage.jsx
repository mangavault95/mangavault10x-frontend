import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../app/Icon";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { chiudibile, euro, fraseMancanti, prossimoVolume, tettoLettura, volumiMancanti } from "../dati/serie";
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

  const videoteca = useRisorsa(() => getVideoteca(), { chiave: "videoteca" });
  const calendario = useRisorsa(() => getCalendarioAnime(GIORNI_SETTIMANA, 14), {
    chiave: `calendario:${GIORNI_SETTIMANA}:14`
  });
  const sessioni = useRisorsa(() => getReadingSessions(), { chiave: "sessioni" });
  const uscite = useRisorsa(() => getUsciteManga(GIORNI_SETTIMANA), { chiave: `uscite:${GIORNI_SETTIMANA}` });

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

  // La collezione arriva dalla cache e si disegna subito; il resto aspetta
  // il server, che a volte si sveglia in 5-6 secondi. In quel tempo la home
  // mostrava solo il «Prossimo acquisto» e sembrava vuota o rotta.
  const caricamentoIniziale = [videoteca, calendario, sessioni, uscite].some((r) => r.inCorso && r.dati === null && !r.errore);
  const lento = useDopo(caricamentoIniziale, 2500);

  // Quello che non è arrivato. Senza dirlo, una richiesta fallita era
  // indistinguibile da «non hai niente da guardare né da leggere»: la
  // home si disegnava corta e basta, e l'unico modo di riprovare era
  // ricaricare la pagina. Le uscite dei volumi hanno già la loro riga
  // più sotto e qui non compaiono.
  const mancanti = [
    { nome: "La videoteca", risorsa: videoteca },
    { nome: "La settimana degli anime", risorsa: calendario },
    { nome: "La lettura in corso", risorsa: sessioni }
  ].filter((m) => m.risorsa.errore && !m.risorsa.inCorso);

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

      {mancanti.length > 0 && (
        <div role="alert" className="mx-4 mt-4 flex items-center gap-3 rounded-card border border-ember/30 bg-ember/10 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-ember">
            {mancanti.length === 1 ? `${mancanti[0].nome} non è arrivata` : "Una parte della pagina non è arrivata"}: il
            server non ha risposto.
          </p>
          <button
            type="button"
            onClick={() => mancanti.forEach((m) => m.risorsa.ricarica())}
            className="bersaglio shrink-0 rounded-card bg-ember/20 px-3.5 py-2 text-sm font-semibold text-ember transition-colors duration-quick active:bg-ember/30"
          >
            Riprova
          </button>
        </div>
      )}

      {caricamentoIniziale && <CaricamentoHome lento={lento} />}

      {daRiprendere && (
        <DaRiprendere anime={daRiprendere} occupato={inCorso === `anime:${daRiprendere.id}`} onVisto={() => vistoProssimo(daRiprendere)} />
      )}

      {daGuardare.length > 0 && (
        <Sezione titolo="Da guardare" kana="見る" link={{ a: "/videoteca/io", testo: "Tutto" }}>
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {daGuardare.slice(0, 10).map((a) => (
              <li key={a.id} className="w-32 shrink-0">
                <Link to={`/videoteca/${a.id}`} className="group block focus-visible:outline-none">
                  <div className="relative">
                    <Immagine src={a.cover_url} alt="" className="aspect-[2/3] w-32 rounded-card" />
                    <span className="absolute left-2 top-2 rounded-md border border-viola/40 bg-void/80 px-1.5 py-0.5 font-numeric text-xs font-medium text-viola backdrop-blur">
                      {a.nuovi} {a.nuovi === 1 ? "nuovo" : "nuovi"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-ink-bright">{a.titolo}</p>
                  <p className="mt-0.5 text-fine text-ink-muted">Riprendi dall'ep. {a.prossimo}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Sezione>
      )}

      {letture.length > 0 && (
        <Sezione titolo="Continua a leggere" kana="読む" link={{ a: "/lettura", testo: "Tutte" }}>
          <LetturaPrincipale lettura={letture[0]} occupato={inCorso === `lettura:${letture[0].mangaId}`} onPiuUno={() => lettoProssimo(letture[0])} />

          {letture.length > 1 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {letture.slice(1, 3).map((l) => (
                <Link
                  key={l.idSessione}
                  to={`/serie/${l.mangaId}`}
                  className="flex items-center gap-2.5 rounded-card bg-alcove p-2.5 transition-colors duration-quick active:bg-glass-2"
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
        <Sezione titolo="Esce questa settimana" kana="今週" link={{ a: "/uscite", testo: "Tutte le uscite" }}>
          <ul className="divide-y divide-hairline rounded-card bg-alcove px-3.5">
            {settimana.map((u) => (
              <li key={u.chiave}>
                <Link to={u.link} className="flex items-center gap-3 py-2.5">
                  <div className="w-10 shrink-0 text-center">
                    <p className="text-micro uppercase text-ink-muted">{u.giornoSettimana}</p>
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
            <p className="mt-2 px-1 text-xs text-ink-muted">Le uscite dei volumi non sono arrivate: riprova fra un attimo.</p>
          )}
        </Sezione>
      )}

      {prossimoAcquisto && (
        <Sezione titolo="Prossimo acquisto" kana="買う" link={{ a: "/wishlist", testo: "Da comprare" }}>
          <Link
            to={`/serie/${prossimoAcquisto.serie.id}`}
            className="flex items-center gap-3.5 rounded-card bg-alcove p-3.5 transition-colors duration-quick active:bg-glass-2"
          >
            <Immagine src={prossimoAcquisto.serie.copertina} alt="" className="h-[70px] w-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-bright">
                {prossimoAcquisto.serie.titolo} {prossimoAcquisto.volume}
              </p>
              <p className="text-fine text-ink-muted">
                {(() => {
                  const frase = fraseMancanti(prossimoAcquisto.serie, prossimoAcquisto.mancanti);
                  return frase.charAt(0).toUpperCase() + frase.slice(1);
                })()}
                {prossimoAcquisto.serie.editore ? ` · ${prossimoAcquisto.serie.editore}` : ""}
                {prossimoAcquisto.serie.costo ? (
                  <>
                    {" · "}
                    <span className="font-numeric text-ambra">{euro(prossimoAcquisto.serie.costo)}</span>
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
    .filter((s) => !s.droppato && !s.smessa)
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

  // Il primo che manca, non quello dopo il più alto: per un Yu-gi-oh con
  // 1-5 e 11 il prossimo acquisto è il 6.
  return { ...scelta, volume: prossimoVolume(scelta.serie) };
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

// Il titolo della Home è un saluto (02/11/2026): «Home» resta nella barra,
// dove serve a orientarsi, e qui la pagina dice di chi è e che ora è.
function saluto(ora = new Date().getHours()) {
  if (ora >= 5 && ora < 13) return "Buongiorno";
  if (ora >= 13 && ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}

// Il giorno della settimana in kana, accanto alla data: 月曜日 il lunedì.
const KANJI_GIORNO = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

function Testata({ nome }) {
  // Solo la prima lettera: «Domenica 4 ottobre», non «Domenica 4 Ottobre».
  const data = FORMATO_DATA.format(new Date());
  const oggi = data.charAt(0).toUpperCase() + data.slice(1);

  return (
    <header className="px-5 pb-1 pt-6">
      <p className="flex items-center gap-2 font-numeric text-micro uppercase tracking-[0.14em] text-ink-muted">
        {oggi}
        <span aria-hidden="true" className="kana font-pixel normal-case tracking-normal text-ink-faint">
          {KANJI_GIORNO[new Date().getDay()]}
        </span>
      </p>
      <h1 className="mt-2 flex items-center gap-3 font-display font-bold tracking-tight text-ink-bright">
        {/* Il torii, cioè il marchio, acceso: è l'unico posto in cui il
            logo è grande, e la Home è casa sua. */}
        <span aria-hidden="true" className="text-brass-400 drop-shadow-[0_0_8px_rgb(var(--c-accento)/0.75)]">
          <Icon nome="portale" dimensione={40} />
        </span>
        <span className="min-w-0">
          <span className="block text-corpo font-semibold leading-tight text-ink-muted">{saluto()},</span>
          <span className="block text-[2rem] leading-none">{nome || "MangaVault"}</span>
        </span>
      </h1>
    </header>
  );
}

/** Vero dopo `ms` millisecondi di `attivo` di fila; torna falso appena `attivo` finisce. */
function useDopo(attivo, ms) {
  const [passato, setPassato] = useState(false);

  useEffect(() => {
    if (!attivo) return undefined;

    const t = setTimeout(() => setPassato(true), ms);

    return () => {
      clearTimeout(t);
      setPassato(false);
    };
  }, [attivo, ms]);

  return attivo && passato;
}

/**
 * Lo scheletro delle sezioni che stanno arrivando: una scheda grande
 * (cosa riprendere) e una fila di copertine (da guardare / leggere).
 * Dopo qualche secondo dice anche perché ci vuole: il server gratuito
 * che dorme si sveglia alla prima richiesta.
 */
function CaricamentoHome({ lento }) {
  const ombra =
    "animate-shimmer bg-[linear-gradient(90deg,transparent,rgb(var(--c-viola)/0.14),transparent)] bg-[length:200%_100%]";

  return (
    <div role="status" aria-label="Caricamento in corso">
      <div className="px-4 pt-5">
        <div className={`h-44 rounded-card bg-alcove ${ombra}`} />
      </div>

      <div className="px-4 pt-7">
        <div className="mb-3 h-5 w-32 rounded bg-glass-2" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-32 shrink-0 space-y-2">
              <div className={`aspect-[2/3] w-32 rounded-card bg-alcove ${ombra}`} />
              <div className="h-3 w-4/5 rounded bg-glass-1" />
            </div>
          ))}
        </div>
      </div>

      <p className="px-5 pt-4 text-center text-xs text-ink-muted" aria-live="polite">
        {lento ? "Il server si sta svegliando, ancora qualche secondo…" : " "}
      </p>

      <span className="sr-only">Caricamento della home in corso</span>
    </div>
  );
}

function Sezione({ titolo, kana, link, children }) {
  return (
    <section className="px-4 pt-7">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="flex items-baseline gap-2 font-display text-lg font-semibold tracking-tight text-ink-bright">
          {titolo}
          {kana && <span aria-hidden="true" className="kana font-pixel text-xs font-normal text-ink-faint">{kana}</span>}
        </h2>
        {link && (
          <Link to={link.a} className="text-sm font-medium text-ciano hover:underline">
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
    <section className="relative mx-4 mt-5 overflow-hidden rounded-panel border border-brass-400/25 bg-alcove shadow-raised">
      {/* La copertina stessa, sfocata, fa da fondo: la card prende il
          colore della serie invece di essere la stessa lastra per tutte.
          Sfuma verso il fondo della scheda perché il tasto resti su una
          superficie uniforme e il testo mantenga il contrasto. */}
      {urlCopertina(anime.cover_url, 256) && (
        <>
          <img
            src={urlCopertina(anime.cover_url, 256)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-35 blur-2xl"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-alcove/20 via-alcove/60 to-alcove" />
        </>
      )}
      <div className="relative flex gap-4 p-4">
        <Link to={`/videoteca/${anime.id}`} className="shrink-0">
          <Immagine src={anime.cover_url} alt={`Copertina di ${anime.titolo}`} className="h-[156px] w-[108px] rounded-card shadow-float" />
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
      <div className="relative px-4 pb-4">
        <button
          type="button"
          onClick={onVisto}
          disabled={occupato}
          className="insegna flex h-12 w-full items-center justify-center gap-2 rounded-card text-corpo font-semibold transition-all duration-quick active:scale-[0.98] disabled:opacity-60"
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
    <div className="flex items-center gap-3.5 rounded-card bg-alcove p-3.5">
      <Link to={`/serie/${lettura.mangaId}`} className="shrink-0">
        <Immagine src={lettura.copertina} alt={`Copertina di ${lettura.titolo}`} className="h-[84px] w-[58px] rounded-lg" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/serie/${lettura.mangaId}`} className="block truncate font-semibold text-ink-bright">
          {lettura.titolo}
        </Link>
        <p className="mt-0.5 text-fine text-ink-muted">
          Stai leggendo il vol. <span className="font-numeric text-ink-bright">{lettura.volume}</span>
          {lettura.massimo ? ` di ${lettura.massimo}` : ""}
        </p>
        {percentuale !== null && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-bright/[0.08]">
            <div className="h-full rounded-full bg-ink-bright/70" style={{ width: `${percentuale}%` }} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onPiuUno}
        disabled={occupato}
        aria-label={eUltimo ? `Finito ${lettura.titolo}` : `Finito il volume ${lettura.volume}, passa al ${lettura.volume + 1}`}
        className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.1rem] border border-brass-400/50 font-numeric text-lg font-bold text-brass-300 transition-all duration-quick hover:bg-brass-400/10 active:scale-90 disabled:opacity-60"
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
      className="mx-4 mt-4 flex items-center justify-between rounded-card border border-hairline bg-alcove/60 px-4 py-3 text-sm text-ink-bright transition-colors duration-quick active:bg-alcove"
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

/**
 * Una copertina con il suo ripiego: un riquadro del colore della scheda.
 *
 * Finché non è arrivata il riquadro respira (shimmer) e poi l'immagine
 * ci sfuma sopra: prima compariva di colpo, e su telefono, con le
 * copertine che passano dal ridimensionatore, la home restava qualche
 * secondo fatta di rettangoli neri tutti uguali.
 */
function Immagine({ src, alt, className = "", larghezza = 256 }) {
  const [rotta, setRotta] = useState(false);
  const [caricata, setCaricata] = useState(false);
  const immagine = useRef(null);
  const indirizzo = urlCopertina(src, larghezza);

  // Un'immagine già in cache può essere completa prima che React le
  // attacchi `onLoad`: senza questo controllo resterebbe invisibile.
  useEffect(() => {
    if (immagine.current?.complete && immagine.current.naturalWidth > 0) setCaricata(true);
  }, [indirizzo]);

  if (!indirizzo || rotta) {
    return <div aria-hidden="true" className={`bg-gradient-to-br from-alcove to-shelf ${className}`} />;
  }

  return (
    <div
      className={`relative overflow-hidden bg-glass-2 ${className}`}
    >
      {!caricata && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgb(var(--c-viola)/0.18),transparent)] bg-[length:200%_100%]"
        />
      )}
      <img
        ref={immagine}
        src={indirizzo}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setCaricata(true)}
        onError={dopoIlRipiego(() => setRotta(true))}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-slow ease-settle ${
          caricata ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
