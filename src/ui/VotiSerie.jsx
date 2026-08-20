import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "../app/Icon";
import Copertina from "./Copertina";
import Sovrapposizione from "./Sovrapposizione";
import useChiusuraVelo from "./useChiusuraVelo";
import { numeroIt, votoIt } from "../dati/serie";

/**
 * Il dettaglio dietro «Voto medio»: chi alza la media e chi la abbassa.
 *
 * Il numero solo sulla tessera dice quanto vale la media, non da cosa
 * è fatta — e "3.6" non dice se è un voto onesto o la somma di tanti
 * 5 e tanti 1,5 che si annullano. Qui si vede la lista intera, ordinata
 * dal voto più alto, con ogni riga colorata rispetto alla media: sopra
 * la alza, sotto la abbassa. Non un colore fisso per voto basso/alto,
 * perché "alza la media" dipende dalla media stessa, non da una soglia
 * assoluta.
 */
export default function VotiSerie({ serie, media, onChiudere }) {
  const velo = useChiusuraVelo(onChiudere);

  const righe = useMemo(() => {
    return serie
      .filter((s) => s.valutazione > 0)
      .sort((a, b) => b.valutazione - a.valutazione || a.titolo.localeCompare(b.titolo, "it"));
  }, [serie]);

  useEffect(() => {
    function alTasto(e) {
      if (e.key === "Escape") onChiudere();
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [onChiudere]);

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-overlay flex items-end justify-center bg-void/70 p-0 backdrop-blur-sm animate-rise-in sm:items-center sm:p-5"
        {...velo}
      >
        <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-sheet border border-hairline bg-glass-3 backdrop-blur-2xl sm:rounded-sheet">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-5">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink-bright">Voto medio</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                {media ? `${media.toFixed(1)} su 5` : "nessun voto registrato"} ·{" "}
                {numeroIt(righe.length)} serie votate
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
                {righe.map((s) => {
                  const scarto = media ? s.valutazione - media : 0;
                  const alza = scarto > 0.001;
                  const abbassa = scarto < -0.001;

                  return (
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
                          <p className="truncate text-sm font-medium text-ink-bright">
                            {s.titolo}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {alza ? "alza la media" : abbassa ? "abbassa la media" : "sulla media"}
                          </p>
                        </div>

                        <p
                          className={`font-numeric shrink-0 text-sm font-semibold ${
                            alza ? "text-jade" : abbassa ? "text-ember" : "text-ink-muted"
                          }`}
                        >
                          {votoIt(s.valutazione)}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-ink-muted">
                Nessun voto registrato.
              </p>
            )}
          </div>
        </div>
      </div>
    </Sovrapposizione>
  );
}
