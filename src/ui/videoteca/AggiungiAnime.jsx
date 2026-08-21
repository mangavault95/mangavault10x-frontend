import { useState } from "react";
import { agganciaAnime, cercaAnime, urlCopertina } from "../../services/api";
import { Bottone, Scheda } from "./Foglio";

/**
 * Il pannello che mette una serie in videoteca.
 *
 * Mostra i candidati e lascia scegliere: **non** aggancia il primo
 * risultato. Non è prudenza generica — la ricerca di AnimeClick ordina
 * per titolo e non per pertinenza, e su "one piece" il primo risultato
 * è un crossover con Dragon Ball. Agganciare da soli vorrebbe dire
 * riempire la videoteca di schede sbagliate, che poi vanno tolte a
 * mano.
 *
 * Per lo stesso motivo ogni candidato porta con sé anno e copertina:
 * fra le sette schede che AnimeClick chiama "Berserk", quelle due cose
 * sono ciò che distingue il 1997 dal 2016.
 */
export default function AggiungiAnime({ chiudi, alFatto }) {
  const [titolo, setTitolo] = useState("");
  const [candidati, setCandidati] = useState(null);
  const [inCorso, setInCorso] = useState(false);
  const [aggancioInCorso, setAggancioInCorso] = useState(null);
  const [errore, setErrore] = useState(null);

  async function cerca(e) {
    e.preventDefault();

    if (titolo.trim().length < 2) return;

    setInCorso(true);
    setErrore(null);

    try {
      setCandidati(await cercaAnime(titolo.trim()));
    } catch (err) {
      setErrore(err);
      setCandidati(null);
    } finally {
      setInCorso(false);
    }
  }

  async function aggancia(candidato) {
    setAggancioInCorso(candidato.animeclickId);
    setErrore(null);

    try {
      const esito = await agganciaAnime(candidato.animeclickId);
      alFatto?.(esito);
      chiudi?.();
    } catch (err) {
      setErrore(err);
    } finally {
      setAggancioInCorso(null);
    }
  }

  return (
    <div className="fixed inset-0 z-modal grid place-items-center p-3" role="dialog" aria-label="Aggiungi un anime">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={chiudi}
        className="absolute inset-0 bg-quaderno-inchiostro/40"
      />

      <Scheda className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden shadow-float">
        <form onSubmit={cerca} className="flex gap-2 border-b border-quaderno-riga p-4">
          <input
            autoFocus
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            placeholder="Titolo della serie — anche in italiano"
            aria-label="Titolo da cercare"
            className="min-w-0 flex-1 rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue
              focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
          />

          <Bottone tono="pieno" type="submit" disabled={inCorso || titolo.trim().length < 2}>
            {inCorso ? "Cerco…" : "Cerca"}
          </Bottone>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {errore && (
            <p className="mb-3 rounded-lg bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
              {errore.message}
            </p>
          )}

          {candidati === null && !inCorso && (
            <p className="py-8 text-center text-sm text-quaderno-tenue">
              La ricerca è letterale: cerca come si chiama la serie, senza refusi.
            </p>
          )}

          {candidati?.length === 0 && (
            <p className="py-8 text-center text-sm text-quaderno-tenue">
              Nessun titolo. Prova con il nome originale, o con una parola sola.
            </p>
          )}

          <ul className="space-y-2">
            {candidati?.map((c) => (
              <li key={c.animeclickId}>
                <div className="flex items-center gap-3 rounded-card border border-quaderno-riga p-2">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-quaderno-carta">
                    {c.copertina && (
                      <img
                        src={urlCopertina(c.copertina)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-quaderno-inchiostro">
                      {c.titolo}
                    </p>
                    <p className="font-numeric text-xs text-quaderno-tenue">
                      {c.anno || "anno ignoto"} · scheda {c.animeclickId}
                    </p>
                  </div>

                  {c.giaInVideoteca ? (
                    <span className="shrink-0 text-xs font-medium text-quaderno-tenue">
                      già in videoteca
                    </span>
                  ) : (
                    <Bottone
                      tono="pieno"
                      onClick={() => aggancia(c)}
                      disabled={aggancioInCorso !== null}
                      className="shrink-0"
                    >
                      {aggancioInCorso === c.animeclickId ? "Aggiungo…" : "Aggiungi"}
                    </Bottone>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end border-t border-quaderno-riga p-3">
          <Bottone onClick={chiudi}>Chiudi</Bottone>
        </div>
      </Scheda>
    </div>
  );
}
