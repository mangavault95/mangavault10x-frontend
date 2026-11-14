import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { useAccessoProtetto } from "../dati/accesso";
import { ossoDelTitolo } from "../dati/identita";
import { interpretaAcquisto, serieDellAcquisto } from "../dati/acquisto";
import { euro, intervalliVolumi, prossimoVolume, totaleDisponibile, volumiMancanti } from "../dati/serie";
import {
  annullaAcquisti,
  dopoIlRipiego,
  getVideoteca,
  getWishlist,
  registraAcquisto,
  urlCopertina
} from "../services/api";

/**
 * CERCA — una casella sola per tutto (04/10/2026).
 *
 * Prima ogni sezione aveva la sua ricerca: quella della collezione,
 * quella dei desideri, quella della videoteca. Per sapere se una cosa
 * «ce l'abbiamo» bisognava ricordarsi prima se era un manga o un anime,
 * e poi andare nel posto giusto. Qui si scrive e basta: manga in casa,
 * anime in videoteca e desideri, nello stesso elenco.
 *
 * Se non c'è, sotto ci sono le due porte per aggiungerla: il modulo
 * della collezione già compilato col titolo, e la ricerca degli anime
 * su AnimeClick con lo stesso testo.
 *
 * Il testo sta nell'indirizzo (`?q=`): tornando indietro da una scheda
 * si ritrova la ricerca com'era.
 *
 * E si può scrivere come al bot di Telegram: «dandadan 23», «one piece
 * 105-107 19,80», «berserk 42 ieri». Se la frase è un acquisto e la
 * serie si riconosce senza dubbi, in cima compare la proposta di
 * registrarlo (vedi `dati/acquisto.js`), con «Annulla» subito dopo.
 */

const QUANTI = 8;
const QUANTI_FILTRATI = 30;
const CHIAVE_RECENTI = "mangavault:cerca:recenti";

/** Le ultime ricerche, dalla più recente: solo sul telefono, mai sul server. */
function leggiRecenti() {
  try {
    const grezzo = JSON.parse(localStorage.getItem(CHIAVE_RECENTI) || "[]");

    return Array.isArray(grezzo) ? grezzo.filter((t) => typeof t === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function salvaRecenti(lista) {
  try {
    localStorage.setItem(CHIAVE_RECENTI, JSON.stringify(lista));
  } catch {
    // Senza memoria locale la ricerca funziona uguale, senza cronologia.
  }
}

const SCORCIATOIE = [
  { a: "/wishlist", etichetta: "Da comprare" },
  { a: "/lettura", etichetta: "Letture" },
  { a: "/calendario", etichetta: "Prossime uscite" },
  { a: "/statistiche", etichetta: "Numeri" }
];

const TIPI = [
  { id: "manga", etichetta: "Manga" },
  { id: "anime", etichetta: "Anime" },
  { id: "voglio", etichetta: "Desideri" }
];

/** Ogni parola scritta deve comparire in uno dei nomi: «attacco giganti» trova «L'attacco dei giganti». */
function corrisponde(nomi, parole) {
  const testo = nomi.filter(Boolean).map(ossoDelTitolo).join(" ");

  return parole.every((p) => testo.includes(p));
}

const STATI_VISIONE = {
  in_visione: "In visione",
  completa: "Vista",
  in_pausa: "In pausa",
  droppata: "Mollata",
  da_vedere: "Da vedere"
};

export default function CercaPage() {
  const [parametri, setParametri] = useSearchParams();
  const testo = parametri.get("q") || "";
  const casella = useRef(null);

  const { serie: collezione, ricarica: ricaricaCollezione } = useCollezione();
  const eseguiProtetto = useAccessoProtetto();
  const [registrando, setRegistrando] = useState(false);
  const [registrato, setRegistrato] = useState(null);
  const [problema, setProblema] = useState(null);
  const videoteca = useRisorsa(() => getVideoteca(), { chiave: "videoteca" });
  const desideri = useRisorsa(() => getWishlist(), { chiave: "wishlist" });

  const [scritto, setScritto] = useState(testo);
  const [recenti, setRecenti] = useState(leggiRecenti);
  // Quale tipo si guarda (null = tutti) e quali gruppi sono stati aperti
  // oltre il tetto: il tetto serve a non allungare la pagina, ma
  // troncare senza dirlo faceva sembrare che il resto non esistesse.
  const [tipo, setTipo] = useState(null);
  const [aperti, setAperti] = useState(() => new Set());

  // La tastiera si apre da sola: si viene qui per scrivere.
  useEffect(() => {
    casella.current?.focus();
  }, []);

  /** Si ricorda la frase solo quando porta da qualche parte: aprire un risultato. */
  function ricorda() {
    const frase = testo.trim();

    if (!frase) return;

    const nuove = [frase, ...recenti.filter((r) => r.toLowerCase() !== frase.toLowerCase())].slice(0, 6);

    setRecenti(nuove);
    salvaRecenti(nuove);
  }

  function cambia(valore) {
    setScritto(valore);
    setProblema(null);
    setTipo(null);
    setAperti(new Set());

    const nuovi = new URLSearchParams(parametri);

    if (valore.trim()) nuovi.set("q", valore);
    else nuovi.delete("q");

    setParametri(nuovi, { replace: true });
  }

  // La frase come acquisto, e la serie a cui si riferisce. Se è un
  // acquisto, la ricerca qui sotto usa solo il titolo: «dandadan 23»
  // deve comunque mostrare DanDaDan fra i manga in casa.
  const acquisto = useMemo(() => {
    const capito = interpretaAcquisto(testo);
    const serie = capito ? serieDellAcquisto(collezione, capito) : null;

    return capito && serie ? { ...capito, serie } : null;
  }, [testo, collezione]);

  const parole = useMemo(
    () => ossoDelTitolo(acquisto ? acquisto.titolo : testo).split(" ").filter(Boolean),
    [testo, acquisto]
  );

  async function registra() {
    setProblema(null);
    setRegistrando(true);

    try {
      const esito = await eseguiProtetto(() =>
        registraAcquisto(acquisto.serie.id, {
          volumi: acquisto.volumi,
          prezzo: acquisto.prezzo,
          data: acquisto.data
        })
      );

      setRegistrato(esito);
      ricaricaCollezione();
      cambia("");
    } catch (e) {
      if (!e?.annullato) setProblema(e?.message || "L'acquisto non è stato registrato.");
    } finally {
      setRegistrando(false);
    }
  }

  async function annulla() {
    setProblema(null);

    try {
      await eseguiProtetto(() => annullaAcquisti(registrato.acquisti));
      setRegistrato(null);
      ricaricaCollezione();
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito ad annullarlo: riprova.");
    }
  }

  const risultati = useMemo(() => {
    if (!parole.length) return null;

    const manga = (collezione || [])
      .filter((s) => corrisponde([s.titolo, s.autore, s.disegnatore, s.editore, s.edizione], parole));

    const anime = (videoteca.dati || [])
      .filter((a) => corrisponde([a.titolo, a.titolo_originale, a.titolo_inglese, a.gruppo_titolo], parole));

    const elencoDesideri = Array.isArray(desideri.dati) ? desideri.dati : desideri.dati?.wishlist || [];

    const voglio = elencoDesideri.filter((d) => corrisponde([d.titolo, d.autori], parole));

    return { manga, anime, voglio };
  }, [parole, collezione, videoteca.dati, desideri.dati]);

  const vuoto = risultati && !risultati.manga.length && !risultati.anime.length && !risultati.voglio.length;

  // I tipi che hanno almeno un risultato: i filtri compaiono solo se
  // c'è davvero da scegliere fra due o più.
  const tipiPresenti = risultati ? TIPI.filter((t) => risultati[t.id].length > 0) : [];

  /** I risultati di un gruppo, tagliati al tetto salvo che lo si sia aperto. */
  function visibili(id) {
    const tutti = risultati[id];

    // Con un tipo scelto il tetto sale: si è venuti a scorrere quello,
    // ma duecento righe di colpo sono comunque troppe.
    return aperti.has(id) ? tutti : tutti.slice(0, tipo === id ? QUANTI_FILTRATI : QUANTI);
  }

  const mostra = (id) => !tipo || tipo === id;

  /** «Mostra altri N», o niente se il gruppo sta già tutto in vista. */
  function altri(id) {
    const resto = risultati[id].length - visibili(id).length;

    return resto > 0 ? { quanti: resto, apri: () => setAperti((a) => new Set(a).add(id)) } : null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-6">
      <h1 className="sr-only">Cerca</h1>

      <label htmlFor="cerca-tutto" className="mb-2 block px-1 text-fine text-ink-muted">
        Manga in casa, anime in videoteca e desideri, tutto insieme
      </label>

      <div className="flex h-14 items-center gap-2.5 rounded-card bg-alcove px-4 ring-2 ring-transparent transition-shadow duration-quick focus-within:ring-brass-400">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-ink-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>

        <input
          ref={casella}
          id="cerca-tutto"
          type="search"
          value={scritto}
          onChange={(e) => cambia(e.target.value)}
          placeholder="Berserk, Frieren, Adachi…"
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-base font-medium text-ink-bright placeholder:text-ink-faint focus:outline-none"
        />

        {scritto && (
          <button
            type="button"
            onClick={() => cambia("")}
            aria-label="Cancella"
            className="bersaglio grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:text-ink-bright"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {problema && (
        <p role="alert" className="mt-4 rounded-card border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          {problema}
        </p>
      )}

      {registrato && <Registrato esito={registrato} onAnnulla={annulla} onChiudi={() => setRegistrato(null)} />}

      {acquisto && <ProposataAcquisto acquisto={acquisto} occupato={registrando} onRegistra={registra} />}

      {tipiPresenti.length > 1 && (
        <div role="group" aria-label="Tipo di risultato" className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Filtro attivo={!tipo} onClick={() => setTipo(null)}>
            Tutto
          </Filtro>

          {tipiPresenti.map((t) => (
            <Filtro key={t.id} attivo={tipo === t.id} onClick={() => setTipo(tipo === t.id ? null : t.id)}>
              {t.etichetta} <span className="font-numeric opacity-70">{risultati[t.id].length}</span>
            </Filtro>
          ))}
        </div>
      )}

      {mostra("manga") && risultati?.manga.length > 0 && (
        <Gruppo titolo="Manga in casa" altri={altri("manga")}>
          {visibili("manga").map((s) => (
            <Riga
              onApri={ricorda}
              key={`m${s.id}`}
              a={`/serie/${s.id}`}
              copertina={s.copertina}
              titolo={s.edizione ? `${s.titolo} · ${s.edizione}` : s.titolo}
              sotto={[dettaglioManga(s), s.editore].filter(Boolean).join(" · ")}
              etichetta="Manga"
            />
          ))}
        </Gruppo>
      )}

      {mostra("anime") && risultati?.anime.length > 0 && (
        <Gruppo titolo="In videoteca" altri={altri("anime")}>
          {visibili("anime").map((a) => (
            <Riga
              onApri={ricorda}
              key={`a${a.id}`}
              a={`/videoteca/${a.id}`}
              copertina={a.cover_url}
              titolo={a.titolo}
              sotto={[STATI_VISIONE[a.stato_visione], dettaglioAnime(a)].filter(Boolean).join(" · ")}
              etichetta="Anime"
            />
          ))}
        </Gruppo>
      )}

      {mostra("voglio") && risultati?.voglio.length > 0 && (
        <Gruppo titolo="Nei desideri" altri={altri("voglio")}>
          {visibili("voglio").map((d) => (
            <Riga
              onApri={ricorda}
              key={`w${d.id}`}
              a={`/desiderio/${d.id}`}
              copertina={d.coverurl}
              titolo={d.titolo}
              sotto={[d.autori, d.volumitotali ? `${d.volumitotali} volumi` : null].filter(Boolean).join(" · ")}
              etichetta="Desiderio"
            />
          ))}
        </Gruppo>
      )}

      {vuoto && <p className="mt-8 px-1 text-center text-sm text-ink-muted">Niente con «{testo}», né in casa né in videoteca.</p>}

      {parole.length > 0 && !acquisto && (
        <Gruppo titolo={vuoto ? "Aggiungila" : "Non è quella giusta?"}>
          <Azione onApri={ricorda} a={`/collezione?nuova=${encodeURIComponent(testo)}`} titolo={`«${testo}» in collezione`} sotto="Apre il modulo della nuova serie, già compilato" />
          <Azione onApri={ricorda} a={`/videoteca/io?aggiungi=${encodeURIComponent(testo)}`} titolo={`«${testo}» fra gli anime`} sotto="Cerca su AnimeClick per aggiungerla alla videoteca" />
        </Gruppo>
      )}

      {!parole.length && (
        <>
          {recenti.length > 0 && (
            <section className="mt-7">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Cercati di recente</h2>

                <button
                  type="button"
                  onClick={() => {
                    setRecenti([]);
                    salvaRecenti([]);
                  }}
                  className="text-xs font-semibold text-brass-300"
                >
                  Svuota
                </button>
              </div>

              <ul className="flex flex-wrap gap-2">
                {recenti.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => cambia(r)}
                      className="rounded-full bg-alcove px-3.5 py-2 text-sm font-medium text-ink-bright active:scale-95"
                    >
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-7">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Vai a</h2>

            <ul className="grid grid-cols-2 gap-2">
              {SCORCIATOIE.map((c) => (
                <li key={c.a}>
                  <Link to={c.a} className="block rounded-card bg-alcove px-4 py-3.5 text-sm font-semibold text-ink-bright">
                    {c.etichetta}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-8 px-6 text-center text-xs leading-relaxed text-ink-muted">
            Scrivi un titolo, un autore o un editore. Cerca anche nei titoli originali degli anime: «sousou no frieren» trova Frieren.
          </p>
        </>
      )}
    </div>
  );
}

function Gruppo({ titolo, altri = null, children }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{titolo}</h2>

      <ul className="divide-y divide-hairline rounded-card bg-alcove px-3.5">{children}</ul>

      {altri && (
        <button type="button" onClick={altri.apri} className="mt-2 w-full rounded-card py-2.5 text-sm font-semibold text-brass-300">
          Mostra altri {altri.quanti}
        </button>
      )}
    </section>
  );
}

function Filtro({ attivo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={attivo}
      className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-quick ${
        attivo ? "bg-brass-400 text-void" : "bg-alcove text-ink-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** «42 su 45 · mancano 3», oppure «42 in casa» se non si sa quanti ne escano. */
function dettaglioManga(s) {
  const totale = totaleDisponibile(s);
  const mancanti = volumiMancanti(s);

  if (!totale) return `${s.posseduti} in casa`;

  return mancanti > 0
    ? `${s.posseduti} su ${totale} · mancano ${mancanti}`
    : `${s.posseduti} su ${totale} · completa`;
}

/** «ep. 12 su 24»: dove sei arrivato, e su quante. */
function dettaglioAnime(a) {
  const visti = Number(a.episodi_visti ?? a.ultimo_visto ?? 0);
  const su = Number(a.episodi_disponibili || a.episodi_totali || 0);

  if (!visti && !su) return null;

  return su ? `ep. ${visti} su ${su}` : `ep. ${visti}`;
}

function Riga({ a, copertina, titolo, sotto, etichetta, onApri }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(copertina, 128);

  return (
    <li>
      <Link to={a} onClick={onApri} className="flex items-center gap-3 py-2.5">
        {indirizzo && !rotta ? (
          <img src={indirizzo} alt="" loading="lazy" onError={dopoIlRipiego(() => setRotta(true))} className="h-12 w-8 shrink-0 rounded-md object-cover" />
        ) : (
          <span aria-hidden="true" className="h-12 w-8 shrink-0 rounded-md bg-glass-2" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-corpo font-semibold text-ink-bright">{titolo}</p>
          {sotto && <p className="truncate text-xs text-ink-muted">{sotto}</p>}
        </div>

        <span className="shrink-0 rounded-full bg-brass-400/12 px-2 py-0.5 text-micro font-medium text-brass-300">{etichetta}</span>
      </Link>
    </li>
  );
}

function Azione({ a, titolo, sotto, onApri }) {
  return (
    <li>
      <Link to={a} onClick={onApri} className="flex items-center gap-3 py-3">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brass-400 text-void">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-corpo font-semibold text-ink-bright">{titolo}</p>
          <p className="truncate text-xs text-ink-muted">{sotto}</p>
        </div>
      </Link>
    </li>
  );
}

/** La proposta in cima: «Registra acquisto · DanDaDan 23 · 6,50 €». */
function ProposataAcquisto({ acquisto, occupato, onRegistra }) {
  const { serie, volumi, prezzo, data } = acquisto;
  const numeri = volumi ?? [prossimoVolume(serie)];
  const unitario = serie.grezzo?.PrezzoCopertina ? Number(serie.grezzo.PrezzoCopertina) : serie.costo;
  const totale = prezzo ?? (unitario ? unitario * numeri.length : null);

  // Dall'elenco vero dei posseduti (022): «già in casa» è avere proprio
  // quel numero, e il buco sono i volumi sotto il primo che ancora mancano.
  const presenti = new Set(serie.numeri);
  const primo = numeri[0];
  const buco = Array.from({ length: Math.max(0, primo - 1) }, (_, i) => i + 1).filter((n) => !presenti.has(n));
  const giaInCasa = numeri.filter((n) => presenti.has(n));

  const etichettaVolumi =
    numeri.length === 1
      ? `${numeri[0]}`
      : numeri.every((n, i) => i === 0 || n === numeri[i - 1] + 1)
        ? `${numeri[0]}–${numeri[numeri.length - 1]}`
        : numeri.join(", ");

  return (
    <section className="mt-5 rounded-card border border-brass-400/40 bg-alcove p-4 text-ink-bright">
      <div className="flex items-center gap-3.5">
        {urlCopertina(serie.copertina, 128) ? (
          <img src={urlCopertina(serie.copertina, 128)} alt="" className="h-16 w-11 shrink-0 rounded-lg object-cover" />
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold opacity-75">Registra acquisto</p>
          <p className="truncate text-base font-bold">
            {serie.titolo} {etichettaVolumi}
          </p>
          <p className="text-fine opacity-80">
            {totale != null ? `${euro(totale)}${prezzo == null ? " (prezzo della scheda)" : ""}` : "senza prezzo"}
            {" · "}
            {data ? new Date(`${data}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "long" }) : "oggi"}
          </p>
        </div>

        <button
          type="button"
          onClick={onRegistra}
          disabled={occupato}
          className="insegna shrink-0 rounded-card px-4 py-2.5 text-sm font-semibold transition-transform duration-quick active:scale-95 disabled:opacity-60"
        >
          {occupato ? "Registro…" : "Registra"}
        </button>
      </div>

      {(buco.length > 0 || giaInCasa.length > 0) && (
        <p className="mt-3 text-fine font-medium">
          {giaInCasa.length > 0
            ? `Attento: in casa ${giaInCasa.length === 1 ? `il ${giaInCasa[0]} c'è già` : `ci sono già ${intervalliVolumi(giaInCasa)}`}.`
            : `Prima ti ${buco.length === 1 ? `manca il ${buco[0]}` : `mancano ${intervalliVolumi(buco)}`}.`}
        </p>
      )}
    </section>
  );
}

/** Fatto: cosa è stato scritto, e il modo di tornare indietro. */
function Registrato({ esito, onAnnulla, onChiudi }) {
  const volumi = esito.volumi.length === 1 ? `${esito.volumi[0]}` : `${esito.volumi[0]}–${esito.volumi[esito.volumi.length - 1]}`;

  return (
    <section role="status" className="mt-5 flex items-center gap-3 rounded-card bg-jade/15 px-4 py-3 text-sm">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-jade">
        <path d="M20 6 9 17l-5-5" />
      </svg>

      <p className="min-w-0 flex-1 text-ink-bright">
        <span className="font-semibold">
          {esito.serie.titolo} {volumi}
        </span>{" "}
        registrato · ora ne hai {esito.serie.posseduti}
      </p>

      <button type="button" onClick={onAnnulla} className="shrink-0 font-semibold text-brass-300">
        Annulla
      </button>
      <button type="button" onClick={onChiudi} aria-label="Chiudi" className="shrink-0 text-ink-muted">
        ✕
      </button>
    </section>
  );
}
