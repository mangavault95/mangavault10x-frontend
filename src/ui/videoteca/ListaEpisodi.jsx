import { useState } from "react";
import { segnaEpisodio, togliEpisodio } from "../../services/api";
import { Pillola } from "./Foglio";

/**
 * L'elenco delle puntate, con la casella per ognuna.
 *
 * Due gesti, non uno: la casella spunta quella puntata, «fino a qui»
 * spunta anche tutte le precedenti — che è quello che serve quando
 * torni dopo una serata e non vuoi toccare otto caselle in fila.
 *
 * La spunta si vede subito e si corregge dopo: il cambio è disegnato
 * appena tocchi, e se il server dice di no la casella torna com'era.
 * Su una lista di ottanta puntate, aspettare la rete a ogni tocco
 * renderebbe la pagina inservibile.
 */
export default function ListaEpisodi({ animeId, episodi, spuntati, puoiScrivere, alCambio }) {
  const [inCorso, setInCorso] = useState(null);
  const [errore, setErrore] = useState(null);

  async function cambia(numero, giaVisto) {
    if (!puoiScrivere) return;

    setInCorso(numero);
    setErrore(null);

    // Ottimista: la casella si accende adesso.
    alCambio(giaVisto ? { togli: numero } : { aggiungi: [numero] });

    try {
      if (giaVisto) await togliEpisodio(animeId, numero);
      else await segnaEpisodio(animeId, numero);
    } catch (e) {
      setErrore(e);
      // Rimetto le cose com'erano: la casella non ha diritto di
      // mostrare uno stato che il database non ha.
      alCambio(giaVisto ? { aggiungi: [numero] } : { togli: numero });
    } finally {
      setInCorso(null);
    }
  }

  async function finoA(numero) {
    if (!puoiScrivere) return;

    setInCorso(numero);
    setErrore(null);

    const prima = episodi.filter((e) => e.numero > 0 && e.numero <= numero).map((e) => e.numero);

    alCambio({ aggiungi: prima });

    try {
      await segnaEpisodio(animeId, numero, { fino: true });
    } catch (e) {
      setErrore(e);
      alCambio({ ripristina: true });
    } finally {
      setInCorso(null);
    }
  }

  if (episodi.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-quaderno-tenue">
        Di questa serie non ho ancora l'elenco delle puntate.
      </p>
    );
  }

  return (
    <div>
      {errore && (
        <p className="mb-2 rounded-lg bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
          {errore.message}
        </p>
      )}

      <ul className="divide-y divide-quaderno-riga">
        {episodi.map((ep) => {
          const visto = spuntati.has(ep.numero);
          const futuro = ep.uscita_italia && new Date(ep.uscita_italia) > new Date();

          return (
            <li
              key={`${ep.numero}-${ep.titolo ?? ""}`}
              className="group flex items-center gap-3 py-2"
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={visto}
                  disabled={!puoiScrivere || inCorso === ep.numero}
                  onChange={() => cambia(ep.numero, visto)}
                  className="h-4 w-4 shrink-0 accent-quaderno-blu"
                />

                <span className="w-8 shrink-0 font-numeric text-xs text-quaderno-tenue">
                  {ep.numero === 0 ? "sp" : ep.numero}
                </span>

                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    visto ? "text-quaderno-tenue" : "text-quaderno-inchiostro"
                  }`}
                >
                  {ep.titolo || <span className="italic text-quaderno-tenue">senza titolo</span>}
                </span>
              </label>

              {futuro && (
                <Pillola tono="blu">
                  {new Date(ep.uscita_italia).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    timeZone: "Europe/Rome"
                  })}
                </Pillola>
              )}

              {ep.durata && (
                <span className="hidden shrink-0 font-numeric text-xs text-quaderno-tenue sm:block">
                  {ep.durata}′
                </span>
              )}

              {puoiScrivere && !visto && ep.numero > 1 && (
                <button
                  type="button"
                  onClick={() => finoA(ep.numero)}
                  disabled={inCorso === ep.numero}
                  className="shrink-0 rounded px-2 py-1 text-[0.7rem] font-medium text-quaderno-tenue opacity-0 transition-opacity hover:text-quaderno-blu focus-visible:opacity-100 group-hover:opacity-100"
                >
                  fino a qui
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
