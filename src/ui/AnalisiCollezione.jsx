import { completamento, euro, numeroIt, valoreSerie } from "../dati/serie";
import { generePrevalente } from "../dati/generi";

/**
 * I numeri di quello che stai guardando in questo momento, non della
 * collezione intera — quelli vivono nella pagina Numeri, fissi. Qui
 * cambiano mentre filtri: cercare "Adventure" e vedere "Valore" scendere
 * da 15.000€ a 900€ dice qualcosa che nessuna griglia da sola direbbe.
 *
 * Sparisce con zero risultati: un pannello di zeri non aggiunge niente
 * al messaggio "nessuna serie corrisponde" che compare comunque sotto.
 */
export default function AnalisiCollezione({ serie }) {
  if (!serie.length) return null;

  const volumi = serie.reduce((t, s) => t + s.posseduti, 0);
  const valore = serie.reduce((t, s) => t + valoreSerie(s), 0);

  const percentuali = serie.map(completamento).filter((v) => v !== null);
  const completamentoMedio = percentuali.length
    ? Math.round(percentuali.reduce((t, v) => t + v, 0) / percentuali.length)
    : null;

  const genere = generePrevalente(serie);

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <Cifra etichetta="Serie" valore={numeroIt(serie.length)} />
      <Cifra etichetta="Volumi in casa" valore={numeroIt(volumi)} />
      <Cifra etichetta="Valore" valore={euro(valore)} />
      <Cifra
        etichetta="Completamento medio"
        valore={completamentoMedio !== null ? `${completamentoMedio}%` : "—"}
        nota={genere ? `soprattutto ${genere}` : null}
      />
    </dl>
  );
}

function Cifra({ etichetta, valore, nota }) {
  return (
    <div className="rounded-panel border border-hairline bg-glass-1 px-4 py-3 backdrop-blur-xl transition-colors duration-base hover:border-soft">
      <dt className="truncate text-[0.65rem] font-medium uppercase tracking-wider text-ink-muted">
        {etichetta}
      </dt>

      <dd className="mt-1 font-numeric text-xl font-semibold text-ink-bright sm:text-2xl">
        {valore}
      </dd>

      {nota && <p className="mt-0.5 truncate text-[0.7rem] text-ink-faint">{nota}</p>}
    </div>
  );
}
