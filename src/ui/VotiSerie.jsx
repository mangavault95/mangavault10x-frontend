import { useMemo } from "react";
import { Link } from "react-router";
import Copertina from "./Copertina";
import Foglio from "./Foglio";
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
  const righe = useMemo(() => {
    return serie
      .filter((s) => s.valutazione > 0)
      .sort((a, b) => b.valutazione - a.valutazione || a.titolo.localeCompare(b.titolo, "it"));
  }, [serie]);

  return (
    <Foglio
      titolo="Voto medio"
      sotto={`${media ? `${media.toFixed(1)} su 5` : "nessun voto registrato"} · ${numeroIt(righe.length)} serie votate`}
      larghezza="sm:max-w-2xl"
      onChiudere={onChiudere}
    >
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
    </Foglio>
  );
}
