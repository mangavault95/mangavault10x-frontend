import { Stella, VotoStelle } from "./AzioniSerie";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { votoDi, votoIt } from "../dati/serie";

/**
 * I voti della scheda, uno per persona.
 *
 *   Voto Nicer     ★★★★☆  4
 *   Voto Ilaria    ★★★½☆  3,5
 *
 * Non è una media e non è una classifica: sono due giudizi diversi
 * sulla stessa opera, e devono restare distinti anche quando
 * coincidono. Il proprio si tocca, quello dell'altra persona si legge
 * e basta — non per gerarchia, ma perché un voto è di chi lo dà.
 *
 * Le righe nascono dall'elenco di chi può votare, non da chi ha già
 * votato: una serie che nessuno ha ancora giudicato mostra comunque
 * due righe vuote, e si vede a colpo d'occhio che manca il tuo.
 */
export default function VotiPersone({ serie, dimensione = 20 }) {
  const { lettori, idVisto } = useSessione();
  const { aggiornaVoto } = useCollezione();

  // Prima che l'elenco arrivi — o se il server è la versione vecchia —
  // resta il voto singolo di sempre: meglio una stella senza nome che
  // nessuna stella.
  if (!lettori.length) {
    return (
      <VotoStelle
        serie={serie}
        dimensione={dimensione}
        onCambiato={(nuovo) => aggiornaVoto(serie.id, nuovo)}
      />
    );
  }

  return (
    <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
      {lettori.map((lettore) => {
        const mio = lettore.id === idVisto;
        const voto = votoDi(serie, lettore.id);

        return (
          <li key={lettore.id} className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Voto {lettore.nickname}
            </span>

            {mio ? (
              <VotoStelle
                serie={serie}
                dimensione={dimensione}
                onCambiato={(nuovo) => aggiornaVoto(serie.id, nuovo)}
              />
            ) : (
              <VotoFermo voto={voto} dimensione={dimensione} nickname={lettore.nickname} />
            )}

            <span className="font-numeric text-sm text-ink-bright">
              {voto ? votoIt(voto) : <span className="text-ink-faint">—</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Il voto di qualcun altro: le stesse stelle, senza bersagli sotto.
 *
 * Disegnarlo con `VotoStelle` disabilitato sarebbe stato più corto, ma
 * un comando spento invita comunque a premerlo. Qui non c'è niente da
 * premere perché non c'è niente da fare: è un dato, come l'editore.
 */
function VotoFermo({ voto, dimensione, nickname }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={voto ? `${nickname}: ${votoIt(voto)} su 5` : `${nickname} non l'ha ancora votata`}
    >
      {[1, 2, 3, 4, 5].map((numero) => (
        <Stella
          key={numero}
          riempimento={Math.min(1, Math.max(0, (voto ?? 0) - numero + 1))}
          dimensione={dimensione}
        />
      ))}
    </span>
  );
}
