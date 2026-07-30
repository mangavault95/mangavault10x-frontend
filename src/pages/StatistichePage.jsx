import { useMemo } from "react";
import { Link } from "react-router-dom";
import Pagina, { Sezione } from "../ui/Pagina";
import Classifica from "../ui/Classifica";
import Copertina from "../ui/Copertina";
import { CaricamentoGriglia, Errore } from "../ui/Stati";
import { useCollezione } from "../dati/collezione";
import {
  completamento,
  euro,
  numeroIt,
  valoreSerie,
  volumiMancanti
} from "../dati/serie";

/**
 * I numeri della collezione.
 *
 * Sono calcolati qui dai dati già in memoria invece di chiedere al
 * server: la collezione è arrivata una volta sola all'apertura del
 * sito, rifare il giro per contare 188 righe sarebbe uno spreco. La
 * vista SQL `v_collezione_riepilogo` resta la fonte per i totali che
 * servono altrove.
 *
 * Ogni blocco risponde a una domanda diversa: quanto ho, quanto vale,
 * cosa colleziono, e cosa svetta.
 */
export default function StatistichePage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();

  const n = useMemo(() => {
    if (!serie.length) return null;

    const volumi = serie.reduce((t, s) => t + s.posseduti, 0);
    const valore = serie.reduce((t, s) => t + valoreSerie(s), 0);

    const conCosto = serie.filter((s) => s.costo);
    const prezzoMedio = conCosto.length
      ? conCosto.reduce((t, s) => t + s.costo, 0) / conCosto.length
      : 0;

    const complete = serie.filter((s) => completamento(s) === 100).length;
    const daCompletare = serie.filter((s) => volumiMancanti(s) > 0).length;
    const inCorsoEditore = serie.filter((s) => s.stato === "in_corso").length;

    // Quanto costerebbe finire tutto quello che hai cominciato: è il
    // numero che nessun'altra pagina dice, e quello che serve sapere
    // prima di aggiungere un'altra serie nuova.
    const perCompletare = serie.reduce((t, s) => {
      const mancanti = volumiMancanti(s);

      return t + (mancanti && s.costo ? mancanti * s.costo : 0);
    }, 0);

    // Zero non è un voto: nella collezione significa "non l'ho ancora
    // giudicato". Contarlo abbasserebbe la media di due punti buoni e
    // farebbe sembrare mediocre tutto quello che hai comprato.
    const votate = serie.filter((s) => s.valutazione > 0);
    const votoMedio = votate.length
      ? votate.reduce((t, s) => t + s.valutazione, 0) / votate.length
      : null;

    return {
      serie: serie.length,
      volumi,
      valore,
      prezzoMedio,
      complete,
      daCompletare,
      inCorsoEditore,
      perCompletare,
      votoMedio,
      volumiMancantiTotali: serie.reduce((t, s) => t + (volumiMancanti(s) || 0), 0)
    };
  }, [serie]);

  /* -------------------- Classifiche -------------------- */

  const editori = useMemo(() => conteggia(serie, (s) => (s.editore ? [s.editore] : [])), [serie]);
  const generi = useMemo(() => conteggia(serie, (s) => s.generi), [serie]);

  const spesaPerEditore = useMemo(() => {
    const mappa = new Map();

    for (const s of serie) {
      if (!s.editore) continue;

      mappa.set(s.editore, (mappa.get(s.editore) || 0) + valoreSerie(s));
    }

    return [...mappa]
      .map(([etichetta, valore]) => ({ etichetta, valore: Math.round(valore) }))
      .filter((v) => v.valore > 0)
      .sort((a, b) => b.valore - a.valore)
      .slice(0, 8);
  }, [serie]);

  /* -------------------- Primati -------------------- */

  const primati = useMemo(() => {
    if (!serie.length) return [];

    const migliore = (etichetta, estrai, formatta) => {
      const candidate = serie.filter((s) => estrai(s) !== null && estrai(s) !== undefined);

      if (!candidate.length) return null;

      const vincitrice = candidate.reduce((a, b) => (estrai(b) > estrai(a) ? b : a));

      return { etichetta, serie: vincitrice, dettaglio: formatta(estrai(vincitrice)) };
    };

    return [
      migliore("Più volumi", (s) => s.posseduti || null, (v) => `${v} volumi`),
      migliore("Voto più alto", (s) => s.valutazione, (v) => `${v} / 5`),
      migliore("Serie più lunga", (s) => s.totali, (v) => `${v} volumi totali`),
      migliore("Vale di più", (s) => valoreSerie(s) || null, (v) => euro(v)),
      migliore("Ne mancano di più", (s) => volumiMancanti(s) || null, (v) => `${v} da prendere`)
    ].filter(Boolean);
  }, [serie]);

  if (errore) {
    return (
      <Pagina titolo="Numeri">
        <Errore errore={errore} riprova={ricarica} />
      </Pagina>
    );
  }

  if (!n) {
    return (
      <Pagina titolo="Numeri" occhiello="La collezione in cifre">
        {inCorso ? <CaricamentoGriglia quante={8} /> : null}
      </Pagina>
    );
  }

  return (
    <Pagina
      occhiello="La collezione in cifre"
      titolo="Numeri"
      sommario="Quanto hai, quanto vale, quanto manca."
    >
      <div className="space-y-14">
        {/* ---------- I titoloni ----------
            Quattro numeri e basta: una fila di venti indicatori non si
            legge, si scorre. Il resto della pagina li spiega. */}
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Tessera etichetta="Serie" valore={numeroIt(n.serie)} />
          <Tessera etichetta="Volumi" valore={numeroIt(n.volumi)} />
          <Tessera
            etichetta="Valore in casa"
            valore={euro(n.valore)}
            nota={`${euro(n.prezzoMedio)} a volume`}
          />
          <Tessera
            etichetta="Per completare tutto"
            valore={euro(n.perCompletare)}
            nota={`${numeroIt(n.volumiMancantiTotali)} volumi`}
            tono="ember"
          />
        </dl>

        {/* ---------- Stato ---------- */}
        <Sezione titolo="Com'è messa">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tessera
              etichetta="Serie complete"
              valore={numeroIt(n.complete)}
              nota={`${Math.round((n.complete / n.serie) * 100)}% del totale`}
              tono="jade"
            />
            <Tessera etichetta="Da completare" valore={numeroIt(n.daCompletare)} />
            <Tessera etichetta="In corso d'uscita" valore={numeroIt(n.inCorsoEditore)} />
            <Tessera
              etichetta="Voto medio"
              valore={n.votoMedio ? n.votoMedio.toFixed(1) : "—"}
              nota={n.votoMedio ? "su 5" : "nessun voto registrato"}
            />
          </div>
        </Sezione>

        {/* ---------- Classifiche ---------- */}
        <div className="grid gap-10 lg:grid-cols-2">
          <Sezione titolo="Editori">
            <Classifica voci={editori.slice(0, 8)} unita="serie" />
          </Sezione>

          <Sezione titolo="Generi">
            <Classifica voci={generi.slice(0, 8)} unita="serie" />
          </Sezione>

          <Sezione titolo="Dove sono finiti i soldi">
            <Classifica voci={spesaPerEditore} formatta={(v) => euro(v)} />
          </Sezione>
        </div>

        {/* ---------- Primati ---------- */}
        <Sezione titolo="Primati">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {primati.map((p) => (
              <Primato key={p.etichetta} {...p} />
            ))}
          </div>
        </Sezione>
      </div>
    </Pagina>
  );
}

/* ==================================================
   PEZZI
   ================================================== */

// Conta quante serie ricadono in ogni valore di un campo che può
// contenerne più d'uno (i generi) o uno solo (l'editore).
function conteggia(serie, estraiValori) {
  const mappa = new Map();

  for (const s of serie) {
    for (const v of estraiValori(s)) {
      mappa.set(v, (mappa.get(v) || 0) + 1);
    }
  }

  return [...mappa]
    .map(([etichetta, valore]) => ({ etichetta, valore }))
    .sort((a, b) => b.valore - a.valore);
}

function Tessera({ etichetta, valore, nota, tono = "neutro" }) {
  const toni = {
    neutro: "text-ink-bright",
    jade: "text-jade",
    ember: "text-ember"
  };

  return (
    <div className="rounded-panel border border-hairline bg-glass-1 px-5 py-4 backdrop-blur-xl transition-colors duration-base hover:border-soft">
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {etichetta}
      </dt>

      <dd className={`mt-1.5 font-numeric text-2xl font-semibold sm:text-3xl ${toni[tono]}`}>
        {valore}
      </dd>

      {nota && <p className="mt-1 text-xs text-ink-faint">{nota}</p>}
    </div>
  );
}

function Primato({ etichetta, serie, dettaglio }) {
  return (
    <Link
      to={`/serie/${serie.id}`}
      className="group flex items-center gap-4 rounded-panel border border-hairline bg-glass-1 p-4 backdrop-blur-xl
                 transition-all duration-base ease-settle hover:-translate-y-0.5 hover:border-soft hover:bg-glass-2
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
    >
      <div className="w-14 shrink-0">
        <Copertina src={serie.copertina} alt={serie.titolo} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-brass-500/90">
          {etichetta}
        </p>

        <p className="mt-1 truncate font-medium text-ink-bright transition-colors group-hover:text-brass-300">
          {serie.titolo}
        </p>

        <p className="font-numeric text-xs text-ink-muted">{dettaglio}</p>
      </div>
    </Link>
  );
}
