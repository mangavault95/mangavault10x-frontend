import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../app/Icon";
import { coloreLettore } from "../../dati/lettori";
import {
  giornoPerEsteso,
  quandoBreveDa,
  quandoPerEsteso,
  raccontaGiornata
} from "../../dati/cineforum";
import {
  cuoreCineforum,
  eliminaMessaggio,
  eliminaRisposta,
  rispondiCineforum,
  urlCopertina
} from "../../services/api";
import { useSessione } from "../../dati/sessione";
import Tondino from "./Tondino";
import { Bottone, Scheda } from "./Foglio";

/**
 * Un post del Cineforum.
 *
 * Ne esistono due specie e stanno nello stesso componente perché
 * hanno la stessa cornice — chi, quando, un cuore, un filo di
 * risposte — e cambia solo cosa c'è in mezzo:
 *
 *   MESSAGGIO   quello che qualcuno ha scritto apposta
 *   GIORNATA    tutto quello che ha fatto in un giorno
 *
 * ---------------------------------------------------------------
 * PERCHÉ L'ANTEPRIMA
 *
 * Sui dati veri una singola giornata contiene fino a cinquantuno
 * serie aggiunte e tremiladuecento spunte: è il giorno in cui la
 * videoteca si è riempita in blocco. Un post che le elenca tutte
 * seppellirebbe da solo tutto il resto del feed. Quindi in chiaro
 * stanno il sommario — che è l'unica cosa leggibile a quei numeri — e
 * le prime righe; il resto si apre con «altro», che è esattamente
 * quello che è stato chiesto.
 *
 * L'anteprima non è un limite di caratteri ma un limite di RIGHE:
 * tagliare a metà frase una serie sola sarebbe peggio che mostrarne
 * una in meno.
 */

const ANTEPRIMA = 3;

export default function Post({ post, alCambio }) {
  const { utente } = useSessione();

  // I cuori si aggiornano prima della risposta del server. Un cuore è
  // il gesto più leggero che c'è: aspettare mezzo secondo che Render
  // si svegli per vedere il colore cambiare lo fa sembrare rotto.
  const [cuori, setCuori] = useState(post.cuori ?? []);
  const [mio, setMio] = useState(Boolean(post.cuorMio));
  const [inCorso, setInCorso] = useState(false);

  const [tutto, setTutto] = useState(false);
  const [risposte, setRisposte] = useState(post.risposte ?? []);
  const [filoAperto, setFiloAperto] = useState(false);

  const suo = utente?.id != null && utente.id === post.utente.id;
  const tinta = coloreLettore(post.utente.colore);

  const racconto = post.tipo === "giornata" ? raccontaGiornata(post.eventi) : null;
  const voci = racconto?.voci ?? [];
  const visibili = tutto ? voci : voci.slice(0, ANTEPRIMA);
  const nascoste = voci.length - visibili.length;

  async function metti() {
    if (!utente || inCorso) return;

    // Si commuta subito e si rimette a posto solo se il server dice
    // di no: la verità la tiene lui, ma il caso normale è che dica sì.
    const prima = { cuori, mio };

    setMio(!mio);
    setCuori(
      mio
        ? cuori.filter((c) => c.id !== utente.id)
        : [...cuori, { id: utente.id, nickname: utente.nickname, colore: null }]
    );
    setInCorso(true);

    try {
      await cuoreCineforum(post.chiave);
    } catch {
      setCuori(prima.cuori);
      setMio(prima.mio);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Scheda className={`overflow-hidden border-l-2 ${tinta.bordo}`}>
      {/* ---------- Chi, e quando ---------- */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Link to={`/videoteca/chi/${encodeURIComponent(post.utente.nickname)}`}>
          <Tondino utente={post.utente} dimensione={38} />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            to={`/videoteca/chi/${encodeURIComponent(post.utente.nickname)}`}
            className="text-sm font-semibold text-quaderno-inchiostro hover:text-quaderno-blu"
          >
            {post.utente.nickname}
          </Link>

          <p className="text-xs text-quaderno-tenue" title={quandoPerEsteso(post.quando)}>
            {post.tipo === "giornata" ? giornoPerEsteso(post.giorno) : quandoBreveDa(post.quando)}
            {post.tipo === "messaggio" && post.modificato_il && " · modificato"}
          </p>
        </div>

        {suo && post.tipo === "messaggio" && (
          <button
            type="button"
            onClick={async () => {
              await eliminaMessaggio(post.id);
              alCambio?.();
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-quaderno-tenue hover:text-quaderno-inchiostro"
          >
            Elimina
          </button>
        )}
      </header>

      {/* ---------- Cosa dice ---------- */}
      <div className="px-4 pb-3 pt-3">
        {post.tipo === "messaggio" ? (
          <>
            {/* `whitespace-pre-wrap`: chi va a capo scrivendo si
                aspetta di trovare quell'a capo. */}
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-quaderno-inchiostro">
              {post.testo}
            </p>

            {post.anime && <Copertina anime={post.anime} className="mt-3" />}
          </>
        ) : (
          <>
            {racconto.sommario.length > 1 && (
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-quaderno-tenue">
                {racconto.sommario.join(" · ")}
              </p>
            )}

            <ul className="space-y-2.5">
              {visibili.map((voce) => (
                <Voce key={voce.chiave} voce={voce} />
              ))}
            </ul>

            {nascoste > 0 && (
              <button
                type="button"
                onClick={() => setTutto(true)}
                className="mt-3 text-sm font-semibold text-quaderno-blu hover:underline"
              >
                Altro — {nascoste === 1 ? "un'altra riga" : `altre ${nascoste} righe`}
              </button>
            )}

            {tutto && voci.length > ANTEPRIMA && (
              <button
                type="button"
                onClick={() => setTutto(false)}
                className="mt-3 text-sm font-medium text-quaderno-tenue hover:text-quaderno-inchiostro"
              >
                Richiudi
              </button>
            )}
          </>
        )}
      </div>

      {/* ---------- Cuore e risposte ---------- */}
      <footer className="flex items-center gap-1 border-t border-quaderno-riga px-2 py-1.5">
        <button
          type="button"
          onClick={metti}
          disabled={!utente}
          aria-pressed={mio}
          // Chi ha messo il cuore, per chi si chiede da chi arriva.
          // Fra tre persone è una domanda che ci si fa.
          title={cuori.length ? cuori.map((c) => c.nickname).join(", ") : "Nessuno, ancora"}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-quick
            disabled:cursor-default disabled:opacity-50
            ${mio ? "text-quaderno-blu" : "text-quaderno-tenue hover:text-quaderno-inchiostro"}`}
        >
          <Icon nome="cuore" dimensione={17} piena={mio} />
          {cuori.length > 0 && <span className="font-numeric text-xs">{cuori.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => setFiloAperto((a) => !a)}
          aria-expanded={filoAperto}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-quaderno-tenue transition-colors duration-quick hover:text-quaderno-inchiostro"
        >
          <Icon nome="cineforum" dimensione={17} />
          {risposte.length > 0 ? (
            <span className="font-numeric text-xs">{risposte.length}</span>
          ) : (
            <span className="text-xs">Rispondi</span>
          )}
        </button>
      </footer>

      {(filoAperto || risposte.length > 0) && (
        <Filo
          chiave={post.chiave}
          risposte={risposte}
          setRisposte={setRisposte}
          aperto={filoAperto}
          apri={() => setFiloAperto(true)}
        />
      )}
    </Scheda>
  );
}

/* ==================================================
   UNA RIGA DI GIORNATA
   ================================================== */

function Voce({ voce }) {
  const [scoperto, setScoperto] = useState(false);
  const { serie } = voce;

  return (
    <li className="flex gap-3">
      <Link
        to={`/videoteca/${serie.animeId}`}
        className="h-14 w-10 shrink-0 overflow-hidden rounded bg-quaderno-carta"
        aria-hidden="true"
        tabIndex={-1}
      >
        {serie.cover_url && (
          <img
            src={urlCopertina(serie.cover_url)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-quaderno-inchiostro">
          <Link to={`/videoteca/${serie.animeId}`} className="hover:text-quaderno-blu">
            {voce.frase}
          </Link>

          {voce.coda && (
            <span className="ml-2 font-numeric text-xs font-semibold text-quaderno-blu">
              {voce.coda}
            </span>
          )}
        </p>

        {voce.testo &&
          (voce.spoiler && !scoperto ? (
            // Coperto, non nascosto: chi vuole leggerlo tocca. Chi è
            // indietro di due stagioni non deve scoprire il finale
            // scorrendo il feed col pollice.
            <button
              type="button"
              onClick={() => setScoperto(true)}
              className="mt-1 rounded bg-quaderno-carta px-2 py-1 text-xs font-semibold text-quaderno-tenue hover:text-quaderno-inchiostro"
            >
              Contiene spoiler — tocca per leggere
            </button>
          ) : (
            <p className="mt-1 whitespace-pre-wrap border-l-2 border-quaderno-riga pl-2.5 text-sm leading-relaxed text-quaderno-tenue">
              {voce.testo}
            </p>
          ))}
      </div>
    </li>
  );
}

/** La copertina agganciata a un messaggio scritto. */
function Copertina({ anime, className = "" }) {
  return (
    <Link
      to={`/videoteca/${anime.id}`}
      className={`flex items-center gap-3 rounded-card border border-quaderno-riga bg-quaderno-carta p-2 transition-colors duration-quick hover:border-quaderno-blu ${className}`}
    >
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-quaderno-riga">
        {anime.cover_url && (
          <img
            src={urlCopertina(anime.cover_url)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <span className="min-w-0 text-sm font-semibold text-quaderno-inchiostro">{anime.titolo}</span>
    </Link>
  );
}

/* ==================================================
   IL FILO DELLE RISPOSTE
   ================================================== */

/**
 * Piatto, non ad albero: siete in tre, e una risposta a una risposta
 * a una risposta è una struttura che serve a moderare le folle.
 */
function Filo({ chiave, risposte, setRisposte, aperto, apri }) {
  const { utente, lettori } = useSessione();
  const [testo, setTesto] = useState("");
  const [inCorso, setInCorso] = useState(false);

  // Colore e faccia non stanno nel token — che porta solo chi sei e
  // cosa puoi fare — ma nell'elenco dei lettori. Senza, la risposta
  // appena scritta comparirebbe grigia e senza ritratto, e si
  // sistemerebbe solo ricaricando: un lampeggio che sembra un errore.
  const io = lettori.find((l) => l.id === utente?.id) ?? null;

  async function manda(e) {
    e.preventDefault();

    const pulito = testo.trim();

    if (!pulito || inCorso) return;

    setInCorso(true);

    try {
      const esito = await rispondiCineforum(chiave, pulito);

      setRisposte([
        ...risposte,
        {
          id: esito.id,
          testo: pulito,
          creata_il: esito.creata_il,
          utente: { ...io, id: utente.id, nickname: utente.nickname }
        }
      ]);

      setTesto("");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="border-t border-quaderno-riga bg-quaderno-carta/60 px-4 py-3">
      <ul className="space-y-3">
        {risposte.map((r) => (
          <li key={r.id} className="flex gap-2.5">
            <Tondino utente={r.utente} dimensione={26} />

            <div className="min-w-0 flex-1">
              <p className="text-xs text-quaderno-tenue">
                <Link
                  to={`/videoteca/chi/${encodeURIComponent(r.utente.nickname)}`}
                  className="font-semibold text-quaderno-inchiostro hover:text-quaderno-blu"
                >
                  {r.utente.nickname}
                </Link>{" "}
                <span title={quandoPerEsteso(r.creata_il)}>{quandoBreveDa(r.creata_il)}</span>
              </p>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-quaderno-inchiostro">
                {r.testo}
              </p>
            </div>

            {utente?.id === r.utente.id && (
              <button
                type="button"
                onClick={async () => {
                  await eliminaRisposta(r.id);
                  setRisposte(risposte.filter((x) => x.id !== r.id));
                }}
                aria-label="Elimina la risposta"
                className="shrink-0 self-start text-quaderno-tenue hover:text-quaderno-inchiostro"
              >
                <Icon nome="close" dimensione={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {utente && (
        <form onSubmit={manda} className="mt-3 flex gap-2">
          <input
            value={testo}
            onFocus={apri}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Rispondi…"
            aria-label="Scrivi una risposta"
            className="min-w-0 flex-1 rounded-lg border border-quaderno-riga bg-quaderno-foglio px-3 py-2 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue
              focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
          />

          {(aperto || testo) && (
            <Bottone tono="pieno" type="submit" disabled={!testo.trim() || inCorso}>
              Manda
            </Bottone>
          )}
        </form>
      )}
    </div>
  );
}
