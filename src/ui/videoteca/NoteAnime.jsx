import { useState } from "react";
import { creaNotaAnime, eliminaNotaAnime } from "../../services/api";
import { Bottone, Pillola } from "./Foglio";

/**
 * I commenti a una serie e alle sue puntate.
 *
 * Una lista sola, come una sola è la tabella: le note di puntata
 * portano il numero davanti, quelle della serie no. Tenerle separate
 * in due elenchi avrebbe spezzato la cronologia — e quello che si
 * scrive guardando una serie è un discorso solo, che passa dalla
 * puntata all'opera e ritorno.
 *
 * Si leggono in due, si scrivono per sé: il colore accanto dice chi
 * l'ha scritta, ed è lo stesso colore delle note in collezione.
 */

// I colori dei lettori sono nati per fondo scuro (vedi tailwind.config).
// Qui servono come segno di riconoscimento su carta bianca, quindi si
// usano per il filetto laterale e non per il testo: il giallo ottone
// su bianco non si leggerebbe.
const FILETTO = {
  ottone: "border-l-brass-500",
  lilla: "border-l-lettore-lilla",
  menta: "border-l-lettore-menta",
  corallo: "border-l-lettore-corallo",
  cielo: "border-l-lettore-cielo",
  rosa: "border-l-lettore-rosa"
};

export default function NoteAnime({ animeId, note, utente, alCambio }) {
  const [testo, setTesto] = useState("");
  const [episodio, setEpisodio] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState(null);
  const [scoperte, setScoperte] = useState(() => new Set());

  async function scrivi(e) {
    e.preventDefault();

    if (!testo.trim()) return;

    setInCorso(true);
    setErrore(null);

    try {
      await creaNotaAnime(animeId, {
        testo: testo.trim(),
        numeroEpisodio: episodio === "" ? null : Number(episodio),
        spoiler
      });

      setTesto("");
      setEpisodio("");
      setSpoiler(false);
      alCambio?.();
    } catch (err) {
      setErrore(err);
    } finally {
      setInCorso(false);
    }
  }

  async function elimina(id) {
    try {
      await eliminaNotaAnime(id);
      alCambio?.();
    } catch (err) {
      setErrore(err);
    }
  }

  return (
    <div className="space-y-4">
      {utente && (
        <form onSubmit={scrivi} className="space-y-2">
          <textarea
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            rows={3}
            placeholder="Cosa ne pensi? Di tutta la serie, o di una puntata."
            aria-label="Scrivi un commento"
            className="w-full resize-y rounded-card border border-quaderno-riga bg-quaderno-foglio px-3 py-2 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue
              focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-quaderno-tenue">
              Episodio
              <input
                type="number"
                min="0"
                value={episodio}
                onChange={(e) => setEpisodio(e.target.value)}
                placeholder="—"
                className="w-16 rounded border border-quaderno-riga bg-quaderno-foglio px-2 py-1 font-numeric text-sm text-quaderno-inchiostro
                  focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-quaderno-tenue">
              <input
                type="checkbox"
                checked={spoiler}
                onChange={(e) => setSpoiler(e.target.checked)}
                className="h-4 w-4 accent-quaderno-blu"
              />
              Contiene spoiler
            </label>

            <Bottone tono="pieno" type="submit" disabled={inCorso || !testo.trim()} className="ml-auto">
              {inCorso ? "Scrivo…" : "Scrivi"}
            </Bottone>
          </div>
        </form>
      )}

      {errore && (
        <p className="rounded-lg bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
          {errore.message}
        </p>
      )}

      {note.length === 0 ? (
        <p className="py-4 text-sm text-quaderno-tenue">
          Ancora nessun commento su questa serie.
        </p>
      ) : (
        <ul className="space-y-2">
          {note.map((nota) => {
            const coperta = nota.spoiler && !scoperte.has(nota.id);

            return (
              <li
                key={nota.id}
                className={`rounded-card border border-quaderno-riga border-l-[3px] bg-quaderno-foglio p-3 ${
                  FILETTO[nota.colore] || "border-l-quaderno-riga"
                }`}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-quaderno-inchiostro">
                    {nota.nickname}
                  </span>

                  {nota.numero_episodio !== null && (
                    <Pillola tono="blu">ep {nota.numero_episodio}</Pillola>
                  )}

                  <span className="font-numeric text-[0.7rem] text-quaderno-tenue">
                    {new Date(nota.creata_il).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>

                  {utente?.id === Number(nota.utente_id) && (
                    <button
                      type="button"
                      onClick={() => elimina(nota.id)}
                      className="ml-auto text-[0.7rem] text-quaderno-tenue hover:text-quaderno-inchiostro"
                    >
                      elimina
                    </button>
                  )}
                </div>

                {coperta ? (
                  <button
                    type="button"
                    onClick={() => setScoperte((s) => new Set(s).add(nota.id))}
                    className="w-full rounded bg-quaderno-carta py-2 text-xs font-medium text-quaderno-tenue hover:text-quaderno-inchiostro"
                  >
                    Contiene spoiler — tocca per leggere
                  </button>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-quaderno-inchiostro">
                    {nota.testo}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
