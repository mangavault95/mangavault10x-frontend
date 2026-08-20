import { useState } from "react";
import Icon from "../app/Icon";
import { useAccessoProtetto } from "../dati/accesso";
import { updateManga, updateRating } from "../services/api";
import useTocco from "./tocco";
import { votoIt } from "../dati/serie";

/**
 * I tre gesti che prima costringevano ad aprire Gestione: segnare un
 * preferito, dare un voto, muovere il contatore dei volumi.
 *
 * Tutti e tre condividono lo stesso schema — cambia lo schermo subito,
 * poi manda la modifica al server, e se qualcosa va storto torna
 * indietro. Aspettare la risposta di Render prima di mostrare la
 * stella accesa renderebbe ogni click una piccola attesa; sbagliare
 * silenziosamente sarebbe peggio, quindi l'errore che arriva riporta
 * tutto com'era e lo dice.
 *
 * La scrittura resta protetta: `useAccessoProtetto` apre un accesso
 * compatto proprio qui se serve, invece di mandare a `/admin`.
 *
 *
 * QUANTO SONO GRANDI DA TOCCARE
 *
 * Col mouse un bersaglio di ventotto pixel si prende al primo colpo,
 * perché la punta della freccia è larga un pixel e la si vede. Il
 * polpastrello no: copre quello che sta per premere ed è largo un
 * centimetro. Dove c'è `[@media(hover:none)]` questi comandi crescono —
 * solo lì, perché su un monitor un bottone di quaranta pixel accanto a
 * un titolo è un bottone che urla.
 */

/* ==================================================
   PREFERITO
   ================================================== */

export function BottonePreferito({ serie, onCambiato, dimensione = 18, className = "" }) {
  const eseguiProtetto = useAccessoProtetto();
  const [inCorso, setInCorso] = useState(false);
  const [erroreVisibile, setErroreVisibile] = useState(false);

  async function alClick(e) {
    // Sta quasi sempre sopra un <Link> (la copertina in una griglia):
    // senza questi due, il click aprirebbe anche la scheda della serie.
    e.preventDefault();
    e.stopPropagation();

    if (inCorso) return;

    const nuovo = !serie.preferito;

    setInCorso(true);
    setErroreVisibile(false);
    onCambiato?.(nuovo);

    try {
      await eseguiProtetto(() => updateManga(serie.id, { preferito: nuovo }));
    } catch (err) {
      if (!err?.annullato) {
        onCambiato?.(serie.preferito);
        setErroreVisibile(true);
      }
    } finally {
      setInCorso(false);
    }
  }

  return (
    <button
      type="button"
      onClick={alClick}
      disabled={inCorso}
      title={serie.preferito ? "Togli dai preferiti" : "Segna come preferito"}
      aria-pressed={serie.preferito}
      className={`grid place-items-center rounded-full transition-all duration-quick ease-spring
                  active:scale-90 disabled:opacity-50
                  ${serie.preferito ? "text-brass-400" : "text-ink-faint hover:text-brass-300"}
                  ${className}`}
    >
      <Icon nome="star" dimensione={dimensione} piena={serie.preferito} />
      {erroreVisibile && <span className="sr-only">Salvataggio non riuscito</span>}
    </button>
  );
}

/* ==================================================
   VOTO — cinque stelle, a mezze stelle
   ================================================== */

/**
 * Una stella vuota, mezza o piena.
 *
 * La mezza non è un'icona a parte: è la stella piena messa sopra
 * quella vuota e tagliata a metà da un contenitore che nasconde quello
 * che esce. Così le due metà combaciano per costruzione — un disegno
 * separato per la mezza stella prima o poi si scosta di un pixel, e si
 * vede.
 */
export function Stella({ riempimento, dimensione }) {
  return (
    <span
      className="relative grid place-items-center"
      style={{ width: dimensione, height: dimensione }}
    >
      <Icon nome="star" dimensione={dimensione} className="text-ink-faint" />

      {riempimento > 0 && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: riempimento >= 1 ? "100%" : "50%" }}
        >
          <Icon nome="star" dimensione={dimensione} piena className="text-brass-400" />
        </span>
      )}
    </span>
  );
}

/**
 * Un voto da 0,5 a 5, a mezze stelle.
 *
 * Le mezze stelle c'erano già state e furono tolte: allora però il voto
 * era in decimi (`8.5 su 10`) e la mezza stella era un modo storto di
 * mostrare un numero che nessuno pensava in quei termini. Adesso la
 * scala è quella giusta — cinque — e la mezza è l'unica cosa che
 * mancava per distinguere un 3 da un 3 e mezzo.
 *
 * Ogni stella ha due bersagli, sinistra e destra: la metà e l'intero.
 * Col dito i bersagli sono grandi il doppio, perché il polpastrello
 * copre quello che sta premendo (vedi `useTocco`).
 *
 * Ricliccare il voto che si è già dato lo TOGLIE. Un voto messo per
 * sbaglio deve potersi ritirare, e "non votato" non è lo zero: è
 * l'assenza di una riga.
 */
export function VotoStelle({ serie, onCambiato, dimensione = 20, sospeso = false }) {
  const eseguiProtetto = useAccessoProtetto();
  const tocco = useTocco();
  const [inCorso, setInCorso] = useState(false);
  const [anteprima, setAnteprima] = useState(null);

  const misura = tocco ? Math.round(dimensione * 1.5) : dimensione;
  const valoreVisibile = anteprima ?? serie.valutazione ?? 0;

  async function salva(nuovo, e) {
    e?.preventDefault();
    e?.stopPropagation();

    if (inCorso) return;

    const precedente = serie.valutazione ?? null;

    // Lo stesso voto due volte vuol dire "toglilo".
    const finale = nuovo === precedente ? null : nuovo;

    setInCorso(true);
    setAnteprima(null);
    onCambiato?.(finale);

    try {
      await eseguiProtetto(() => updateRating(serie.id, finale));
    } catch (err) {
      if (!err?.annullato) onCambiato?.(precedente);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${sospeso ? "opacity-60" : ""}`}
      onMouseLeave={() => setAnteprima(null)}
      role="group"
      aria-label={
        serie.valutazione ? `Voto: ${votoIt(serie.valutazione)} su 5` : "Non votato"
      }
    >
      {[1, 2, 3, 4, 5].map((numero) => (
        <span
          key={numero}
          className="relative inline-grid transition-transform duration-quick ease-spring hover:scale-110"
        >
          <Stella
            riempimento={Math.min(1, Math.max(0, valoreVisibile - numero + 1))}
            dimensione={misura}
          />

          {[numero - 0.5, numero].map((valore, meta) => (
            <button
              key={valore}
              type="button"
              disabled={inCorso}
              title={
                valore === serie.valutazione
                  ? "Togli il voto"
                  : `Dai ${votoIt(valore)} su 5`
              }
              aria-label={`${votoIt(valore)} su 5`}
              aria-pressed={serie.valutazione === valore}
              onMouseEnter={() => setAnteprima(valore)}
              onClick={(e) => salva(valore, e)}
              className={`absolute inset-y-0 w-1/2 disabled:pointer-events-none
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                          ${meta === 0 ? "left-0" : "right-0"}`}
            />
          ))}
        </span>
      ))}
    </div>
  );
}

/* ==================================================
   VOLUMI POSSEDUTI — contapagine
   ================================================== */

export function ContaVolumi({ serie, onCambiato, compatto = false }) {
  const eseguiProtetto = useAccessoProtetto();
  const [inCorso, setInCorso] = useState(false);

  async function cambia(delta, e) {
    e?.preventDefault();
    e?.stopPropagation();

    if (inCorso) return;

    const nuovo = Math.max(0, serie.posseduti + delta);

    if (nuovo === serie.posseduti) return;

    setInCorso(true);
    onCambiato?.(nuovo);

    try {
      await eseguiProtetto(() => updateManga(serie.id, { volumiposseduti: nuovo }));
    } catch (err) {
      if (!err?.annullato) onCambiato?.(serie.posseduti);
    } finally {
      setInCorso(false);
    }
  }

  const misura = compatto
    ? "h-6 w-6 text-xs [@media(hover:none)]:h-8 [@media(hover:none)]:w-8"
    : "h-8 w-8 text-sm [@media(hover:none)]:h-10 [@media(hover:none)]:w-10";

  return (
    <div
      className={`inline-flex items-center rounded-card border border-hairline bg-glass-2 ${
        compatto ? "gap-0.5 p-0.5" : "gap-1 p-1"
      }`}
    >
      <button
        type="button"
        onClick={(e) => cambia(-1, e)}
        disabled={inCorso || serie.posseduti <= 0}
        aria-label="Un volume in meno"
        className={`grid place-items-center rounded-lg text-ink-muted transition-all duration-quick
                    hover:bg-glass-3 hover:text-ink-bright active:scale-90
                    disabled:pointer-events-none disabled:opacity-30 ${misura}`}
      >
        −
      </button>

      <span className={`min-w-[1.5rem] text-center font-numeric font-semibold text-ink-bright ${compatto ? "text-xs" : "text-sm"}`}>
        {serie.posseduti}
      </span>

      <button
        type="button"
        onClick={(e) => cambia(1, e)}
        disabled={inCorso || (serie.totali && serie.posseduti >= serie.totali)}
        aria-label="Un volume in più"
        title={
          serie.totali && serie.posseduti >= serie.totali
            ? "Hai già tutti i volumi usciti"
            : "Un volume in più"
        }
        className={`grid place-items-center rounded-lg text-ink-muted transition-all duration-quick
                    hover:bg-glass-3 hover:text-ink-bright active:scale-90
                    disabled:pointer-events-none disabled:opacity-30 ${misura}`}
      >
        +
      </button>
    </div>
  );
}
