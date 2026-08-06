import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "../app/Icon";
import Copertina from "./Copertina";
import Sovrapposizione from "./Sovrapposizione";
import useChiusuraVelo from "./useChiusuraVelo";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { abbinaOpere, caricaOpereAutore } from "../dati/autore";

/**
 * Tutto quello che ha fatto un autore, in una griglia di copertine.
 *
 * Si apre cliccando il suo nome dentro la scheda di una serie, e
 * risponde a colpo d'occhio a "di questo, quanto ho?": le opere in
 * collezione sono a colori e portano alla loro scheda, le altre restano
 * in grigio e portano ad AniList. Il grigio non è decorazione — è
 * l'informazione: quello che manca si vede senza leggere una parola.
 *
 * Un pannello e non una pagina: è una domanda che viene in mente
 * *mentre* si guarda una serie, e mandare via da lì per rispondere
 * costringerebbe a tornare indietro ogni volta.
 */
export default function OpereAutore({ nome, onChiudere }) {
  const velo = useChiusuraVelo(onChiudere);
  const { serie: collezione } = useCollezione();

  const persona = useRisorsa(() => caricaOpereAutore(nome), { attivo: Boolean(nome) });

  const opere = useMemo(
    () => abbinaOpere(persona.dati?.opere, collezione),
    [persona.dati, collezione]
  );

  useEffect(() => {
    function alTasto(e) {
      if (e.key === "Escape") onChiudere();
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [onChiudere]);

  const inCasa = opere.filter((o) => o.posseduta).length;

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-overlay flex items-end justify-center bg-void/70 p-0 backdrop-blur-sm animate-rise-in sm:items-center sm:p-5"
        {...velo}
      >
        <div className="flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-sheet border border-hairline bg-glass-3 backdrop-blur-2xl sm:rounded-sheet">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-5">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink-bright">
                {persona.dati?.nome || nome}
              </h2>

              <p className="mt-0.5 text-sm text-ink-muted">
                {persona.inCorso && !persona.dati
                  ? "Cerco le sue opere…"
                  : opere.length
                    ? `${inCasa} di ${opere.length} in collezione`
                    : "Nessuna opera trovata su AniList"}
              </p>
            </div>

            <button
              onClick={onChiudere}
              aria-label="Chiudi"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright"
            >
              <Icon nome="close" dimensione={18} />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-5 sm:px-6">
            {persona.inCorso && !persona.dati ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-x-4 gap-y-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-cover w-full animate-pulse rounded-card border border-hairline bg-glass-1" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-glass-1" />
                  </div>
                ))}
              </div>
            ) : opere.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-x-4 gap-y-6">
                {opere.map((o) => (
                  <CartaOpera key={o.idEsterno} opera={o} onChiudere={onChiudere} />
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-ink-muted">
                {persona.errore
                  ? "AniList non ha risposto. Riprova fra poco."
                  : `Su AniList non risulta nessun autore di nome "${nome}".`}
              </p>
            )}
          </div>
        </div>
      </div>
    </Sovrapposizione>
  );
}

function CartaOpera({ opera, onChiudere }) {
  const { posseduta } = opera;

  // In casa vince il titolo dell'edizione italiana, quello con cui la
  // serie è registrata: è come la chiami tu, non come la chiama AniList.
  const titolo = posseduta?.titolo || opera.titoloInglese || opera.titolo;

  const contenuto = (
    <>
      <div
        className={`relative transition-[filter,opacity] duration-base ${
          posseduta ? "" : "opacity-60 grayscale group-hover:opacity-90 group-hover:grayscale-0"
        }`}
      >
        <Copertina src={posseduta?.copertina || opera.copertina} alt={titolo} riempi />

        {posseduta && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-card ring-2 ring-inset ring-brass-400/70"
          />
        )}
      </div>

      <div className="mt-2 space-y-0.5 px-0.5">
        <h3
          className={`line-clamp-2 min-h-[2.1rem] text-xs font-medium leading-snug transition-colors duration-quick group-hover:text-brass-300 ${
            posseduta ? "text-ink-bright" : "text-ink-muted"
          }`}
        >
          {titolo}
        </h3>

        <p className="font-numeric text-[0.65rem] text-ink-faint">
          {[opera.anno, opera.volumi ? `${opera.volumi} vol.` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
    </>
  );

  const stile =
    "group block rounded-panel outline-none transition-transform duration-base ease-settle hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brass-400";

  if (posseduta) {
    return (
      <Link
        to={`/serie/${posseduta.id}`}
        onClick={onChiudere}
        className={stile}
        title={`${titolo} — ce l'hai, apri la scheda`}
      >
        {contenuto}
      </Link>
    );
  }

  return (
    <a
      href={opera.collegamento || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={stile}
      title={`${titolo} — non ce l'hai, apri su AniList`}
    >
      {contenuto}
    </a>
  );
}
