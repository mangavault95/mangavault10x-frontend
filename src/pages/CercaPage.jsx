import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { ossoDelTitolo } from "../dati/identita";
import { getVideoteca, getWishlist, urlCopertina } from "../services/api";

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
 */

const QUANTI = 8;

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

  const { serie: collezione } = useCollezione();
  const videoteca = useRisorsa(() => getVideoteca());
  const desideri = useRisorsa(() => getWishlist());

  const [scritto, setScritto] = useState(testo);

  // La tastiera si apre da sola: si viene qui per scrivere.
  useEffect(() => {
    casella.current?.focus();
  }, []);

  function cambia(valore) {
    setScritto(valore);

    const nuovi = new URLSearchParams(parametri);

    if (valore.trim()) nuovi.set("q", valore);
    else nuovi.delete("q");

    setParametri(nuovi, { replace: true });
  }

  const parole = useMemo(() => ossoDelTitolo(testo).split(" ").filter(Boolean), [testo]);

  const risultati = useMemo(() => {
    if (!parole.length) return null;

    const manga = (collezione || [])
      .filter((s) => corrisponde([s.titolo, s.autore, s.disegnatore, s.editore, s.edizione], parole))
      .slice(0, QUANTI);

    const anime = (videoteca.dati || [])
      .filter((a) => corrisponde([a.titolo, a.titolo_originale, a.titolo_inglese, a.gruppo_titolo], parole))
      .slice(0, QUANTI);

    const elencoDesideri = Array.isArray(desideri.dati) ? desideri.dati : desideri.dati?.wishlist || [];

    const voglio = elencoDesideri.filter((d) => corrisponde([d.titolo, d.autori], parole)).slice(0, QUANTI);

    return { manga, anime, voglio };
  }, [parole, collezione, videoteca.dati, desideri.dati]);

  const vuoto = risultati && !risultati.manga.length && !risultati.anime.length && !risultati.voglio.length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-6">
      <h1 className="sr-only">Cerca</h1>

      <label htmlFor="cerca-tutto" className="mb-2 block px-1 text-[0.8rem] text-ink-muted">
        Manga in casa, anime in videoteca e desideri, tutto insieme
      </label>

      <div className="flex h-14 items-center gap-2.5 rounded-2xl bg-alcove px-4 ring-2 ring-transparent transition-shadow duration-quick focus-within:ring-brass-400">
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
          className="min-w-0 flex-1 bg-transparent text-[1.05rem] font-medium text-ink-bright placeholder:text-ink-faint focus:outline-none"
        />

        {scritto && (
          <button
            type="button"
            onClick={() => cambia("")}
            aria-label="Cancella"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:text-ink-bright"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {risultati?.manga.length > 0 && (
        <Gruppo titolo="Manga in casa">
          {risultati.manga.map((s) => (
            <Riga
              key={`m${s.id}`}
              a={`/serie/${s.id}`}
              copertina={s.copertina}
              titolo={s.edizione ? `${s.titolo} · ${s.edizione}` : s.titolo}
              sotto={[`${s.posseduti} in casa`, s.editore].filter(Boolean).join(" · ")}
              etichetta="Manga"
            />
          ))}
        </Gruppo>
      )}

      {risultati?.anime.length > 0 && (
        <Gruppo titolo="In videoteca">
          {risultati.anime.map((a) => (
            <Riga
              key={`a${a.id}`}
              a={`/videoteca/${a.id}`}
              copertina={a.cover_url}
              titolo={a.titolo}
              sotto={[STATI_VISIONE[a.stato_visione], a.ultimo_visto ? `ep. ${a.ultimo_visto}` : null].filter(Boolean).join(" · ")}
              etichetta="Anime"
            />
          ))}
        </Gruppo>
      )}

      {risultati?.voglio.length > 0 && (
        <Gruppo titolo="Nei desideri">
          {risultati.voglio.map((d) => (
            <Riga
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

      {parole.length > 0 && (
        <Gruppo titolo={vuoto ? "Aggiungila" : "Non è quella giusta?"}>
          <Azione a={`/collezione?nuova=${encodeURIComponent(testo)}`} titolo={`«${testo}» in collezione`} sotto="Apre il modulo della nuova serie, già compilato" />
          <Azione a={`/videoteca/io?aggiungi=${encodeURIComponent(testo)}`} titolo={`«${testo}» fra gli anime`} sotto="Cerca su AnimeClick per aggiungerla alla videoteca" />
        </Gruppo>
      )}

      {!parole.length && (
        <p className="mt-10 px-6 text-center text-sm leading-relaxed text-ink-muted">
          Scrivi un titolo, un autore o un editore. Cerca anche nei titoli originali degli anime: «sousou no frieren» trova Frieren.
        </p>
      )}
    </div>
  );
}

function Gruppo({ titolo, children }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{titolo}</h2>
      <ul className="divide-y divide-hairline rounded-2xl bg-alcove px-3.5">{children}</ul>
    </section>
  );
}

function Riga({ a, copertina, titolo, sotto, etichetta }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(copertina);

  return (
    <li>
      <Link to={a} className="flex items-center gap-3 py-2.5">
        {indirizzo && !rotta ? (
          <img src={indirizzo} alt="" loading="lazy" onError={() => setRotta(true)} className="h-12 w-8 shrink-0 rounded-md object-cover" />
        ) : (
          <span aria-hidden="true" className="h-12 w-8 shrink-0 rounded-md bg-glass-2" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-ink-bright">{titolo}</p>
          {sotto && <p className="truncate text-xs text-ink-muted">{sotto}</p>}
        </div>

        <span className="shrink-0 rounded-full bg-brass-400/12 px-2 py-0.5 text-[0.7rem] font-medium text-brass-300">{etichetta}</span>
      </Link>
    </li>
  );
}

function Azione({ a, titolo, sotto }) {
  return (
    <li>
      <Link to={a} className="flex items-center gap-3 py-3">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brass-400 text-void">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-ink-bright">{titolo}</p>
          <p className="truncate text-xs text-ink-muted">{sotto}</p>
        </div>
      </Link>
    </li>
  );
}
