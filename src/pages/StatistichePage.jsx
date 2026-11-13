import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Pagina, { Sezione } from "../ui/Pagina";
import Classifica from "../ui/Classifica";
import Copertina from "../ui/Copertina";
import DaCompletare from "../ui/DaCompletare";
import VotiSerie from "../ui/VotiSerie";
import Icon from "../app/Icon";
import { CaricamentoGriglia, Errore } from "../ui/Stati";
import { useCollezione } from "../dati/collezione";
import { primati, riepilogo } from "../dati/numeri";
import { marchioEditore } from "../dati/editori";
import { euro, numeroIt, valoreSerie } from "../dati/serie";

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
  const [mostraDaCompletare, setMostraDaCompletare] = useState(false);
  const [mostraVoti, setMostraVoti] = useState(false);

  // I conti stavano qui, e da quando il registratore di cassa della
  // stanza batte lo stesso scontrino stanno in `dati/numeri.js`: due
  // copie della stessa somma finiscono sempre per divergere, e il giorno
  // che divergono il sito mostra due valori della collezione a due click
  // di distanza.
  const n = useMemo(() => riepilogo(serie), [serie]);

  /* -------------------- Classifiche -------------------- */

  const generi = useMemo(() => conteggia(serie, (s) => s.generi), [serie]);
  const autori = useMemo(() => conteggia(serie, (s) => (s.autore ? [s.autore] : [])), [serie]);

  // Editori e «dove sono finiti i soldi» erano due classifiche degli
  // stessi nomi, una in serie e una in euro: ora è una lista sola, con
  // la barra sulle serie e gli euro accanto.
  const editori = useMemo(() => {
    const mappa = new Map();

    for (const s of serie) {
      if (!s.editore) continue;

      const e = mappa.get(s.editore) || { etichetta: s.editore, valore: 0, spesa: 0 };

      e.valore += 1;
      e.spesa += valoreSerie(s);
      mappa.set(s.editore, e);
    }

    return [...mappa.values()].sort((a, b) => b.valore - a.valore || b.spesa - a.spesa);
  }, [serie]);

  /* -------------------- Primati -------------------- */

  const record = useMemo(() => primati(serie), [serie]);

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
        {/* ---------- La testata ----------
            I soldi sono i due numeri che si vengono a cercare qui:
            stanno in grande in cima. Serie, volumi e voto sono la riga
            piccola sotto, non tre riquadri alti uguali ai primi. */}
        <div className="space-y-3">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Tessera
              grande
              etichetta="Valore in casa"
              valore={euro(n.valore)}
              nota={`${euro(n.prezzoMedio)} a volume`}
            />
            <Tessera
              grande
              etichetta="Per completare tutto"
              valore={euro(n.perCompletare)}
              nota={`${numeroIt(n.volumiMancantiTotali)} volumi · tocca per vedere quali`}
              tono="ember"
              onClick={() => setMostraDaCompletare(true)}
            />
          </dl>

          <dl className="grid grid-cols-3 divide-x divide-hairline rounded-panel border border-hairline bg-glass-1 py-3">
            <Cifra etichetta="Serie" valore={numeroIt(n.serie)} />
            <Cifra etichetta="Volumi" valore={numeroIt(n.volumi)} />
            <Cifra
              etichetta="Voto medio"
              valore={n.votoMedio ? `${n.votoMedio.toFixed(1)}★` : "—"}
              onClick={n.votoMedio ? () => setMostraVoti(true) : undefined}
            />
          </dl>
        </div>

        {mostraDaCompletare && (
          <DaCompletare serie={serie} onChiudere={() => setMostraDaCompletare(false)} />
        )}

        {mostraVoti && (
          <VotiSerie serie={serie} media={n.votoMedio} onChiudere={() => setMostraVoti(false)} />
        )}

        {/* ---------- Stato ---------- */}
        <Sezione
          titolo="Stato attuale"
          extra={
            <span className="font-numeric text-sm text-ink-muted">
              {Math.round((n.complete / n.serie) * 100)}% complete
            </span>
          }
        >
          {/* Una barra sola: la quota di serie chiuse. Le altre due
              categorie si sovrappongono (una serie in corso può anche
              mancare di qualcosa), quindi non sono pezzi della stessa
              torta e restano conti accanto, non segmenti. */}
          <div
            role="img"
            aria-label={`${n.complete} serie complete su ${n.serie}`}
            className="h-3 overflow-hidden rounded-full bg-ink-bright/[0.06]"
          >
            <div className="h-full rounded-full bg-jade" style={{ width: `${(n.complete / n.serie) * 100}%` }} />
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-jade" />
              Complete <span className="font-numeric text-ink-bright">{numeroIt(n.complete)}</span>
            </li>
            <li>
              Da completare <span className="font-numeric text-ink-bright">{numeroIt(n.daCompletare)}</span>
            </li>
            <li>
              In corso d'uscita <span className="font-numeric text-ink-bright">{numeroIt(n.inCorsoEditore)}</span>
            </li>
          </ul>
        </Sezione>

        {/* ---------- Primati ----------
            Due gruppi, non una lista sola: vedi `primati` in
            `dati/numeri.js` per il perché. */}
        {record.map((gruppo) => (
          <Sezione
            key={gruppo.id}
            titolo={gruppo.titolo}
            extra={
              <p className="text-xs text-ink-faint">{gruppo.sommario}</p>
            }
          >
            {/* Sul telefono i primati scorrono di lato, una scheda e un
                pezzo della successiva: tre schede in colonna erano uno
                schermo intero per leggere tre record. */}
            <div
              className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1
                         sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3"
            >
              {gruppo.voci.map((p) => (
                <div key={p.id} className="w-[17.5rem] shrink-0 snap-start sm:w-auto">
                  <Primato {...p} />
                </div>
              ))}
            </div>
          </Sezione>
        ))}

        {/* ---------- Classifiche ---------- */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Sezione titolo="Editori" extra={<span className="text-xs text-ink-faint">serie · spesa</span>}>
            <ClassificaEditori voci={editori} />
          </Sezione>

          <Sezione titolo="Generi">
            <Elenco voci={generi} />
          </Sezione>

          <Sezione titolo="Autori con più serie">
            <Elenco voci={autori} />
          </Sezione>
        </div>
      </div>
    </Pagina>
  );
}

/* ==================================================
   PEZZI
   ================================================== */

const VISIBILI = 5;

/** Una classifica che ne mostra cinque e si apre su richiesta. */
function Elenco({ voci, ...resto }) {
  const [tutte, setTutte] = useState(false);

  return (
    <div>
      <Classifica voci={tutte ? voci : voci.slice(0, VISIBILI)} unita="serie" {...resto} />
      <ApriTutti n={voci.length} aperto={tutte} onClick={() => setTutte((t) => !t)} />
    </div>
  );
}

function ApriTutti({ n, aperto, onClick }) {
  if (n <= VISIBILI) return null;

  return (
    <button type="button" onClick={onClick} className="mt-3 text-sm font-medium text-brass-300 hover:underline">
      {aperto ? "Mostra meno" : `Mostra tutti (${n})`}
    </button>
  );
}

/** Editori: la barra misura le serie, a destra anche quanto ci hai speso. */
function ClassificaEditori({ voci }) {
  const [tutte, setTutte] = useState(false);
  const visibili = tutte ? voci : voci.slice(0, VISIBILI);
  const massimo = Math.max(...voci.map((v) => v.valore), 1);

  return (
    <div>
      <ol className="space-y-2.5">
        {visibili.map((v) => (
          <li key={v.etichetta} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_auto] sm:gap-4">
            <span className="truncate text-sm text-ink">{v.etichetta}</span>

            <span className="h-2.5 w-full overflow-hidden rounded-full bg-ink-bright/[0.05]">
              <span
                className="block h-full rounded-full bg-brass-400/85"
                style={{ width: `${Math.max(1.5, (v.valore / massimo) * 100)}%` }}
              />
            </span>

            <span className="min-w-[5.5rem] text-right font-numeric text-sm tabular-nums text-ink-muted">
              {v.valore} · {v.spesa > 0 ? `${numeroIt(Math.round(v.spesa))} €` : "—"}
            </span>
          </li>
        ))}
      </ol>

      <ApriTutti n={voci.length} aperto={tutte} onClick={() => setTutte((t) => !t)} />
    </div>
  );
}

/** Un numero piccolo della riga sotto la testata; se ha un dettaglio si tocca. */
function Cifra({ etichetta, valore, onClick }) {
  const Contenitore = onClick ? "button" : "div";

  return (
    <Contenitore
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`px-2 text-center ${onClick ? "rounded-r-panel hover:bg-glass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400" : ""}`}
    >
      <dd className="font-numeric text-xl font-semibold text-ink-bright">{valore}</dd>
      <dt className="text-micro font-medium uppercase tracking-wider text-ink-muted">{etichetta}</dt>
    </Contenitore>
  );
}

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

/**
 * Una tessera: un'etichetta, un numero grande, una nota.
 *
 * Le rifiniture non sono decorazione fine a se stessa. Il filo di luce
 * sul bordo alto dà alle tessere un verso — si leggono come lastre
 * appoggiate sotto una lampada invece che come rettangoli disegnati — e
 * prende il colore del numero, così la fila in cima alla pagina si
 * scorre a colpo d'occhio anche senza leggere le etichette.
 *
 * Quelle che si aprono lo dichiarano: alone d'angolo che si accende al
 * passaggio e una freccia che scivola dentro. Prima erano identiche
 * alle altre e l'unico modo di scoprire che due tessere su otto
 * nascondevano un pannello era passarci sopra per caso.
 */
function Tessera({ etichetta, valore, nota, tono = "neutro", onClick, grande = false }) {
  const toni = {
    neutro: "text-ink-bright",
    jade: "text-jade",
    ember: "text-ember"
  };

  const fili = {
    neutro: "via-white/25",
    jade: "via-jade/50",
    ember: "via-ember/50"
  };

  const Contenitore = onClick ? "button" : "div";

  return (
    <Contenitore
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`group relative overflow-hidden rounded-panel border border-hairline bg-glass-1 px-5 py-4 text-left backdrop-blur-xl
                  transition-all duration-base ease-settle hover:border-soft
                  ${
                    onClick
                      ? "w-full cursor-pointer hover:-translate-y-0.5 hover:bg-glass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
                      : ""
                  }`}
    >
      {/* Il taglio del vetro che prende la luce */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${fili[tono]}`}
      />

      {onClick && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brass-400/[0.09] opacity-0 blur-2xl transition-opacity duration-base group-hover:opacity-100"
        />
      )}

      <dt className="relative text-xs font-medium uppercase tracking-wider text-ink-muted">
        {etichetta}
      </dt>

      <dd
        className={`relative mt-1.5 font-numeric font-semibold ${
          grande ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
        } ${toni[tono]}`}
      >
        {valore}
      </dd>

      {nota && <p className="relative mt-1 text-xs text-ink-faint">{nota}</p>}

      {onClick && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 right-4 text-ink-faint transition-all duration-base ease-settle
                     group-hover:translate-x-0.5 group-hover:text-brass-300"
        >
          <Icon nome="back" dimensione={16} className="rotate-180" />
        </span>
      )}
    </Contenitore>
  );
}

/**
 * Il riquadro di un primato.
 *
 * Tre righe in ordine di importanza: che gara è, chi l'ha vinta, con
 * che numero. Il numero è la riga che si guarda per ultima ma si
 * ricorda per prima, quindi è l'unica in ottone e in cifre grandi.
 *
 * Uno dei primati premia una casa editrice invece di una serie: non ha
 * una copertina da mostrare e non porta da nessuna parte. Invece di
 * dargli un riquadro tutto suo — che lo farebbe sembrare fuori posto in
 * fila con gli altri — tiene la stessa forma, con una targhetta al
 * posto della copertina, e semplicemente non è un collegamento.
 */
function Primato({ etichetta, titolo, serie, dettaglio, nota }) {
  const contenuto = (
    <>
      {/* L'alone si accende solo al passaggio: acceso sempre, dodici
          riquadri di fila diventerebbero una fila di lampadine. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brass-400/[0.09] opacity-0 blur-2xl transition-opacity duration-base group-hover:opacity-100"
      />

      <div className="relative w-16 shrink-0">
        {/* Nessuna serie da mostrare: qui ha vinto una casa editrice, e
            al posto della copertina ci va il suo marchio — con lo
            stesso componente e lo stesso ripiego a iniziali che ogni
            altra copertina mancante usa in questa pagina. Un chip
            piccolo e impaginato dentro un riquadro grande sembrava un
            quadrato perso in un rettangolo; così riempie lo spazio
            come farebbe una copertina vera. */}
        <Copertina src={serie ? serie.copertina : marchioEditore(titolo)} alt={titolo} />
      </div>

      <div className="relative min-w-0 flex-1">
        <p className="text-micro font-medium uppercase tracking-[0.16em] text-brass-500/90">
          {etichetta}
        </p>

        <p className="mt-1 truncate font-display font-semibold text-ink-bright transition-colors group-hover:text-brass-300">
          {titolo}
        </p>

        <p className="mt-1.5 font-numeric text-lg font-semibold leading-none text-brass-300">
          {dettaglio}
        </p>

        {nota && <p className="mt-1.5 font-numeric text-xs text-ink-muted">{nota}</p>}
      </div>
    </>
  );

  const vestito =
    "group relative flex items-center gap-4 overflow-hidden rounded-panel border border-hairline bg-glass-1 p-4 backdrop-blur-xl transition-all duration-base ease-settle";

  if (!serie) {
    return <div className={vestito}>{contenuto}</div>;
  }

  return (
    <Link
      to={`/serie/${serie.id}`}
      className={`${vestito} hover:-translate-y-0.5 hover:border-soft hover:bg-glass-2
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400`}
    >
      {contenuto}
    </Link>
  );
}

