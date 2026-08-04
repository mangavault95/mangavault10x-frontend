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

  const editori = useMemo(() => conteggia(serie, (s) => (s.editore ? [s.editore] : [])), [serie]);
  const generi = useMemo(() => conteggia(serie, (s) => s.generi), [serie]);
  const autori = useMemo(() => conteggia(serie, (s) => (s.autore ? [s.autore] : [])), [serie]);

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
            onClick={() => setMostraDaCompletare(true)}
          />
        </dl>

        {mostraDaCompletare && (
          <DaCompletare serie={serie} onChiudere={() => setMostraDaCompletare(false)} />
        )}

        {mostraVoti && (
          <VotiSerie serie={serie} media={n.votoMedio} onChiudere={() => setMostraVoti(false)} />
        )}

        {/* ---------- Stato ---------- */}
        <Sezione titolo="Stato attuale">
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
              nota={n.votoMedio ? "su 5 · vedi il dettaglio" : "nessun voto registrato"}
              onClick={n.votoMedio ? () => setMostraVoti(true) : undefined}
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

          <Sezione titolo="Autori con più serie">
            <Classifica voci={autori.slice(0, 8)} unita="serie" />
          </Sezione>
        </div>

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gruppo.voci.map((p) => (
                <Primato key={p.id} {...p} />
              ))}
            </div>
          </Sezione>
        ))}
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
function Tessera({ etichetta, valore, nota, tono = "neutro", onClick }) {
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

      <dd className={`relative mt-1.5 font-numeric text-2xl font-semibold sm:text-3xl ${toni[tono]}`}>
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
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-brass-500/90">
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

