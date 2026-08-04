import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "../app/Icon";
import Copertina from "./Copertina";
import Sovrapposizione from "./Sovrapposizione";
import useChiusuraVelo from "./useChiusuraVelo";
import { euro, numeroIt, plurale, volumiMancanti } from "../dati/serie";

/**
 * Il dettaglio dietro «Per completare tutto»: quali serie, quanto
 * manca di ognuna, a che prezzo.
 *
 * La tessera dà un numero solo — il totale — ed è apposta: è la prima
 * cosa che si legge. Ma un totale senza sapere cosa lo compone non
 * dice se conviene finire la serie da tre volumi o quella da trenta,
 * e questo elenco è la risposta a quella domanda, non un'altra pagina.
 *
 * Ordinate per costo, non per titolo: chi apre questo pannello vuole
 * sapere dove andrebbero i soldi, non cercare alfabeticamente.
 */
export default function DaCompletare({ serie, onChiudere }) {
  const velo = useChiusuraVelo(onChiudere);

  const righe = useMemo(() => {
    return serie
      .map((s) => {
        const mancanti = volumiMancanti(s);

        if (!mancanti || !s.costo) return null;

        return { serie: s, mancanti, costoVolume: s.costo, costoTotale: mancanti * s.costo };
      })
      .filter(Boolean)
      .sort((a, b) => b.costoTotale - a.costoTotale);
  }, [serie]);

  useEffect(() => {
    function alTasto(e) {
      if (e.key === "Escape") onChiudere();
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [onChiudere]);

  const totaleVolumi = righe.reduce((t, r) => t + r.mancanti, 0);

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-overlay flex items-end justify-center bg-void/70 p-0 backdrop-blur-sm animate-rise-in sm:items-center sm:p-5"
        {...velo}
      >
        <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-sheet border border-hairline bg-glass-3 backdrop-blur-2xl sm:rounded-sheet">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-5">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink-bright">
                Per completare tutto
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                {plurale(righe.length, "serie", "serie")} · {numeroIt(totaleVolumi)} volumi mancanti
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

          <div className="overflow-y-auto px-4 py-2 sm:px-6">
            {righe.length ? (
              <ul className="divide-y divide-hairline">
                {righe.map(({ serie: s, mancanti, costoVolume, costoTotale }) => (
                  <li key={s.id}>
                    <Link
                      to={`/serie/${s.id}`}
                      onClick={onChiudere}
                      className="-mx-2 flex items-center gap-4 rounded-card px-2 py-3 transition-colors duration-quick hover:bg-glass-1"
                    >
                      <div className="w-10 shrink-0">
                        <Copertina src={s.copertina} alt={s.titolo} inclina={false} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-bright">{s.titolo}</p>
                        <p className="font-numeric text-xs text-ink-muted">
                          {plurale(mancanti, "volume mancante", "volumi mancanti")} · {euro(costoVolume)} l'uno
                        </p>
                      </div>

                      <p className="font-numeric shrink-0 text-sm font-semibold text-ember">
                        {euro(costoTotale)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-ink-muted">
                Nessuna serie da completare.
              </p>
            )}
          </div>
        </div>
      </div>
    </Sovrapposizione>
  );
}
