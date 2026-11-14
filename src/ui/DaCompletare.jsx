import { useMemo } from "react";
import { Link } from "react-router";
import Copertina from "./Copertina";
import Foglio from "./Foglio";
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

  const totaleVolumi = righe.reduce((t, r) => t + r.mancanti, 0);

  return (
    <Foglio
      titolo="Per completare tutto"
      sotto={`${plurale(righe.length, "serie", "serie")} · ${numeroIt(totaleVolumi)} volumi mancanti`}
      larghezza="sm:max-w-2xl"
      onChiudere={onChiudere}
    >
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
    </Foglio>
  );
}
