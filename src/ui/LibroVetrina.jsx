import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LibroVetrinaScena from "../tre/libroVetrina";
import Copertina from "./Copertina";
import Icon from "../app/Icon";
import { urlCopertina } from "../services/api";
import { completamento, volumiMancanti } from "../dati/serie";

/**
 * Chi va in vetrina oggi.
 *
 * Non il voto più alto in assoluto ogni giorno — sempre la stessa
 * scelta sarebbe una vetrina morta. Pesa preferiti, voto e serie quasi
 * finite (un promemoria più utile di una già completa o appena
 * cominciata), poi sceglie con un numero pseudo-casuale ancorato alla
 * data: la stessa scelta per tutto il giorno, un'altra il giorno dopo.
 */
function scegliPickDelGiorno(serie) {
  if (!serie.length) return null;

  const pesate = serie.map((s) => {
    let peso = 1;

    if (s.preferito) peso += 6;
    if (s.valutazione) peso += s.valutazione;

    const mancanti = volumiMancanti(s);
    if (mancanti > 0 && mancanti <= 3) peso += 3;

    return { s, peso };
  });

  const totale = pesate.reduce((t, x) => t + x.peso, 0);

  const chiaveGiorno = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  const casuale = ((chiaveGiorno * 9301 + 49297) % 233280) / 233280;

  let soglia = casuale * totale;

  for (const { s, peso } of pesate) {
    soglia -= peso;
    if (soglia <= 0) return s;
  }

  return pesate[pesate.length - 1].s;
}

export default function LibroVetrina({ serie }) {
  const contenitore = useRef(null);
  const scena = useRef(null);
  const navigate = useNavigate();

  const [guasto, setGuasto] = useState(false);

  // Un pick al giorno, non a ogni render: ricalcolarlo ogni volta che
  // la collezione si aggiorna (un voto cambiato altrove) farebbe
  // saltare il libro sotto le mani di chi lo sta girando.
  const pick = useMemo(() => scegliPickDelGiorno(serie), [serie]);

  useEffect(() => {
    if (!contenitore.current || !pick || guasto) return undefined;

    let istanza;

    try {
      istanza = new LibroVetrinaScena(contenitore.current, {
        copertina: pick.copertina ? urlCopertina(pick.copertina) : null,
        alClick: () => navigate(`/serie/${pick.id}`)
      });
    } catch (e) {
      console.error("Libro in vetrina non avviato:", e);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuasto(true);
      return undefined;
    }

    scena.current = istanza;

    return () => {
      istanza.distruggi();
      scena.current = null;
    };
  }, [pick, guasto, navigate]);

  if (!pick) return null;

  const pct = completamento(pick);

  return (
    <div className="relative overflow-hidden rounded-panel border border-hairline bg-glass-1 backdrop-blur-xl">
      <div className="grid sm:grid-cols-[minmax(0,13rem)_1fr]">
        {guasto ? (
          <div className="mx-auto w-32 p-5 sm:mx-0 sm:w-full sm:p-6">
            <Copertina src={pick.copertina} alt={pick.titolo} inclina={false} />
          </div>
        ) : (
          <div ref={contenitore} className="h-52 w-full sm:h-64" />
        )}

        <div className="flex min-w-0 flex-col justify-center gap-2 p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brass-500/80">
            In vetrina oggi
          </p>

          <h3 className="truncate font-display text-xl font-semibold text-ink-bright sm:text-2xl">
            {pick.titolo}
          </h3>

          <p className="font-numeric text-sm text-ink-muted">
            {pick.posseduti}
            {pick.totali ? ` / ${pick.totali}` : ""} volumi
            {pct !== null && ` · ${pct}% completa`}
          </p>

          <button
            onClick={() => navigate(`/serie/${pick.id}`)}
            className="mt-1 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brass-400 transition-colors duration-quick hover:text-brass-300"
          >
            Apri la scheda
            <Icon nome="back" dimensione={14} className="rotate-180" />
          </button>

          {!guasto && (
            <p className="mt-1 text-[0.7rem] text-ink-faint">Trascinalo per girarlo</p>
          )}
        </div>
      </div>
    </div>
  );
}
