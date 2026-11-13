import { Link } from "react-router-dom";
import { dopoIlRipiego, urlCopertina } from "../../services/api";
import { prossimoVolume, totaleDisponibile, volumiMancanti, votoDi, votoIt } from "../../dati/serie";

/* ==================================================
   LA RIGA DELL'ELENCO
   ================================================== */

function Miniatura({ src }) {
  const indirizzo = urlCopertina(src, 128);

  return indirizzo ? (
    <img
      src={indirizzo}
      alt=""
      loading="lazy"
      onError={dopoIlRipiego(() => {})}
      className="h-14 w-10 shrink-0 rounded-md object-cover"
    />
  ) : (
    <span aria-hidden="true" className="h-14 w-10 shrink-0 rounded-md bg-glass-2" />
  );
}

/**
 * Una serie in elenco: a colpo d'occhio titolo, quanti ne hai e cosa
 * manca; a destra, se manca qualcosa, il tasto per segnare che l'hai
 * preso. Una serie completa non ha tasti: non c'è niente da aggiornare.
 */
export function RigaSerie({ serie, lettore, occupata, onPreso }) {
  const mancanti = volumiMancanti(serie);
  const totale = totaleDisponibile(serie);
  const completa = mancanti === 0;
  const voto = lettore ? votoDi(serie, lettore) : serie.valutazione;
  const numero = prossimoVolume(serie);

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link
        to={lettore ? `/serie/${serie.id}?lettore=${lettore}` : `/serie/${serie.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      >
        <Miniatura src={serie.copertina} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-ink-bright">
            {serie.titolo}
            {serie.edizione && <span className="font-normal text-ink-muted"> · {serie.edizione}</span>}
          </p>

          <p className="truncate text-xs text-ink-muted">
            <span className="font-numeric">
              {serie.posseduti}
              {totale ? `/${totale}` : ""}
            </span>{" "}
            vol.
            {completa && (
              <span className="ml-1.5 font-medium text-jade">
                {serie.stato === "conclusa" ? "completa" : "in pari"}
              </span>
            )}
            {mancanti > 0 && (
              <span className="ml-1.5 font-medium text-ember">ne mancano {mancanti}</span>
            )}
            {serie.editore && <span> · {serie.editore}</span>}
          </p>
        </div>

        {voto > 0 && (
          <span className="shrink-0 font-numeric text-xs font-medium text-brass-300">
            {votoIt(voto)}★
          </span>
        )}
      </Link>

      {onPreso && !completa && (
        <button
          type="button"
          onClick={onPreso}
          disabled={occupata}
          aria-label={`Segna come preso il volume ${numero} di ${serie.titolo}`}
          className="shrink-0 rounded-xl bg-glass-2 px-3 py-2 font-numeric text-sm font-semibold text-ink-bright transition-transform duration-quick active:scale-95 disabled:opacity-60"
        >
          {occupata ? "…" : `+ ${numero}`}
        </button>
      )}
    </li>
  );
}
