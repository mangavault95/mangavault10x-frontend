import { useState } from "react";
import ScaffaleVolumi from "../ScaffaleVolumi";
import { Bottone } from "../Controlli";
import { Sezione } from "../Pagina";
import Icon from "../../app/Icon";
import { useAccessoProtetto } from "../../dati/accesso";
import { annullaAcquisti, registraAcquisto, updateManga } from "../../services/api";
import { euro, prossimoVolume as primoDaComprare } from "../../dati/serie";

/**
 * I volumi della serie.
 *
 * Il disegno vero sta in `ui/ScaffaleVolumi`, che è lo stesso usato
 * dal tavolo di lettura: qui c'era una seconda copia — quadratini
 * numerati, tre stati, gli stessi colori — scritta a mano e divergente
 * di qualche pixel da quella di là. Due implementazioni della stessa
 * cosa vogliono dire due posti in cui correggere ogni volta, e un
 * giorno in cui una delle due si dimentica.
 *
 * Quello che resta qui è il contorno: il titolo della sezione, il
 * conto, e la frase che spiega quando i volumi si possono premere.
 *
 * Dal 02/11/2026 è anche il posto dove si dice QUALI volumi si hanno
 * («Modifica volumi»), e la mensola dei dorsi ha lasciato il posto al
 * tabellone: con tanti volumi i dorsi diventavano un codice a barre.
 */
export function Volumi({
  serie,
  letti = [],
  droppata = false,
  onRiprendi,
  di = null,
  corrente = null,
  modificabile = false,
  onSalvati
}) {
  const insiemeLetti = new Set(letti.map(Number));
  const eseguiProtetto = useAccessoProtetto();

  // Cliccabili solo se la serie è droppata: altrimenti sarebbe un
  // quadratino che sembra un bottone ma non fa niente in nessun altro
  // stato, e cliccarlo per sbaglio riaprirebbe una lettura non voluta.
  const riprendibile = Boolean(droppata) && typeof onRiprendi === "function";

  // In modifica i tocchi cambiano una copia, e si salva tutto con «Fatto».
  // Salvare a ogni tocco vorrebbe dire una richiesta per volume, e due
  // tocchi veloci potrebbero arrivare al server nell'ordine sbagliato.
  const [bozza, setBozza] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [problema, setProblema] = useState(null);

  const inModifica = bozza !== null;
  const numeri = inModifica ? bozza : serie.numeri;
  const presenti = new Set(numeri);

  // Il tabellone arriva fin dove serve: al totale, o più in là se in
  // casa c'è un volume oltre il totale noto (Rocky Joe, 13 su 12).
  const quanti = Math.max(serie.totali ?? 0, ...numeri, 0);
  const mancano = Array.from({ length: quanti }, (_, i) => i + 1).filter((n) => !presenti.has(n)).length;

  const tocca = (n) =>
    setBozza((b) => (b.includes(n) ? b.filter((x) => x !== n) : [...b, n].sort((a, c) => a - c)));

  async function fatto() {
    const uguali = bozza.length === serie.numeri.length && bozza.every((n, i) => n === serie.numeri[i]);

    if (uguali) return setBozza(null);

    setSalvando(true);
    setProblema(null);

    try {
      await eseguiProtetto(() => updateManga(serie.id, { numeriposseduti: bozza }));
      onSalvati?.(bozza);
      setBozza(null);
    } catch (e) {
      if (!e?.annullato) setProblema("I volumi non sono stati salvati. Riprova fra un attimo.");
    } finally {
      setSalvando(false);
    }
  }

  if (!quanti && !modificabile) return null;

  return (
    <Sezione
      titolo="Volumi"
      extra={
        // Due numeri con due nomi: prima «0 di 38» non diceva se erano
        // letti o posseduti, e sopra la mensola ce n'erano due diversi.
        <span className="font-numeric text-sm text-ink-muted">
          {presenti.size}
          {serie.totali ? ` di ${serie.totali}` : ""} nella collezione
        </span>
      }
    >
      {riprendibile && !inModifica && (
        <p className="mb-3 text-xs text-ink-faint">
          Serie droppata — clicca un volume per riprendere da lì.
        </p>
      )}

      {inModifica && (
        <p className="mb-3 text-sm text-brass-300">Tocca i volumi che hai: si accendono e si spengono.</p>
      )}

      {quanti > 0 && (
        <ScaffaleVolumi
          totali={quanti}
          letti={letti}
          posseduti={numeri}
          corrente={inModifica ? null : corrente}
          onSelezionaVolume={inModifica ? tocca : riprendibile ? onRiprendi : undefined}
          resa="tabellone"
          riepilogo={false}
        />
      )}

      {/* La legenda: i tre stati del tabellone, con il conto di ciascuno. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border border-brass-400/60 bg-brass-400/25" />
          Letti{di ? ` da ${di}` : ""} <span className="font-numeric">{insiemeLetti.size}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border border-ink-bright/15 bg-ink-bright/[0.1]" />
          Da leggere <span className="font-numeric">{numeri.filter((n) => !insiemeLetti.has(n)).length}</span>
        </li>
        {mancano > 0 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border border-dashed border-ember/60" />
            Mancano <span className="font-numeric">{mancano}</span>
          </li>
        )}
      </ul>

      {modificabile && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {inModifica ? (
            <>
              <Bottone
                variante="secondario"
                onClick={() => setBozza(Array.from({ length: quanti }, (_, i) => i + 1))}
              >
                Li ho tutti
              </Bottone>
              <Bottone variante="secondario" onClick={() => setBozza([])}>
                Nessuno
              </Bottone>
              <Bottone onClick={fatto} disabled={salvando}>
                {salvando ? "Salvo…" : "Fatto"}
              </Bottone>
              <Bottone variante="fantasma" onClick={() => setBozza(null)} disabled={salvando}>
                Annulla
              </Bottone>
            </>
          ) : (
            <Bottone variante="secondario" onClick={() => setBozza([...serie.numeri])}>
              Modifica volumi
            </Bottone>
          )}
        </div>
      )}

      {problema && (
        <p role="alert" className="mt-3 text-sm text-ember">
          {problema}
        </p>
      )}
    </Sezione>
  );
}

/**
 * «Ho comprato il vol. 6»: il gesto di tutti i giorni, a un tocco.
 *
 * Prende il primo che MANCA, non quello dopo il più alto: per un
 * Yu-gi-oh con 1-5 e 11 è il 6. È un acquisto vero — passa dalla stessa
 * rotta della casella Cerca e del bot, entra nella spesa del mese col
 * prezzo della scheda — quindi resta a portata di mano anche l'Annulla.
 */
export function AcquistoProssimo({ serie, onCambiato }) {
  const eseguiProtetto = useAccessoProtetto();
  const [inCorso, setInCorso] = useState(false);
  const [registrato, setRegistrato] = useState(null);
  const [problema, setProblema] = useState(null);

  const numero = primoDaComprare(serie);
  const prezzo = serie.grezzo?.PrezzoCopertina ? Number(serie.grezzo.PrezzoCopertina) : serie.costo;

  async function compra() {
    setInCorso(true);
    setProblema(null);

    try {
      const esito = await eseguiProtetto(() => registraAcquisto(serie.id, { volumi: [numero] }));

      setRegistrato({ numero, acquisti: esito?.acquisti || [] });
      onCambiato?.();
    } catch (e) {
      if (!e?.annullato) setProblema(`Il vol. ${numero} non è stato registrato. Riprova fra un attimo.`);
    } finally {
      setInCorso(false);
    }
  }

  async function annulla() {
    setInCorso(true);
    setProblema(null);

    try {
      await eseguiProtetto(() => annullaAcquisti(registrato.acquisti));
      setRegistrato(null);
      onCambiato?.();
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito ad annullarlo: riprova.");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="pt-1">
      {registrato ? (
        <p className="flex items-center justify-between gap-3 rounded-card border border-jade/30 bg-jade/10 px-3.5 py-2.5 text-sm text-jade" role="status">
          Vol. {registrato.numero} registrato
          <button
            type="button"
            onClick={annulla}
            disabled={inCorso}
            className="rounded-lg px-2 py-1 font-semibold text-ink-bright hover:underline disabled:opacity-50"
          >
            Annulla
          </button>
        </p>
      ) : (
        <button
          type="button"
          onClick={compra}
          disabled={inCorso}
          className="flex w-full items-center justify-between gap-3 rounded-card border border-hairline bg-glass-2 px-3.5 py-2.5 text-left text-sm transition-colors duration-quick hover:border-soft disabled:opacity-60
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
        >
          <span className="flex items-center gap-2 font-semibold text-ink-bright">
            <Icon nome="plus" dimensione={16} />
            {inCorso ? "Registro…" : <>Ho comprato il vol. <span className="font-numeric">{numero}</span></>}
          </span>
          {prezzo ? <span className="font-numeric text-xs text-ink-muted">{euro(prezzo)}</span> : null}
        </button>
      )}

      {problema && (
        <p role="alert" className="mt-2 text-xs text-ember">
          {problema}
        </p>
      )}
    </div>
  );
}
